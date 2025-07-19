import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Plus, TrendingUp, Eye, DollarSign, FileText } from 'lucide-react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/navbar';
import { dashboardApi, msmeApi } from '@/lib/api';

export default function SellerDashboard() {
  const { user } = useAuth();

  // Mock data for development
  const stats = {
    totalListings: 3,
    activeListings: 2,
    totalViews: 450,
    totalInquiries: 25,
  };
  const statsLoading = false;

  const listings = [
    {
      id: 1,
      companyName: 'Mumbai Textiles Pvt Ltd',
      industry: 'Textiles',
      askingPrice: '2.5',
      status: 'active',
      views: 125,
      inquiries: 8,
      location: 'Mumbai, Maharashtra',
    },
    {
      id: 2,
      companyName: 'Pune Food Processing Ltd',
      industry: 'Food Processing',
      askingPrice: '1.8',
      status: 'under_review',
      views: 89,
      inquiries: 5,
      location: 'Pune, Maharashtra',
    },
    {
      id: 3,
      companyName: 'Chennai Auto Parts Ltd',
      industry: 'Automotive',
      askingPrice: '3.2',
      status: 'draft',
      views: 0,
      inquiries: 0,
      location: 'Chennai, Tamil Nadu',
    },
  ];
  const listingsLoading = false;

  const getStatusBadge = (status: string) => {
    switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'draft':
      return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    case 'under_review':
      return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
    case 'sold':
      return <Badge className="bg-blue-100 text-blue-800">Sold</Badge>;
    case 'suspended':
      return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
              <p className="text-gray-600">Manage your MSME listings and track performance</p>
            </div>
            <Link href="/seller/listing/new">
              <Button className="bg-primary hover:bg-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                New Listing
              </Button>
            </Link>
          </div>
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
                  <p className="text-sm font-medium text-gray-500">Total Listings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : stats?.totalListings || 0}
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
                  <p className="text-sm font-medium text-gray-500">Active Listings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : stats?.activeListings || 0}
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
                  <p className="text-sm font-medium text-gray-500">Sold Listings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : stats?.soldListings || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Views</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : '2,847'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Listings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              My MSME Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !listings || listings.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
                <p className="text-gray-500 mb-4">Create your first MSME listing to get started</p>
                <Link href="/seller/listing/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Listing
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asking Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {listings.map((listing: any) => (
                      <tr key={listing.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building className="h-5 w-5 text-primary" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {listing.companyName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {listing.city}, {listing.state}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{listing.industry}</div>
                          <div className="text-sm text-gray-500">{listing.businessType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{listing.askingPrice} Cr
                          </div>
                          <div className="text-sm text-gray-500">
                            Est. {listing.establishedYear}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(listing.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link href={`/seller/listing/edit/${listing.id}`}>
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
