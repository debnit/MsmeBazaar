'use client'

import { TrendingUp, Users, FileText, Clock, ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { formatCurrency, formatNumber } from '../../../libs/ui/lib/utils'
import { DashboardMetrics } from '@/types/dashboard'

interface AnalyticsOverviewProps {
  metrics?: DashboardMetrics
  isLoading: boolean
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  loading?: boolean
  className?: string
}

function MetricCard({ title, value, change, changeLabel, icon, loading, className }: MetricCardProps) {
  if (loading) {
    return (
      <Card className={`animate-fade-in ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-5 w-5 rounded" />
          </div>
          <div className="skeleton h-8 w-20 rounded mb-1" />
          <div className="skeleton h-3 w-16 rounded" />
        </CardContent>
      </Card>
    )
  }

  const isPositiveChange = change && change > 0
  const isNegativeChange = change && change < 0

  return (
    <Card className={`metric-card animate-fade-in hover:scale-105 transition-transform ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          
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
              <span className="text-muted-foreground ml-1">
                {changeLabel || 'from last period'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsOverview({ metrics, isLoading }: AnalyticsOverviewProps) {
  const cards = [
    {
      title: 'Total Active MSMEs',
      value: metrics?.totalActiveMSMEs || 0,
      change: 12.5,
      changeLabel: 'from last month',
      icon: <Users className="h-4 w-4" />,
      className: 'border-blue-200 dark:border-blue-800',
    },
    {
      title: 'New Signups Today',
      value: metrics?.newSignupsToday || 0,
      change: 8.2,
      changeLabel: 'from yesterday',
      icon: <TrendingUp className="h-4 w-4" />,
      className: 'border-green-200 dark:border-green-800',
    },
    {
      title: 'Total Transactions',
      value: metrics?.totalTransactions || 0,
      change: 15.8,
      changeLabel: 'from last week',
      icon: <FileText className="h-4 w-4" />,
      className: 'border-purple-200 dark:border-purple-800',
    },
    {
      title: 'Pending Approvals',
      value: metrics?.pendingApprovals || 0,
      change: -5.2,
      changeLabel: 'from yesterday',
      icon: <Clock className="h-4 w-4" />,
      className: 'border-orange-200 dark:border-orange-800',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <MetricCard
          key={card.title}
          title={card.title}
          value={card.value}
          change={card.change}
          changeLabel={card.changeLabel}
          icon={card.icon}
          loading={isLoading}
          className={card.className}
        />
      ))}
    </div>
  )
}