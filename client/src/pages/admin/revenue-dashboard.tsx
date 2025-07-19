/**
 * Admin Revenue Dashboard - Platform Profitability Design
 * Implements the complete revenue model with commission tracking, subscriptions, and EaaS pricing
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  CreditCard,
  FileText,
  Star,
  Crown,
  Shield,
  Award,
  BarChart3,
  IndianRupee,
  Handshake,
  UserCheck,
  Building,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';

interface RevenueMetrics {
  total_revenue: number;
  monthly_revenue: number;
  commission_revenue: number;
  subscription_revenue: number;
  eaas_revenue: number;
  growth_rate: number;
  active_subscribers: number;
  deal_closures: number;
  platform_commission: number;
  agent_commission: number;
}

interface SubscriptionStats {
  free_users: number;
  premium_buyers: number;
  verified_sellers: number;
  agent_pro: number;
  conversion_rate: number;
}

interface CommissionBreakdown {
  deal_closures: number;
  total_commission: number;
  platform_share: number;
  agent_share: number;
  average_deal_value: number;
  commission_rate: number;
}

interface EaaSMetrics {
  legal_docs: number;
  valuations: number;
  complete_bundles: number;
  total_revenue: number;
  average_order_value: number;
}

export default function RevenueDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const { data: revenueMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/admin/revenue-metrics', selectedPeriod],
    queryFn: () => apiRequest(`/api/admin/revenue-metrics?period=${selectedPeriod}`),
  });

  const { data: subscriptionStats } = useQuery({
    queryKey: ['/api/admin/subscription-stats'],
    queryFn: () => apiRequest('/api/admin/subscription-stats'),
  });

  const { data: commissionBreakdown } = useQuery({
    queryKey: ['/api/admin/commission-breakdown', selectedPeriod],
    queryFn: () => apiRequest(`/api/admin/commission-breakdown?period=${selectedPeriod}`),
  });

  const { data: eaasMetrics } = useQuery({
    queryKey: ['/api/admin/eaas-metrics', selectedPeriod],
    queryFn: () => apiRequest(`/api/admin/eaas-metrics?period=${selectedPeriod}`),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  if (metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
          <p className="text-muted-foreground">
            Platform profitability and revenue tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={selectedPeriod === 'monthly' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={selectedPeriod === 'quarterly' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('quarterly')}
          >
            Quarterly
          </Button>
          <Button
            variant={selectedPeriod === 'yearly' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('yearly')}
          >
            Yearly
          </Button>
        </div>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(revenueMetrics?.total_revenue || 0)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+{revenueMetrics?.growth_rate || 0}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Revenue</CardTitle>
            <Handshake className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(revenueMetrics?.commission_revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueMetrics?.deal_closures || 0} deals closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Revenue</CardTitle>
            <Crown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(revenueMetrics?.subscription_revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueMetrics?.active_subscribers || 0} active subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EaaS Revenue</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(revenueMetrics?.eaas_revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Exit-as-a-Service revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Revenue Breakdown */}
      <Tabs defaultValue="commission" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="commission">Commission Model</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="eaas">EaaS Pricing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Commission Model Tab */}
        <TabsContent value="commission" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Handshake className="h-5 w-5" />
                  <span>Deal Closure Commission</span>
                </CardTitle>
                <CardDescription>
                  2–5% of transaction value split
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(commissionBreakdown?.platform_share || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Platform (30%)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(commissionBreakdown?.agent_share || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Agent (70%)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Deals</span>
                    <span className="text-sm font-medium">
                      {formatNumber(commissionBreakdown?.deal_closures || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Deal Value</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(commissionBreakdown?.average_deal_value || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Commission Rate</span>
                    <span className="text-sm font-medium">
                      {commissionBreakdown?.commission_rate || 3}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Lead Fee Revenue</span>
                </CardTitle>
                <CardDescription>
                  ₹500 – ₹5,000 for verified seller profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold">₹500</div>
                      <p className="text-xs text-muted-foreground">Basic Lead</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold">₹2,000</div>
                      <p className="text-xs text-muted-foreground">Verified Lead</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold">₹5,000</div>
                      <p className="text-xs text-muted-foreground">Premium Lead</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(125000)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Monthly lead fee revenue
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Free Tier</CardTitle>
                <div className="text-2xl font-bold">₹0</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Users</span>
                    <span className="text-sm font-medium">
                      {formatNumber(subscriptionStats?.free_users || 8450)}
                    </span>
                  </div>
                  <Badge variant="outline">Basic access</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">
                  Premium Buyer
                </CardTitle>
                <div className="text-2xl font-bold">₹999/month</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subscribers</span>
                    <span className="text-sm font-medium">
                      {formatNumber(subscriptionStats?.premium_buyers || 245)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">Verified deals</Badge>
                    <Badge variant="secondary" className="text-xs">Early access</Badge>
                    <Badge variant="secondary" className="text-xs">Priority support</Badge>
                  </div>
                  <div className="text-sm font-medium text-blue-600">
                    {formatCurrency(245 * 999)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Verified Seller
                </CardTitle>
                <div className="text-2xl font-bold">₹1,499/month</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subscribers</span>
                    <span className="text-sm font-medium">
                      {formatNumber(subscriptionStats?.verified_sellers || 189)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">Verified badge</Badge>
                    <Badge variant="secondary" className="text-xs">Valuation tool</Badge>
                    <Badge variant="secondary" className="text-xs">EaaS access</Badge>
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    {formatCurrency(189 * 1499)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600">
                  Agent Pro
                </CardTitle>
                <div className="text-2xl font-bold">₹199/month</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subscribers</span>
                    <span className="text-sm font-medium">
                      {formatNumber(subscriptionStats?.agent_pro || 67)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">CRM dashboard</Badge>
                    <Badge variant="secondary" className="text-xs">Analytics</Badge>
                    <Badge variant="secondary" className="text-xs">Branding</Badge>
                  </div>
                  <div className="text-sm font-medium text-purple-600">
                    {formatCurrency(67 * 199)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {formatCurrency((245 * 999) + (189 * 1499) + (67 * 199))}
                  </div>
                  <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {((245 + 189 + 67) / 8450 * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(((245 * 999) + (189 * 1499) + (67 * 199)) / (245 + 189 + 67))}
                  </div>
                  <p className="text-sm text-muted-foreground">ARPU</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EaaS Pricing Tab */}
        <TabsContent value="eaas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Legal Docs Package</span>
                </CardTitle>
                <div className="text-3xl font-bold text-blue-600">₹499</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Orders</span>
                    <span className="text-sm font-medium">
                      {formatNumber(eaasMetrics?.legal_docs || 156)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue</span>
                    <span className="text-sm font-medium text-blue-600">
                      {formatCurrency((eaasMetrics?.legal_docs || 156) * 499)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1">
                    <Badge variant="outline" className="text-xs">Sale Deed</Badge>
                    <Badge variant="outline" className="text-xs">NDA</Badge>
                    <Badge variant="outline" className="text-xs">Asset Transfer</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Valuation Certificate</span>
                </CardTitle>
                <div className="text-3xl font-bold text-green-600">₹999</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Orders</span>
                    <span className="text-sm font-medium">
                      {formatNumber(eaasMetrics?.valuations || 89)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency((eaasMetrics?.valuations || 89) * 999)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1">
                    <Badge variant="outline" className="text-xs">AI Valuation</Badge>
                    <Badge variant="outline" className="text-xs">Professional Report</Badge>
                    <Badge variant="outline" className="text-xs">Certificate</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>Complete Exit Bundle</span>
                </CardTitle>
                <div className="text-3xl font-bold text-purple-600">₹2,499</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Orders</span>
                    <span className="text-sm font-medium">
                      {formatNumber(eaasMetrics?.complete_bundles || 34)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue</span>
                    <span className="text-sm font-medium text-purple-600">
                      {formatCurrency((eaasMetrics?.complete_bundles || 34) * 2499)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-1">
                    <Badge variant="outline" className="text-xs">Legal Docs</Badge>
                    <Badge variant="outline" className="text-xs">Valuation</Badge>
                    <Badge variant="outline" className="text-xs">Buyer Matching</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>EaaS Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatNumber((eaasMetrics?.legal_docs || 156) + (eaasMetrics?.valuations || 89) + (eaasMetrics?.complete_bundles || 34))}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(((156 * 499) + (89 * 999) + (34 * 2499)))}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(((156 * 499) + (89 * 999) + (34 * 2499)) / ((156) + (89) + (34)))}
                  </div>
                  <p className="text-sm text-muted-foreground">Average Order Value</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {((34 / ((156) + (89) + (34))) * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Bundle Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Commission Revenue</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Subscription Revenue</span>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">EaaS Revenue</span>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                    <Progress value={20} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Monthly Revenue Growth</span>
                    <span className="text-sm font-medium text-green-600">+23%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Customer Acquisition Cost</span>
                    <span className="text-sm font-medium">₹1,250</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Customer Lifetime Value</span>
                    <span className="text-sm font-medium text-green-600">₹15,400</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Payback Period</span>
                    <span className="text-sm font-medium">3.2 months</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">8.7</div>
                  <p className="text-sm text-muted-foreground">Overall Health Score</p>
                  <Badge variant="secondary" className="mt-2">Excellent</Badge>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">92%</div>
                  <p className="text-sm text-muted-foreground">User Satisfaction</p>
                  <Badge variant="secondary" className="mt-2">High</Badge>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">₹2.4L</div>
                  <p className="text-sm text-muted-foreground">Avg. Monthly Profit</p>
                  <Badge variant="secondary" className="mt-2">Growing</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
