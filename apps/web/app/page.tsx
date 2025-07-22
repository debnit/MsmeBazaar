import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, Users, TrendingUp, Shield, Zap, Globe } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-brand-600" />
              <h1 className="text-2xl font-bold text-gray-900">MSMEBazaar</h1>
              <span className="text-sm bg-brand-100 text-brand-700 px-2 py-1 rounded-full">v2.0</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/register">
                <Button variant="outline">Register</Button>
              </Link>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Connect. <span className="text-gradient">Grow.</span> Scale.
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              A modular platform to onboard MSMEs and match them with buyers, investors, and acquisition opportunities. 
              Powered by AI for intelligent matching and automated valuations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose MSMEBazaar V2.0?
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for scale with modern technology stack and AI-powered features
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle>AI-Powered Matching</CardTitle>
                <CardDescription>
                  Advanced vector embeddings and ML algorithms for precise buyer-seller matching
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle>Smart Valuations</CardTitle>
                <CardDescription>
                  XGBoost ML model with rule-based fallback for accurate business valuations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle>Secure & Scalable</CardTitle>
                <CardDescription>
                  OTP-based authentication, RBAC, and enterprise-grade security
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle>Multi-Role Platform</CardTitle>
                <CardDescription>
                  Dedicated experiences for MSMEs, buyers, investors, and administrators
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle>API-First Design</CardTitle>
                <CardDescription>
                  Microservices architecture with comprehensive API documentation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Building className="h-6 w-6 text-brand-600" />
                </div>
                <CardTitle>Modern Tech Stack</CardTitle>
                <CardDescription>
                  Next.js, FastAPI, PostgreSQL, Redis, and AI/ML integration
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Scale Your Business?
            </h3>
            <p className="text-brand-100 mb-8 text-lg">
              Join thousands of MSMEs who have found their perfect match through our platform
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Start Your Journey
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building className="h-6 w-6" />
                <span className="text-lg font-semibold">MSMEBazaar</span>
              </div>
              <p className="text-gray-400">
                Connecting MSMEs with opportunities for growth and scale.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/api">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/status">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/security">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MSMEBazaar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}