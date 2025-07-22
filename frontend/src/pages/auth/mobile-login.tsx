import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Mail, Lock, User, Building2, UserCheck, Timer } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';

export default function MobileLogin() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  
  // Form states
  const [activeTab, setActiveTab] = useState<'otp' | 'email'>('otp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<string>('buyer');
  const [isRegister, setIsRegister] = useState(false);
  
  // UI states
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  // Redirect if already logged in
  if (user && !isLoading) {
    setLocation('/dashboard');
    return null;
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Add country code if not present
    if (digits.length > 0 && !digits.startsWith('91')) {
      return `+91${digits}`;
    }
    
    return digits.startsWith('91') ? `+${digits}` : digits;
  };

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 13;
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const response = await authService.sendOTP(formattedPhone);
      
      if (response.success) {
        setOtpSent(true);
        startCountdown();
        toast({
          title: "OTP Sent",
          description: "Please check your phone for the verification code",
        });
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const response = await authService.verifyOTP(formattedPhone, otp);
      
      if (response.success && response.user && response.token) {
        authService.setToken(response.token);
        toast({
          title: "Login Successful",
          description: "Welcome to MSMESquare!",
        });
        setLocation('/dashboard');
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'OTP verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let response;
      
      if (isRegister) {
        if (!firstName || !role) {
          setError('Please fill in all required fields');
          return;
        }
        
        response = await authService.register({
          email,
          password,
          firstName,
          lastName,
          role,
        });
      } else {
        response = await authService.login({ email, password });
      }
      
      if (response.success && response.user && response.token) {
        authService.setToken(response.token);
        toast({
          title: isRegister ? "Registration Successful" : "Login Successful",
          description: "Welcome to MSMESquare!",
        });
        setLocation('/dashboard');
      } else {
        setError(response.message || (isRegister ? 'Registration failed' : 'Login failed'));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const response = await authService.resendOTP(formattedPhone);
      
      if (response.success) {
        startCountdown();
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your phone",
        });
      } else {
        setError(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resend OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    { value: 'buyer', label: 'Buyer', icon: Building2, description: 'Looking to acquire MSMEs' },
    { value: 'seller', label: 'Seller', icon: User, description: 'MSME owner looking to sell' },
    { value: 'agent', label: 'Agent', icon: UserCheck, description: 'Facilitate transactions' },
    { value: 'nbfc', label: 'NBFC', icon: Building2, description: 'Provide financing solutions' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">MSMESquare</h1>
          <p className="text-gray-600">National MSME Marketplace</p>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Secure & Trusted Platform
          </Badge>
        </div>

        {/* Auth Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred authentication method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'otp' | 'email')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="otp" className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile OTP</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </TabsTrigger>
              </TabsList>

              {/* Mobile OTP Tab */}
              <TabsContent value="otp" className="space-y-4">
                {!otpSent ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Mobile Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="text-lg"
                      />
                      <p className="text-sm text-gray-500">
                        We'll send a 6-digit verification code to this number
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleSendOTP} 
                      disabled={isSubmitting || !phoneNumber}
                      className="w-full"
                    >
                      {isSubmitting ? 'Sending...' : 'Send OTP'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-lg text-center tracking-widest"
                        maxLength={6}
                      />
                      <p className="text-sm text-gray-500">
                        Code sent to {phoneNumber}
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleVerifyOTP} 
                      disabled={isSubmitting || otp.length !== 6}
                      className="w-full"
                    >
                      {isSubmitting ? 'Verifying...' : 'Verify & Login'}
                    </Button>
                    
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setOtpSent(false)}
                      >
                        Change Number
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleResendOTP}
                        disabled={countdown > 0 || isSubmitting}
                      >
                        {countdown > 0 ? (
                          <span className="flex items-center space-x-1">
                            <Timer className="h-4 w-4" />
                            <span>{countdown}s</span>
                          </span>
                        ) : (
                          'Resend OTP'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Email Tab */}
              <TabsContent value="email" className="space-y-4">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Button
                    variant={!isRegister ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsRegister(false)}
                  >
                    Login
                  </Button>
                  <Button
                    variant={isRegister ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsRegister(true)}
                  >
                    Register
                  </Button>
                </div>

                <div className="space-y-4">
                  {isRegister && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="role">Role *</Label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center space-x-2">
                                  <option.icon className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-sm text-gray-500">{option.description}</div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>

                  <Button 
                    onClick={handleEmailAuth} 
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? 'Processing...' : isRegister ? 'Register' : 'Login'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>Secure authentication powered by JWT & OTP</p>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="outline">🔒 Secure</Badge>
            <Badge variant="outline">🇮🇳 Made in India</Badge>
            <Badge variant="outline">📱 Mobile First</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}