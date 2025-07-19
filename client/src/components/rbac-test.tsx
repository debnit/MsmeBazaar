import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, FileText, DollarSign, Bell, TrendingUp } from 'lucide-react';

interface Permission {
  name: string;
  description: string;
  category: string;
}

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  message: string;
  success: boolean;
}

const PERMISSION_CATEGORIES = {
  'users': { icon: User, label: 'User Management', color: 'bg-blue-100 text-blue-800' },
  'msme-listings': { icon: FileText, label: 'MSME Listings', color: 'bg-green-100 text-green-800' },
  'loan-applications': { icon: DollarSign, label: 'Loan Applications', color: 'bg-purple-100 text-purple-800' },
  'escrow': { icon: Shield, label: 'Escrow Management', color: 'bg-orange-100 text-orange-800' },
  'notifications': { icon: Bell, label: 'Notifications', color: 'bg-yellow-100 text-yellow-800' },
  'analytics': { icon: TrendingUp, label: 'Analytics', color: 'bg-indigo-100 text-indigo-800' },
};

const TEST_ENDPOINTS = [
  { method: 'GET', endpoint: '/api/msme-listings', description: 'View MSME listings' },
  { method: 'POST', endpoint: '/api/msme-listings', description: 'Create MSME listing' },
  { method: 'GET', endpoint: '/api/loan-applications', description: 'View loan applications' },
  { method: 'POST', endpoint: '/api/loan-applications', description: 'Create loan application' },
  { method: 'GET', endpoint: '/api/admin/users', description: 'View all users (admin only)' },
  { method: 'GET', endpoint: '/api/analytics/dashboard', description: 'View analytics dashboard' },
  { method: 'GET', endpoint: '/api/monitoring/health', description: 'View system health' },
];

export default function RBACTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPermissions();
    }
  }, [user]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/auth/permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const runPermissionTests = async () => {
    setLoading(true);
    const results: TestResult[] = [];

    for (const test of TEST_ENDPOINTS) {
      try {
        const response = await fetch(test.endpoint, {
          method: test.method,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: test.method === 'POST' ? JSON.stringify({
            businessName: 'Test Business',
            industry: 'Technology',
            revenue: 1000000,
            location: 'Mumbai',
          }) : undefined,
        });

        results.push({
          endpoint: `${test.method} ${test.endpoint}`,
          method: test.method,
          status: response.status,
          message: response.ok ? 'Success' : await response.text(),
          success: response.ok,
        });
      } catch (error) {
        results.push({
          endpoint: `${test.method} ${test.endpoint}`,
          method: test.method,
          status: 0,
          message: error instanceof Error ? error.message : 'Network error',
          success: false,
        });
      }
    }

    setTestResults(results);
    setLoading(false);

    toast({
      title: 'Permission Tests Completed',
      description: `Ran ${results.length} tests. Check results below.`,
    });
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.split(':')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, string[]>);

  if (!user) {
    return (
      <Alert>
        <AlertDescription>
          Please log in to test RBAC permissions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">RBAC Testing Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Role</p>
                <p className="text-2xl font-bold capitalize">{user.role}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Permissions</p>
                <p className="text-2xl font-bold">{permissions.length}</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Permission Categories</p>
                <p className="text-2xl font-bold">{Object.keys(groupedPermissions).length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="permissions">Current Permissions</TabsTrigger>
          <TabsTrigger value="tests">Permission Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Permissions by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
                    const categoryInfo = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
                    const Icon = categoryInfo?.icon || Shield;

                    return (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="h-5 w-5" />
                          <h3 className="font-semibold capitalize">
                            {categoryInfo?.label || category.replace('-', ' ')}
                          </h3>
                          <Badge variant="secondary">{categoryPermissions.length}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {categoryPermissions.map((permission) => (
                            <Badge
                              key={permission}
                              variant="outline"
                              className={categoryInfo?.color || 'bg-gray-100 text-gray-800'}
                            >
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                API Endpoint Permission Tests
                <Button
                  onClick={runPermissionTests}
                  disabled={loading}
                  className="ml-4"
                >
                  {loading ? 'Running Tests...' : 'Run Tests'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TEST_ENDPOINTS.map((test, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={test.method === 'GET' ? 'default' : 'secondary'}>
                        {test.method}
                      </Badge>
                      <span className="font-mono text-sm">{test.endpoint}</span>
                      <span className="text-sm text-gray-600">{test.description}</span>
                    </div>
                    {testResults.find(r => r.endpoint === `${test.method} ${test.endpoint}`) && (
                      <Badge variant={testResults.find(r => r.endpoint === `${test.method} ${test.endpoint}`)?.success ? 'default' : 'destructive'}>
                        {testResults.find(r => r.endpoint === `${test.method} ${test.endpoint}`)?.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {testResults.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="font-semibold">Test Results:</h4>
                  <ScrollArea className="h-48">
                    {testResults.map((result, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm">{result.endpoint}</span>
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Role-Based Access Control Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Role Capabilities:</h4>
              <ul className="text-sm space-y-1">
                {user.role === 'admin' && (
                  <>
                    <li>• Full system access and user management</li>
                    <li>• Can moderate content and manage all resources</li>
                    <li>• Access to system analytics and monitoring</li>
                  </>
                )}
                {user.role === 'seller' && (
                  <>
                    <li>• Create and manage your own MSME listings</li>
                    <li>• View buyer interests in your listings</li>
                    <li>• Access business valuation services</li>
                  </>
                )}
                {user.role === 'buyer' && (
                  <>
                    <li>• Browse and search all MSME listings</li>
                    <li>• Express interest and apply for loans</li>
                    <li>• Manage escrow transactions</li>
                  </>
                )}
                {user.role === 'agent' && (
                  <>
                    <li>• Manage assigned listings and transactions</li>
                    <li>• Track commissions and performance</li>
                    <li>• Assist in buyer-seller matchmaking</li>
                  </>
                )}
                {user.role === 'nbfc' && (
                  <>
                    <li>• Process and approve loan applications</li>
                    <li>• Manage regulatory compliance</li>
                    <li>• Access loan performance analytics</li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Security Features:</h4>
              <ul className="text-sm space-y-1">
                <li>• Role-based permission system</li>
                <li>• Resource ownership validation</li>
                <li>• Rate limiting by user role</li>
                <li>• JWT token authentication</li>
                <li>• Comprehensive audit logging</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
