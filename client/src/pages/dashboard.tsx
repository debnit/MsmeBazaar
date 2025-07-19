import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  DollarSign,
  Eye,
  Plus,
  ArrowUpRight,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  Target,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalListings: number;
  listingsChange: number;
  totalViews: number;
  viewsChange: number;
  totalInquiries: number;
  inquiriesChange: number;
}

interface Activity {
  id: string;
  type: 'listing' | 'inquiry' | 'valuation' | 'payment' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  status?: 'pending' | 'completed' | 'failed';
  amount?: number;
}

const QUICK_ACTIONS = [
  {
    id: 'add-listing',
    title: 'Add New Listing',
    description: 'Showcase your products or services',
    icon: Plus,
    href: '/seller/listing-form',
    color: 'blue',
  },
  {
    id: 'view-analytics',
    title: 'View Analytics',
    description: 'Track your business performance',
    icon: BarChart3,
    href: '/analytics',
    color: 'green',
  },
  {
    id: 'get-valuation',
    title: 'Get Valuation',
    description: 'Know your business worth',
    icon: Target,
    href: '/valuation',
    color: 'purple',
  },
  {
    id: 'explore-financing',
    title: 'Explore Financing',
    description: 'Access loans and credit',
    icon: DollarSign,
    href: '/financing',
    color: 'orange',
  },
];

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    retry: false,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/dashboard/activities'],
    retry: false,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['/api/dashboard/recommendations'],
    retry: false,
  });

  const getStatChangeIcon = (change: number) => {
    return change >= 0 ? TrendingUp : TrendingDown;
  };

  const getStatChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
    case 'listing': return Building2;
    case 'inquiry': return Users;
    case 'valuation': return Target;
    case 'payment': return DollarSign;
    case 'achievement': return Star;
    default: return Activity;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
    case 'listing': return 'text-blue-600 bg-blue-50';
    case 'inquiry': return 'text-green-600 bg-green-50';
    case 'valuation': return 'text-purple-600 bg-purple-50';
    case 'payment': return 'text-orange-600 bg-orange-50';
    case 'achievement': return 'text-yellow-600 bg-yellow-50';
    default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: Activity['status']) => {
    switch (status) {
    case 'completed': return CheckCircle2;
    case 'pending': return Clock;
    case 'failed': return AlertCircle;
    default: return Activity;
    }
  };

  const getStatusColor = (status: Activity['status']) => {
    switch (status) {
    case 'completed': return 'text-green-600';
    case 'pending': return 'text-yellow-600';
    case 'failed': return 'text-red-600';
    default: return 'text-gray-600';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's what's happening with your business.
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Listing
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Total Revenue',
              value: stats?.totalRevenue || 0,
              change: stats?.revenueChange || 0,
              icon: DollarSign,
              format: (val: number) => `₹${val.toLocaleString()}`,
            },
            {
              title: 'Active Listings',
              value: stats?.totalListings || 0,
              change: stats?.listingsChange || 0,
              icon: Building2,
              format: (val: number) => val.toString(),
            },
            {
              title: 'Profile Views',
              value: stats?.totalViews || 0,
              change: stats?.viewsChange || 0,
              icon: Eye,
              format: (val: number) => val.toLocaleString(),
            },
            {
              title: 'Inquiries',
              value: stats?.totalInquiries || 0,
              change: stats?.inquiriesChange || 0,
              icon: Users,
              format: (val: number) => val.toString(),
            },
          ].map((stat, index) => {
            const Icon = stat.icon;
            const ChangeIcon = getStatChangeIcon(stat.change);
            const changeColor = getStatChangeColor(stat.change);

            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statsLoading ? '...' : stat.format(stat.value)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-full">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className={`flex items-center mt-4 text-sm ${changeColor}`}>
                      <ChangeIcon className="w-4 h-4 mr-1" />
                      <span className="font-medium">
                        {Math.abs(stat.change)}%
                      </span>
                      <span className="text-gray-600 ml-1">vs last month</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks to grow your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {QUICK_ACTIONS.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                      >
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
                          <div className="flex items-start space-x-4">
                            <div className={`
                              p-2 rounded-lg
                              ${action.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                              ${action.color === 'green' ? 'bg-green-50 text-green-600' : ''}
                              ${action.color === 'purple' ? 'bg-purple-50 text-purple-600' : ''}
                              ${action.color === 'orange' ? 'bg-orange-50 text-orange-600' : ''}
                            `}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {action.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {action.description}
                              </p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
                <CardDescription>Your business metrics at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Profile Completion</span>
                    <span className="text-sm font-bold text-gray-900">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Listing Quality</span>
                    <span className="text-sm font-bold text-gray-900">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Response Rate</span>
                    <span className="text-sm font-bold text-gray-900">78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Detailed Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates on your business
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.slice(0, 5).map((activity, index) => {
                    const Icon = getActivityIcon(activity.type);
                    const StatusIcon = getStatusIcon(activity.status);
                    const activityColor = getActivityColor(activity.type);
                    const statusColor = getStatusColor(activity.status);

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${activityColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.title}
                            </p>
                            {activity.status && (
                              <div className="flex items-center ml-2">
                                <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">
                              {activity.timestamp}
                            </p>
                            {activity.amount && (
                              <p className="text-sm font-semibold text-green-600">
                                +₹{activity.amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent activity</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Start by adding your first listing
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
