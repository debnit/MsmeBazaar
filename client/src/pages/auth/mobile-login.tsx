import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, MessageSquare, ArrowRight } from 'lucide-react';

const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number')
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits')
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OTPForm = z.infer<typeof otpSchema>;

export default function MobileLogin() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { toast } = useToast();

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' }
  });

  const otpForm = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' }
  });

  const sendOTPMutation = useMutation({
    mutationFn: async (data: PhoneForm) => {
      return await apiRequest('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: data.phone })
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        setPhoneNumber(phoneForm.getValues('phone'));
        setStep('otp');
        toast({
          title: 'OTP Sent',
          description: 'Please check your phone for the verification code'
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to send OTP',
          variant: 'destructive'
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive'
      });
    }
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: OTPForm) => {
      return await apiRequest('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ 
          phoneNumber: phoneNumber,
          otp: data.otp 
        })
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        // Store token and navigate to dashboard
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        toast({
          title: 'Login Successful',
          description: 'Welcome to MSMESquare!'
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Verification Failed',
          description: data.message || 'Invalid OTP',
          variant: 'destructive'
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify OTP',
        variant: 'destructive'
      });
    }
  });

  const resendOTPMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phoneNumber })
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'OTP Resent',
          description: 'A new verification code has been sent to your phone'
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to resend OTP',
          variant: 'destructive'
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend OTP',
        variant: 'destructive'
      });
    }
  });

  const onPhoneSubmit = (data: PhoneForm) => {
    sendOTPMutation.mutate(data);
  };

  const onOTPSubmit = (data: OTPForm) => {
    verifyOTPMutation.mutate(data);
  };

  const handleResendOTP = () => {
    resendOTPMutation.mutate();
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setPhoneNumber('');
    phoneForm.reset();
    otpForm.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {step === 'phone' ? 'Mobile Login' : 'Verify OTP'}
          </CardTitle>
          <CardDescription>
            {step === 'phone' 
              ? 'Enter your mobile number to get started' 
              : `Enter the 6-digit code sent to +91 ${phoneNumber}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <div className="absolute left-10 top-3 text-sm text-gray-500">+91</div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    className="pl-16"
                    {...phoneForm.register('phone')}
                    maxLength={10}
                  />
                </div>
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-red-500">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={sendOTPMutation.isPending}
              >
                {sendOTPMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending OTP...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send OTP
                  </div>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  className="text-center text-lg tracking-widest"
                  {...otpForm.register('otp')}
                  maxLength={6}
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-sm text-red-500">{otpForm.formState.errors.otp.message}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={verifyOTPMutation.isPending}
              >
                {verifyOTPMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Verify & Login
                  </div>
                )}
              </Button>
              
              <div className="flex flex-col space-y-2 text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOTP}
                  disabled={resendOTPMutation.isPending}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {resendOTPMutation.isPending ? 'Resending...' : 'Resend OTP'}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToPhone}
                  className="text-gray-600 hover:text-gray-700"
                >
                  Change Mobile Number
                </Button>
              </div>
            </form>
          )}
          
          <div className="text-center text-sm text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </div>
        </CardContent>
      </Card>
    </div>
  );
}