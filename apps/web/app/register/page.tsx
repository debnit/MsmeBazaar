'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Phone, 
  User, 
  Mail, 
  Building, 
  Shield, 
  CheckCircle,
  ArrowRight,
  ArrowLeft 
} from 'lucide-react';
import OtpInput from 'react-otp-input';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth';

// Validation schemas
const registrationSchema = z.object({
  phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[+]?[0-9]{10,15}$/, 'Please enter a valid phone number'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  role: z.enum(['MSME', 'BUYER', 'ADMIN'], {
    required_error: 'Please select a role',
  }),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type RegistrationForm = z.infer<typeof registrationSchema>;
type OTPForm = z.infer<typeof otpSchema>;

enum RegistrationStep {
  PHONE_DETAILS = 'phone_details',
  OTP_VERIFICATION = 'otp_verification',
  SUCCESS = 'success'
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const [step, setStep] = useState<RegistrationStep>(RegistrationStep.PHONE_DETAILS);
  const [registrationData, setRegistrationData] = useState<RegistrationForm | null>(null);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const registrationForm = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: 'MSME',
    },
  });

  const otpForm = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
  });

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    return phone;
  };

  // Handle registration submission
  const handleRegistration = async (data: RegistrationForm) => {
    setIsLoading(true);
    try {
      const formattedData = {
        ...data,
        phone: formatPhoneNumber(data.phone),
        email: data.email || undefined,
        name: data.name || undefined,
        role: data.role , // 👈 explicitly include role to satisfy type
      };

      const response = await authApi.register(formattedData);
      
      if (response.success) {
        setRegistrationData(formattedData);
        setStep(RegistrationStep.OTP_VERIFICATION);
        startResendTimer();
        toast.success('OTP sent successfully!');
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleOTPVerification = async () => {
    if (!registrationData || otp.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await authApi.verifyOTP({
        phone: registrationData.phone,
        otp,
        purpose: 'REGISTRATION',
      });

      // Store user data and tokens
      setUser(response.user);
      setTokens({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });

      setStep(RegistrationStep.SUCCESS);
      toast.success('Registration successful!');
      
      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP resend
  const handleResendOTP = async () => {
    if (!registrationData || !canResend) return;

    setIsLoading(true);
    try {
      const response = await authApi.resendOTP({
        phone: registrationData.phone,
        purpose: 'REGISTRATION',
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

  // Start resend timer
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

  // Handle back button
  const handleBack = () => {
    if (step === RegistrationStep.OTP_VERIFICATION) {
      setStep(RegistrationStep.PHONE_DETAILS);
      setOtp('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center">
              <Building className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {step === RegistrationStep.PHONE_DETAILS && 'Join MSMEBazaar'}
              {step === RegistrationStep.OTP_VERIFICATION && 'Verify Your Phone'}
              {step === RegistrationStep.SUCCESS && 'Welcome Aboard!'}
            </CardTitle>
            <CardDescription>
              {step === RegistrationStep.PHONE_DETAILS && 'Create your account to connect with buyers and investors'}
              {step === RegistrationStep.OTP_VERIFICATION && 'Enter the 6-digit code sent to your phone'}
              {step === RegistrationStep.SUCCESS && 'Your account has been created successfully'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Phone and Details */}
            {step === RegistrationStep.PHONE_DETAILS && (
              <motion.form
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={registrationForm.handleSubmit(handleRegistration)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      className="pl-10"
                      {...registrationForm.register('phone')}
                    />
                  </div>
                  {registrationForm.formState.errors.phone && (
                    <p className="text-sm text-error-500">
                      {registrationForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      className="pl-10"
                      {...registrationForm.register('name')}
                    />
                  </div>
                  {registrationForm.formState.errors.name && (
                    <p className="text-sm text-error-500">
                      {registrationForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      {...registrationForm.register('email')}
                    />
                  </div>
                  {registrationForm.formState.errors.email && (
                    <p className="text-sm text-error-500">
                      {registrationForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">I am a *</Label>
                  <Select
                    value={registrationForm.watch('role')}
                    onValueChange={(value) => registrationForm.setValue('role', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MSME">MSME Owner</SelectItem>
                      <SelectItem value="BUYER">Buyer/Investor</SelectItem>
                    </SelectContent>
                  </Select>
                  {registrationForm.formState.errors.role && (
                    <p className="text-sm text-error-500">
                      {registrationForm.formState.errors.role.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending OTP...' : 'Continue'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.form>
            )}

            {/* Step 2: OTP Verification */}
            {step === RegistrationStep.OTP_VERIFICATION && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
                    <Shield className="w-8 h-8 text-brand-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    We've sent a 6-digit code to<br />
                    <span className="font-semibold">{registrationData?.phone}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-center">
                    <OtpInput
                      value={otp}
                      onChange={setOtp}
                      numInputs={6}
                     // separator={<span className="mx-1"></span>}
                      inputStyle={{
                        width: '40px',
                        height: '40px',
                        margin: '0 4px',
                        fontSize: '18px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        textAlign: 'center',
                      }}
                      focusStyle={{
                        border: '1px solid #0ea5e9',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleOTPVerification}
                      disabled={isLoading || otp.length !== 6}
                      className="w-full"
                    >
                      {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </Button>

                    <div className="flex justify-between items-center">
                      <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={isLoading}
                      >
                        <ArrowLeft className="mr-2 w-4 h-4" />
                        Back
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={handleResendOTP}
                        disabled={!canResend || isLoading}
                      >
                        {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === RegistrationStep.SUCCESS && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="mx-auto mb-4 w-16 h-16 bg-success-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success-600" />
                </div>
                <p className="text-gray-600">
                  Redirecting you to your dashboard...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-brand-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}