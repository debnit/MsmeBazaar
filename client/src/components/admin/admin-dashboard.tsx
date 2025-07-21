import React, { useState } from 'react';
import { RoleSwitcher } from './role-switcher';
import { TestResults } from './test-results';
import { useAuth } from '@/components/auth/auth-provider';
import { apiRequest } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, RefreshCw, Settings, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  id: string;
  name: string;
  status: number;
  success: boolean;
  message: string;
  timestamp: string;
  duration: number;
  endpoint?: string;
  permissions?: string[];
}

export function AdminDashboard() {
  const { user } = useAuth();
  
  // Helper functions for role checking
  const isAdmin = user?.role === 'admin';
  // Helper function for future permission checks
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasPermission = (permission: string) => user?.permissions?.includes(permission) ?? false;
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const { toast } = useToast();

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need administrator privileges to access this dashboard.
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runPermissionTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];
    
    const testEndpoints = [
      {
        name: 'List MSME Listings',
        endpoint: '/api/msme-listings',
        permissions: ['listing:read']
      },
      {
        name: 'Create MSME Listing',
        endpoint: '/api/msme-listings',
        method: 'POST',
        permissions: ['listing:create']
      },
      {
        name: 'Request Valuation',
        endpoint: '/api/valuation',
        method: 'POST',
        permissions: ['valuation:create']
      },
      {
        name: 'View Valuation Report',
        endpoint: '/api/valuation/123',
        permissions: ['valuation:read']
      },
      {
        name: 'Manage Users',
        endpoint: '/api/admin/users',
        permissions: ['admin:users']
      },
      {
        name: 'View Analytics',
        endpoint: '/api/analytics',
        permissions: ['analytics:read']
      },
      {
        name: 'Process Transactions',
        endpoint: '/api/transactions',
        permissions: ['transaction:process']
      },
      {
        name: 'Generate Documents',
        endpoint: '/api/documents/generate',
        method: 'POST',
        permissions: ['document:create']
      }
    ];

    for (const test of testEndpoints) {
      const startTime = Date.now();
      let result: TestResult;
      
      try {
        await apiRequest(test.endpoint, {
          method: test.method || 'GET',
          ...(test.method === 'POST' && {
            body: JSON.stringify({ test: true })
          })
        });
        
        result = {
          id: `test_${Date.now()}_${Math.random()}`,
          name: test.name,
          status: 200,
          success: true,
          message: 'Request successful',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          endpoint: test.endpoint,
          permissions: test.permissions
        };
      } catch (error: any) {
        result = {
          id: `test_${Date.now()}_${Math.random()}`,
          name: test.name,
          status: error.status || 500,
          success: false,
          message: error.message || 'Request failed',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          endpoint: test.endpoint,
          permissions: test.permissions
        };
      }
      
      results.push(result);
      setTestResults([...results]); // Update UI progressively
      
      // Add a small delay to make the tests more visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsRunningTests(false);
    
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => !r.success).length;
    
    toast({
      title: 'Permission Tests Completed',
      description: `${passedTests} passed, ${failedTests} failed`,
      variant: passedTests > failedTests ? 'success' : 'destructive'
    });
  };

  const retryTest = async (testId: string) => {
    const originalTest = testResults.find(t => t.id === testId);
    if (!originalTest) return;
    
    const startTime = Date.now();
    let result: TestResult;
    
    try {
      await apiRequest(originalTest.endpoint!, {
        method: originalTest.endpoint?.includes('POST') ? 'POST' : 'GET'
      });
      
      result = {
        ...originalTest,
        id: `retry_${Date.now()}_${Math.random()}`,
        status: 200,
        success: true,
        message: 'Request successful',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      result = {
        ...originalTest,
        id: `retry_${Date.now()}_${Math.random()}`,
        status: error.status || 500,
        success: false,
        message: error.message || 'Request failed',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
    
    setTestResults(prev => [result, ...prev]);
  };

  const handleUpgrade = () => {
    window.open('/pricing', '_blank');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Administrative tools and system monitoring
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Administrator
        </Badge>
      </div>

      <Tabs defaultValue="role-switcher" className="space-y-4">
        <TabsList>
          <TabsTrigger value="role-switcher">Role Switcher</TabsTrigger>
          <TabsTrigger value="permissions">Permission Tests</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="role-switcher" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RoleSwitcher />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Current Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">User ID:</span>
                    <span className="text-sm">{user?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Current Role:</span>
                    <Badge>{user?.role}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Permissions:</span>
                    <span className="text-sm">{user?.permissions?.length || 0}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      View Audit Logs
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Users
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      System Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Permission Testing</span>
                <div className="flex gap-2">
                  <Button
                    onClick={runPermissionTests}
                    disabled={isRunningTests}
                    className="flex items-center gap-2"
                  >
                    {isRunningTests ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isRunningTests ? 'Running Tests...' : 'Run Tests'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length > 0 ? (
                <TestResults 
                  results={testResults}
                  onRetryTest={retryTest}
                  onUpgrade={handleUpgrade}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No test results yet. Click "Run Tests" to begin.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">All systems operational</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <div className="text-xs text-muted-foreground">+12% from last hour</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">API Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45,678</div>
                <div className="text-xs text-muted-foreground">Last 24 hours</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}