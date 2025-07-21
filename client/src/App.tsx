import React from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from "./lib/api";
import { ToastProvider, useInitializeGlobalToast } from "@/lib/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth, AuthProvider } from "@/components/auth/auth-provider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import InstantHomepage from "@/pages/instant-homepage";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth/login";
import SellerDashboard from "@/pages/seller/dashboard";
import SellerListingForm from "@/pages/seller/listing-form";
import BuyerDashboard from "@/pages/buyer/dashboard";
import BuyerBrowseMsmes from "@/pages/buyer/browse-msmes";
import AgentDashboard from "@/pages/agent/dashboard";
import NbfcDashboard from "@/pages/nbfc/dashboard";
import NbfcLoanApplications from "@/pages/nbfc/loan-applications";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminHub from "@/pages/admin/index";
import RevenueDashboard from "@/pages/admin/revenue-dashboard";
import WhatsAppDashboard from "@/pages/admin/whatsapp-dashboard";
import { VaaSDemoPage } from "@/pages/vaas-demo";

// Accessibility and keyboard navigation component
const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    // Add skip link for screen readers
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.setAttribute('tabindex', '0');
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Focus management for route changes
    const handleRouteChange = () => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
      }
    };

    // Listen for route changes (simplified)
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      document.body.removeChild(skipLink);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return <>{children}</>;
};

// Loading component with accessibility
const LoadingSpinner: React.FC = () => (
  <div 
    className="min-h-screen flex items-center justify-center"
    role="status"
    aria-label="Loading application"
  >
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      <p className="text-muted-foreground">Loading MSMEBazaar...</p>
    </div>
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-6">
              We're sorry, but something unexpected happened. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Router component with authentication
function Router() {
  const { user, isLoading, error } = useAuth();

  // Initialize global toast
  useInitializeGlobalToast();

  // Show loading spinner only for a brief moment
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <Switch>
        {!user ? (
          <>
            <Route path="/" component={InstantHomepage} />
            <Route path="/landing" component={Landing} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/login" component={AuthPage} />
            <Route path="/register" component={AuthPage} />
            <Route path="/vaas-demo" component={VaaSDemoPage} />
            {/* Fallback routes for when API is not available */}
            <Route path="/dashboard" component={InstantHomepage} />
            <Route path="/admin" component={InstantHomepage} />
            <Route path="/seller/:rest*" component={InstantHomepage} />
            <Route path="/buyer/:rest*" component={InstantHomepage} />
            <Route path="/agent/:rest*" component={InstantHomepage} />
            <Route path="/nbfc/:rest*" component={InstantHomepage} />
          </>
        ) : (
          <>
            <Route path="/" component={Dashboard} />
            
            {/* Seller routes */}
            {(user.role === "seller" || user.role === "admin") && (
              <>
                <Route path="/seller/dashboard" component={SellerDashboard} />
                <Route path="/seller/listing-form" component={SellerListingForm} />
              </>
            )}
            
            {/* Buyer routes */}
            {(user.role === "buyer" || user.role === "admin") && (
              <>
                <Route path="/buyer/dashboard" component={BuyerDashboard} />
                <Route path="/buyer/browse" component={BuyerBrowseMsmes} />
              </>
            )}
            
            {/* Agent routes */}
            {(user.role === "agent" || user.role === "admin") && (
              <Route path="/agent/dashboard" component={AgentDashboard} />
            )}
            
            {/* NBFC routes */}
            {(user.role === "nbfc" || user.role === "admin") && (
              <>
                <Route path="/nbfc/dashboard" component={NbfcDashboard} />
                <Route path="/nbfc/loan-applications" component={NbfcLoanApplications} />
              </>
            )}
            
            {/* Admin routes */}
            {user.role === "admin" && (
              <>
                <Route path="/admin" component={AdminHub} />
                <Route path="/admin/dashboard" component={AdminDashboard} />
                <Route path="/admin/revenue" component={RevenueDashboard} />
                <Route path="/admin/whatsapp" component={WhatsAppDashboard} />
              </>
            )}
            
            {/* Common authenticated routes */}
            <Route path="/vaas-demo" component={VaaSDemoPage} />
          </>
        )}
        
        {/* 404 route */}
        <Route component={NotFound} />
      </Switch>
    </main>
  );
}

// Main App component
export default function App() {
  React.useEffect(() => {
    // Set up meta tags for SEO
    const metaTags = [
      { name: 'description', content: 'MSMEBazaar - India\'s premier platform for MSME valuation, trading, and financial services. Connect with verified MSMEs, get accurate valuations, and access funding opportunities.' },
      { name: 'keywords', content: 'MSME, valuation, trading, India, business, SME, funding, marketplace' },
      { name: 'author', content: 'MSMEBazaar' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { property: 'og:title', content: 'MSMEBazaar - MSME Valuation & Trading Platform' },
      { property: 'og:description', content: 'India\'s premier platform for MSME valuation, trading, and financial services' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.origin },
      { property: 'og:image', content: `${window.location.origin}/og-image.jpg` },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'MSMEBazaar - MSME Valuation & Trading Platform' },
      { name: 'twitter:description', content: 'India\'s premier platform for MSME valuation, trading, and financial services' },
      { name: 'theme-color', content: '#3b82f6' },
    ];

    metaTags.forEach(({ name, property, content }) => {
      const existingTag = document.querySelector(
        `meta[${name ? 'name' : 'property'}="${name || property}"]`
      );
      
      if (existingTag) {
        existingTag.setAttribute('content', content);
      } else {
        const meta = document.createElement('meta');
        if (name) meta.setAttribute('name', name);
        if (property) meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    });

    // Set title
    document.title = 'MSMEBazaar - MSME Valuation & Trading Platform';

    // Add structured data for SEO
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'MSMEBazaar',
      description: 'India\'s premier platform for MSME valuation, trading, and financial services',
      url: window.location.origin,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        category: 'MSME Services',
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipProvider>
            <AccessibilityProvider>
              <AuthProvider>
                <div className="min-h-screen bg-background text-foreground font-sans antialiased">
                  <Router />
                </div>
              </AuthProvider>
            </AccessibilityProvider>
          </TooltipProvider>
        </ToastProvider>
        
        {/* React Query DevTools - only in development */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools 
            initialIsOpen={false} 
            position={"bottom-right" as any}
          />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
