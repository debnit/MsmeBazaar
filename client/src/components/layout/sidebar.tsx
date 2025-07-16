import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building, 
  Search, 
  FileText, 
  Users, 
  TrendingUp, 
  Shield, 
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  Calculator
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const sidebarItems = {
    seller: [
      { href: "/seller/dashboard", icon: Home, label: "Dashboard" },
      { href: "/seller/listing/new", icon: FileText, label: "New Listing" },
      { href: "/seller/listings", icon: Building, label: "My Listings" },
      { href: "/seller/analytics", icon: TrendingUp, label: "Analytics" },
    ],
    buyer: [
      { href: "/buyer/dashboard", icon: Home, label: "Dashboard" },
      { href: "/buyer/browse", icon: Search, label: "Browse MSMEs" },
      { href: "/buyer/interests", icon: Building, label: "My Interests" },
      { href: "/buyer/applications", icon: FileText, label: "Loan Applications" },
    ],
    agent: [
      { href: "/agent/dashboard", icon: Home, label: "Dashboard" },
      { href: "/agent/assignments", icon: Building, label: "Assignments" },
      { href: "/agent/earnings", icon: TrendingUp, label: "Earnings" },
      { href: "/agent/leads", icon: Users, label: "Leads" },
    ],
    nbfc: [
      { href: "/nbfc/dashboard", icon: Home, label: "Dashboard" },
      { href: "/nbfc/loan-applications", icon: FileText, label: "Applications" },
      { href: "/nbfc/loan-products", icon: Building, label: "Loan Products" },
      { href: "/nbfc/compliance", icon: Shield, label: "Compliance" },
      { href: "/nbfc/analytics", icon: TrendingUp, label: "Analytics" },
    ],
    admin: [
      { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
      { href: "/admin/revenue-dashboard", icon: TrendingUp, label: "Revenue" },
      { href: "/admin/whatsapp-dashboard", icon: Building, label: "WhatsApp" },
      { href: "/admin/users", icon: Users, label: "Users" },
      { href: "/admin/listings", icon: Building, label: "Listings" },
      { href: "/admin/approvals", icon: FileText, label: "Approvals" },
      { href: "/vaas-demo", icon: Calculator, label: "VaaS Demo" },
      { href: "/admin/system", icon: Settings, label: "System" },
    ]
  };

  const userItems = sidebarItems[user?.role as keyof typeof sidebarItems] || [];

  const roleColors = {
    seller: "bg-blue-100 text-blue-800",
    buyer: "bg-green-100 text-green-800",
    agent: "bg-purple-100 text-purple-800",
    nbfc: "bg-orange-100 text-orange-800",
    admin: "bg-red-100 text-red-800"
  };

  return (
    <div className={cn(
      "bg-white border-r border-slate-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <Building className="h-6 w-6 text-primary" />
              <span className="font-semibold text-primary">MSMESquare</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName || user.email?.split('@')[0]}
              </p>
              <Badge className={cn("text-xs", roleColors[user.role as keyof typeof roleColors])}>
                {user.role.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {userItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href);
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-10",
                  isActive ? "bg-primary/10 text-primary" : "text-gray-600 hover:text-gray-900",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>© 2024 MSMEAtlas</p>
            <p>RBI Licensed Platform</p>
          </div>
        </div>
      )}
    </div>
  );
}
