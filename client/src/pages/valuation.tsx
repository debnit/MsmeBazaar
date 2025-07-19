import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Calculator,
  TrendingUp,
  DollarSign,
  FileText,
  BarChart3,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  PieChart,
  Calendar,
  MapPin,
  Users,
  Award,
  AlertTriangle,
  Info,
  Download,
  Share2,
} from 'lucide-react';

// Validation schema for valuation form
const valuationSchema = z.object({
  // Business Information
  businessName: z.string().min(2, 'Business name is required'),
  industry: z.string().min(1, 'Please select an industry'),
  businessType: z.enum(['manufacturing', 'trading', 'service', 'retail', 'other']),
  foundedYear: z.number().min(1900).max(new Date().getFullYear()),
  location: z.string().min(2, 'Location is required'),

  // Financial Information
  annualRevenue: z.number().min(0, 'Annual revenue must be positive'),
  monthlyProfit: z.number().min(0, 'Monthly profit must be positive'),
  totalAssets: z.number().min(0, 'Total assets must be positive'),
  totalLiabilities: z.number().min(0, 'Total liabilities must be positive'),

  // Operational Details
  employeeCount: z.number().min(1, 'Employee count must be at least 1'),
  customerBase: z.number().min(0, 'Customer base must be positive'),
  marketPresence: z.enum(['local', 'regional', 'national', 'international']),

  // Growth Metrics
  revenueGrowth: z.number().min(-100).max(1000),
  profitMargin: z.number().min(0).max(100),

  // Additional Information
  uniqueSellingPoints: z.string().optional(),
  majorClients: z.string().optional(),
  competitiveAdvantages: z.string().optional(),
});

type ValuationFormData = z.infer<typeof valuationSchema>;

interface ValuationResult {
  estimatedValue: number;
  confidence: number;
  valuation_multiple: number;
  risk_score: number;
  growth_potential: number;
  market_position: number;
  recommendation: 'undervalued' | 'fairly_valued' | 'overvalued';
  factors: {
    financial_health: number;
    market_position: number;
    growth_prospects: number;
    operational_efficiency: number;
  };
  comparables: {
    industry_average: number;
    size_peer_average: number;
    location_average: number;
  };
  sensitivity_analysis: {
    best_case: number;
    worst_case: number;
    most_likely: number;
  };
}

