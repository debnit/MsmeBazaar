'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal
} from 'lucide-react';
import { MSMEOnboardingItem, adminApi } from '@/lib/api/admin';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface MSMEOnboardingQueueProps {
  items: MSMEOnboardingItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function MSMEOnboardingQueue({ 
  items, 
  isLoading, 
  onRefresh 
}: MSMEOnboardingQueueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMSME, setSelectedMSME] = useState<MSMEOnboardingItem | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'view';
    msme: MSMEOnboardingItem | null;
  }>({ open: false, type: 'view', msme: null });
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter items based on search and status
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { variant: 'secondary' as const, label: 'Draft' },
      SUBMITTED: { variant: 'warning' as const, label: 'Submitted' },
      UNDER_REVIEW: { variant: 'default' as const, label: 'Under Review' },
      APPROVED: { variant: 'success' as const, label: 'Approved' },
      REJECTED: { variant: 'error' as const, label: 'Rejected' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getVerificationBadge = (level: string) => {
    const levelConfig = {
      BASIC: { variant: 'secondary' as const, label: 'Basic' },
      DOCUMENT_VERIFIED: { variant: 'warning' as const, label: 'Documents' },
      FINANCIAL_VERIFIED: { variant: 'default' as const, label: 'Financial' },
      FULL_VERIFIED: { variant: 'success' as const, label: 'Full Verified' },
    };
    
    const config = levelConfig[level as keyof typeof levelConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleStatusUpdate = async (
    msmeId: string, 
    newStatus: string, 
    notes: string
  ) => {
    setIsUpdating(true);
    try {
      await adminApi.updateMSMEStatus(msmeId, newStatus, notes);
      toast.success(`MSME status updated to ${newStatus}`);
      setActionDialog({ open: false, type: 'view', msme: null });
      setNotes('');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update MSME status');
    } finally {
      setIsUpdating(false);
    }
  };

  const openActionDialog = (
    type: 'approve' | 'reject' | 'view', 
    msme: MSMEOnboardingItem
  ) => {
    setActionDialog({ open: true, type, msme });
    setNotes('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MSME Onboarding Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            MSME Onboarding Queue
          </CardTitle>
          <Button onClick={onRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by company name, user name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Business Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No MSME applications found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                          <div className="font-medium">{item.company_name}</div>
                          <div className="text-sm text-gray-500">{item.industry}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{item.user.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{item.user.phone}</span>
                        </div>
                        {item.user.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{item.user.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {item.business_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    
                    <TableCell>
                      {getVerificationBadge(item.verification_level)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{formatDate(item.created_at)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openActionDialog('view', item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {item.status === 'SUBMITTED' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openActionDialog('approve', item)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openActionDialog('reject', item)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'view' && 'MSME Details'}
              {actionDialog.type === 'approve' && 'Approve MSME Application'}
              {actionDialog.type === 'reject' && 'Reject MSME Application'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'view' && 'View complete MSME profile information'}
              {actionDialog.type === 'approve' && 'Approve this MSME application for listing'}
              {actionDialog.type === 'reject' && 'Reject this MSME application with reason'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.msme && (
            <div className="space-y-4">
              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <p className="text-sm text-gray-600">{actionDialog.msme.company_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Business Type</label>
                  <p className="text-sm text-gray-600">{actionDialog.msme.business_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Industry</label>
                  <p className="text-sm text-gray-600">{actionDialog.msme.industry}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Status</label>
                  <div className="mt-1">
                    {getStatusBadge(actionDialog.msme.status)}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contact Person</label>
                    <p className="text-sm text-gray-600">{actionDialog.msme.user.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-gray-600">{actionDialog.msme.user.phone}</p>
                  </div>
                  {actionDialog.msme.user.email && (
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-gray-600">{actionDialog.msme.user.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action specific fields */}
              {actionDialog.type !== 'view' && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder={`Add notes for ${actionDialog.type === 'approve' ? 'approval' : 'rejection'}...`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ ...actionDialog, open: false })}
            >
              Cancel
            </Button>
            
            {actionDialog.type === 'approve' && (
              <Button
                onClick={() => handleStatusUpdate(
                  actionDialog.msme!.id, 
                  'APPROVED', 
                  notes
                )}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? 'Approving...' : 'Approve'}
              </Button>
            )}
            
            {actionDialog.type === 'reject' && (
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate(
                  actionDialog.msme!.id, 
                  'REJECTED', 
                  notes
                )}
                disabled={isUpdating}
              >
                {isUpdating ? 'Rejecting...' : 'Reject'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default MSMEOnboardingQueue;