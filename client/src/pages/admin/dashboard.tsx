import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Building, FileText, Shield, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import { dashboardApi } from "@/lib/api";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: dashboardApi.getStats,
  });

  const mockPendingApprovals = [
    {
      id: 1,
      type: "listing",
      title: "Mumbai Textiles Pvt Ltd",
      description: "Textile manufacturing company in Mumbai",
      submittedBy: "seller@company.com",
      submittedAt: "2024-01-15",
      status: "pending"
    },
    {
      id: 2,
      type: "nbfc",
      title: "ABC Finance Ltd",
      description: "NBFC registration verification",
      submittedBy: "admin@abcfinance.com",
      submittedAt: "2024-01-14",
      status: "pending"
    },
    {
      id: 3,
      type: "listing",
      title: "Pune Auto Parts Ltd",
      description: "Automotive components manufacturer",
      submittedBy: "owner@puneauto.com",
      submittedAt: "2024-01-13",
      status: "pending"
    }
  ];

  const mockSystemMetrics = {
    totalUsers: 15847,
    activeListings: 2456,
    pendingApprovals: 23,
    totalTransactions: 1234,
    systemHealth: 98.5,
    uptime: "99.9%",
    avgResponseTime: "145ms",
    errorRate: "0.1%"
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor platform activity and manage system operations</p>
        </div>

        {/* System Health Alert */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">System Status: Healthy</h3>
                <p className="text-green-700">All systems operational • Uptime: {mockSystemMetrics.uptime} • Response Time: {mockSystemMetrics.avgResponseTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mockSystemMetrics.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">+5.2% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Listings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mockSystemMetrics.activeListings.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">+12% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mockSystemMetrics.pendingApprovals}
                  </p>
                  <p className="text-sm text-yellow-600">Requires attention</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mockSystemMetrics.totalTransactions.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">+8.1% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPendingApprovals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {item.type === "listing" ? (
                          <Building className="h-8 w-8 text-blue-600" />
                        ) : (
                          <Shield className="h-8 w-8 text-green-600" />
                        )}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        <p className="text-xs text-gray-400">
                          Submitted by {item.submittedBy} on {item.submittedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive">
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                System Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-900">System Health</p>
                    <p className="text-sm text-green-600">All services operational</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{mockSystemMetrics.systemHealth}%</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-900">Uptime</p>
                    <p className="text-sm text-blue-600">Last 30 days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{mockSystemMetrics.uptime}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium text-purple-900">Avg Response Time</p>
                    <p className="text-sm text-purple-600">API endpoints</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{mockSystemMetrics.avgResponseTime}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-orange-900">Error Rate</p>
                    <p className="text-sm text-orange-600">Last 24 hours</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">{mockSystemMetrics.errorRate}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button className="justify-start h-auto p-4 bg-blue-600 hover:bg-blue-700">
                <Users className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">User Management</div>
                  <div className="text-sm opacity-80">Manage user accounts</div>
                </div>
              </Button>
              
              <Button className="justify-start h-auto p-4 bg-green-600 hover:bg-green-700">
                <Building className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Listing Management</div>
                  <div className="text-sm opacity-80">Review MSME listings</div>
                </div>
              </Button>
              
              <Button className="justify-start h-auto p-4 bg-purple-600 hover:bg-purple-700">
                <Shield className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">NBFC Compliance</div>
                  <div className="text-sm opacity-80">Monitor compliance</div>
                </div>
              </Button>
              
              <Button className="justify-start h-auto p-4 bg-orange-600 hover:bg-orange-700">
                <FileText className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Reports</div>
                  <div className="text-sm opacity-80">Generate reports</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
