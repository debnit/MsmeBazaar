'use client'

import { Activity, Server, Database, Zap, Cpu, HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { SystemMetrics } from '@/types/dashboard'
import { formatPercentage } from '../../../libs/ui/lib/utils'

interface PrometheusMetricsProps {
  systemMetrics?: SystemMetrics
  isLoading: boolean
}

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  status?: 'good' | 'warning' | 'error'
  icon: React.ReactNode
  loading?: boolean
}

function MetricCard({ title, value, unit, status = 'good', icon, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-3">
          <div className="skeleton h-8 w-8 rounded" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-5 w-12 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const statusColors = {
    good: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    warning: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
    error: 'text-red-600 bg-red-100 dark:bg-red-900/20',
  }

  return (
    <div className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${statusColors[status]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className="text-lg font-bold text-foreground">
            {value}{unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

export function PrometheusMetrics({ systemMetrics, isLoading }: PrometheusMetricsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <MetricCard
                key={i}
                title="Loading..."
                value=""
                icon={<div className="h-4 w-4" />}
                loading={true}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!systemMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>System metrics unavailable</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getUptimeStatus = (percentage: number) => {
    if (percentage >= 99.5) return 'good'
    if (percentage >= 99.0) return 'warning'
    return 'error'
  }

  const getLatencyStatus = (latency: number) => {
    if (latency <= 200) return 'good'
    if (latency <= 500) return 'warning'
    return 'error'
  }

  const getCacheStatus = (hitRate: number) => {
    if (hitRate >= 90) return 'good'
    if (hitRate >= 75) return 'warning'
    return 'error'
  }

  const getResourceStatus = (usage: number) => {
    if (usage <= 70) return 'good'
    if (usage <= 90) return 'warning'
    return 'error'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Core System Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Uptime"
            value={formatPercentage(systemMetrics.uptime.percentage)}
            status={getUptimeStatus(systemMetrics.uptime.percentage)}
            icon={<Server className="h-4 w-4" />}
          />
          
          <MetricCard
            title="Avg Latency"
            value={systemMetrics.requestLatency.avg}
            unit="ms"
            status={getLatencyStatus(systemMetrics.requestLatency.avg)}
            icon={<Zap className="h-4 w-4" />}
          />
          
          <MetricCard
            title="Cache Hit Rate"
            value={formatPercentage(systemMetrics.redisStats.hitRate)}
            status={getCacheStatus(systemMetrics.redisStats.hitRate)}
            icon={<Database className="h-4 w-4" />}
          />
          
          <MetricCard
            title="CPU Usage"
            value={formatPercentage(systemMetrics.resourceUsage.cpuUsage)}
            status={getResourceStatus(systemMetrics.resourceUsage.cpuUsage)}
            icon={<Cpu className="h-4 w-4" />}
          />
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Performance Details</h4>
          
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">P95 Latency</span>
              <span className="text-sm font-mono">{systemMetrics.requestLatency.p95}ms</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">P99 Latency</span>
              <span className="text-sm font-mono">{systemMetrics.requestLatency.p99}ms</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Memory Usage</span>
              <span className="text-sm font-mono">{formatPercentage(systemMetrics.resourceUsage.memoryUsage)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Disk Usage</span>
              <span className="text-sm font-mono">{formatPercentage(systemMetrics.resourceUsage.diskUsage)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Redis Keys</span>
              <span className="text-sm font-mono">{systemMetrics.redisStats.totalKeys.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">System Uptime</span>
              <span className="text-sm font-mono">{systemMetrics.uptime.duration}</span>
            </div>
          </div>
        </div>

        {/* Error Rates */}
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">API Error Rates</h4>
          
          <div className="space-y-2">
            {systemMetrics.errorRates.map((endpoint, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{endpoint.endpoint}</p>
                  <p className="text-xs text-muted-foreground">
                    {endpoint.totalRequests.toLocaleString()} requests
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        endpoint.errorRate > 5 ? 'bg-red-500' :
                        endpoint.errorRate > 1 ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(endpoint.errorRate * 10, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium min-w-0 ${
                    endpoint.errorRate > 5 ? 'text-red-600' :
                    endpoint.errorRate > 1 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {formatPercentage(endpoint.errorRate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall System Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                systemMetrics.uptime.percentage >= 99.5 ? 'bg-green-500' :
                systemMetrics.uptime.percentage >= 99.0 ? 'bg-orange-500' : 'bg-red-500'
              }`} />
              <span className={`text-sm font-medium ${
                systemMetrics.uptime.percentage >= 99.5 ? 'text-green-600' :
                systemMetrics.uptime.percentage >= 99.0 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {systemMetrics.uptime.percentage >= 99.5 ? 'Healthy' :
                 systemMetrics.uptime.percentage >= 99.0 ? 'Warning' : 'Critical'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}