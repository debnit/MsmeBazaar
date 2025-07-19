import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Building, ArrowLeft, Save, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import Navbar from '@/components/layout/navbar';
import { msmeApi } from '@/lib/api';

const listingSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  industry: z.string().min(1, 'Industry is required'),
  subIndustry: z.string().optional(),
  establishedYear: z.number().min(1900).max(new Date().getFullYear()),
  legalStructure: z.string().min(1, 'Legal structure is required'),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),

  // Financial details
  annualTurnover: z.number().min(0, 'Annual turnover must be positive'),
  netProfit: z.number(),
  totalAssets: z.number().min(0, 'Total assets must be positive'),
  totalLiabilities: z.number().min(0, 'Total liabilities must be positive'),
  currentAssets: z.number().min(0, 'Current assets must be positive'),
  currentLiabilities: z.number().min(0, 'Current liabilities must be positive'),

  // Operational details
  employeeCount: z.number().min(1, 'Employee count is required'),
  productionCapacity: z.string().optional(),
  majorClients: z.string().optional(),
  majorSuppliers: z.string().optional(),

  // Location
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(6, 'Valid pincode is required'),

  // Valuation
  askingPrice: z.number().min(0, 'Asking price must be positive'),
  isDistressed: z.boolean(),
  distressReason: z.string().optional(),

  // Description
  description: z.string().min(50, 'Description must be at least 50 characters'),
});

type ListingFormData = z.infer<typeof listingSchema>;

export default function ListingForm() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const { data: listing, isLoading } = useQuery({
    queryKey: ['/api/msme/listings', id],
    queryFn: () => msmeApi.getListing(Number(id)),
    enabled: isEditing,
  });

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      companyName: '',
      businessType: '',
      industry: '',
      subIndustry: '',
      establishedYear: new Date().getFullYear(),
      legalStructure: '',
      registrationNumber: '',
      gstNumber: '',
      panNumber: '',
      annualTurnover: 0,
      netProfit: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      currentAssets: 0,
      currentLiabilities: 0,
      employeeCount: 1,
      productionCapacity: '',
      majorClients: '',
      majorSuppliers: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      askingPrice: 0,
      isDistressed: false,
      distressReason: '',
      description: '',
    },
  });

  // Populate form when editing
  React.useEffect(() => {
    if (listing && isEditing) {
      form.reset({
        companyName: listing.companyName || '',
        businessType: listing.businessType || '',
        industry: listing.industry || '',
        subIndustry: listing.subIndustry || '',
        establishedYear: listing.establishedYear || new Date().getFullYear(),
        legalStructure: listing.legalStructure || '',
        registrationNumber: listing.registrationNumber || '',
        gstNumber: listing.gstNumber || '',
        panNumber: listing.panNumber || '',
        annualTurnover: Number(listing.annualTurnover) || 0,
        netProfit: Number(listing.netProfit) || 0,
        totalAssets: Number(listing.totalAssets) || 0,
        totalLiabilities: Number(listing.totalLiabilities) || 0,
        currentAssets: Number(listing.currentAssets) || 0,
        currentLiabilities: Number(listing.currentLiabilities) || 0,
        employeeCount: listing.employeeCount || 1,
        productionCapacity: listing.productionCapacity || '',
        majorClients: listing.majorClients || '',
        majorSuppliers: listing.majorSuppliers || '',
        address: listing.address || '',
        city: listing.city || '',
        state: listing.state || '',
        pincode: listing.pincode || '',
        askingPrice: Number(listing.askingPrice) || 0,
        isDistressed: listing.isDistressed || false,
        distressReason: listing.distressReason || '',
        description: listing.description || '',
      });
    }
  }, [listing, isEditing, form]);

  const createMutation = useMutation({
    mutationFn: msmeApi.createListing,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'MSME listing created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/msme/my-listings'] });
      navigate('/seller/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => msmeApi.updateListing(Number(id), data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'MSME listing updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/msme/my-listings'] });
      navigate('/seller/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ListingFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/seller/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit' : 'Create'} MSME Listing
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update your' : 'Create a new'} MSME listing to connect with potential buyers
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Manufacturing, Trading" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="establishedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Established Year *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 2010"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="legalStructure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Structure *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select legal structure" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="private_limited">Private Limited</SelectItem>
                            <SelectItem value="public_limited">Public Limited</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="proprietorship">Proprietorship</SelectItem>
                            <SelectItem value="llp">LLP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Company registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input placeholder="GST registration number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <Input placeholder="PAN card number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="annualTurnover"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Turnover (₹ Crore) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 5.25"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="netProfit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Net Profit (₹ Crore)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 0.85"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="totalAssets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Assets (₹ Crore) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 8.50"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalLiabilities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Liabilities (₹ Crore) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 3.20"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="employeeCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Count *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 50"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="askingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asking Price (₹ Crore) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 12.50"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardHeader>
                <CardTitle>Location Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter complete address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mumbai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Maharashtra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 400001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your business, products, services, market position, etc."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="isDistressed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            This is a distressed asset
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('isDistressed') && (
                  <FormField
                    control={form.control}
                    name="distressReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distress Reason</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Explain the reason for distress"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Link href="/seller/dashboard">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary hover:bg-primary hover:opacity-90"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update' : 'Create'} Listing
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
