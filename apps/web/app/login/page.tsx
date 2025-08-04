'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Phone, Shield, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import OtpInput from 'react-otp-input';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth';

const phoneSchema = z.object({
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[+]?[0-9]{10,15}$/, 'Please enter a valid phone number'),
});

type PhoneForm = z.infer<typeof phoneSchema>;

enum LoginStep {
  PHONE = 'phone',
  OTP = 'otp',
  SUCCESS = 'success',
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();

  const [step, setStep] = useState<LoginStep>(LoginStep.PHONE);
  const [loginData, setLoginData] = useState<PhoneForm | null>(null);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
  });

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
    return phone;
  };

  const handlePhoneSubmit = async (data: PhoneForm) => {
    setIsLoading(true);
    try {
      const formattedData = { phone: formatPhoneNumber(data.phone) };
      const response = await authApi.login(formattedData);

      if (response.success) {
        setLoginData(formattedData);
        setStep(LoginStep.OTP);
        startResendTimer();
        toast.success('OTP sent successfully!');
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerification = async () => {
    if (!loginData || otp.length !== 6) return;
    setIsLoading(true);
    try {
      const response = await authApi.verifyOTP({
        phone: loginData.phone,
        otp,
        purpose: 'LOGIN',
      });

      setUser(response.user);
      setTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });

      setStep(LoginStep.SUCCESS);
      toast.success('Login successful!');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!loginData || !canResend) return;
    setIsLoading(true);
    try {
      const response = await authApi.resendOTP({
        phone: loginData.phone,
        purpose: 'LOGIN',
      });
      if (response.success) {
        toast.success('OTP resent successfully!');
        startResendTimer();
      } else {
        toast.error(response.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const startResendTimer = () => {
    setCanResend(false);
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {step === LoginStep.PHONE && 'Welcome Back'}
              {step === LoginStep.OTP && 'Verify Your Phone'}
              {step === LoginStep.SUCCESS && 'Logged In!'}
            </CardTitle>
            <CardDescription>
              {step === LoginStep.PHONE && 'Sign in to continue to MSMEBazaar'}
              {step === LoginStep.OTP && 'Enter the 6-digit code sent to your phone'}
              {step === LoginStep.SUCCESS && 'Redirecting to dashboard'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === LoginStep.PHONE && (
              <motion.form initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input id="phone" type="tel" placeholder="9876543210" className="pl-10" {...phoneForm.register('phone')} />
                  </div>
                  {phoneForm.formState.errors.phone && (
                    <p className="text-sm text-error-500">{phoneForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending OTP...' : 'Continue'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.form>
            )}

            {step === LoginStep.OTP && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
                    <Shield className="w-8 h-8 text-brand-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    We've sent a 6-digit code to <br />
                    <span className="font-semibold">{loginData?.phone}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      numInputs={6}
                      renderInput={(props) => (
                        <input {...props} className="w-10 h-10 mx-1 text-center text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button onClick={handleOTPVerification} disabled={isLoading || otp.length !== 6} className="w-full">
                      {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </Button>
                    <div className="flex justify-between items-center">
                      <Button variant="ghost" onClick={() => setStep(LoginStep.PHONE)} disabled={isLoading}>
                        <ArrowLeft className="mr-2 w-4 h-4" /> Back
                      </Button>
                      <Button variant="ghost" onClick={handleResendOTP} disabled={!canResend || isLoading}>
                        {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === LoginStep.SUCCESS && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-success-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success-600" />
                </div>
                <p className="text-gray-600">Redirecting you to your dashboard...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-brand-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button onClick={() => router.push('/register')} className="text-brand-600 hover:text-brand-700 font-medium">
              Sign up
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
