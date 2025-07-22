import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Building, Bell, User, LogOut, Settings, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/auth";

export default function Navbar() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const roleColors = {
    seller: "bg-blue-100 text-blue-800",
    buyer: "bg-green-100 text-green-800",
    agent: "bg-purple-100 text-purple-800",
    nbfc: "bg-orange-100 text-orange-800",
    admin: "bg-red-100 text-red-800"
  };

  const roleLabels = {
    seller: "Seller",
    buyer: "Buyer", 
    agent: "Agent",
    nbfc: "NBFC Partner",
    admin: "Admin"
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Building className="h-8 w-8 text-primary mr-2" />
                <span className="text-xl font-bold text-primary">MSMEAtlas</span>
              </div>
            </Link>
            {user?.role === "nbfc" && (
              <Badge className="ml-3 bg-success/10 text-success">
                <Shield className="h-3 w-3 mr-1" />
                RBI Verified
              </Badge>
            )}
          </div>

          {/* Role-based Navigation */}
          <nav className="hidden md:flex space-x-8">
            {user?.role === "seller" && (
              <>
                <Link href="/seller/dashboard">
                  <span className={`nav-link ${location.includes('/seller') ? 'nav-link-active' : ''}`}>
                    Dashboard
                  </span>
                </Link>
                <Link href="/seller/listing/new">
                  <span className="nav-link">New Listing</span>
                </Link>
              </>
            )}
            
            {user?.role === "buyer" && (
              <>
                <Link href="/buyer/dashboard">
                  <span className={`nav-link ${location.includes('/buyer') ? 'nav-link-active' : ''}`}>
                    Dashboard
                  </span>
                </Link>
                <Link href="/buyer/browse">
                  <span className="nav-link">Browse MSMEs</span>
                </Link>
              </>
            )}
            
            {user?.role === "agent" && (
              <>
                <Link href="/agent/dashboard">
                  <span className={`nav-link ${location.includes('/agent') ? 'nav-link-active' : ''}`}>
                    Dashboard
                  </span>
                </Link>
                <span className="nav-link">Assignments</span>
              </>
            )}
            
            {user?.role === "nbfc" && (
              <>
                <Link href="/nbfc/dashboard">
                  <span className={`nav-link ${location.includes('/nbfc') ? 'nav-link-active' : ''}`}>
                    Dashboard
                  </span>
                </Link>
                <Link href="/nbfc/loan-applications">
                  <span className="nav-link">Applications</span>
                </Link>
                <span className="nav-link">Compliance</span>
              </>
            )}
            
            {user?.role === "admin" && (
              <>
                <Link href="/admin/dashboard">
                  <span className={`nav-link ${location.includes('/admin') ? 'nav-link-active' : ''}`}>
                    Dashboard
                  </span>
                </Link>
                <span className="nav-link">Users</span>
                <span className="nav-link">Approvals</span>
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Role Badge */}
            {user && (
              <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                {roleLabels[user.role as keyof typeof roleLabels]}
              </Badge>
            )}
            
            {/* Notifications */}
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span className="hidden md:block">
                    {user?.firstName || user?.email?.split('@')[0] || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Role Switch Banner for NBFC */}
      {user?.role === "nbfc" && (
        <div className="fintech-gradient text-white py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="font-medium">NBFC Mode Active</span>
                <span>•</span>
                <span>RBI Compliance: Active</span>
              </div>
              <div className="flex items-center space-x-4">
                <span>Scale: Upper Layer</span>
                <Shield className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
