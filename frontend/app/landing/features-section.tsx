import { motion } from "framer-motion"
import { 
  Brain, 
  Shield, 
  Zap, 
  Users, 
  TrendingUp, 
  FileText, 
  Globe, 
  Clock,
  Calculator,
  Award,
  Target,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Smartphone,
  CreditCard,
  Building,
  Handshake,
  PieChart,
  MapPin
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const MAIN_FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Valuation Engine",
    description: "Advanced machine learning algorithms analyze 200+ parameters to provide accurate MSME valuations within minutes.",
    benefits: ["99.2% Accuracy Rate", "Real-time Analysis", "Industry Benchmarking"],
    color: "from-blue-500 to-purple-600"
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "Your financial data is protected with enterprise-level encryption and compliance with RBI guidelines.",
    benefits: ["256-bit Encryption", "RBI Compliant", "SOC 2 Certified"],
    color: "from-green-500 to-teal-600"
  },
  {
    icon: FileText,
    title: "Professional Reports",
    description: "Generate comprehensive valuation reports accepted by banks, investors, and regulatory bodies.",
    benefits: ["CA Verified", "Investor Ready", "Regulatory Compliant"],
    color: "from-orange-500 to-red-600"
  },
  {
    icon: Users,
    title: "Expert Network",
    description: "Connect with certified valuers, CAs, and industry experts for personalized guidance and validation.",
    benefits: ["500+ Experts", "24/7 Support", "Industry Specialists"],
    color: "from-purple-500 to-pink-600"
  }
]

const INDUSTRY_FEATURES = [
  {
    category: "Manufacturing",
    icon: Building,
    features: ["Asset Valuation", "Production Capacity Analysis", "Supply Chain Assessment"],
    companies: "15,000+ Manufacturing MSMEs"
  },
  {
    category: "Technology",
    icon: Smartphone,
    features: ["IP Valuation", "User Base Analysis", "Revenue Model Assessment"],
    companies: "8,500+ Tech Startups"
  },
  {
    category: "Retail & E-commerce",
    icon: CreditCard,
    features: ["Inventory Valuation", "Customer Analytics", "Market Position Analysis"],
    companies: "12,000+ Retail Businesses"
  },
  {
    category: "Services",
    icon: Handshake,
    features: ["Client Portfolio Analysis", "Recurring Revenue Valuation", "Brand Assessment"],
    companies: "20,000+ Service Providers"
  }
]

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Upload Business Data",
    description: "Securely upload your financial statements, GST returns, and business documents through our encrypted portal.",
    icon: FileText,
    time: "5 minutes"
  },
  {
    step: "02", 
    title: "AI Analysis",
    description: "Our advanced AI engine analyzes your data against 50,000+ similar businesses and market benchmarks.",
    icon: Brain,
    time: "15 minutes"
  },
  {
    step: "03",
    title: "Expert Review",
    description: "Certified valuers and industry experts review and validate the AI-generated insights for accuracy.",
    icon: Award,
    time: "2-4 hours"
  },
  {
    step: "04",
    title: "Comprehensive Report",
    description: "Receive a detailed valuation report with actionable insights and recommendations for growth.",
    icon: BarChart3,
    time: "24 hours"
  }
]

const PRICING_PLANS = [
  {
    name: "Basic",
    price: "₹2,999",
    period: "per valuation",
    description: "Perfect for small MSMEs seeking quick valuations",
    features: [
      "AI-powered valuation",
      "Basic financial analysis", 
      "PDF report generation",
      "Email support",
      "Valid for 30 days"
    ],
    popular: false,
    cta: "Get Started"
  },
  {
    name: "Professional", 
    price: "₹7,999",
    period: "per valuation",
    description: "Ideal for growing businesses and funding rounds",
    features: [
      "Everything in Basic",
      "Expert validation",
      "Detailed market analysis",
      "Investor-ready reports", 
      "Priority support",
      "Valid for 90 days",
      "Revision included"
    ],
    popular: true,
    cta: "Most Popular"
  },
  {
    name: "Enterprise",
    price: "₹15,999",
    period: "per valuation", 
    description: "Comprehensive solution for large MSMEs and IPO preparation",
    features: [
      "Everything in Professional",
      "Multiple valuation methods",
      "Regulatory compliance check",
      "Custom presentation",
      "Dedicated account manager",
      "Valid for 1 year",
      "Unlimited revisions"
    ],
    popular: false,
    cta: "Contact Sales"
  }
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Features */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 px-4 py-2 bg-blue-100 text-blue-800">
            <Zap className="w-4 h-4 mr-2" />
            Powerful Features
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Everything You Need for{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MSME Success
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive platform combines cutting-edge AI technology with expert insights 
            to deliver accurate valuations tailored for Indian MSMEs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {MAIN_FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-xl transition-shadow duration-300 border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} mb-6`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                  
                  <div className="space-y-3">
                    {feature.benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Industry-Specific Features */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tailored for Every Industry
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Specialized valuation models designed for different MSME sectors across India
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {INDUSTRY_FEATURES.map((industry, index) => (
              <motion.div
                key={industry.category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                      <industry.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{industry.category}</h3>
                    
                    <div className="space-y-2 mb-4">
                      {industry.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Badge variant="secondary" className="text-xs">
                      {industry.companies}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Process Flow */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get your MSME valuation in 4 simple steps - from data upload to comprehensive report
            </p>
          </div>

          <div className="relative">
            {/* Connection Lines */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 transform -translate-y-1/2" />
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {PROCESS_STEPS.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-8">
                      {/* Step Number */}
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white font-bold text-xl mb-6 relative z-10">
                        {step.step}
                      </div>
                      
                      {/* Icon */}
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl mb-4">
                        <step.icon className="w-6 h-6 text-gray-600" />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">{step.description}</p>
                      
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {step.time}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Pricing Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the plan that best fits your MSME's valuation needs. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {PRICING_PLANS.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <Card className={`h-full ${plan.popular ? 'ring-2 ring-blue-500 shadow-xl scale-105' : 'hover:shadow-lg'} transition-all duration-300`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="p-8">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-600 ml-2">{plan.period}</span>
                      </div>
                      <p className="text-gray-600">{plan.description}</p>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className={`w-full py-3 ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Need a custom solution for your enterprise? 
            </p>
            <Button variant="outline" size="lg">
              Contact Our Sales Team
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}