'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  Activity,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../libs/ui/components/ui/tabs'
import { api } from '@/lib/api'
import { formatCurrency, formatNumber, formatPercentage } from '../../../libs/ui/lib/utils'

import { AnalyticsOverview } from '@/components/dashboard/analytics-overview'
import { ChartsSection } from '@/components/dashboard/charts-section'
import { KeyMetricsSection } from '@/components/dashboard/key-metrics'
import { TransactionTable } from '@/components/dashboard/transaction-table'
import { MSMETable } from '@/components/dashboard/msme-table'
import { SystemNotifications } from '@/components/dashboard/system-notifications'
import { PrometheusMetrics } from '@/components/dashboard/prometheus-metrics'
import { DateFilterSelect } from '@/components/ui/date-filter-select'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<string>('week')
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch dashboard data
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['dashboard-metrics', dateFilter, refreshKey],
    queryFn: () => api.getDashboardMetrics(dateFilter),
  })

  const { data: chartData, isLoading: chartsLoading } = useQuery({
    queryKey: ['chart-data', dateFilter, refreshKey],
    queryFn: () => api.getChartData(dateFilter),
  })

  const { data: systemMetrics, isLoading: systemMetricsLoading } = useQuery({
    queryKey: ['system-metrics', refreshKey],
    queryFn: () => api.getSystemMetrics(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (metricsError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load dashboard data. Please try refreshing the page.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">VyapaarMitra Admin Dashboard</h1>
              <p className="text-muted-foreground">Business Intelligence & System Monitoring</p>
            </div>
            
            <div className="flex items-center gap-4">
              <DateFilterSelect
                value={dateFilter}
                onValueChange={setDateFilter}
              />
              
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-accent transition-colors"
                disabled={metricsLoading}
              >
                <RefreshCw className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Analytics Overview Cards */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Analytics Overview</h2>
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <AnalyticsOverview 
            metrics={metrics?.data} 
            isLoading={metricsLoading}
          />
        </section>

        {/* Key Metrics */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Key Performance Metrics</h2>
          <KeyMetricsSection 
            metrics={metrics?.data} 
            isLoading={metricsLoading}
          />
        </section>

        {/* Charts Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Analytics & Trends</h2>
          <ChartsSection 
            chartData={chartData?.data} 
            isLoading={chartsLoading}
            dateFilter={dateFilter}
          />
        </section>

        {/* Data Tables */}
        <section>
          <Tabs defaultValue="transactions" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="msmes" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  MSME Listings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="transactions" className="space-y-4">
              <TransactionTable />
            </TabsContent>

            <TabsContent value="msmes" className="space-y-4">
              <MSMETable />
            </TabsContent>
          </Tabs>
        </section>

        {/* System Monitoring */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* System Notifications */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">System Notifications</h2>
            <SystemNotifications />
          </div>

          {/* Prometheus Metrics */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">System Health</h2>
            <PrometheusMetrics 
              systemMetrics={systemMetrics?.data}
              isLoading={systemMetricsLoading}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">Export Reports</p>
                    <p className="text-sm text-muted-foreground">Download analytics data</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">Approve Pending</p>
                    <p className="text-sm text-muted-foreground">{metrics?.data?.pendingApprovals || 0} items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium">System Health</p>
                    <p className="text-sm text-muted-foreground">
                      {systemMetrics?.data?.uptime.percentage}% uptime
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">View Reports</p>
                    <p className="text-sm text-muted-foreground">Detailed analytics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 mt-16">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© 2024 VyapaarMitra. All rights reserved.</p>
            <p>Admin Dashboard v2.0.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}