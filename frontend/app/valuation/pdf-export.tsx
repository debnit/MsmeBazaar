import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Download, 
  FileText, 
  Printer, 
  Share2, 
  Eye, 
  Settings,
  Check,
  Crown,
  Star,
  Building,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Award,
  Shield,
  Zap
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

import type { ValuationResult } from "./types"

const PDF_TEMPLATES = [
  {
    id: "professional",
    name: "Professional Report",
    description: "Comprehensive report for investors and banks",
    pages: 15,
    features: ["Executive Summary", "Financial Analysis", "Market Comparison", "Risk Assessment"],
    preview: "/templates/professional-preview.jpg",
    recommended: true
  },
  {
    id: "investor",
    name: "Investor Pitch",
    description: "Investor-focused presentation format",
    pages: 8,
    features: ["Key Metrics", "Growth Projections", "Market Opportunity", "Investment Highlights"],
    preview: "/templates/investor-preview.jpg",
    recommended: false
  },
  {
    id: "bank",
    name: "Bank Submission",
    description: "RBI compliant format for loan applications",
    pages: 12,
    features: ["Regulatory Compliance", "Credit Analysis", "Collateral Assessment", "Risk Metrics"],
    preview: "/templates/bank-preview.jpg",
    recommended: false
  },
  {
    id: "summary",
    name: "Executive Summary",
    description: "Concise overview for quick decisions",
    pages: 4,
    features: ["Key Valuation", "Quick Insights", "Action Items", "Contact Info"],
    preview: "/templates/summary-preview.jpg",
    recommended: false
  }
]

const EXPORT_OPTIONS = {
  language: [
    { value: "en", label: "English", flag: "🇬🇧" },
    { value: "hi", label: "हिंदी", flag: "🇮🇳" },
    { value: "gu", label: "ગુજરાતી", flag: "🇮🇳" },
    { value: "mr", label: "मराठी", flag: "🇮🇳" }
  ],
  format: [
    { value: "pdf", label: "PDF Document", icon: FileText },
    { value: "ppt", label: "PowerPoint", icon: FileText },
    { value: "word", label: "Word Document", icon: FileText }
  ],
  quality: [
    { value: "standard", label: "Standard (2MB)", description: "Good for email sharing" },
    { value: "high", label: "High Quality (5MB)", description: "Best for printing" },
    { value: "web", label: "Web Optimized (1MB)", description: "Fast online viewing" }
  ]
}

interface PDFExportProps {
  result: ValuationResult
  onExport: (config: ExportConfig) => Promise<void>
  isExporting?: boolean
}

interface ExportConfig {
  template: string
  language: string
  format: string
  quality: string
  includeCharts: boolean
  includeComparables: boolean
  includeRecommendations: boolean
  watermark: boolean
  customLogo?: File
  customMessage?: string
  recipientEmail?: string
}

