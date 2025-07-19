import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, TrendingUp, Shield, Plus, Eye, Download } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/layout/navbar";
import ComplianceStatusWidget from "@/components/compliance/status-widget";
import { dashboardApi, nbfcApi } from "@/lib/api";

export default function NbfcDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: dashboardApi.getStats,
  });

  const { data: recentApplications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/nbfc/loan-applications"],
    queryFn: nbfcApi.getLoanApplications,
    select: (data) => data?.slice(0, 5) || [],
  });

  const mockFeaturedListings = [
    {
      id: 1,
      companyName: "Bangalore Pharma Ltd",
      industry: "Pharmaceutical Manufacturing",
      askingPrice: "15.5",
      annualRevenue: "25",
      employeeCount: 150,
      city: "Bangalore",
      isDistressed: true,
      status: "active"
    },
    {
      id: 2,
      companyName: "Hyderabad Electronics",
      industry: "Electronics Manufacturing",
      askingPrice: "8.2",
      annualRevenue: "12",
      employeeCount: 85,
      city: "Hyderabad",
      isDistressed: false,
      status: "active"
    },
    {
      id: 3,
      companyName: "Gujarat Chemicals Ltd",
      industry: "Chemical Processing",
      askingPrice: "22.8",
      annualRevenue: "35",
      employeeCount: 220,
      city: "Ahmedabad",
      isDistressed: false,
      status: "active"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "disbursed":
        return <Badge className="bg-blue-100 text-blue-800">Disbursed</Badge>;
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
              <h1 className="text-3xl font-bold text-gray-900">NBFC Dashboard</h1>
              <p className="text-gray-600">Monitor loan applications, disbursements, and compliance metrics</p>
            </div>
            <Button className="bg-primary hover:bg-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              New Loan Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Loan Applications</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? "..." : stats?.loanApplications || 0}
                  </p>
                  <p className="text-sm text-success">+12% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Disbursed Amount</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{statsLoading ? "..." : Math.round((stats?.disbursedAmount || 0) / 10000000) || 45}.2 Cr
                  </p>
                  <p className="text-sm text-success">+8% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-warning" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active MSMEs</p>
                  <p className="text-2xl font-semibold text-gray-900">1,234</p>
                  <p className="text-sm text-success">+5% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">NPA Ratio</p>
                  <p className="text-2xl font-semibold text-gray-900">2.4%</p>
                  <p className="text-sm text-success">-0.3% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Applications */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Loan Applications</CardTitle>
                  <Link href="/nbfc/loan-applications">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !recentApplications || recentApplications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                    <p className="text-gray-500">New loan applications will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            MSME Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Loan Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Buyer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentApplications.map((application: any) => (
                          <tr key={application.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    Application #{application.id}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {application.msme?.industry || "Industry"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ₹{application.loanAmount} Cr
                              </div>
                              <div className="text-sm text-gray-500">
                                {application.interestRate}% interest
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                Buyer #{application.buyerId}
                              </div>
                              <div className="text-sm text-gray-500">
                                {application.creditScore ? `${application.creditScore} Credit Score` : "AAA Rating"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(application.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Button variant="ghost" size="sm">
                                Review
                              </Button>
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

          {/* Right Column */}
          <div className="space-y-6">
            {/* Compliance Status */}
            <ComplianceStatusWidget />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full bg-primary hover:bg-primary hover:opacity-90 text-left justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Loan Product
                  </Button>
                  <Button className="w-full text-left justify-start" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Browse MSME Listings
                  </Button>
                  <Button className="w-full text-left justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics Dashboard
                  </Button>
                  <Button className="w-full text-left justify-start" variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Agent Network
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Market Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Market Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Active MSMEs</span>
                    <span className="text-sm font-semibold text-gray-900">6 Crore+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Avg. Loan Size</span>
                    <span className="text-sm font-semibold text-gray-900">₹1.8 Cr</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Success Rate</span>
                    <span className="text-sm font-semibold text-success">78%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Avg. Processing Time</span>
                    <span className="text-sm font-semibold text-gray-900">14 Days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Featured MSME Listings */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Featured MSME Listings</CardTitle>
                <p className="text-sm text-gray-600">High-potential acquisition opportunities</p>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockFeaturedListings.map((listing) => (
                <div key={listing.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      listing.isDistressed 
                        ? "bg-red-100 text-red-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {listing.isDistressed ? "Distressed" : "Healthy"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">₹{listing.askingPrice} Cr</span>
                  </div>
                  <div className="flex items-center mb-3">
                    <div className="flex-shrink-0 h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">{listing.companyName}</h4>
                      <p className="text-sm text-gray-500">{listing.industry}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Annual Revenue</span>
                      <span className="font-medium">₹{listing.annualRevenue} Cr</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Employees</span>
                      <span className="font-medium">{listing.employeeCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium">{listing.city}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="w-full bg-secondary hover:bg-secondary/90">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Facilitate Loan
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
