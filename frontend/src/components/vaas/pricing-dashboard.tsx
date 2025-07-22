import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  Building, 
  CreditCard, 
  Target,
  BarChart3,
  Lock,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { apiRequest } from '@/lib/api-client';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  features: string[];
  reportFormat: string;
  targetUser: string;
  popular?: boolean;
}

interface NetworkMetrics {
  totalMSMEs: number;
  avgConfidence: string;
  networkGrowth: string;
  defenseScore: string;
}

export function VaaSPricingDashboard() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    try {
      const [pricingResponse, analyticsResponse] = await Promise.all([
        apiRequest('/api/vaas/pricing'),
        apiRequest('/api/vaas/analytics')
      ]);

      setTiers(pricingResponse.tiers);
      setNetworkMetrics(analyticsResponse.networkEffect);
    } catch (error) {
      console.error('Failed to load pricing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierIcon = (targetUser: string) => {
    const icons = {
      'msme': Building,
      'buyer': Users,
      'agent': Target,
      'nbfc': CreditCard
    };
    return icons[targetUser as keyof typeof icons] || Building;
  };

  const getTierColor = (targetUser: string) => {
    const colors = {
      'msme': 'bg-blue-100 text-blue-800',
      'buyer': 'bg-green-100 text-green-800',
      'agent': 'bg-orange-100 text-orange-800',
      'nbfc': 'bg-purple-100 text-purple-800'
    };
    return colors[targetUser as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">VaaS - Valuation-as-a-Service</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          More MSMEs → Better Data → Higher Trust → Defensible Pricing
        </p>
        
        {/* Network Effect Metrics */}
        {networkMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{networkMetrics.totalMSMEs}</div>
                <div className="text-sm text-muted-foreground">Total MSMEs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{networkMetrics.avgConfidence}</div>
                <div className="text-sm text-muted-foreground">Avg Confidence</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{networkMetrics.networkGrowth}</div>
                <div className="text-sm text-muted-foreground">Network Growth</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span className="text-lg font-bold text-purple-600">{networkMetrics.defenseScore}</span>
                </div>
                <div className="text-sm text-muted-foreground">IP Defense</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const Icon = getTierIcon(tier.targetUser);
          const isPopular = tier.id === 'buyer-diligence' || tier.id === 'nbfc-saas';
          
          return (
            <Card key={tier.id} className={`relative ${isPopular ? 'ring-2 ring-blue-500' : ''}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {tier.name}
                </CardTitle>
                <CardDescription>
                  <Badge className={getTierColor(tier.targetUser)}>
                    {tier.targetUser.toUpperCase()}
                  </Badge>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">₹{tier.price.toLocaleString()}</span>
                    {tier.id === 'api-per-call' && (
                      <span className="text-sm text-muted-foreground">per call</span>
                    )}
                    {tier.id === 'nbfc-saas' && (
                      <span className="text-sm text-muted-foreground">per month</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {tier.reportFormat} report format
                  </div>
                </div>
                
                <ul className="space-y-2">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => setSelectedTier(tier)}
                >
                  {tier.price === 0 ? 'Get Started' : 'Choose Plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* IP Defensibility Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            IP-Defensible Valuation Engine
          </CardTitle>
          <CardDescription>
            Our proprietary algorithms create a defensible moat around your valuation business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                IP Components
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">ML Engine (XGBoost + CatBoost)</span>
                  <Badge variant="outline">Protected</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Factor Scoring Algorithm</span>
                  <Badge variant="outline">Proprietary</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Dynamic Market Adjustments</span>
                  <Badge variant="outline">Confidential</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Valuation Ledger System</span>
                  <Badge variant="outline">Auditable</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Network Effect Benefits
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Progress value={85} className="flex-1" />
                  <span className="text-sm">Data Quality: 85%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={92} className="flex-1" />
                  <span className="text-sm">Model Accuracy: 92%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={78} className="flex-1" />
                  <span className="text-sm">Trust Score: 78%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={94} className="flex-1" />
                  <span className="text-sm">IP Defense: 94%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">₹199-₹499</div>
              <div className="text-sm text-muted-foreground">MSME Self-Valuation</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">₹999+</div>
              <div className="text-sm text-muted-foreground">Buyer Due Diligence</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">Commission</div>
              <div className="text-sm text-muted-foreground">Agent Revenue Share</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">₹5-₹10</div>
              <div className="text-sm text-muted-foreground">Per API Call</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Build Your Valuation Moat?</h2>
          <p className="text-blue-100 mb-6">
            Join the network effect. More data = Better models = Higher trust = Defensible pricing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
              Schedule Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}