const FORM_STEPS = [
  {
    id: 1,
    title: 'Business Details',
    description: 'Basic information about your business',
    icon: Building2,
  },
  {
    id: 2,
    title: 'Financial Information',
    description: 'Revenue, profit, and financial metrics',
    icon: DollarSign,
  },
  {
    id: 3,
    title: 'Operations & Growth',
    description: 'Team size, customers, and growth metrics',
    icon: TrendingUp,
  },
  {
    id: 4,
    title: 'Valuation Result',
    description: 'AI-powered business valuation',
    icon: Target,
  },
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

export default function ValuationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
  const { toast } = useToast();

  const form = useForm<ValuationFormData>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      businessType: 'manufacturing',
      marketPresence: 'local',
      foundedYear: new Date().getFullYear() - 5,
      revenueGrowth: 10,
      profitMargin: 15,
    },
  });

  const handleNextStep = async (data: Partial<ValuationFormData>) => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3) {
      // Calculate valuation
      setIsCalculating(true);

      try {
        const response = await fetch('/api/valuation/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const result = await response.json();
          setValuationResult(result);
          setCurrentStep(4);
          toast({
            title: 'Valuation Complete!',
            description: 'Your business valuation has been calculated successfully.',
          });
        } else {
          throw new Error('Valuation calculation failed');
        }
      } catch (error) {
        toast({
          title: 'Calculation Error',
          description: 'Failed to calculate valuation. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsCalculating(false);
      }
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / FORM_STEPS.length) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
    case 'undervalued': return 'text-green-600 bg-green-50 border-green-200';
    case 'overvalued': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <Badge variant="secondary" className="text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Valuation
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900">Business Valuation</h1>
            <p className="text-lg text-gray-600">
              Get an accurate, AI-powered valuation of your business in minutes
            </p>
          </motion.div>
        </div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep} of {FORM_STEPS.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />

          <div className="flex justify-between">
            {FORM_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                        ${isCompleted
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-gray-300 text-gray-400'
                }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < FORM_STEPS.length - 1 && (
                    <div
                      className={`
                        h-0.5 w-24 mx-4 transition-colors
                        ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Form Content */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {FORM_STEPS[currentStep - 1]?.title}
            </CardTitle>
            <CardDescription>
              {FORM_STEPS[currentStep - 1]?.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Business Details */}
              {currentStep === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  onSubmit={form.handleSubmit(handleNextStep)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        {...form.register('businessName')}
                        placeholder="Enter your business name"
                      />
                      {form.formState.errors.businessName && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.businessName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select {...form.register('industry')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.industry && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.industry.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select {...form.register('businessType')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="trading">Trading</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="foundedYear">Founded Year</Label>
                      <Input
                        id="foundedYear"
                        type="number"
                        {...form.register('foundedYear', { valueAsNumber: true })}
                        placeholder="2019"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="location">Business Location</Label>
                      <Input
                        id="location"
                        {...form.register('location')}
                        placeholder="City, State"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="min-w-32">
                      Next Step
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {/* Step 2: Financial Information */}
              {currentStep === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  onSubmit={form.handleSubmit(handleNextStep)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="annualRevenue">Annual Revenue (₹)</Label>
                      <Input
                        id="annualRevenue"
                        type="number"
                        {...form.register('annualRevenue', { valueAsNumber: true })}
                        placeholder="5000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyProfit">Monthly Profit (₹)</Label>
                      <Input
                        id="monthlyProfit"
                        type="number"
                        {...form.register('monthlyProfit', { valueAsNumber: true })}
                        placeholder="200000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalAssets">Total Assets (₹)</Label>
                      <Input
                        id="totalAssets"
                        type="number"
                        {...form.register('totalAssets', { valueAsNumber: true })}
                        placeholder="2000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalLiabilities">Total Liabilities (₹)</Label>
                      <Input
                        id="totalLiabilities"
                        type="number"
                        {...form.register('totalLiabilities', { valueAsNumber: true })}
                        placeholder="500000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="revenueGrowth">Revenue Growth (%)</Label>
                      <Input
                        id="revenueGrowth"
                        type="number"
                        {...form.register('revenueGrowth', { valueAsNumber: true })}
                        placeholder="15"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profitMargin">Profit Margin (%)</Label>
                      <Input
                        id="profitMargin"
                        type="number"
                        {...form.register('profitMargin', { valueAsNumber: true })}
                        placeholder="12"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={goBack}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button type="submit" className="min-w-32">
                      Next Step
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {/* Step 3: Operations & Growth */}
              {currentStep === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  onSubmit={form.handleSubmit(handleNextStep)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="employeeCount">Number of Employees</Label>
                      <Input
                        id="employeeCount"
                        type="number"
                        {...form.register('employeeCount', { valueAsNumber: true })}
                        placeholder="25"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerBase">Customer Base Size</Label>
                      <Input
                        id="customerBase"
                        type="number"
                        {...form.register('customerBase', { valueAsNumber: true })}
                        placeholder="500"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="marketPresence">Market Presence</Label>
                      <Select {...form.register('marketPresence')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="regional">Regional</SelectItem>
                          <SelectItem value="national">National</SelectItem>
                          <SelectItem value="international">International</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="uniqueSellingPoints">Unique Selling Points</Label>
                      <Textarea
                        id="uniqueSellingPoints"
                        {...form.register('uniqueSellingPoints')}
                        placeholder="What makes your business unique?"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="competitiveAdvantages">Competitive Advantages</Label>
                      <Textarea
                        id="competitiveAdvantages"
                        {...form.register('competitiveAdvantages')}
                        placeholder="Your key competitive advantages"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={goBack}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <Button type="submit" disabled={isCalculating} className="min-w-32">
                      {isCalculating ? (
                        <>
                          <Calculator className="w-4 h-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          Calculate Valuation
                          <Target className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}

              {/* Step 4: Valuation Results */}
              {currentStep === 4 && valuationResult && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Main Valuation Card */}
                  <div className="text-center space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                    >
                      <Target className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-900">Business Valuation</h3>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-2"
                    >
                      <p className="text-4xl font-bold text-blue-600">
                        {formatCurrency(valuationResult.estimatedValue)}
                      </p>
                      <div className="flex items-center justify-center space-x-4">
                        <Badge variant="outline" className="text-sm">
                          Confidence: {Math.round(valuationResult.confidence * 100)}%
                        </Badge>
                        <Badge className={getRecommendationColor(valuationResult.recommendation)}>
                          {valuationResult.recommendation.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </motion.div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Valuation Factors */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2" />
                          Valuation Factors
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(valuationResult.factors).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium capitalize">
                                {key.replace('_', ' ')}
                              </span>
                              <span className="text-sm font-bold">
                                {Math.round(value * 100)}%
                              </span>
                            </div>
                            <Progress value={value * 100} className="h-2" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Market Comparables */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <PieChart className="w-5 h-5 mr-2" />
                          Market Comparables
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(valuationResult.comparables).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-sm font-medium capitalize">
                              {key.replace('_', ' ')}
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(value)}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sensitivity Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Sensitivity Analysis
                      </CardTitle>
                      <CardDescription>
                        Valuation under different scenarios
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-red-800">Worst Case</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(valuationResult.sensitivity_analysis.worst_case)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-blue-800">Most Likely</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(valuationResult.sensitivity_analysis.most_likely)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-green-800">Best Case</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(valuationResult.sensitivity_analysis.best_case)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-4">
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                    <Button variant="outline">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Results
                    </Button>
                    <Button onClick={() => window.location.reload()}>
                      New Valuation
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
