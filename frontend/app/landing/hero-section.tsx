import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowRight, 
  Play, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Building, 
  Star,
  Zap,
  Shield,
  Award,
  Globe,
  BarChart3
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const STATS = [
  { label: "MSMEs Valued", value: "50,000+", icon: Building },
  { label: "Total Funding Raised", value: "₹2,500Cr", icon: TrendingUp },
  { label: "Success Rate", value: "94%", icon: CheckCircle },
  { label: "Active Users", value: "25,000+", icon: Users }
]

const FEATURES = [
  "AI-Powered Valuation Engine",
  "Industry Expert Validation", 
  "Real-time Market Data",
  "Comprehensive Reports"
]

const TESTIMONIALS = [
  {
    name: "Rajesh Kumar",
    company: "Kumar Manufacturing",
    role: "Founder & CEO",
    content: "MSMEBazaar helped us get accurate valuation for our expansion funding. The AI-powered insights were incredibly detailed!",
    avatar: "/avatars/testimonial-1.jpg",
    rating: 5
  },
  {
    name: "Priya Sharma", 
    company: "Sharma Textiles",
    role: "Managing Director",
    content: "The platform made our IPO preparation seamless. Professional reports and expert guidance throughout the process.",
    avatar: "/avatars/testimonial-2.jpg", 
    rating: 5
  },
  {
    name: "Amit Patel",
    company: "Patel Industries",
    role: "CFO",
    content: "Best MSME platform in India! Helped us secure ₹50 crores funding with their comprehensive valuation report.",
    avatar: "/avatars/testimonial-3.jpg",
    rating: 5
  }
]

export function HeroSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-60 animate-pulse" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-purple-200 rounded-full opacity-40 animate-bounce" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-green-200 rounded-full opacity-50 animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 border-blue-200">
                <Award className="w-4 h-4 mr-2" />
                India's #1 MSME Valuation Platform
              </Badge>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Unlock Your{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MSME's True Value
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                Get AI-powered business valuations, connect with investors, and scale your MSME with confidence. 
                Trusted by 50,000+ Indian businesses.
              </p>
            </motion.div>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Free Valuation
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-gray-300 hover:border-blue-500 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
                onClick={() => setIsVideoPlaying(true)}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-6 pt-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Avatar key={i} className="w-8 h-8 border-2 border-white">
                      <AvatarImage src={`/avatars/user-${i}.jpg`} />
                      <AvatarFallback>U{i}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  Join 25,000+ MSMEs
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-gray-600 ml-1">4.9/5 rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Interactive Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Dashboard Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Live Valuation Dashboard</h3>
                    <p className="text-blue-100">Real-time MSME insights</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm">Live</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Valuation</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700">₹2.5Cr</div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Confidence</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">94%</div>
                  </div>
                </div>

                {/* Chart Placeholder */}
                <div className="bg-gray-50 rounded-xl p-4 h-32 flex items-center justify-center">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-spin opacity-20" />
                    <span className="text-gray-500 font-medium">Interactive Charts Loading...</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Generate Report
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Share Results
                  </Button>
                </div>
              </div>
            </div>

            {/* Floating Cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-semibold">Bank Grade Security</span>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-semibold">AI-Powered</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-20"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mb-4">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonial Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by India's Leading MSMEs
            </h2>
            <p className="text-gray-600 text-lg">
              See what our customers say about their experience
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="p-8 text-center bg-white shadow-xl border-0">
                  <CardContent className="space-y-6">
                    <div className="flex justify-center mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    
                    <blockquote className="text-xl text-gray-700 leading-relaxed italic">
                      "{TESTIMONIALS[currentTestimonial].content}"
                    </blockquote>
                    
                    <div className="flex items-center justify-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={TESTIMONIALS[currentTestimonial].avatar} />
                        <AvatarFallback>
                          {TESTIMONIALS[currentTestimonial].name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">
                          {TESTIMONIALS[currentTestimonial].name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {TESTIMONIALS[currentTestimonial].role}, {TESTIMONIALS[currentTestimonial].company}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Testimonial Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {TESTIMONIALS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial
                      ? 'bg-blue-600 w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative bg-white rounded-2xl overflow-hidden max-w-4xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Demo Video Coming Soon</p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}