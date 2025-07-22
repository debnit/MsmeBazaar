import { z } from "zod"

// Valuation Form Schema with Zod validation
export const valuationFormSchema = z.object({
  // Company Information
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  industry: z.string().min(1, "Please select an industry"),
  subIndustry: z.string().optional(),
  establishedYear: z.number().min(1900).max(new Date().getFullYear()),
  legalStructure: z.enum(["proprietorship", "partnership", "pvt_ltd", "ltd", "llp"]),
  
  // Financial Data
  annualRevenue: z.number().min(0, "Revenue must be positive"),
  netProfit: z.number(),
  totalAssets: z.number().min(0, "Assets must be positive"),
  totalLiabilities: z.number().min(0, "Liabilities must be positive"),
  currentAssets: z.number().min(0, "Current assets must be positive"),
  currentLiabilities: z.number().min(0, "Current liabilities must be positive"),
  
  // Operational Data
  employeeCount: z.number().min(1, "Must have at least 1 employee"),
  marketPresence: z.enum(["local", "regional", "national", "international"]),
  customerBase: z.number().min(0, "Customer base must be positive"),
  
  // Growth & Risk Factors
  revenueGrowthRate: z.number().min(-100).max(1000),
  profitGrowthRate: z.number().min(-100).max(1000),
  marketPosition: z.enum(["leader", "challenger", "follower", "niche"]),
  riskFactors: z.array(z.string()).optional(),
  
  // Additional Information
  keyAssets: z.array(z.string()).optional(),
  intellectualProperty: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  
  // Valuation Purpose
  valuationPurpose: z.enum(["sale", "acquisition", "investment", "loan", "insurance", "other"]),
  urgency: z.enum(["immediate", "within_week", "within_month", "flexible"]),
})

export type ValuationFormData = z.infer<typeof valuationFormSchema>

// Valuation Result Types
export interface ValuationResult {
  id: string
  companyId: string
  valuationDate: string
  status: "processing" | "completed" | "failed"
  
  // Valuation Methods
  methods: {
    assetBased: ValuationMethod
    incomeBased: ValuationMethod
    marketBased: ValuationMethod
    discountedCashFlow: ValuationMethod
  }
  
  // Final Valuation
  finalValuation: {
    value: number
    range: {
      min: number
      max: number
    }
    confidence: number // 0-100
    methodology: string[]
  }
  
  // Analysis
  analysis: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
    keyDrivers: string[]
    riskFactors: string[]
  }
  
  // Comparables
  comparables: Comparable[]
  
  // Charts Data
  charts: {
    financialTrends: ChartData[]
    industryComparison: ChartData[]
    valuationBreakdown: ChartData[]
    riskAssessment: ChartData[]
  }
}

export interface ValuationMethod {
  name: string
  value: number
  weight: number
  confidence: number
  details: {
    methodology: string
    assumptions: string[]
    calculations: Record<string, number>
  }
}

export interface Comparable {
  id: string
  companyName: string
  industry: string
  revenue: number
  valuation: number
  multiple: number
  similarity: number // 0-100
}

export interface ChartData {
  label: string
  value: number
  color?: string
  category?: string
}

// UI State Types
export interface ValuationState {
  currentStep: number
  formData: Partial<ValuationFormData>
  isSubmitting: boolean
  result: ValuationResult | null
  error: string | null
}

// API Types
export interface ValuationRequest {
  companyData: ValuationFormData
  options?: {
    methods?: string[]
    includeComparables?: boolean
    includeCharts?: boolean
  }
}

export interface ValuationResponse {
  success: boolean
  data?: ValuationResult
  error?: string
  requestId: string
}