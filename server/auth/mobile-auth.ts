import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { User } from '@shared/schema';

// Mock SMS service - replace with actual provider like Twilio
interface SMSService {
  sendOTP(phoneNumber: string, otp: string): Promise<boolean>;
}

class MockSMSService implements SMSService {
  async sendOTP(phoneNumber: string, otp: string): Promise<boolean> {
    console.log(`SMS sent to ${phoneNumber}: Your OTP is ${otp}`);
    return true;
  }
}

// In production, use Twilio or similar
const smsService = new MockSMSService();

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expires: Date; attempts: number }>();

export class MobileAuthService {
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digits and add country code if missing
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    return cleaned;
  }

  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Check if phone number is valid
      if (!normalizedPhone.match(/^\+91\d{10}$/)) {
        return { success: false, message: 'Invalid phone number format' };
      }

      // Check rate limiting
      const existing = otpStore.get(normalizedPhone);
      if (existing && existing.attempts >= 3) {
        return { success: false, message: 'Too many attempts. Please try again later.' };
      }

      const otp = this.generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      otpStore.set(normalizedPhone, {
        otp,
        expires,
        attempts: existing ? existing.attempts + 1 : 1,
      });

      // Send SMS
      const sent = await smsService.sendOTP(normalizedPhone, otp);

      if (sent) {
        return { success: true, message: 'OTP sent successfully' };
      }
      return { success: false, message: 'Failed to send OTP' };

    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; user?: User; token?: string }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const stored = otpStore.get(normalizedPhone);

      if (!stored) {
        return { success: false };
      }

      if (stored.expires < new Date()) {
        otpStore.delete(normalizedPhone);
        return { success: false };
      }

      if (stored.otp !== otp) {
        return { success: false };
      }

      // OTP verified, clear from store
      otpStore.delete(normalizedPhone);

      // Check if user exists
      let user = await storage.getUserByPhone(normalizedPhone);

      if (!user) {
        // Create new user
        user = await storage.createUser({
          phone: normalizedPhone,
          role: 'seller', // Default role
          isVerified: true,
          name: '', // Will be filled during onboarding
          email: '',
          password: '', // Not needed for mobile auth
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, phone: user.phone, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' },
      );

      return { success: true, user, token };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false };
    }
  }

  async resendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Clear existing OTP to reset attempts
    otpStore.delete(normalizedPhone);

    return this.sendOTP(phoneNumber);
  }
}

export const mobileAuth = new MobileAuthService();

// Middleware for mobile auth routes
export const authenticateMobile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const user = await storage.getUser(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
