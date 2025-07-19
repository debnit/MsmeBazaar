import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, DollarSign, Clock, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EscrowAccount {
  id: number;
  buyerId: number;
  sellerId: number;
  msmeId: number;
  amount: number;
  currency: string;
  status: 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';
  createdAt: string;
  updatedAt: string;
  releaseConditions: string[];
  milestones: EscrowMilestone[];
}

interface EscrowMilestone {
  id: number;
  escrowId: number;
  description: string;
  amount: number;
  status: 'pending' | 'completed' | 'disputed';
  dueDate: string;
  completedAt?: string;
  completedBy?: number;
  evidence?: string;
}

interface EscrowAnalytics {
  totalEscrows: number;
  pendingEscrows: number;
  fundedEscrows: number;
  releasedEscrows: number;
  disputedEscrows: number;
  totalVolume: number;
  releasedVolume: number;
  averageEscrowAmount: number;
  successRate: number;
  recentTransactions: any[];
}

export default function EscrowManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowAccount | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [milestoneEvidence, setMilestoneEvidence] = useState('');

  const { data: analytics, isLoading: analyticsLoading } = useQuery<EscrowAnalytics>({
    queryKey: ['/api/escrow/analytics'],
  });

  const { data: escrows, isLoading: escrowsLoading } = useQuery<EscrowAccount[]>({
    queryKey: ['/api/escrow/all'],
    queryFn: () => apiRequest('GET', '/api/escrow/all'),
  });

  const releaseFundsMutation = useMutation({
    mutationFn: (escrowId: number) => apiRequest('POST', `/api/escrow/${escrowId}/release`),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Funds have been released to the seller',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/escrow'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to release funds',
        variant: 'destructive',
      });
    },
  });

  const refundFundsMutation = useMutation({
    mutationFn: ({ escrowId, reason }: { escrowId: number; reason: string }) =>
      apiRequest('POST', `/api/escrow/${escrowId}/refund`, { reason }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Funds have been refunded to the buyer',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/escrow'] });
      setRefundReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to refund funds',
        variant: 'destructive',
      });
    },
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, evidence }: { milestoneId: number; evidence: string }) =>
      apiRequest('POST', '/api/escrow/milestone/complete', { milestoneId, evidence }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Milestone completed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/escrow'] });
      setMilestoneEvidence('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete milestone',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'funded': return 'bg-blue-100 text-blue-800';
    case 'released': return 'bg-green-100 text-green-800';
    case 'refunded': return 'bg-gray-100 text-gray-800';
    case 'disputed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (analyticsLoading || escrowsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escrow Management</h1>
          <p className="text-gray-600">Manage secure transactions and milestone-based payments</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Escrows</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalEscrows || 0}</div>
            <p className="text-xs text-gray-500">Active and completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.totalVolume || 0)}</div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.successRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-gray-500">Completed successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disputed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics?.disputedEscrows || 0}</div>
            <p className="text-xs text-gray-500">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="escrows" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="escrows">All Escrows</TabsTrigger>
          <TabsTrigger value="pending">Pending Actions</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="escrows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Escrow Accounts</CardTitle>
              <CardDescription>All escrow accounts and their current status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrows?.map((escrow) => (
                    <TableRow key={escrow.id}>
                      <TableCell>#{escrow.id}</TableCell>
                      <TableCell>{formatCurrency(escrow.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(escrow.status)}>
                          {escrow.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(escrow.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedEscrow(escrow)}>
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Escrow #{escrow.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Amount</Label>
                                    <p className="text-lg font-semibold">{formatCurrency(escrow.amount)}</p>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Badge className={getStatusColor(escrow.status)}>
                                      {escrow.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div>
                                  <Label>Release Conditions</Label>
                                  <ul className="list-disc pl-5 mt-1">
                                    {escrow.releaseConditions.map((condition, idx) => (
                                      <li key={idx} className="text-sm">{condition}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <Label>Milestones</Label>
                                  <div className="mt-2 space-y-2">
                                    {escrow.milestones.map((milestone) => (
                                      <div key={milestone.id} className="p-3 border rounded">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{milestone.description}</span>
                                          <Badge className={getStatusColor(milestone.status)}>
                                            {milestone.status}
                                          </Badge>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          Amount: {formatCurrency(milestone.amount)} •
                                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                        </div>
                                        {milestone.status === 'pending' && (
                                          <div className="mt-2 flex items-center space-x-2">
                                            <Input
                                              placeholder="Evidence or notes"
                                              value={milestoneEvidence}
                                              onChange={(e) => setMilestoneEvidence(e.target.value)}
                                              className="flex-1"
                                            />
                                            <Button
                                              size="sm"
                                              onClick={() => completeMilestoneMutation.mutate({
                                                milestoneId: milestone.id,
                                                evidence: milestoneEvidence,
                                              })}
                                              disabled={completeMilestoneMutation.isPending}
                                            >
                                              Complete
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {escrow.status === 'funded' && (
                                  <div className="flex space-x-2 pt-4">
                                    <Button
                                      onClick={() => releaseFundsMutation.mutate(escrow.id)}
                                      disabled={releaseFundsMutation.isPending}
                                      className="flex-1"
                                    >
                                      Release Funds
                                    </Button>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" className="flex-1">
                                          Refund
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Refund Escrow</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Reason for refund</Label>
                                            <Textarea
                                              value={refundReason}
                                              onChange={(e) => setRefundReason(e.target.value)}
                                              placeholder="Enter reason for refund..."
                                            />
                                          </div>
                                          <Button
                                            onClick={() => refundFundsMutation.mutate({
                                              escrowId: escrow.id,
                                              reason: refundReason,
                                            })}
                                            disabled={refundFundsMutation.isPending || !refundReason}
                                            className="w-full"
                                          >
                                            Confirm Refund
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!escrows || escrows.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No escrow accounts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Actions</CardTitle>
              <CardDescription>Escrows requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {escrows?.filter(e => e.status === 'funded' || e.status === 'pending').map((escrow) => (
                  <div key={escrow.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Escrow #{escrow.id}</h3>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(escrow.amount)} • {escrow.status}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {escrow.status === 'funded' && (
                          <Button
                            size="sm"
                            onClick={() => releaseFundsMutation.mutate(escrow.id)}
                            disabled={releaseFundsMutation.isPending}
                          >
                            Release Funds
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!escrows || escrows.filter(e => e.status === 'funded' || e.status === 'pending').length === 0) && (
                  <p className="text-center text-gray-500 py-8">No pending actions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disputed Escrows</CardTitle>
              <CardDescription>Escrows with disputes requiring resolution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {escrows?.filter(e => e.status === 'disputed').map((escrow) => (
                  <div key={escrow.id} className="p-4 border rounded-lg border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span>Escrow #{escrow.id}</span>
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(escrow.amount)} • Disputed
                        </p>
                      </div>
                      <Badge variant="destructive">
                        Requires Resolution
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!escrows || escrows.filter(e => e.status === 'disputed').length === 0) && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">No disputed escrows</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
