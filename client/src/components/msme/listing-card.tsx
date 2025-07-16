import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Building, 
  MapPin, 
  Users, 
  TrendingUp, 
  Heart, 
  Eye, 
  DollarSign,
  AlertTriangle,
  Star
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { buyerApi } from "@/lib/api";
import { MsmeListing } from "@shared/schema";

interface ListingCardProps {
  listing: MsmeListing;
  showActions?: boolean;
}

export default function ListingCard({ listing, showActions = true }: ListingCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const expressInterestMutation = useMutation({
    mutationFn: (data: any) => {
      // Mock API call - in real implementation this would call buyerApi.createInterest(data)
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 500);
      });
    },
    onSuccess: () => {
      toast({
        title: "Interest Expressed",
        description: "Your interest has been recorded. The seller will be notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/buyer/interests"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExpressInterest = () => {
    if (!user) return;
    
    expressInterestMutation.mutate({
      msmeId: listing.id,
      interestType: "inquiry",
      message: `I'm interested in acquiring ${listing.companyName}. Please share more details.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "under_review":
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case "sold":
        return <Badge className="bg-blue-100 text-blue-800">Sold</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {listing.isDistressed && (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Distressed
              </Badge>
            )}
            {!listing.isDistressed && (
              <Badge className="bg-green-100 text-green-800">
                <Star className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            )}
            {getStatusBadge(listing.status)}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">₹{listing.askingPrice} Cr</p>
            <p className="text-sm text-gray-500">Asking Price</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {listing.companyName}
            </h3>
            <p className="text-sm text-gray-500">{listing.industry}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span>₹{listing.annualTurnover} Cr Revenue</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Users className="h-4 w-4 mr-2" />
            <span>{listing.employeeCount} Employees</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{listing.city}, {listing.state}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Building className="h-4 w-4 mr-2" />
            <span>Est. {listing.establishedYear}</span>
          </div>
        </div>

        {listing.description && (
          <div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {isExpanded ? listing.description : `${listing.description.substring(0, 120)}...`}
            </p>
            {listing.description.length > 120 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-primary hover:text-primary/80 p-0 h-auto"
              >
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            )}
          </div>
        )}

        {listing.isDistressed && listing.distressReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">Distress Reason</span>
            </div>
            <p className="text-sm text-red-700">{listing.distressReason}</p>
          </div>
        )}

        {/* Financial Highlights */}
        <div className="bg-slate-50 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Financial Highlights</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Net Profit:</span>
              <span className="font-medium ml-2">₹{listing.netProfit || 0} Cr</span>
            </div>
            <div>
              <span className="text-gray-500">Total Assets:</span>
              <span className="font-medium ml-2">₹{listing.totalAssets || 0} Cr</span>
            </div>
          </div>
        </div>

        {/* Valuation */}
        {listing.valuationAmount && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Expert Valuation</span>
              <span className="text-lg font-bold text-blue-600">₹{listing.valuationAmount} Cr</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && user?.role === "buyer" && (
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={handleExpressInterest}
              disabled={expressInterestMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {expressInterestMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Heart className="h-4 w-4 mr-2" />
              )}
              Express Interest
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        )}

        {showActions && user?.role === "nbfc" && (
          <div className="flex space-x-2 pt-2">
            <Button className="flex-1 bg-secondary hover:bg-secondary/90">
              <DollarSign className="h-4 w-4 mr-2" />
              Facilitate Loan
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Assess Risk
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
