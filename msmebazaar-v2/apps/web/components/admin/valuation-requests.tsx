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
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Filter, 
  Eye, 
  DollarSign, 
  Download,
  Building,
  Calendar,
  FileText,
  Play,
  Settings,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { ValuationRequest, adminApi } from '@/lib/api/admin';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface ValuationRequestsProps {
  items: ValuationRequest[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ValuationRequests({ 
  items, 
  isLoading, 
  onRefresh 
}: ValuationRequestsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'view' | 'trigger' | 'override';
    valuation: ValuationRequest | null;
  }>({ open: false, type: 'view', valuation: null });
  const [notes, setNotes] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [triggerMethod, setTriggerMethod] = useState<'ML_MODEL' | 'RULE_BASED' | 'HYBRID' | 'MANUAL'>('ML_MODEL');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter items based on search and status
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.msme.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.msme.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { variant: 'warning' as const, label: 'Pending' },
      PROCESSING: { variant: 'default' as const, label: 'Processing' },
      COMPLETED: { variant: 'success' as const, label: 'Completed' },
      FAILED: { variant: 'error' as const, label: 'Failed' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    const methodConfig = {
      ML_MODEL: { label: 'ML Model', color: 'bg-blue-100 text-blue-800' },
      RULE_BASED: { label: 'Rule Based', color: 'bg-green-100 text-green-800' },
      HYBRID: { label: 'Hybrid', color: 'bg-purple-100 text-purple-800' },
      MANUAL: { label: 'Manual', color: 'bg-orange-100 text-orange-800' },
    };
    
    const config = methodConfig[method as keyof typeof methodConfig];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleTriggerValuation = async (msmeId: string, method: string) => {
    setIsUpdating(true);
    try {
      await adminApi.triggerValuation(msmeId, method as any);
      toast.success('Valuation triggered successfully');
      setActionDialog({ open: false, type: 'view', valuation: null });
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to trigger valuation');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOverrideValuation = async (valuationId: string, value: number, notes: string) => {
    setIsUpdating(true);
    try {
      await adminApi.overrideValuation(valuationId, value, notes);
      toast.success('Valuation overridden successfully');
      setActionDialog({ open: false, type: 'view', valuation: null });
      setOverrideValue('');
      setNotes('');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to override valuation');
    } finally {
      setIsUpdating(false);
    }
  };

  const openActionDialog = (
    type: 'view' | 'trigger' | 'override', 
    valuation: ValuationRequest
  ) => {
    setActionDialog({ open: true, type, valuation });
    setNotes('');
    setOverrideValue('');
  };

  const handleDownloadReport = (reportUrl: string) => {
    window.open(reportUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Valuation Requests</CardTitle>
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
            <TrendingUp className="h-5 w-5" />
            Valuation Requests
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
              placeholder="Search by company name..."
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
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
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
                <TableHead>Method</TableHead>
                <TableHead>Estimated Value</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No valuation requests found
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
                      {getMethodBadge(item.method)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {formatCurrency(item.estimated_value)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                          {(item.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              item.confidence >= 0.8 ? 'bg-green-500' :
                              item.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.reports.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              {item.reports.length} report(s)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400">No reports</span>
                          </div>
                        )}
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
                        
                        {item.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openActionDialog('trigger', item)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {item.status === 'COMPLETED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openActionDialog('override', item)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
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
              {actionDialog.type === 'view' && 'Valuation Details'}
              {actionDialog.type === 'trigger' && 'Trigger Valuation'}
              {actionDialog.type === 'override' && 'Override Valuation'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'view' && 'View valuation details and reports'}
              {actionDialog.type === 'trigger' && 'Start valuation process for this MSME'}
              {actionDialog.type === 'override' && 'Override the current valuation with manual value'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.valuation && (
            <div className="space-y-4">
              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <p className="text-sm text-gray-600">{actionDialog.valuation.msme.company_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Person</label>
                  <p className="text-sm text-gray-600">{actionDialog.valuation.msme.user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Method</label>
                  <div className="mt-1">
                    {getMethodBadge(actionDialog.valuation.method)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(actionDialog.valuation.status)}
                  </div>
                </div>
              </div>

              {/* Valuation Info */}
              {actionDialog.type === 'view' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Valuation Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Estimated Value</label>
                      <p className="text-sm text-gray-600 font-medium">
                        {formatCurrency(actionDialog.valuation.estimated_value)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Confidence Score</label>
                      <p className={`text-sm font-medium ${getConfidenceColor(actionDialog.valuation.confidence)}`}>
                        {(actionDialog.valuation.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Created Date</label>
                      <p className="text-sm text-gray-600">{formatDate(actionDialog.valuation.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Updated</label>
                      <p className="text-sm text-gray-600">{formatDate(actionDialog.valuation.updated_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reports */}
              {actionDialog.type === 'view' && actionDialog.valuation.reports.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Generated Reports</h4>
                  <div className="space-y-2">
                    {actionDialog.valuation.reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <div>
                            <p className="text-sm font-medium">{report.report_type} Report</p>
                            <p className="text-xs text-gray-500">
                              Generated on {formatDate(report.generated_at)}
                            </p>
                          </div>
                        </div>
                        {report.report_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadReport(report.report_url!)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trigger Method Selection */}
              {actionDialog.type === 'trigger' && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium">Valuation Method</label>
                  <Select value={triggerMethod} onValueChange={(value) => setTriggerMethod(value as any)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ML_MODEL">ML Model</SelectItem>
                      <SelectItem value="RULE_BASED">Rule Based</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Override Value */}
              {actionDialog.type === 'override' && (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium">New Valuation (₹)</label>
                    <Input
                      type="number"
                      placeholder="Enter new valuation amount"
                      value={overrideValue}
                      onChange={(e) => setOverrideValue(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Override Reason</label>
                    <Textarea
                      placeholder="Explain why you're overriding the valuation..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-2"
                      rows={3}
                    />
                  </div>
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
            
            {actionDialog.type === 'trigger' && (
              <Button
                onClick={() => handleTriggerValuation(
                  actionDialog.valuation!.msme_id, 
                  triggerMethod
                )}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? 'Triggering...' : 'Trigger Valuation'}
              </Button>
            )}
            
            {actionDialog.type === 'override' && (
              <Button
                onClick={() => handleOverrideValuation(
                  actionDialog.valuation!.id, 
                  parseFloat(overrideValue),
                  notes
                )}
                disabled={isUpdating || !overrideValue || !notes}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isUpdating ? 'Overriding...' : 'Override Valuation'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ValuationRequests;