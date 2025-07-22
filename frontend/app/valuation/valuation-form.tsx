import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Building, 
  DollarSign, 
  Users, 
  TrendingUp, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Check
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

import { valuationFormSchema, type ValuationFormData } from "./types"

const STEPS = [
  { id: 1, name: "Company Info", icon: Building },
  { id: 2, name: "Financial Data", icon: DollarSign },
  { id: 3, name: "Operations", icon: Users },
  { id: 4, name: "Growth & Risk", icon: TrendingUp },
  { id: 5, name: "Review", icon: FileText }
]

const INDUSTRIES = [
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Retail",
  "Construction",
  "Food & Beverage",
  "Textiles",
  "Automotive",
  "Electronics",
  "Other"
]

const LEGAL_STRUCTURES = [
  { value: "proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "pvt_ltd", label: "Private Limited" },
  { value: "ltd", label: "Public Limited" },
  { value: "llp", label: "Limited Liability Partnership" }
]

interface ValuationFormProps {
  onSubmit: (data: ValuationFormData) => void
  isLoading?: boolean
}

export function ValuationForm({ onSubmit, isLoading = false }: ValuationFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const { toast } = useToast()

  const form = useForm<ValuationFormData>({
    resolver: zodResolver(valuationFormSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      establishedYear: new Date().getFullYear(),
      legalStructure: "pvt_ltd",
      annualRevenue: 0,
      netProfit: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      currentAssets: 0,
      currentLiabilities: 0,
      employeeCount: 1,
      marketPresence: "local",
      customerBase: 0,
      revenueGrowthRate: 0,
      profitGrowthRate: 0,
      marketPosition: "follower",
      valuationPurpose: "sale",
      urgency: "flexible"
    }
  })

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    } else {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before continuing.",
        variant: "destructive"
      })
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = (data: ValuationFormData) => {
    onSubmit(data)
  }

  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>MSME Valuation</CardTitle>
                <p className="text-muted-foreground">
                  Step {currentStep} of {STEPS.length}
                </p>
              </div>
              <Badge variant="secondary">
                {Math.round(progress)}% Complete
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <div className="flex justify-between items-center">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <motion.div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step.id < currentStep
                  ? "bg-primary text-primary-foreground border-primary"
                  : step.id === currentStep
                  ? "border-primary text-primary"
                  : "border-muted text-muted-foreground"
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {step.id < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </motion.div>
            <div className="ml-2 hidden sm:block">
              <p className={`text-sm font-medium ${
                step.id <= currentStep ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.name}
              </p>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mx-4 ${
                step.id < currentStep ? "bg-primary" : "bg-muted"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 1 && <CompanyInfoStep form={form} />}
              {currentStep === 2 && <FinancialDataStep form={form} />}
              {currentStep === 3 && <OperationsStep form={form} />}
              {currentStep === 4 && <GrowthRiskStep form={form} />}
              {currentStep === 5 && <ReviewStep form={form} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < STEPS.length ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : "Get Valuation"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}

// Step Components
function CompanyInfoStep({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
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
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry.toLowerCase()}>
                        {industry}
                      </SelectItem>
                    ))}
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
                <FormLabel>Established Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
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
            name="legalStructure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Structure</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LEGAL_STRUCTURES.map((structure) => (
                      <SelectItem key={structure.value} value={structure.value}>
                        {structure.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function FinancialDataStep({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Information
        </CardTitle>
        <p className="text-muted-foreground">
          Please provide your latest financial data (amounts in ₹)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="annualRevenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Revenue</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
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
                <FormLabel>Net Profit</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
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
            name="totalAssets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Assets</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
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
                <FormLabel>Total Liabilities</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
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
            name="currentAssets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Assets</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
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
            name="currentLiabilities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Liabilities</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
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
  )
}

function OperationsStep({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Operational Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="employeeCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Employees</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
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
            name="customerBase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Base</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Number of customers"
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
            name="marketPresence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Market Presence</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function GrowthRiskStep({ form }: { form: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Growth & Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="revenueGrowthRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Revenue Growth Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 15"
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
            name="profitGrowthRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profit Growth Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 20"
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
            name="marketPosition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Market Position</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="leader">Market Leader</SelectItem>
                    <SelectItem value="challenger">Challenger</SelectItem>
                    <SelectItem value="follower">Follower</SelectItem>
                    <SelectItem value="niche">Niche Player</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valuationPurpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valuation Purpose</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="acquisition">Acquisition</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewStep({ form }: { form: any }) {
  const formData = form.getValues()
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Review & Submit
        </CardTitle>
        <p className="text-muted-foreground">
          Please review your information before submitting for valuation.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Company Information</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {formData.companyName}</p>
              <p><strong>Industry:</strong> {formData.industry}</p>
              <p><strong>Established:</strong> {formData.establishedYear}</p>
              <p><strong>Legal Structure:</strong> {formData.legalStructure}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Financial Overview</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Revenue:</strong> ₹{formData.annualRevenue?.toLocaleString()}</p>
              <p><strong>Profit:</strong> ₹{formData.netProfit?.toLocaleString()}</p>
              <p><strong>Assets:</strong> ₹{formData.totalAssets?.toLocaleString()}</p>
              <p><strong>Employees:</strong> {formData.employeeCount}</p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            By submitting this form, you agree to our terms of service and privacy policy. 
            The valuation will be processed using industry-standard methodologies and 
            delivered within 24-48 hours.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function getFieldsForStep(step: number): (keyof ValuationFormData)[] {
  switch (step) {
    case 1:
      return ["companyName", "industry", "establishedYear", "legalStructure"]
    case 2:
      return ["annualRevenue", "totalAssets", "totalLiabilities", "currentAssets", "currentLiabilities"]
    case 3:
      return ["employeeCount", "marketPresence", "customerBase"]
    case 4:
      return ["revenueGrowthRate", "profitGrowthRate", "marketPosition", "valuationPurpose"]
    default:
      return []
  }
}