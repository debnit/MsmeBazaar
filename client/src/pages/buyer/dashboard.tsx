import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  TrendingUp,
  Eye,
  Heart,
  FileText,
  Building,
} from 'lucide-react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/navbar';
import { dashboardApi, buyerApi } from '@/lib/api';

export default function BuyerDashboard() {
  // Mock data for development
  const stats = {
    totalViewed: 28,
    totalInterests: 5,
    activeInterests: 3,
    completedDeals: 1,
  };
  const statsLoading = false;

  const interests = [
    {
      id: 1,
      msme: {
        companyName: 'Mumbai Textiles Pvt Ltd',
        industry: 'Textiles',
        askingPrice: '2.5',
        location: 'Mumbai, Maharashtra',
      },
      status: 'active',
      interestDate: '2024-01-15',
      lastUpdated: '2024-01-20',
    },
    {
      id: 2,
      msme: {
        companyName: 'Pune Food Processing Ltd',
        industry: 'Food Processing',
        askingPrice: '1.8',
        location: 'Pune, Maharashtra',
      },
      status: 'accepted',
      interestDate: '2024-01-10',
      lastUpdated: '2024-01-18',
    },
    {
      id: 3,
      msme: {
        companyName: 'Chennai Auto Parts Ltd',
        industry: 'Automotive',
        askingPrice: '3.2',
        location: 'Chennai, Tamil Nadu',
      },
      status: 'withdrawn',
      interestDate: '2024-01-05',
      lastUpdated: '2024-01-12',
    },
  ];
  const interestsLoading = false;

  const getInterestStatusBadge = (status: string) => {
    switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'withdrawn':
      return <Badge className="bg-gray-100 text-gray-800">Withdrawn</Badge>;
    case 'accepted':
      return <Badge className="bg-blue-100 text-blue-800">Accepted</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
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
              <h1 className="text-3xl font-bold text-gray-900">
                Buyer Dashboard
              </h1>
              <p className="text-gray-600">
                Discover and acquire MSMEs that match your criteria
              </p>
            </div>
            <Link href="/buyer/browse">
              <Button className="bg-primary hover:bg-primary hover:opacity-90">
                <Search className="h-4 w-4 mr-2" />
                Browse MSMEs
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
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Interests
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : stats?.totalInterests || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Heart className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Active Interests
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : stats?.activeInterests || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Loan Applications
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : '3'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Acquisitions
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {statsLoading ? '...' : '1'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Recent Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interestsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !interests || interests.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No interests yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Browse MSMEs and express interest in potential acquisitions
                  </p>
                  <Link href="/buyer/browse">
                    <Button>
                      <Search className="h-4 w-4 mr-2" />
                      Browse MSMEs
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {interests.slice(0, 5).map((interest: any) => (
                    <div
                      key={interest.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <Building className="h-8 w-8 text-primary mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {interest.msme?.companyName || 'Company Name'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {interest.msme?.industry || 'Industry'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getInterestStatusBadge(interest.status)}
                        <p className="text-sm text-gray-500 mt-1">
                          {interest.offerAmount
                            ? `₹${interest.offerAmount} Cr`
                            : 'No offer'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/buyer/browse">
                  <Button className="w-full justify-start bg-primary hover:bg-primary hover:opacity-90">
                    <Search className="h-4 w-4 mr-2" />
                    Browse MSME Listings
                  </Button>
                </Link>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Loan Applications
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Portfolio Analytics
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Heart className="h-4 w-4 mr-2" />
                  Saved Searches
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Insights */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Market Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">6 Cr+</div>
                <div className="text-sm text-gray-600">Total MSMEs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">₹1.8 Cr</div>
                <div className="text-sm text-gray-600">
                  Avg. Acquisition Size
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">78%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  14 Days
                </div>
                <div className="text-sm text-gray-600">
                  Avg. Processing Time
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/*ml logic to be used later for showing top 5 msme
import { useEffect, useState } from "react";
import axios from "axios";
import { valuationEngine } from "@/ml/valuation-engine";
import type { MsmeListing } from "@shared/schema";
import type { ValuationResult } from "@/ml/valuation-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MSME extends MsmeListing {
  id: string;
  name: string;
  city: string;
  industry: string;
}

interface MatchResult {
  msme: MSME;
  valuation: ValuationResult;
  matchScore: number;
}

const buyerPreferences = {
  preferredCity: "Cuttack",
  maxBudget: 15000000,
  industry: "Manufacturing",
  minConfidence: 0.7,
};

export default function BuyerBrowseMSME() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const api = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get(`${api}/admin/msmes`);
        const listings: MSME[] = res.data;

        const evaluated = await Promise.all(
          listings.map(async (msme) => {
            const valuation = await valuationEngine.calculateValuation(msme);
            const matchScore = computeMatchScore(msme, valuation);
            return { msme, valuation, matchScore };
          })
        );

        const filtered = evaluated
          .filter(
            (m) =>
              m.valuation.estimatedValue <= buyerPreferences.maxBudget &&
              m.valuation.confidence >= buyerPreferences.minConfidence &&
              m.msme.industry === buyerPreferences.industry
          )
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);

        setMatches(filtered);
      } catch (err) {
        console.error("Error fetching MSMEs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const computeMatchScore = (msme: MSME, valuation: ValuationResult): number => {
    let score = 0;
    if (msme.city === buyerPreferences.preferredCity) score += 25;
    if (valuation.estimatedValue <= buyerPreferences.maxBudget) score += 30;
    if (valuation.confidence >= buyerPreferences.minConfidence) score += 25;
    if (msme.industry === buyerPreferences.industry) score += 20;
    return score;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Top 5 Matching MSMEs
        </h1>

        {loading ? (
          <div className="text-gray-500 text-sm">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="text-gray-600">No matching MSMEs found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map(({ msme, valuation, matchScore }) => (
              <Card key={msme.id}>
                <CardHeader>
                  <CardTitle>{msme.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-700">
                  <p>
                    📍 {msme.city} | 🏭 {msme.industry}
                  </p>
                  <p>
                    💰 <strong>Valuation:</strong> ₹{valuation.estimatedValue.toLocaleString()}
                  </p>
                  <p>
                    🎯 <strong>Confidence:</strong> {(valuation.confidence * 100).toFixed(0)}%
                  </p>
                  <p>
                    🧠 <strong>Recommendation:</strong>{" "}
                    <span
                      className={
                        valuation.recommendation === "undervalued"
                          ? "text-green-600"
                          : valuation.recommendation === "overvalued"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }
                    >
                      {valuation.recommendation.replace("_", " ")}
                    </span>
                  </p>
                  <p>
                    🔢 <strong>Match Score:</strong> <Badge>{matchScore} / 100</Badge>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}*/
