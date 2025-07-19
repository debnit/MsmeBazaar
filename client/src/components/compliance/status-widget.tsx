import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertCircle, Clock, Download, ExternalLink } from 'lucide-react';
import { nbfcApi } from '@/lib/api';

export default function ComplianceStatusWidget() {
  const { data: complianceRecords, isLoading } = useQuery({
    queryKey: ['/api/nbfc/compliance'],
    queryFn: nbfcApi.getCompliance,
  });

  // Mock compliance data for demonstration
  const mockCompliance = {
    overall: 'compliant',
    items: [
      {
        name: 'Master Directions',
        status: 'compliant',
        description: 'All master directions are being followed as per RBI guidelines',
        lastChecked: '2024-01-15',
        nextReview: '2024-02-15',
      },
      {
        name: 'MSME Lending Guidelines',
        status: 'compliant',
        description: 'MSME lending guidelines are being followed. Fair practices code implemented.',
        lastChecked: '2024-01-15',
        nextReview: '2024-02-15',
      },
      {
        name: 'Scale-based Regulation',
        status: 'under_review',
        description: 'Current tier: upper. Scale-based regulation compliance under review.',
        lastChecked: '2024-01-10',
        nextReview: '2024-02-10',
      },
      {
        name: 'SRO Membership',
        status: 'compliant',
        description: 'Active membership with MFIN (recognized SRO). Regular compliance reporting.',
        lastChecked: '2024-01-15',
        nextReview: '2024-02-15',
      },
    ],
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'compliant':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'non_compliant':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'under_review':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
    case 'compliant':
      return <Badge className="bg-green-100 text-green-800">Compliant</Badge>;
    case 'non_compliant':
      return <Badge className="bg-red-100 text-red-800">Non-Compliant</Badge>;
    case 'under_review':
      return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-green-600" />
          RBI Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-900">Overall Status</p>
                  <p className="text-sm text-green-700">All systems compliant</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Compliant</Badge>
            </div>

            {/* Compliance Items */}
            <div className="space-y-3">
              {mockCompliance.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(item.status)}
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        Last checked: {item.lastChecked}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button className="w-full bg-secondary hover:bg-secondary/90">
                <Download className="h-4 w-4 mr-2" />
                Download Compliance Report
              </Button>
              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                View RBI Guidelines
              </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">98.5%</div>
                <div className="text-xs text-gray-600">Compliance Score</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">Upper</div>
                <div className="text-xs text-gray-600">RBI Tier</div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
