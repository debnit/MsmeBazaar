import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Activity, TrendingUp, Server, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface HealthMetrics {
  crashRate: number;
  errorRate: number;
  totalErrors: number;
  totalCrashes: number;
  totalRequests: number;
  averageResponseTime: number;
  criticalErrors: number;
  highSeverityErrors: number;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: string;
}

interface ErrorAnalytics {
  errorsByRoute: [string, number][];
  slowRoutes: {
    route: string;
    averageTime: number;
    requestCount: number;
  }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function MonitoringDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedPeriod, setSelectedPeriod] = useState(24);

  const { data: healthMetrics, isLoading: healthLoading, error: healthError } = useQuery<HealthMetrics>({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: refreshInterval,
  });

  const { data: crashRateData, isLoading: crashLoading } = useQuery<{ crashRate: number; period: string }>({
    queryKey: ['/api/monitoring/crash-rate', selectedPeriod],
    queryFn: () => fetch(`/api/monitoring/crash-rate?hours=${selectedPeriod}`).then(res => res.json()),
    refetchInterval: refreshInterval,
  });

  const { data: errorAnalytics, isLoading: analyticsLoading } = useQuery<ErrorAnalytics>({
    queryKey: ['/api/monitoring/errors'],
    refetchInterval: refreshInterval,
  });

  const getSeverityColor = (rate: number) => {
    if (rate > 5) return 'text-red-500';
    if (rate > 2) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSeverityBadge = (rate: number) => {
    if (rate > 5) return <Badge variant="destructive">Critical</Badge>;
    if (rate > 2) return <Badge variant="default" className="bg-yellow-500">Warning</Badge>;
    return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
  };

  if (healthLoading || crashLoading || analyticsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (healthError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load monitoring data. Please check your permissions and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time application health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crash Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {crashRateData?.crashRate?.toFixed(2)}%
            </div>
            <p className="text-xs text-gray-500">
              {crashRateData?.period}
            </p>
            <div className="mt-2">
              {getSeverityBadge(crashRateData?.crashRate || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.averageResponseTime || 0}ms
            </div>
            <p className="text-xs text-gray-500">
              Average response time
            </p>
            <Progress 
              value={Math.min((healthMetrics?.averageResponseTime || 0) / 50, 100)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.totalRequests?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500">
              Last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(healthMetrics?.uptime || 0)}
            </div>
            <p className="text-xs text-gray-500">
              Since last restart
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="errors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span>Errors by Route</span>
                </CardTitle>
                <CardDescription>Routes with the most errors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {errorAnalytics?.errorsByRoute?.slice(0, 5).map(([route, count]) => (
                    <div key={route} className="flex items-center justify-between">
                      <span className="text-sm font-mono">{route}</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                  {(!errorAnalytics?.errorsByRoute || errorAnalytics.errorsByRoute.length === 0) && (
                    <p className="text-sm text-gray-500">No errors recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span>Error Summary</span>
                </CardTitle>
                <CardDescription>Current error statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Errors</span>
                    <Badge variant="outline">{healthMetrics?.totalErrors || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Critical Errors</span>
                    <Badge variant="destructive">{healthMetrics?.criticalErrors || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Severity</span>
                    <Badge variant="default" className="bg-yellow-500">{healthMetrics?.highSeverityErrors || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Crashes</span>
                    <Badge variant="destructive">{healthMetrics?.totalCrashes || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span>Slow Routes</span>
              </CardTitle>
              <CardDescription>Routes with highest response times</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Average Time</TableHead>
                    <TableHead>Request Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorAnalytics?.slowRoutes?.slice(0, 10).map((route) => (
                    <TableRow key={route.route}>
                      <TableCell className="font-mono">{route.route}</TableCell>
                      <TableCell>
                        <Badge variant={route.averageTime > 2000 ? "destructive" : route.averageTime > 1000 ? "default" : "outline"}>
                          {route.averageTime}ms
                        </Badge>
                      </TableCell>
                      <TableCell>{route.requestCount}</TableCell>
                    </TableRow>
                  ))}
                  {(!errorAnalytics?.slowRoutes || errorAnalytics.slowRoutes.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">
                        No performance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5 text-green-500" />
                  <span>Memory Usage</span>
                </CardTitle>
                <CardDescription>Current memory consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">RSS</span>
                    <span className="text-sm font-mono">{formatBytes(healthMetrics?.memoryUsage?.rss || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Heap Total</span>
                    <span className="text-sm font-mono">{formatBytes(healthMetrics?.memoryUsage?.heapTotal || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Heap Used</span>
                    <span className="text-sm font-mono">{formatBytes(healthMetrics?.memoryUsage?.heapUsed || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">External</span>
                    <span className="text-sm font-mono">{formatBytes(healthMetrics?.memoryUsage?.external || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>System Status</span>
                </CardTitle>
                <CardDescription>Overall system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant="default" className="bg-green-500">Online</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-sm text-gray-500">
                      {healthMetrics?.timestamp ? new Date(healthMetrics.timestamp).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className={`text-sm font-semibold ${getSeverityColor(healthMetrics?.errorRate || 0)}`}>
                      {healthMetrics?.errorRate?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alerts */}
      {healthMetrics && (
        <div className="space-y-4">
          {healthMetrics.crashRate > 5 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Critical: Crash rate is {healthMetrics.crashRate.toFixed(2)}%. Immediate attention required.
              </AlertDescription>
            </Alert>
          )}
          {healthMetrics.averageResponseTime > 5000 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Warning: Average response time is {healthMetrics.averageResponseTime}ms. Consider performance optimization.
              </AlertDescription>
            </Alert>
          )}
          {healthMetrics.criticalErrors > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Alert: {healthMetrics.criticalErrors} critical errors detected. Review error logs immediately.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}