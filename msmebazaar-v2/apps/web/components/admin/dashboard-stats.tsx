'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Clock,
  FileCheck,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Timer,
} from 'lucide-react';
import { DashboardStats } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils';

interface DashboardStatsProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

export function DashboardStatsComponent({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total MSMEs',
      value: stats.total_msmes.toLocaleString(),
      icon: Users,
      description: 'Registered businesses',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Approvals',
      value: stats.pending_approvals.toLocaleString(),
      icon: Clock,
      description: 'Awaiting review',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'KYC Pending',
      value: stats.kyc_pending.toLocaleString(),
      icon: FileCheck,
      description: 'Document verification',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Valuation Requests',
      value: stats.valuation_requests.toLocaleString(),
      icon: DollarSign,
      description: 'Active requests',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Monthly Registrations',
      value: stats.monthly_registrations.toLocaleString(),
      icon: TrendingUp,
      description: `${stats.monthly_growth >= 0 ? '+' : ''}${stats.monthly_growth.toFixed(1)}% from last month`,
      color: stats.monthly_growth >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: stats.monthly_growth >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: 'Approval Rate',
      value: `${stats.approval_rate.toFixed(1)}%`,
      icon: CheckCircle,
      description: 'Success rate',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Avg Processing Time',
      value: `${stats.avg_processing_time.toFixed(1)}`,
      icon: Timer,
      description: 'Days to process',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'System Health',
      value: 'Healthy',
      icon: AlertCircle,
      description: 'All services running',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <p className={`text-xs ${stat.color}`}>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default DashboardStatsComponent;
