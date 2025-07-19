import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Lock, Shield, Filter, ExternalLink } from 'lucide-react';

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

interface TestResultsProps {
  results: TestResult[];
  onRetryTest?: (testId: string) => void;
  onUpgrade?: () => void;
}

export function TestResults({ results, onRetryTest, onUpgrade }: TestResultsProps) {
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getStatusBadge = (result: TestResult) => {
    const variant =
      result.status === 403
        ? 'destructive'  // Authenticated but lacks permission
        : result.status === 401
          ? 'secondary'    // Not authenticated
          : result.success
            ? 'default'      // Success
            : 'outline';     // Other errors

    const icon =
      result.status === 403
        ? <Lock className="h-3 w-3 mr-1" />
        : result.status === 401
          ? <Shield className="h-3 w-3 mr-1" />
          : result.success
            ? <CheckCircle className="h-3 w-3 mr-1" />
            : <XCircle className="h-3 w-3 mr-1" />;

    return (
      <Badge variant={variant} className="flex items-center">
        {icon}
        {result.status}
      </Badge>
    );
  };

  const getStatusMessage = (result: TestResult) => {
    if (result.status === 401) {
      return 'Not authenticated - Token missing or invalid';
    }
    if (result.status === 403) {
      return 'Authenticated but lacks required permissions';
    }
    return result.message;
  };

  const filteredResults = results.filter(result => {
    if (showOnlyFailed && result.success) {return false;}
    if (selectedCategory !== 'all') {
      // Filter by permission category if needed
      return result.permissions?.some(p => p.startsWith(selectedCategory));
    }
    return true;
  });

  const stats = {
    total: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    auth_failures: results.filter(r => r.status === 401).length,
    permission_failures: results.filter(r => r.status === 403).length,
  };

  const hasPermissionFailures = stats.permission_failures > 0;

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Tests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-xs text-muted-foreground">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.auth_failures}</div>
            <div className="text-xs text-muted-foreground">Auth (401)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.permission_failures}</div>
            <div className="text-xs text-muted-foreground">Permission (403)</div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade CTA for Permission Failures */}
      {hasPermissionFailures && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Some tests failed due to insufficient permissions. Upgrade to Pro for full access.
            </span>
            <Button variant="outline" size="sm" onClick={onUpgrade}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={showOnlyFailed ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowOnlyFailed(!showOnlyFailed)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showOnlyFailed ? 'Show All' : 'Show Failures'}
        </Button>

        <div className="flex gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Categories
          </Button>
          <Button
            variant={selectedCategory === 'listing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('listing')}
          >
            Listings
          </Button>
          <Button
            variant={selectedCategory === 'valuation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('valuation')}
          >
            Valuation
          </Button>
          <Button
            variant={selectedCategory === 'transaction' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('transaction')}
          >
            Transactions
          </Button>
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-2">
        {filteredResults.map((result) => (
          <Card key={result.id} className={`${!result.success ? 'border-red-200' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {result.name}
                </span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(result)}
                  <span className="text-xs text-muted-foreground">
                    {result.duration}ms
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                {result.endpoint && (
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {result.endpoint}
                  </code>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {getStatusMessage(result)}
                </p>

                {result.permissions && result.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.permissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                )}

                {!result.success && result.status === 403 && (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      This test requires additional permissions. Consider upgrading your plan or contact an administrator.
                    </AlertDescription>
                  </Alert>
                )}

                {!result.success && result.status === 401 && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Authentication failed. Please check your login credentials and try again.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                  {onRetryTest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetryTest(result.id)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No test results match the current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
