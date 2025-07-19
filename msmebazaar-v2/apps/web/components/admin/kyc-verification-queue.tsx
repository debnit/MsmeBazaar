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
  SelectValue,
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
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Building,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { KYCVerificationItem, adminApi } from '@/lib/api/admin';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface KYCVerificationQueueProps {
  items: KYCVerificationItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function KYCVerificationQueue({
  items,
  isLoading,
  onRefresh,
}: KYCVerificationQueueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'view';
    document: KYCVerificationItem | null;
  }>({ open: false, type: 'view', document: null });
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter items based on search and status
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.msme.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.msme.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.document_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'warning' as const, label: 'Pending' },
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

  const getDocumentTypeBadge = (type: string) => {
    const typeConfig = {
      GST_CERTIFICATE: { label: 'GST Certificate', color: 'bg-blue-100 text-blue-800' },
      PAN_CARD: { label: 'PAN Card', color: 'bg-green-100 text-green-800' },
      INCORPORATION_CERTIFICATE: { label: 'Incorporation', color: 'bg-purple-100 text-purple-800' },
      BALANCE_SHEET: { label: 'Balance Sheet', color: 'bg-orange-100 text-orange-800' },
      PROFIT_LOSS_STATEMENT: { label: 'P&L Statement', color: 'bg-red-100 text-red-800' },
      BANK_STATEMENT: { label: 'Bank Statement', color: 'bg-indigo-100 text-indigo-800' },
      AUDIT_REPORT: { label: 'Audit Report', color: 'bg-yellow-100 text-yellow-800' },
      BUSINESS_PLAN: { label: 'Business Plan', color: 'bg-pink-100 text-pink-800' },
      OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.OTHER;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleDocumentAction = async (
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    notes: string,
  ) => {
    setIsUpdating(true);
    try {
      await adminApi.updateDocumentStatus(documentId, status, notes);
      toast.success(`Document ${status.toLowerCase()} successfully`);
      setActionDialog({ open: false, type: 'view', document: null });
      setNotes('');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update document status');
    } finally {
      setIsUpdating(false);
    }
  };

  const openActionDialog = (
    type: 'approve' | 'reject' | 'view',
    document: KYCVerificationItem,
  ) => {
    setActionDialog({ open: true, type, document });
    setNotes('');
  };

  const handleViewDocument = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KYC Verification Queue</CardTitle>
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
            <FileText className="h-5 w-5" />
            KYC Verification Queue
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
              placeholder="Search by company name, document type..."
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
              <SelectItem value="PENDING">Pending</SelectItem>
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
                <TableHead>Document Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No KYC documents found
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
                          <div className="font-medium">{item.msme.company_name}</div>
                          <div className="text-sm text-gray-500">{item.msme.user.name}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {getDocumentTypeBadge(item.document_type)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm truncate max-w-32">{item.file_name}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(item.status)}
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
                          onClick={() => handleViewDocument(item.file_url)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openActionDialog('view', item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {item.status === 'PENDING' && (
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
              {actionDialog.type === 'view' && 'Document Details'}
              {actionDialog.type === 'approve' && 'Approve Document'}
              {actionDialog.type === 'reject' && 'Reject Document'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'view' && 'View document information and details'}
              {actionDialog.type === 'approve' && 'Approve this document for KYC verification'}
              {actionDialog.type === 'reject' && 'Reject this document with reason'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.document && (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <p className="text-sm text-gray-600">{actionDialog.document.msme.company_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Person</label>
                  <p className="text-sm text-gray-600">{actionDialog.document.msme.user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Document Type</label>
                  <div className="mt-1">
                    {getDocumentTypeBadge(actionDialog.document.document_type)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Status</label>
                  <div className="mt-1">
                    {getStatusBadge(actionDialog.document.status)}
                  </div>
                </div>
              </div>

              {/* File Info */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">File Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">File Name</label>
                    <p className="text-sm text-gray-600">{actionDialog.document.file_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Submitted Date</label>
                    <p className="text-sm text-gray-600">{formatDate(actionDialog.document.created_at)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleViewDocument(actionDialog.document!.file_url)}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Document
                  </Button>
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
                onClick={() => handleDocumentAction(
                  actionDialog.document!.id,
                  'APPROVED',
                  notes,
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
                onClick={() => handleDocumentAction(
                  actionDialog.document!.id,
                  'REJECTED',
                  notes,
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

export default KYCVerificationQueue;
