import React, { useState } from 'react';
import { VaaSPricingDashboard } from '@/components/vaas/pricing-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  Shield,
  TrendingUp,
  Users,
  Building,
  Lock,
  Sparkles,
  Crown,
  BarChart3,
  Zap,
} from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

export function VaaSDemoPage() {
  const [msmeData, setMsmeData] = useState({
    companyName: 'TechStart Solutions',
    industry: 'technology',
    annualTurnover: 5000000,
    netProfit: 750000,
    totalAssets: 2500000,
    totalLiabilities: 1000000,
    employeeCount: 25,
    establishedYear: 2020,
    city: 'Bangalore',
    state: 'Karnataka',
    isDistressed: false,
    growthRate: 0.25,
  });

  const [quote, setQuote] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  const handleGetQuote = async () => {
    setIsCalculating(true);
    try {
      const response = await apiRequest('/api/vaas/quote', {
        method: 'POST',
        body: JSON.stringify({ msmeData, valuationType: 'standard' }),
      });
      setQuote(response.quote);
      toast({
        title: 'Quote Generated',
        description: 'Valuation quote calculated successfully',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Quote Failed',
        description: 'Unable to generate quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setMsmeData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <h1 className="text-4xl font-bold">VaaS - Valuation-as-a-Service</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Build a defensible IP moat through network effects. More MSMEs → Better data → Higher trust → Premium pricing
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Badge className="bg-blue-100 text-blue-800 px-4 py-2">
            <Shield className="h-4 w-4 mr-2" />
            IP Defensible
          </Badge>
          <Badge className="bg-green-100 text-green-800 px-4 py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            Network Effect
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 px-4 py-2">
            <Crown className="h-4 w-4 mr-2" />
            Premium Pricing
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="demo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Tiers</TabsTrigger>
          <TabsTrigger value="ip-defense">IP Defense</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  MSME Valuation Input
                </CardTitle>
                <CardDescription>
                  Enter company details for IP-defensible valuation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={msmeData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={msmeData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="annualTurnover">Annual Turnover (₹)</Label>
                    <Input
                      id="annualTurnover"
                      type="number"
                      value={msmeData.annualTurnover}
                      onChange={(e) => handleInputChange('annualTurnover', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="netProfit">Net Profit (₹)</Label>
                    <Input
                      id="netProfit"
                      type="number"
                      value={msmeData.netProfit}
                      onChange={(e) => handleInputChange('netProfit', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAssets">Total Assets (₹)</Label>
                    <Input
                      id="totalAssets"
                      type="number"
                      value={msmeData.totalAssets}
                      onChange={(e) => handleInputChange('totalAssets', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeCount">Employee Count</Label>
                    <Input
                      id="employeeCount"
                      type="number"
                      value={msmeData.employeeCount}
                      onChange={(e) => handleInputChange('employeeCount', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGetQuote}
                  disabled={isCalculating}
                  className="w-full"
                  size="lg"
                >
                  {isCalculating ? 'Calculating...' : 'Get Valuation Quote'}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Valuation Results
                </CardTitle>
                <CardDescription>
                  IP-defensible valuation with confidence scoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quote ? (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        ₹{quote.finalPrice.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {quote.tier.name} - {quote.reportFormat} format
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-lg font-semibold text-green-600">
                          {quote.networkBonus > 0 ? `+₹${quote.networkBonus}` : 'Standard'}
                        </div>
                        <div className="text-xs text-muted-foreground">Network Bonus</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-lg font-semibold text-orange-600">
                          {quote.discounts.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Discounts Applied</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold">Features Included:</h4>
                      <ul className="space-y-1">
                        {quote.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button className="w-full" variant="outline">
                      Generate Full Report
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter company details and click "Get Valuation Quote" to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <VaaSPricingDashboard />
        </TabsContent>

        <TabsContent value="ip-defense" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                IP-Defensible Components
              </CardTitle>
              <CardDescription>
                How our proprietary technology creates a defensible moat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">ML Engine</h3>
                      <p className="text-sm text-muted-foreground">
                        XGBoost + CatBoost trained on proprietary MSME deal data
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Factor Scoring</h3>
                      <p className="text-sm text-muted-foreground">
                        Revenue multiples, asset values, industry factors - all customizable
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Dynamic Adjustments</h3>
                      <p className="text-sm text-muted-foreground">
                        Learns from deal patterns and market signals
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">PDF Reports</h3>
                      <p className="text-sm text-muted-foreground">
                        Instantly generated, branded, monetizable IP artifacts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Lock className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Valuation Ledger</h3>
                      <p className="text-sm text-muted-foreground">
                        Immutable record of all valuations with version control
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Network Effect</h3>
                      <p className="text-sm text-muted-foreground">
                        More users = better models = higher trust = premium pricing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Potential</CardTitle>
              <CardDescription>
                Projected revenue streams from VaaS implementation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">₹12L</div>
                  <div className="text-sm text-muted-foreground">Monthly from MSMEs</div>
                  <div className="text-xs text-gray-500">600 × ₹199 avg</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₹8L</div>
                  <div className="text-sm text-muted-foreground">Monthly from Buyers</div>
                  <div className="text-xs text-gray-500">80 × ₹999 avg</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">₹15L</div>
                  <div className="text-sm text-muted-foreground">Monthly from NBFCs</div>
                  <div className="text-xs text-gray-500">30 × ₹5000 SaaS</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">₹6L</div>
                  <div className="text-sm text-muted-foreground">Monthly from API</div>
                  <div className="text-xs text-gray-500">6000 × ₹10 calls</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <div className="text-3xl font-bold text-gray-900">₹41L / month</div>
                <div className="text-sm text-muted-foreground">Total Monthly Revenue Potential</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
