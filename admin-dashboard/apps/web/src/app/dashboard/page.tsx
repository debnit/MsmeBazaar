'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  Building, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line
} from 'recharts'

import { useAuthStore } from '@/stores/auth'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { StatsCard } from '@/components/dashboard/stats-card'
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { QuickActions } from '@/components/dashboard/quick-actions'

// Mock data - replace with actual API calls
const STATS_DATA = [
  {
    title: 'Total MSMEs',
    value: '2,847',
    change: '+12%',
    trend: 'up' as const,
    icon: Building,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    title: 'Active Deals',
    value: '156',
    change: '+8%',
    trend: 'up' as const,
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Deal Value',
    value: '₹24.5Cr',
    change: '+23%',
    trend: 'up' as const,
    icon: DollarSign,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    title: 'Conversion Rate',
    value: '68%',
    change: '-2%',
    trend: 'down' as const,
    icon: Activity,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  }
]

const CHART_DATA = [
  { month: 'Jan', msmes: 120, deals: 45, revenue: 180000 },
  { month: 'Feb', msmes: 135, deals: 52, revenue: 210000 },
  { month: 'Mar', msmes: 150, deals: 68, revenue: 275000 },
  { month: 'Apr', msmes: 180, deals: 89, revenue: 356000 },
  { month: 'May', msmes: 210, deals: 112, revenue: 448000 },
  { month: 'Jun', msmes: 240, deals: 134, revenue: 536000 }
]

const DEAL_PIPELINE_DATA = [
  { name: 'New Leads', value: 45, color: '#3b82f6' },
  { name: 'Contacted', value: 32, color: '#10b981' },
  { name: 'Negotiation', value: 28, color: '#f59e0b' },
  { name: 'Due Diligence', value: 15, color: '#ef4444' },
  { name: 'Closed', value: 12, color: '#8b5cf6' }
]

const RECENT_ACTIVITIES = [
  {
    id: '1',
    type: 'msme_added',
    title: 'New MSME Added',
    description: 'Kumar Manufacturing Pvt Ltd added to database',
    user: 'Rajesh Patel',
    timestamp: '2 hours ago',
    icon: Building
  },
  {
    id: '2',
    type: 'deal_updated',
    title: 'Deal Status Updated',
    description: 'Sharma Textiles deal moved to negotiation',
    user: 'Priya Singh',
    timestamp: '4 hours ago',
    icon: TrendingUp
  },
  {
    id: '3',
    type: 'valuation_completed',
    title: 'Valuation Completed',
    description: 'TechInnovate Solutions valued at ₹1.5Cr',
    user: 'CA Suresh Gupta',
    timestamp: '6 hours ago',
    icon: CheckCircle
  },
  {
    id: '4',
    type: 'user_invited',
    title: 'New User Invited',
    description: 'Field agent invited to Mumbai region',
    user: 'Admin',
    timestamp: '1 day ago',
    icon: Users
  }
]

export default function DashboardPage() {
  const { user, organization, checkPermission } = useAuthStore()
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [isLoading, setIsLoading] = useState(false)

  // Refresh dashboard data
  const refreshData = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  if (!user || !organization) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.firstName}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your {organization.name} operations
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={refreshData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {checkPermission('analytics:export') && (
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Quick Add
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS_DATA.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatsCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Dashboard Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="msmes">MSMEs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Growth Chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Growth Overview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      {selectedPeriod}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={CHART_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? `₹${(value / 100000).toFixed(1)}L` : value,
                          name === 'msmes' ? 'MSMEs' : name === 'deals' ? 'Deals' : 'Revenue'
                        ]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="msmes" 
                        stackId="1"
                        stroke="#3b82f6" 
                        fill="#3b82f6"
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="deals" 
                        stackId="1"
                        stroke="#10b981" 
                        fill="#10b981"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Deal Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Deal Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie
                        data={DEAL_PIPELINE_DATA}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {DEAL_PIPELINE_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-2 mt-4">
                    {DEAL_PIPELINE_DATA.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <RecentActivity activities={RECENT_ACTIVITIES} />
          </TabsContent>

          <TabsContent value="deals" className="space-y-6">
            <KanbanBoard />
          </TabsContent>

          <TabsContent value="msmes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>MSME Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage your MSME database, verification status, and valuations
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">MSME Management</h3>
                  <p className="text-muted-foreground mb-4">
                    View and manage your MSME database
                  </p>
                  <Button>
                    <Eye className="w-4 h-4 mr-2" />
                    View All MSMEs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={CHART_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`} />
                      <Tooltip 
                        formatter={(value: number) => [`₹${(value / 100000).toFixed(1)}L`, 'Revenue']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Deal Conversion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={CHART_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="deals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Subscription Status (if not enterprise) */}
        {organization.plan !== 'enterprise' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-900">
                        {organization.subscriptionStatus === 'trialing' ? 'Trial Period' : 'Subscription Status'}
                      </h3>
                      <p className="text-sm text-orange-700">
                        {organization.subscriptionStatus === 'trialing' 
                          ? `Your trial ends on ${new Date(organization.trialEndsAt!).toLocaleDateString()}`
                          : `Current plan: ${organization.plan.charAt(0).toUpperCase() + organization.plan.slice(1)}`
                        }
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}