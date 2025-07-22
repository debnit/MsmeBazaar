import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, ArrowLeft, Eye, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/layout/navbar";
import { nbfcApi, loanApi } from "@/lib/api";

export default function LoanApplications() {
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["/api/nbfc/loan-applications", filters],
    queryFn: () => nbfcApi.getLoanApplications(),
  });

  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => loanApi.updateApplication(id, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Application updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nbfc/loan-applications"] });
      setSelectedApplication(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (applicationId: number, status: string, notes?: string) => {
    updateApplicationMutation.mutate({
      id: applicationId,
      data: { status, internalNotes: notes }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "disbursed":
        return <Badge className="bg-purple-100 text-purple-800">Disbursed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const filteredApplications = applications?.filter((app: any) => {
    const matchesStatus = !filters.status || app.status === filters.status;
    const matchesSearch = !filters.search || 
      app.id.toString().includes(filters.search) ||
      app.loanAmount.toString().includes(filters.search);
    
    return matchesStatus && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/nbfc/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Loan Applications</h1>
          <p className="text-gray-600">Review and manage MSME acquisition loan applications</p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Application ID, amount..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="disbursed">Disbursed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ status: "", search: "" })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Loan Applications ({filteredApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
                <p className="text-gray-500">Try adjusting your filters or wait for new applications</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loan Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Buyer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MSME
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredApplications.map((application: any) => (
                      <tr key={application.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            #{application.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{application.loanAmount} Cr
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.interestRate}% • {application.tenure} months
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            Buyer #{application.buyerId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.creditScore ? `Credit Score: ${application.creditScore}` : "Assessment pending"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            MSME #{application.msmeId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.loanPurpose || "Acquisition"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(application.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Application #{application.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Loan Amount</Label>
                                    <p className="text-lg font-semibold">₹{application.loanAmount} Cr</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Interest Rate</Label>
                                    <p className="text-lg font-semibold">{application.interestRate}%</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Tenure</Label>
                                    <p className="text-lg font-semibold">{application.tenure} months</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                                    <div className="mt-1">{getStatusBadge(application.status)}</div>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Purpose</Label>
                                  <p className="mt-1">{application.loanPurpose || "MSME Acquisition"}</p>
                                </div>
                                
                                {application.collateral && (
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Collateral</Label>
                                    <p className="mt-1">{application.collateral}</p>
                                  </div>
                                )}
                                
                                <div className="flex space-x-2">
                                  {application.status === "pending" && (
                                    <>
                                      <Button 
                                        onClick={() => handleStatusUpdate(application.id, "under_review")}
                                        disabled={updateApplicationMutation.isPending}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        <Clock className="h-4 w-4 mr-2" />
                                        Review
                                      </Button>
                                      <Button 
                                        onClick={() => handleStatusUpdate(application.id, "approved")}
                                        disabled={updateApplicationMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button 
                                        onClick={() => handleStatusUpdate(application.id, "rejected")}
                                        disabled={updateApplicationMutation.isPending}
                                        variant="destructive"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {application.status === "approved" && (
                                    <Button 
                                      onClick={() => handleStatusUpdate(application.id, "disbursed")}
                                      disabled={updateApplicationMutation.isPending}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Disburse
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
