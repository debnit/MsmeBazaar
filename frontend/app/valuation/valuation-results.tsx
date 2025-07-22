import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Download, 
  Share2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Building,
  Users,
  Calendar,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
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
  RadialBarChart,
  RadialBar,
  Legend
} from "recharts"

import type { ValuationResult, ValuationMethod, Comparable } from "./types"

const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981",
  accent: "#f59e0b",
  danger: "#ef4444",
  muted: "#6b7280"
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

interface ValuationResultsProps {
  result: ValuationResult
  onExportPDF: () => void
  onShare: () => void
}

export function ValuationResults({ result, onExportPDF, onShare }: ValuationResultsProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // Mock historical data for charts
  const historicalData = [
    { period: "2019", revenue: result.inputs.annualRevenue * 0.7, valuation: result.estimatedValue * 0.6 },
    { period: "2020", revenue: result.inputs.annualRevenue * 0.8, valuation: result.estimatedValue * 0.7 },
    { period: "2021", revenue: result.inputs.annualRevenue * 0.9, valuation: result.estimatedValue * 0.85 },
    { period: "2022", revenue: result.inputs.annualRevenue * 0.95, valuation: result.estimatedValue * 0.92 },
    { period: "2023", revenue: result.inputs.annualRevenue, valuation: result.estimatedValue }
  ]

  const methodBreakdown = result.methods.map((method, index) => ({
    name: method.name,
    value: method.value,
    weight: method.weight * 100,
    color: PIE_COLORS[index % PIE_COLORS.length]
  }))

  const riskFactors = [
    { name: "Market Risk", score: 75, color: CHART_COLORS.accent },
    { name: "Financial Risk", score: 60, color: CHART_COLORS.danger },
    { name: "Operational Risk", score: 45, color: CHART_COLORS.secondary },
    { name: "Regulatory Risk", score: 30, color: CHART_COLORS.primary }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Valuation Report</h1>
          <p className="text-muted-foreground">
            Generated on {new Date(result.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button onClick={onExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Estimated Value"
          value={`₹${result.estimatedValue.toLocaleString()}`}
          change={result.confidence}
          changeLabel="Confidence"
          icon={DollarSign}
          trend="up"
        />
        <MetricCard
          title="Revenue Multiple"
          value={`${(result.estimatedValue / result.inputs.annualRevenue).toFixed(1)}x`}
          change={result.inputs.revenueGrowthRate}
          changeLabel="Growth Rate"
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard
          title="Asset Value"
          value={`₹${(result.inputs.totalAssets - result.inputs.totalLiabilities).toLocaleString()}`}
          change={((result.inputs.totalAssets - result.inputs.totalLiabilities) / result.inputs.totalAssets * 100)}
          changeLabel="Asset Ratio"
          icon={Building}
          trend="neutral"
        />
        <MetricCard
          title="Per Employee"
          value={`₹${Math.round(result.estimatedValue / result.inputs.employeeCount).toLocaleString()}`}
          change={result.inputs.employeeCount}
          changeLabel="Employees"
          icon={Users}
          trend="up"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="comparables">Comparables</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Valuation Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Valuation Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
                      labelStyle={{ color: "#000" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="valuation" 
                      stroke={CHART_COLORS.primary} 
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Confidence Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Confidence Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {result.confidence}%
                  </div>
                  <p className="text-muted-foreground">Overall Confidence</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Data Quality</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Market Comparables</span>
                      <span>72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Financial Health</span>
                      <span>90%</span>
                    </div>
                    <Progress value={90} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Strong Financial Position:</strong> Your company shows healthy profit margins 
                  and solid asset base, contributing to a higher valuation multiple.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Growth Potential:</strong> With {result.inputs.revenueGrowthRate}% revenue growth, 
                  your company is positioned well for future value appreciation.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Market Risk:</strong> Consider diversifying your customer base to reduce 
                  concentration risk and improve valuation stability.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Method Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Valuation Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={methodBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ₹${(value / 1000000).toFixed(1)}M`}
                    >
                      {methodBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Value"]} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Method Details */}
            <Card>
              <CardHeader>
                <CardTitle>Method Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.methods.map((method, index) => (
                    <div key={method.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="font-medium">{method.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{method.value.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{(method.weight * 100).toFixed(0)}% weight</div>
                        </div>
                      </div>
                      <Progress value={method.weight * 100} className="h-2" />
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Comparables</CardTitle>
              <p className="text-muted-foreground">
                Similar companies in your industry and size range
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Company</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Valuation</th>
                      <th className="text-right py-2">Multiple</th>
                      <th className="text-right py-2">Employees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparables.map((comp, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">{comp.name}</div>
                            <div className="text-sm text-muted-foreground">{comp.industry}</div>
                          </div>
                        </td>
                        <td className="text-right py-3">₹{comp.revenue.toLocaleString()}</td>
                        <td className="text-right py-3">₹{comp.valuation.toLocaleString()}</td>
                        <td className="text-right py-3">
                          <Badge variant="secondary">
                            {comp.multiple.toFixed(1)}x
                          </Badge>
                        </td>
                        <td className="text-right py-3">{comp.employees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {riskFactors.map((risk) => (
                  <div key={risk.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{risk.name}</span>
                      <Badge variant={risk.score > 70 ? "destructive" : risk.score > 50 ? "default" : "secondary"}>
                        {risk.score}%
                      </Badge>
                    </div>
                    <Progress value={risk.score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Strengths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Strong Profitability</p>
                    <p className="text-sm text-muted-foreground">
                      Healthy profit margins indicate efficient operations
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Growth Trajectory</p>
                    <p className="text-sm text-muted-foreground">
                      Consistent revenue growth over the past years
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Asset Quality</p>
                    <p className="text-sm text-muted-foreground">
                      Strong balance sheet with good asset utilization
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-amber-600">Improvement Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Market Diversification</p>
                    <p className="text-sm text-muted-foreground">
                      Expand customer base to reduce concentration risk
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Digital Transformation</p>
                    <p className="text-sm text-muted-foreground">
                      Invest in technology to improve efficiency
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Working Capital</p>
                    <p className="text-sm text-muted-foreground">
                      Optimize inventory and receivables management
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.ComponentType<{ className?: string }>
  trend: "up" | "down" | "neutral"
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, trend }: MetricCardProps) {
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span>{change}{typeof change === 'number' && change < 100 ? '%' : ''}</span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}