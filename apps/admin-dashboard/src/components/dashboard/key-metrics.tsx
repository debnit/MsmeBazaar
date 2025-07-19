'use client'

import { TrendingUp, DollarSign, Users, Target, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { formatCurrency, formatNumber, formatPercentage } from '../../../libs/ui/lib/utils'
import { DashboardMetrics } from '@/types/dashboard'

interface KeyMetricsSectionProps {
  metrics?: DashboardMetrics
  isLoading: boolean
}

interface MetricItemProps {
  title: string
  value: string | number
  change?: number
  target?: number
  icon: React.ReactNode
  color: string
  loading?: boolean
}

function MetricItem({ title, value, change, target, icon, color, loading }: MetricItemProps) {
  if (loading) {
    return (
      <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-6 w-16 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
    )
  }

  const isPositiveChange = change && change > 0
  const isNegativeChange = change && change < 0
  const targetAchieved = target && typeof value === 'number' ? value >= target : false

  return (
    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-card to-card/50 border border-border/50 rounded-lg hover:shadow-md transition-all">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          {change !== undefined && (
            <div className="flex items-center text-xs">
              {isPositiveChange && (
                <ArrowUpIcon className="h-3 w-3 text-green-500 mr-1" />
              )}
              {isNegativeChange && (
                <ArrowDownIcon className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={`font-medium ${
                isPositiveChange ? 'text-green-600 dark:text-green-400' : 
                isNegativeChange ? 'text-red-600 dark:text-red-400' : 
                'text-muted-foreground'
              }`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
          
          {target && (
            <div className="text-xs text-muted-foreground">
              Target: {formatNumber(target)} 
              {targetAchieved && <span className="text-green-500 ml-1">✓</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function KeyMetricsSection({ metrics, isLoading }: KeyMetricsSectionProps) {
  const keyMetrics = [
    {
      title: 'Conversion Rate',
      value: metrics ? formatPercentage(metrics.conversionRate) : '0%',
      change: 5.2,
      target: 70,
      icon: <Target className="h-5 w-5 text-white" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Successful Transactions',
      value: metrics?.successfulTransactions || 0,
      change: 12.8,
      target: 2500,
      icon: <TrendingUp className="h-5 w-5 text-white" />,
      color: 'bg-green-500',
    },
    {
      title: 'Active Buyers',
      value: metrics?.activeBuyers || 0,
      change: 8.1,
      target: 1000,
      icon: <Users className="h-5 w-5 text-white" />,
      color: 'bg-purple-500',
    },
    {
      title: 'Active Sellers',
      value: metrics?.activeSellers || 0,
      change: 15.3,
      target: 1200,
      icon: <Users className="h-5 w-5 text-white" />,
      color: 'bg-orange-500',
    },
    {
      title: 'Avg Deal Size',
      value: metrics ? formatCurrency(metrics.avgDealSize) : '₹0',
      change: -2.1,
      target: 3000000,
      icon: <DollarSign className="h-5 w-5 text-white" />,
      color: 'bg-indigo-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {keyMetrics.map((metric, index) => (
        <MetricItem
          key={metric.title}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          target={metric.target}
          icon={metric.icon}
          color={metric.color}
          loading={isLoading}
        />
      ))}
    </div>
  )
}