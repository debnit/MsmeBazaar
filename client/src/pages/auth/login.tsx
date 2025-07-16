import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building, Users, TrendingUp, Shield, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useLocalization } from '@/hooks/useLocalization';
import { LanguageSelector } from '@/components/LanguageSelector';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['seller', 'buyer', 'agent', 'nbfc'])
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const roleIcons = {
  seller: Building,
  buyer: Users,
  agent: TrendingUp,
  nbfc: Shield
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLocalization();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', role: 'seller' }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: t('auth.login.success'),
        description: t('auth.login.welcome'),
        variant: 'default'
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.login.error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: t('auth.register.success'),
        description: t('auth.register.welcome'),
        variant: 'default'
      });
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.register.error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getRoleDescription = (role: string) => {
    const descriptions = {
      seller: t('auth.roles.seller.description'),
      buyer: t('auth.roles.buyer.description'),
      agent: t('auth.roles.agent.description'),
      nbfc: t('auth.roles.nbfc.description')
    };
    return descriptions[role as keyof typeof descriptions] || '';
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <Building className="h-12 w-12 text-blue-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">MSMESquare</h1>
            </div>
            <p className="text-xl text-gray-600">{t('auth.tagline')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Benefits */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('auth.benefits.title')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">{t('auth.benefits.sellers')}</h3>
                    <p className="text-sm text-gray-600">{t('auth.benefits.sellersDesc')}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">{t('auth.benefits.buyers')}</h3>
                    <p className="text-sm text-gray-600">{t('auth.benefits.buyersDesc')}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">{t('auth.benefits.agents')}</h3>
                    <p className="text-sm text-gray-600">{t('auth.benefits.agentsDesc')}</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-gray-900">{t('auth.benefits.nbfcs')}</h3>
                    <p className="text-sm text-gray-600">{t('auth.benefits.nbfcsDesc')}</p>
                  </div>
                </div>
              </div>

              {/* Success Statistics */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">{t('auth.stats.title')}</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">20L+</div>
                    <div className="text-sm opacity-90">{t('auth.stats.msmes')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">₹500Cr+</div>
                    <div className="text-sm opacity-90">{t('auth.stats.transactions')}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">95%</div>
                    <div className="text-sm opacity-90">{t('auth.stats.success')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Auth Forms */}
            <div>
              <Card className="shadow-xl">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Building className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">
                    {isLogin ? t('auth.login.title') : t('auth.register.title')}
                  </CardTitle>
                  <CardDescription>
                    {isLogin ? t('auth.login.subtitle') : t('auth.register.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLogin ? (
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.form.email')}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder={t('auth.form.emailPlaceholder')}
                                  className="h-12"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.form.password')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? 'text' : 'password'} 
                                    placeholder={t('auth.form.passwordPlaceholder')}
                                    className="h-12 pr-10"
                                    {...field} 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? t('auth.form.loggingIn') : t('auth.form.login')}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.form.firstName')}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={t('auth.form.firstNamePlaceholder')}
                                    className="h-12"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t('auth.form.lastName')}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={t('auth.form.lastNamePlaceholder')}
                                    className="h-12"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.form.email')}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder={t('auth.form.emailPlaceholder')}
                                  className="h-12"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.form.password')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? 'text' : 'password'} 
                                    placeholder={t('auth.form.passwordPlaceholder')}
                                    className="h-12 pr-10"
                                    {...field} 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.form.role')}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
                                    <SelectValue placeholder={t('auth.form.selectRole')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(['seller', 'buyer', 'agent', 'nbfc'] as const).map((role) => {
                                    const Icon = roleIcons[role];
                                    return (
                                      <SelectItem key={role} value={role}>
                                        <div className="flex items-center">
                                          <Icon className="h-4 w-4 mr-2" />
                                          <div>
                                            <div className="font-medium">{t(`auth.roles.${role}.title`)}</div>
                                            <div className="text-sm text-gray-500">{getRoleDescription(role)}</div>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? t('auth.form.registering') : t('auth.form.register')}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </form>
                    </Form>
                  )}

                  <div className="text-center">
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {isLogin ? t('auth.form.needAccount') : t('auth.form.haveAccount')}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500">
            <p>&copy; {currentYear} MSMESquare. {t('footer.rights')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}