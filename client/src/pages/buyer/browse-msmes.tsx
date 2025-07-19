import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Building, MapPin, Users, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/navbar';
import ListingCard from '@/components/msme/listing-card';
import { msmeApi } from '@/lib/api';

export default function BrowseMsmes() {
  const [filters, setFilters] = useState({
    industry: '',
    city: '',
    status: 'active',
    minPrice: '',
    maxPrice: '',
    search: '',
  });

  // Mock data for development
  const listings = [
    {
      id: 1,
      companyName: 'Mumbai Textiles Pvt Ltd',
      industry: 'Textiles',
      subIndustry: 'Garment Manufacturing',
      city: 'Mumbai',
      state: 'Maharashtra',
      askingPrice: 2.5,
      annualTurnover: 5.2,
      netProfit: 0.8,
      employeeCount: 45,
      establishedYear: 2010,
      description: 'Well-established textile manufacturing company with strong client base',
      status: 'active',
      rating: 4.2,
      isDistressed: false,
    },
    {
      id: 2,
      companyName: 'Pune Food Processing Ltd',
      industry: 'Food Processing',
      subIndustry: 'Packaged Foods',
      city: 'Pune',
      state: 'Maharashtra',
      askingPrice: 1.8,
      annualTurnover: 3.1,
      netProfit: 0.5,
      employeeCount: 32,
      establishedYear: 2015,
      description: 'Modern food processing unit with automated packaging systems',
      status: 'active',
      rating: 4.5,
      isDistressed: false,
    },
    {
      id: 3,
      companyName: 'Chennai Auto Parts Ltd',
      industry: 'Automotive',
      subIndustry: 'Components',
      city: 'Chennai',
      state: 'Tamil Nadu',
      askingPrice: 3.2,
      annualTurnover: 6.8,
      netProfit: 1.2,
      employeeCount: 67,
      establishedYear: 2008,
      description: 'Leading automotive components manufacturer with OEM partnerships',
      status: 'active',
      rating: 4.8,
      isDistressed: false,
    },
    {
      id: 4,
      companyName: 'Bangalore Tech Solutions',
      industry: 'Information Technology',
      subIndustry: 'Software Development',
      city: 'Bangalore',
      state: 'Karnataka',
      askingPrice: 2.1,
      annualTurnover: 4.2,
      netProfit: 0.9,
      employeeCount: 28,
      establishedYear: 2018,
      description: 'Growing software development company with international clients',
      status: 'active',
      rating: 4.3,
      isDistressed: false,
    },
  ];
  const isLoading = false;

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      industry: '',
      city: '',
      status: 'active',
      minPrice: '',
      maxPrice: '',
      search: '',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/buyer/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Browse MSMEs</h1>
          <p className="text-gray-600">Discover verified MSME opportunities for acquisition</p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Company name, industry..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={filters.industry} onValueChange={(value) => handleFilterChange('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Industries</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                    <SelectItem value="textiles">Textiles</SelectItem>
                    <SelectItem value="automotive">Automotive</SelectItem>
                    <SelectItem value="chemicals">Chemicals</SelectItem>
                    <SelectItem value="food_processing">Food Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="city">Location</Label>
                <Input
                  id="city"
                  placeholder="City or state"
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="minPrice">Min Price (₹ Crore)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="e.g., 1"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="maxPrice">Max Price (₹ Crore)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="e.g., 50"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !listings || listings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No listings found</h3>
              <p className="text-gray-500">Try adjusting your filters or search criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                Found {listings.length} listing{listings.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing: any) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
