import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, Building, Phone, Mail } from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import { dashboardApi } from '@/lib/api';

export default function AgentDashboard() {
  // Mock data for development
  const stats = {
    totalAssignments: 3,
    activeAssignments: 2,
    completedDeals: 1,
    totalCommissions: '12.65',
  };
  const statsLoading = false;

  const mockAssignments = [
    {
      id: 1,
      msme: {
        companyName: 'Mumbai Textiles Pvt Ltd',
        industry: 'Textiles',
        askingPrice: '2.5',
        city: 'Mumbai',
        state: 'Maharashtra',
      },
      commission: '2.5',
      status: 'active',
      potentialEarnings: '6.25',
    },
    {
      id: 2,
      msme: {
        companyName: 'Pune Food Processing Ltd',
        industry: 'Food Processing',
        askingPrice: '1.8',
        city: 'Pune',
        state: 'Maharashtra',
      },
      commission: '3.0',
      status: 'completed',
      potentialEarnings: '5.40',
    },
    {
      id: 3,
      msme: {
        companyName: 'Chennai Auto Parts Ltd',
        industry: 'Automotive',
        askingPrice: '3.2',
        city: 'Chennai',
        state: 'Tamil Nadu',
      },
      commission: '2.8',
      status: 'active',
      potentialEarnings: '8.96',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'completed':
      return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-gray-600">Manage your assigned MSMEs and track commission earnings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Assignments</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : stats?.totalAssignments || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Assignments</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : stats?.activeAssignments || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{statsLoading ? '...' : stats?.totalEarnings || 0} L
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed Deals</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : '12'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              My Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MSME Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asking Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Potential Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {assignment.msme.companyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {assignment.msme.industry} • {assignment.msme.city}, {assignment.msme.state}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{assignment.msme.askingPrice} Cr
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assignment.commission}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(assignment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          ₹{assignment.potentialEarnings} L
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4 mr-1" />
                          Contact
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Commission Structure */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2.5%</div>
                <div className="text-sm text-gray-600">Base Commission</div>
                <div className="text-xs text-gray-500 mt-1">Standard rate for all deals</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">+0.5%</div>
                <div className="text-sm text-gray-600">Distressed Asset Bonus</div>
                <div className="text-xs text-gray-500 mt-1">Additional for distressed MSMEs</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">+1.0%</div>
                <div className="text-sm text-gray-600">Quick Closure Bonus</div>
                <div className="text-xs text-gray-500 mt-1">For deals closed within 30 days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
