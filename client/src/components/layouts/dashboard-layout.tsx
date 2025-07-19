import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Calculator,
  CreditCard,
  Users,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  User,
  LogOut,
  ChevronDown,
  Home,
  TrendingUp,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/providers/theme-provider';
import { animationPresets } from '@/lib/theme';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
  isActive?: boolean;
  subItems?: Array<{ label: string; href: string }>;
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    isActive: true,
  },
  {
    label: 'My Listings',
    icon: Building2,
    href: '/listings',
    badge: '3',
  },
  {
    label: 'Valuation',
    icon: Calculator,
    href: '/valuation',
    subItems: [
      { label: 'Request Valuation', href: '/valuation/request' },
      { label: 'My Requests', href: '/valuation/requests' },
      { label: 'Reports', href: '/valuation/reports' },
    ],
  },
  {
    label: 'Loans',
    icon: CreditCard,
    href: '/loans',
    badge: 'New',
    subItems: [
      { label: 'Apply for Loan', href: '/loans/apply' },
      { label: 'My Applications', href: '/loans/applications' },
      { label: 'NBFC Partners', href: '/loans/partners' },
    ],
  },
  {
    label: 'Marketplace',
    icon: TrendingUp,
    href: '/marketplace',
  },
  {
    label: 'Documents',
    icon: FileText,
    href: '/documents',
  },
  {
    label: 'Analytics',
    icon: TrendingUp,
    href: '/analytics',
  },
];

const bottomNavItems: NavItem[] = [
  {
    label: 'Support',
    icon: HelpCircle,
    href: '/support',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
  },
];

export function DashboardLayout({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const toggleExpanded = (label: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 hidden w-72 bg-[var(--surface-primary)] border-r border-[var(--border-primary)] lg:block"
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="flex h-full flex-col">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--border-primary)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
              M
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">MSMEBazaar</h1>
              <p className="text-sm text-[var(--text-secondary)]">Business Platform</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => (
              <NavItemComponent
                key={item.label}
                item={item}
                isExpanded={expandedItems.has(item.label)}
                onToggleExpanded={() => toggleExpanded(item.label)}
              />
            ))}
          </nav>

          {/* Bottom Navigation */}
          <div className="px-4 py-4 border-t border-[var(--border-primary)] space-y-2">
            {bottomNavItems.map((item) => (
              <NavItemComponent key={item.label} item={item} />
            ))}
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-[var(--border-primary)]">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback className="bg-blue-500 text-white">JD</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    John Doe
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    TechStart Manufacturing
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
            />

            {/* Mobile Sidebar */}
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[var(--surface-primary)] border-r border-[var(--border-primary)] lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="flex h-full flex-col">
                {/* Mobile Header */}
                <div className="flex items-center justify-between px-6 py-6 border-b border-[var(--border-primary)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
                      M
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-[var(--text-primary)]">MSMEBazaar</h1>
                      <p className="text-sm text-[var(--text-secondary)]">Business Platform</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Mobile Navigation - Same as desktop */}
                <nav className="flex-1 px-4 py-6 space-y-2">
                  {navigationItems.map((item) => (
                    <NavItemComponent
                      key={item.label}
                      item={item}
                      isExpanded={expandedItems.has(item.label)}
                      onToggleExpanded={() => toggleExpanded(item.label)}
                    />
                  ))}
                </nav>

                <div className="px-4 py-4 border-t border-[var(--border-primary)] space-y-2">
                  {bottomNavItems.map((item) => (
                    <NavItemComponent key={item.label} item={item} />
                  ))}
                </div>

                <div className="p-4 border-t border-[var(--border-primary)]">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="/placeholder-avatar.jpg" />
                        <AvatarFallback className="bg-blue-500 text-white">JD</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          John Doe
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          TechStart Manufacturing
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--border-primary)] bg-[var(--surface-primary)]/95 backdrop-blur-sm px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumbs */}
          {breadcrumbs && (
            <nav className="flex items-center space-x-2 text-sm">
              <Home className="h-4 w-4 text-[var(--text-muted)]" />
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <span className="text-[var(--text-muted)]">/</span>
                  <span className={index === breadcrumbs.length - 1 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}>
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-64 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] pl-10 pr-4 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--interactive-primary)]/20"
              />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 p-0 text-xs text-white">
                3
              </Badge>
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <Button variant="ghost" size="sm" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="bg-blue-500 text-white text-xs">JD</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {/* Page Header */}
          {(title || subtitle || actions) && (
            <motion.div
              className="mb-8"
              {...animationPresets.slideUp}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {title && (
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-[var(--text-secondary)] mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                {actions && (
                  <div className="flex items-center gap-3">
                    {actions}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Page Content */}
          <motion.div
            {...animationPresets.fadeIn}
            transition={{ delay: 0.1 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// Navigation Item Component
function NavItemComponent({
  item,
  isExpanded,
  onToggleExpanded,
}: {
  item: NavItem;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const hasSubItems = item.subItems && item.subItems.length > 0;

  return (
    <div className="space-y-1">
      {/* Main Item */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <button
          className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
            item.isActive
              ? 'bg-[var(--interactive-primary)] text-white shadow-lg'
              : 'text-[var(--text-secondary)] hover:bg-[var(--interactive-secondary-hover)] hover:text-[var(--text-primary)]'
          }`}
          onClick={hasSubItems ? onToggleExpanded : undefined}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span className="flex-1">{item.label}</span>

          {item.badge && (
            <Badge
              variant={item.badge === 'New' ? 'default' : 'secondary'}
              className="h-5 px-2 text-xs"
            >
              {item.badge}
            </Badge>
          )}

          {hasSubItems && (
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>
      </motion.div>

      {/* Sub Items */}
      <AnimatePresence>
        {hasSubItems && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-8 space-y-1 overflow-hidden"
          >
            {item.subItems?.map((subItem) => (
              <motion.button
                key={subItem.label}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--interactive-secondary-hover)] hover:text-[var(--text-primary)]"
                whileHover={{ x: 4 }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                {subItem.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
