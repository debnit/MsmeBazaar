'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../libs/ui/components/ui/tabs'
import { ChartData } from '@/types/dashboard'
import { formatCurrency, formatNumber } from '../../../libs/ui/lib/utils'

interface ChartsSectionProps {
  chartData?: ChartData
  isLoading: boolean
  dateFilter: string
}

interface ChartWrapperProps {
  title: string
  children: React.ReactNode
  loading?: boolean
  className?: string
}

function ChartWrapper({ title, children, loading, className }: ChartWrapperProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse space-y-4 w-full">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-64 w-full rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`chart-container ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function ChartsSection({ chartData, isLoading, dateFilter }: ChartsSectionProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // Chart colors
  const colors = {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--chart-2))',
    accent: 'hsl(var(--chart-3))',
    muted: 'hsl(var(--chart-4))',
    success: 'hsl(var(--chart-5))',
  }

  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-2">
          {/* Weekly Signups Bar Chart */}
          <ChartWrapper 
            title="Weekly Signups" 
            loading={isLoading}
            className="lg:col-span-1"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.weeklySignups || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={(value: number) => `${value} signups`} />}
                />
                <Bar 
                  dataKey="signups" 
                  fill={colors.primary}
                  radius={[4, 4, 0, 0]}
                  name="Daily Signups"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* Valuation Trends Line Chart */}
          <ChartWrapper 
            title="Valuation Trends" 
            loading={isLoading}
            className="lg:col-span-1"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData?.valuationTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgValuation" 
                  stroke={colors.secondary}
                  strokeWidth={3}
                  dot={{ fill: colors.secondary, strokeWidth: 2, r: 4 }}
                  name="Avg Valuation"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </TabsContent>

        <TabsContent value="trends" className="grid gap-6 lg:grid-cols-2">
          {/* Combined Signups and Valuations */}
          <ChartWrapper 
            title="Signups vs Valuations" 
            loading={isLoading}
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData?.weeklySignups || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="signups" 
                  fill={colors.primary}
                  name="Daily Signups"
                  opacity={0.7}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="previousWeek" 
                  stroke={colors.accent}
                  strokeWidth={2}
                  name="Previous Week"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </TabsContent>

        <TabsContent value="regional" className="grid gap-6 lg:grid-cols-2">
          {/* Region Distribution Pie Chart */}
          <ChartWrapper 
            title="MSME Distribution by Region" 
            loading={isLoading}
            className="lg:col-span-1"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData?.regionDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(chartData?.regionDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip formatter={(value: number) => `${formatNumber(value)} MSMEs`} />}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* Regional Stats Table */}
          <ChartWrapper 
            title="Regional Statistics" 
            loading={isLoading}
            className="lg:col-span-1"
          >
            <div className="space-y-4">
              {(chartData?.regionDistribution || []).map((region, index) => (
                <div key={region.region} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: pieColors[index % pieColors.length] }}
                    />
                    <span className="font-medium">{region.region}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatNumber(region.count)}</p>
                    <p className="text-sm text-muted-foreground">{region.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartWrapper>
        </TabsContent>

        <TabsContent value="sectors" className="grid gap-6">
          {/* Sector Deals Stacked Bar Chart */}
          <ChartWrapper 
            title="Active Deals by Sector" 
            loading={isLoading}
            className="col-span-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.sectorDeals || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="sector" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="activeDeals" 
                  stackId="a" 
                  fill={colors.primary}
                  name="Active Deals"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="completedDeals" 
                  stackId="a" 
                  fill={colors.secondary}
                  name="Completed Deals"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </TabsContent>
      </Tabs>
    </div>
  )
}