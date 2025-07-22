import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { FileText, DollarSign, Calculator, Send } from "lucide-react";
import { loanApi } from "@/lib/api";
import { MsmeListing } from "@shared/schema";

const loanApplicationSchema = z.object({
  msmeId: z.number().min(1, "MSME selection is required"),
  nbfcId: z.number().min(1, "NBFC selection is required"),
  loanAmount: z.number().min(0.1, "Loan amount must be at least ₹0.1 Cr"),
  interestRate: z.number().min(0.1, "Interest rate must be positive"),
  tenure: z.number().min(6, "Minimum tenure is 6 months").max(240, "Maximum tenure is 240 months"),
  loanPurpose: z.string().min(1, "Loan purpose is required"),
  collateral: z.string().optional(),
  monthlyIncome: z.number().min(0, "Monthly income must be positive"),
  existingLoans: z.number().min(0, "Existing loans amount must be positive"),
  businessExperience: z.number().min(0, "Business experience must be positive"),
  additionalInfo: z.string().optional(),
});

type LoanApplicationFormData = z.infer<typeof loanApplicationSchema>;

interface LoanApplicationFormProps {
  msme: MsmeListing;
  onSuccess?: () => void;
}

export default function LoanApplicationForm({ msme, onSuccess }: LoanApplicationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculatedEmi, setCalculatedEmi] = useState<number | null>(null);

  const form = useForm<LoanApplicationFormData>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      msmeId: msme.id,
      nbfcId: 0,
      loanAmount: Number(msme.askingPrice) || 0,
      interestRate: 10.5,
      tenure: 60,
      loanPurpose: "MSME Acquisition",
      collateral: "",
      monthlyIncome: 0,
      existingLoans: 0,
      businessExperience: 0,
      additionalInfo: "",
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: loanApi.createApplication,
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your loan application has been submitted successfully. You will receive updates via email.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loan/applications"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateEmi = () => {
    const principal = form.getValues("loanAmount") * 10000000; // Convert crores to rupees
    const monthlyRate = form.getValues("interestRate") / 100 / 12;
    const tenure = form.getValues("tenure");

    if (principal > 0 && monthlyRate > 0 && tenure > 0) {
      const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
                  (Math.pow(1 + monthlyRate, tenure) - 1);
      setCalculatedEmi(emi);
    }
  };

  const onSubmit = (data: LoanApplicationFormData) => {
    createApplicationMutation.mutate(data);
  };

  // Mock NBFCs for selection
  const mockNbfcs = [
    { id: 1, name: "ABC Finance Ltd", rate: "9.5-12.0%" },
    { id: 2, name: "XYZ Capital", rate: "10.0-13.5%" },
    { id: 3, name: "Quick Loan NBFC", rate: "11.0-14.0%" },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Loan Application for {msme.companyName}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Complete the form below to apply for acquisition financing
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* MSME Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">MSME Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Company Name</Label>
                    <p className="text-sm font-semibold text-gray-900">{msme.companyName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Industry</Label>
                    <p className="text-sm font-semibold text-gray-900">{msme.industry}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Asking Price</Label>
                    <p className="text-sm font-semibold text-gray-900">₹{msme.askingPrice} Cr</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Annual Revenue</Label>
                    <p className="text-sm font-semibold text-gray-900">₹{msme.annualTurnover} Cr</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="nbfcId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select NBFC *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an NBFC partner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockNbfcs.map((nbfc) => (
                            <SelectItem key={nbfc.id} value={nbfc.id.toString()}>
                              {nbfc.name} - Interest Rate: {nbfc.rate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="loanAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Amount (₹ Crore) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 2.5"
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
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (% per annum) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="e.g., 10.5"
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
                    name="tenure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Tenure (Months) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 60"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end">
                    <Button type="button" onClick={calculateEmi} className="w-full">
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculate EMI
                    </Button>
                  </div>
                </div>

                {calculatedEmi && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Estimated Monthly EMI</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{calculatedEmi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="loanPurpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Purpose *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., MSME Acquisition"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collateral"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collateral (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe any collateral you can provide"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Financial Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Income (₹ Lakh) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 5.5"
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
                    name="existingLoans"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Existing Loans (₹ Lakh) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 25.0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="businessExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Experience (Years) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 10"
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
                  name="additionalInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information that might help with your application"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline">
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={createApplicationMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {createApplicationMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
