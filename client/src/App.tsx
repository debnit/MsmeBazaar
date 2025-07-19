import React from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/api';
import { ToastProvider, useInitializeGlobalToast } from '@/lib/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { useAuth, AuthProvider } from '@/components/auth/auth-provider';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import InstantHomepage from '@/pages/instant-homepage';
import Dashboard from '@/pages/dashboard';
import ValuationPage from '@/pages/valuation';
import AuthPage from '@/pages/auth/login';
import RegisterPage from '@/pages/auth/register';
import SellerDashboard from '@/pages/seller/dashboard';
import SellerListingForm from '@/pages/seller/listing-form';
import BuyerDashboard from '@/pages/buyer/dashboard';
import BuyerBrowseMsmes from '@/pages/buyer/browse-msmes';
import AgentDashboard from '@/pages/agent/dashboard';
import NbfcDashboard from '@/pages/nbfc/dashboard';
import NbfcLoanApplications from '@/pages/nbfc/loan-applications';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminHub from '@/pages/admin/index';
import RevenueDashboard from '@/pages/admin/revenue-dashboard';
import WhatsAppDashboard from '@/pages/admin/whatsapp-dashboard';
import { VaaSDemoPage } from '@/pages/vaas-demo';

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
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return <>{children}</>;
};

const Router = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <main id="main-content" tabIndex={-1}>
      <Switch>
        <Route path="/" component={user ? Dashboard : Landing} />
        <Route path="/instant" component={InstantHomepage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/valuation" component={ValuationPage} />
        <Route path="/auth/login" component={AuthPage} />
        <Route path="/auth/register" component={RegisterPage} />
        <Route path="/seller/dashboard" component={SellerDashboard} />
        <Route path="/seller/listing-form" component={SellerListingForm} />
        <Route path="/buyer/dashboard" component={BuyerDashboard} />
        <Route path="/buyer/browse-msmes" component={BuyerBrowseMsmes} />
        <Route path="/agent/dashboard" component={AgentDashboard} />
        <Route path="/nbfc/dashboard" component={NbfcDashboard} />
        <Route path="/nbfc/loan-applications" component={NbfcLoanApplications} />
        <Route path="/admin" component={AdminHub} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/revenue-dashboard" component={RevenueDashboard} />
        <Route path="/admin/whatsapp-dashboard" component={WhatsAppDashboard} />
        <Route path="/vaas-demo" component={VaaSDemoPage} />
        <Route component={NotFound} />
      </Switch>
    </main>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ToastProvider>
            <AuthProvider>
              <AccessibilityProvider>
                <Router />
                <GlobalToastInitializer />
                <Toaster />
              </AccessibilityProvider>
            </AuthProvider>
          </ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// Component to initialize global toast
const GlobalToastInitializer = () => {
  useInitializeGlobalToast();
  return null;
};

export default App;
