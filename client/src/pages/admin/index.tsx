/**
 * Admin Dashboard Hub
 * Central hub for all admin functionalities including revenue, WhatsApp, and system management
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  MessageCircle, 
  Users, 
  BarChart3, 
  Settings, 
  Shield,
  FileText,
  Target,
  TrendingUp,
  Activity,
  Crown,
  Calculator
} from 'lucide-react';
import { Link } from 'wouter';

export default function AdminHub() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform management and analytics hub
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Administrator
          </Badge>
          <Badge variant="outline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            All Systems Online
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹5.2L</div>
            <p className="text-xs text-muted-foreground">+23% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">8,947</div>
            <p className="text-xs text-muted-foreground">+15% growth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">12.5K</div>
            <p className="text-xs text-muted-foreground">94.5% delivery rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deal Closures</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">89</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Revenue Dashboard */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span>Revenue Dashboard</span>
            </CardTitle>
            <CardDescription>
              Platform profitability and revenue tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Commission</div>
                  <div className="text-green-600">₹2.3L (45%)</div>
                </div>
                <div>
                  <div className="font-medium">Subscriptions</div>
                  <div className="text-blue-600">₹1.8L (35%)</div>
                </div>
                <div>
                  <div className="font-medium">EaaS</div>
                  <div className="text-orange-600">₹1.1L (20%)</div>
                </div>
                <div>
                  <div className="font-medium">Growth</div>
                  <div className="text-purple-600">+23%</div>
                </div>
              </div>
              <Link href="/admin/revenue-dashboard">
                <Button className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Revenue Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Dashboard */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <span>WhatsApp Business</span>
            </CardTitle>
            <CardDescription>
              Campaign management and user acquisition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Messages Sent</div>
                  <div className="text-blue-600">12,580</div>
                </div>
                <div>
                  <div className="font-medium">Response Rate</div>
                  <div className="text-purple-600">32.1%</div>
                </div>
                <div>
                  <div className="font-medium">New Registrations</div>
                  <div className="text-green-600">279</div>
                </div>
                <div>
                  <div className="font-medium">Active Campaigns</div>
                  <div className="text-orange-600">3</div>
                </div>
              </div>
              <Link href="/admin/whatsapp-dashboard">
                <Button className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Manage WhatsApp
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* VaaS Demo */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <span>VaaS Demo</span>
            </CardTitle>
            <CardDescription>
              Valuation-as-a-Service testing and demo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Pricing Tiers</div>
                  <div className="text-blue-600">4 tiers</div>
                </div>
                <div>
                  <div className="font-medium">Revenue Model</div>
                  <div className="text-green-600">IP-defensible</div>
                </div>
                <div>
                  <div className="font-medium">ML Engine</div>
                  <div className="text-purple-600">XGBoost</div>
                </div>
                <div>
                  <div className="font-medium">API Access</div>
                  <div className="text-orange-600">White-label</div>
                </div>
              </div>
              <Link href="/vaas-demo">
                <Button className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Launch VaaS Demo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>User Management</span>
            </CardTitle>
            <CardDescription>
              Manage users, roles, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Total Users</div>
                  <div className="text-blue-600">8,947</div>
                </div>
                <div>
                  <div className="font-medium">Active Today</div>
                  <div className="text-green-600">1,234</div>
                </div>
                <div>
                  <div className="font-medium">Verified</div>
                  <div className="text-purple-600">6,789</div>
                </div>
                <div>
                  <div className="font-medium">Premium</div>
                  <div className="text-orange-600">501</div>
                </div>
              </div>
              <Link href="/admin/users">
                <Button className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Analytics */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span>System Analytics</span>
            </CardTitle>
            <CardDescription>
              Performance metrics and system health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Uptime</div>
                  <div className="text-green-600">99.8%</div>
                </div>
                <div>
                  <div className="font-medium">Response Time</div>
                  <div className="text-blue-600">245ms</div>
                </div>
                <div>
                  <div className="font-medium">API Calls</div>
                  <div className="text-purple-600">45.2K</div>
                </div>
                <div>
                  <div className="font-medium">Errors</div>
                  <div className="text-orange-600">0.2%</div>
                </div>
              </div>
              <Link href="/admin/analytics">
                <Button className="w-full">
                  <Activity className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <span>System Settings</span>
            </CardTitle>
            <CardDescription>
              Platform configuration and maintenance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Database</div>
                  <div className="text-green-600">Healthy</div>
                </div>
                <div>
                  <div className="font-medium">Redis</div>
                  <div className="text-green-600">Connected</div>
                </div>
                <div>
                  <div className="font-medium">Storage</div>
                  <div className="text-blue-600">78% Used</div>
                </div>
                <div>
                  <div className="font-medium">Backups</div>
                  <div className="text-purple-600">Daily</div>
                </div>
              </div>
              <Link href="/admin/settings">
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New deal closed: Tech Solutions Pvt Ltd</span>
                  <span className="text-xs text-muted-foreground">2 minutes ago</span>
                </div>
                <p className="text-xs text-muted-foreground">₹12,50,000 transaction value</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Premium subscription activated</span>
                  <span className="text-xs text-muted-foreground">5 minutes ago</span>
                </div>
                <p className="text-xs text-muted-foreground">Manufacturing buyer - Mumbai</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">WhatsApp campaign completed</span>
                  <span className="text-xs text-muted-foreground">10 minutes ago</span>
                </div>
                <p className="text-xs text-muted-foreground">1,234 messages sent, 34% response rate</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">EaaS valuation completed</span>
                  <span className="text-xs text-muted-foreground">15 minutes ago</span>
                </div>
                <p className="text-xs text-muted-foreground">Restaurant business - Bangalore</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}