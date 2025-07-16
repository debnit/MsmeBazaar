import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ModernToaster } from "@/components/ui/modern-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/components/auth/auth-provider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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
import { VaaSDemoPage } from "@/pages/vaas-demo";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!user ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={AuthPage} />
          <Route path="/register" component={AuthPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          
          {/* Seller routes */}
          <Route path="/seller/dashboard" component={SellerDashboard} />
          <Route path="/seller/listing/new" component={SellerListingForm} />
          <Route path="/seller/listing/edit/:id" component={SellerListingForm} />
          
          {/* Buyer routes */}
          <Route path="/buyer/dashboard" component={BuyerDashboard} />
          <Route path="/buyer/browse" component={BuyerBrowseMsmes} />
          
          {/* Agent routes */}
          <Route path="/agent/dashboard" component={AgentDashboard} />
          
          {/* NBFC routes */}
          <Route path="/nbfc/dashboard" component={NbfcDashboard} />
          <Route path="/nbfc/loan-applications" component={NbfcLoanApplications} />
          
          {/* Admin routes */}
          <Route path="/admin/dashboard" component={AdminDashboard} />
          
          {/* VaaS Demo routes */}
          <Route path="/vaas-demo" component={VaaSDemoPage} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ModernToaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
