import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Building2, User, Phone, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

// Validation schemas for each step
const step1Schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

const step2Schema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['manufacturer', 'trader', 'service', 'retailer', 'other']),
  industry: z.string().min(1, 'Please select an industry'),
  gstNumber: z.string().optional(),
});

const step3Schema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

interface RegistrationData extends Step1Data, Step2Data {}

const STEPS = [
  { id: 1, title: 'Personal Details', icon: User, description: 'Your basic information' },
  { id: 2, title: 'Business Details', icon: Building2, description: 'About your business' },
  { id: 3, title: 'Verification', icon: CheckCircle, description: 'Verify your mobile' },
];

const INDUSTRIES = [
  'Agriculture & Food Processing',
  'Automotive & Components',
  'Chemical & Petrochemicals',
  'Construction & Infrastructure',
  'Education & Training',
  'Electronics & IT',
  'Energy & Power',
  'Healthcare & Pharmaceuticals',
  'Leather & Footwear',
  'Manufacturing',
  'Mining & Metals',
  'Retail & E-commerce',
  'Services',
  'Textiles & Apparel',
  'Transportation & Logistics',
  'Other',
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<Partial<RegistrationData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: registrationData,
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: registrationData,
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
  });

  const handleStep1Submit = (data: Step1Data) => {
    setRegistrationData(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleStep2Submit = async (data: Step2Data) => {
    setRegistrationData(prev => ({ ...prev, ...data }));
    setIsLoading(true);

    try {
      // Send OTP
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: registrationData.phone }),
      });

      if (response.ok) {
        setOtpSent(true);
        setCurrentStep(3);
        toast({
          title: 'OTP Sent',
          description: 'Please check your mobile for verification code',
        });
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Submit = async (data: Step3Data) => {
    setIsLoading(true);

    try {
      const finalData = { ...registrationData, ...data };
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (response.ok) {
        toast({
          title: 'Registration Successful!',
          description: 'Welcome to MSMEBazaar. Redirecting to dashboard...',
        });
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'Please check your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <Badge variant="secondary" className="text-sm font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Join 10,000+ MSMEs
                </Badge>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  Start your
                  <span className="text-blue-600"> digital</span>
                  <br />
                  business journey
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Connect with buyers, get valuations, access loans, and grow your MSME business with our comprehensive platform.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: 'Business Listing', desc: 'Showcase your products' },
                  { title: 'AI Valuations', desc: 'Know your worth' },
                  { title: 'Easy Financing', desc: 'Access capital fast' },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Hero Image */}
              <div className="hidden lg:block">
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  src="/api/placeholder/600/400"
                  alt="MSME Business Growth"
                  className="w-full rounded-2xl shadow-lg"
                />
              </div>
            </motion.div>

            {/* Registration Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full max-w-md mx-auto"
            >
              <Card className="shadow-xl border-0">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                      <CardDescription>
                        Step {currentStep} of {STEPS.length}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(progress)}% Complete
                    </Badge>
                  </div>

                  <Progress value={progress} className="h-2" />

                  <div className="flex items-center space-x-2">
                    {STEPS.map((step, index) => {
                      const Icon = step.icon;
                      const isActive = currentStep === step.id;
                      const isCompleted = currentStep > step.id;

                      return (
                        <div key={step.id} className="flex items-center">
                          <div
                            className={`
                              flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                              ${isCompleted
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : isActive
                            ? 'border-blue-600 text-blue-600'
                            : 'border-gray-300 text-gray-400'
                        }
                            `}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                          </div>
                          {index < STEPS.length - 1 && (
                            <div
                              className={`
                                h-0.5 w-8 mx-2 transition-colors
                                ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'}
                              `}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Step 1: Personal Details */}
                  {currentStep === 1 && (
                    <motion.form
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            {...step1Form.register('firstName')}
                            placeholder="John"
                          />
                          {step1Form.formState.errors.firstName && (
                            <p className="text-sm text-red-600">
                              {step1Form.formState.errors.firstName.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            {...step1Form.register('lastName')}
                            placeholder="Doe"
                          />
                          {step1Form.formState.errors.lastName && (
                            <p className="text-sm text-red-600">
                              {step1Form.formState.errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          {...step1Form.register('email')}
                          placeholder="john@example.com"
                        />
                        {step1Form.formState.errors.email && (
                          <p className="text-sm text-red-600">
                            {step1Form.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <Input
                          id="phone"
                          {...step1Form.register('phone')}
                          placeholder="+91 9876543210"
                        />
                        {step1Form.formState.errors.phone && (
                          <p className="text-sm text-red-600">
                            {step1Form.formState.errors.phone.message}
                          </p>
                        )}
                      </div>

                      <Button type="submit" className="w-full">
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.form>
                  )}

                  {/* Step 2: Business Details */}
                  {currentStep === 2 && (
                    <motion.form
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={step2Form.handleSubmit(handleStep2Submit)}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          {...step2Form.register('businessName')}
                          placeholder="Acme Manufacturing Pvt Ltd"
                        />
                        {step2Form.formState.errors.businessName && (
                          <p className="text-sm text-red-600">
                            {step2Form.formState.errors.businessName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Select {...step2Form.register('businessType')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manufacturer">Manufacturer</SelectItem>
                            <SelectItem value="trader">Trader</SelectItem>
                            <SelectItem value="service">Service Provider</SelectItem>
                            <SelectItem value="retailer">Retailer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {step2Form.formState.errors.businessType && (
                          <p className="text-sm text-red-600">
                            {step2Form.formState.errors.businessType.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select {...step2Form.register('industry')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDUSTRIES.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {step2Form.formState.errors.industry && (
                          <p className="text-sm text-red-600">
                            {step2Form.formState.errors.industry.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                        <Input
                          id="gstNumber"
                          {...step2Form.register('gstNumber')}
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>

                      <div className="flex space-x-3">
                        <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isLoading}>
                          {isLoading ? 'Sending OTP...' : 'Send OTP'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </motion.form>
                  )}

                  {/* Step 3: OTP Verification */}
                  {currentStep === 3 && (
                    <motion.form
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={step3Form.handleSubmit(handleStep3Submit)}
                      className="space-y-6"
                    >
                      <div className="text-center space-y-2">
                        <Phone className="w-12 h-12 text-blue-600 mx-auto" />
                        <h3 className="text-lg font-semibold">Verify Your Mobile</h3>
                        <p className="text-sm text-gray-600">
                          We've sent a 6-digit code to {registrationData.phone}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <Input
                          id="otp"
                          {...step3Form.register('otp')}
                          placeholder="000000"
                          className="text-center text-lg tracking-widest"
                          maxLength={6}
                        />
                        {step3Form.formState.errors.otp && (
                          <p className="text-sm text-red-600">
                            {step3Form.formState.errors.otp.message}
                          </p>
                        )}
                      </div>

                      <div className="text-center">
                        <Button variant="link" className="text-sm">
                          Didn't receive OTP? Resend
                        </Button>
                      </div>

                      <div className="flex space-x-3">
                        <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isLoading}>
                          {isLoading ? 'Verifying...' : 'Complete Registration'}
                        </Button>
                      </div>
                    </motion.form>
                  )}
                </CardContent>
              </Card>

              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/auth/login" className="text-blue-600 hover:underline font-medium">
                  Sign in
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