export function PDFExport({ result, onExport, isExporting = false }: PDFExportProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("professional")
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    template: "professional",
    language: "en",
    format: "pdf",
    quality: "high",
    includeCharts: true,
    includeComparables: true,
    includeRecommendations: true,
    watermark: false,
    customMessage: "",
    recipientEmail: ""
  })
  const [showPreview, setShowPreview] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const handleExport = async () => {
    setExportProgress(0)
    
    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    try {
      await onExport({ ...exportConfig, template: selectedTemplate })
    } catch (error) {
      console.error("Export failed:", error)
      clearInterval(progressInterval)
    }
  }

  const selectedTemplateData = PDF_TEMPLATES.find(t => t.id === selectedTemplate)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Export Valuation Report
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Generate professional PDF reports with customizable templates and branding options
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Template Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Choose Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PDF_TEMPLATES.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer ${
                      selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <Card className={`h-full transition-all duration-200 ${
                      selectedTemplate === template.id ? 'shadow-lg' : 'hover:shadow-md'
                    }`}>
                      <CardContent className="p-4">
                        {template.recommended && (
                          <Badge className="absolute -top-2 -right-2 bg-orange-500">
                            <Crown className="w-3 h-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                        
                        <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <FileText className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Preview</p>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span>{template.pages} pages</span>
                          {selectedTemplate === template.id && (
                            <Check className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {template.features.slice(0, 3).map((feature) => (
                            <div key={feature} className="flex items-center gap-2 text-xs text-gray-600">
                              <Check className="w-3 h-3 text-green-500" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="format" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="format">Format</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="branding">Branding</TabsTrigger>
                </TabsList>
                
                <TabsContent value="format" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={exportConfig.language}
                        onValueChange={(value) => setExportConfig(prev => ({ ...prev, language: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPORT_OPTIONS.language.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              <span className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="format">File Format</Label>
                      <Select
                        value={exportConfig.format}
                        onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPORT_OPTIONS.format.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              <span className="flex items-center gap-2">
                                <format.icon className="w-4 h-4" />
                                <span>{format.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="quality">Quality</Label>
                    <Select
                      value={exportConfig.quality}
                      onValueChange={(value) => setExportConfig(prev => ({ ...prev, quality: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPORT_OPTIONS.quality.map((quality) => (
                          <SelectItem key={quality.value} value={quality.value}>
                            <div className="flex flex-col items-start">
                              <span>{quality.label}</span>
                              <span className="text-xs text-gray-500">{quality.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="charts">Include Charts & Graphs</Label>
                        <p className="text-sm text-gray-500">Visual representation of data</p>
                      </div>
                      <Switch
                        id="charts"
                        checked={exportConfig.includeCharts}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeCharts: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="comparables">Market Comparables</Label>
                        <p className="text-sm text-gray-500">Similar company analysis</p>
                      </div>
                      <Switch
                        id="comparables"
                        checked={exportConfig.includeComparables}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeComparables: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="recommendations">Recommendations</Label>
                        <p className="text-sm text-gray-500">Growth suggestions and insights</p>
                      </div>
                      <Switch
                        id="recommendations"
                        checked={exportConfig.includeRecommendations}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeRecommendations: checked }))}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="branding" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="watermark">MSMEBazaar Watermark</Label>
                      <p className="text-sm text-gray-500">Show platform branding</p>
                    </div>
                    <Switch
                      id="watermark"
                      checked={exportConfig.watermark}
                      onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, watermark: checked }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Custom Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Add a personalized message to the report..."
                      value={exportConfig.customMessage}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, customMessage: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Recipient Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="investor@company.com"
                      value={exportConfig.recipientEmail}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, recipientEmail: e.target.value }))}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          {/* Template Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTemplateData && (
                <div className="space-y-4">
                  <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-6 bg-blue-600 rounded"></div>
                      <div className="text-xs text-gray-500">Page 1 of {selectedTemplateData.pages}</div>
                    </div>
                    
                    <div className="space-y-3 flex-1">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      
                      <div className="bg-white rounded p-2 mt-4">
                        <div className="h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded mb-2"></div>
                        <div className="flex justify-between">
                          <div className="h-2 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <div className="h-2 bg-gray-200 rounded w-full"></div>
                        <div className="h-2 bg-gray-200 rounded w-4/5"></div>
                        <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Full Preview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Template:</span>
                  <span className="font-medium">{selectedTemplateData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium">{exportConfig.format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Language:</span>
                  <span className="font-medium">
                    {EXPORT_OPTIONS.language.find(l => l.value === exportConfig.language)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Size:</span>
                  <span className="font-medium">
                    {exportConfig.quality === 'high' ? '5MB' : 
                     exportConfig.quality === 'standard' ? '2MB' : '1MB'}
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-green-600">₹{result.estimatedValue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Estimated Valuation</div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Shield className="w-4 h-4" />
                  <span>Bank-grade security & encryption</span>
                </div>
              </div>
              
              {/* Export Progress */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Generating report...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              )}
              
              {/* Export Button */}
              <div className="space-y-2">
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </>
                  )}
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative bg-white rounded-2xl overflow-hidden max-w-4xl w-full mx-4 max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Report Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="aspect-[8.5/11] bg-white shadow-lg rounded-lg p-8 mx-auto max-w-2xl">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">MSME Valuation Report</h1>
                        <p className="text-gray-600">{result.inputs.companyName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Generated on</div>
                        <div className="font-medium">{new Date().toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600 mb-1">Estimated Value</div>
                        <div className="text-2xl font-bold text-green-700">
                          ₹{(result.estimatedValue / 1000000).toFixed(1)}M
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600 mb-1">Confidence</div>
                        <div className="text-2xl font-bold text-blue-700">{result.confidence}%</div>
                      </div>
                    </div>
                    
                    {/* Chart Placeholder */}
                    <div className="bg-gray-50 rounded-lg p-6 h-40 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                        <p>Valuation Methodology Chart</p>
                      </div>
                    </div>
                    
                    {/* Content Preview */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold">Executive Summary</h3>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}