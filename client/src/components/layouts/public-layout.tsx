import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Building2,
  Calculator,
  CreditCard,
  Users,
  Shield,
  Globe,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/providers/theme-provider';
import { animationPresets } from '@/lib/theme';

interface PublicLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  showFooter?: boolean;
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
  subItems?: Array<{ label: string; href: string; description?: string }>;
}

const navigationItems: NavItem[] = [
  {
    label: 'Services',
    href: '/services',
    subItems: [
      {
        label: 'Business Valuation',
        href: '/valuation',
        description: 'Get professional valuation for your MSME',
      },
      {
        label: 'Business Marketplace',
        href: '/marketplace',
        description: 'Buy and sell businesses with confidence',
      },
      {
        label: 'Business Loans',
        href: '/loans',
        description: 'Access funding from verified NBFCs',
      },
      {
        label: 'Due Diligence',
        href: '/due-diligence',
        description: 'Comprehensive business verification',
      },
    ],
  },
  {
    label: 'Solutions',
    href: '/solutions',
    subItems: [
      {
        label: 'For Sellers',
        href: '/solutions/sellers',
        description: 'List and sell your business',
      },
      {
        label: 'For Buyers',
        href: '/solutions/buyers',
        description: 'Find the perfect business opportunity',
      },
      {
        label: 'For NBFCs',
        href: '/solutions/nbfcs',
        description: 'Partner with us for lending',
      },
      {
        label: 'For Investors',
        href: '/solutions/investors',
        description: 'Discover investment opportunities',
      },
    ],
  },
  {
    label: 'About',
    href: '/about',
  },
  {
    label: 'Contact',
    href: '/contact',
  },
];

const footerLinks = {
  product: [
    { label: 'Business Valuation', href: '/valuation' },
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'Loan Services', href: '/loans' },
    { label: 'Due Diligence', href: '/due-diligence' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press Kit', href: '/press' },
    { label: 'Blog', href: '/blog' },
  ],
  support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'API Documentation', href: '/docs' },
    { label: 'Status Page', href: '/status' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Data Protection', href: '/data-protection' },
  ],
};

export function PublicLayout({
  children,
  showNavigation = true,
  showFooter = true,
  className = '',
}: PublicLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const handleDropdownToggle = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label);
  };

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] ${className}`}>
      {/* Navigation */}
      {showNavigation && (
        <motion.header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'bg-[var(--surface-primary)]/95 backdrop-blur-md border-b border-[var(--border-primary)] shadow-lg'
              : 'bg-transparent'
          }`}
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <motion.div
                className="flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
                  M
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">MSMEBazaar</h1>
                  <p className="text-xs text-[var(--text-secondary)] leading-none">Business Platform</p>
                </div>
              </motion.div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex md:items-center md:space-x-8">
                {navigationItems.map((item) => (
                  <div key={item.label} className="relative">
                    {item.subItems ? (
                      <DropdownMenu
                        label={item.label}
                        items={item.subItems}
                        isOpen={activeDropdown === item.label}
                        onToggle={() => handleDropdownToggle(item.label)}
                      />
                    ) : (
                      <motion.a
                        href={item.href}
                        className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
                        whileHover={{ scale: 1.05 }}
                      >
                        {item.label}
                      </motion.a>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Actions */}
              <div className="hidden md:flex md:items-center md:space-x-4">
                <ThemeToggle />
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center gap-3 md:hidden">
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={toggleMobileMenu}>
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </nav>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                className="md:hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-[var(--surface-primary)] border-t border-[var(--border-primary)] px-4 py-6 space-y-4">
                  {navigationItems.map((item) => (
                    <div key={item.label}>
                      {item.subItems ? (
                        <div>
                          <button
                            className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-[var(--text-primary)]"
                            onClick={() => handleDropdownToggle(item.label)}
                          >
                            {item.label}
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                activeDropdown === item.label ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          <AnimatePresence>
                            {activeDropdown === item.label && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-2 ml-4 space-y-2 overflow-hidden"
                              >
                                {item.subItems.map((subItem) => (
                                  <a
                                    key={subItem.label}
                                    href={subItem.href}
                                    className="block py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  >
                                    {subItem.label}
                                  </a>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <a
                          href={item.href}
                          className="block py-2 text-sm font-medium text-[var(--text-primary)]"
                        >
                          {item.label}
                        </a>
                      )}
                    </div>
                  ))}

                  <div className="pt-4 border-t border-[var(--border-primary)] space-y-3">
                    <Button variant="ghost" className="w-full justify-start">
                      Log In
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      )}

      {/* Main Content */}
      <main className={showNavigation ? 'pt-16' : ''}>
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="bg-[var(--surface-secondary)] border-t border-[var(--border-primary)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Brand Section */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-lg">
                    M
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)]">MSMEBazaar</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Business Platform</p>
                  </div>
                </div>
                <p className="text-[var(--text-secondary)] mb-6 max-w-md">
                  India's leading platform connecting MSMEs with buyers, investors, and financial services.
                  Empowering small businesses to grow and scale.
                </p>

                {/* Contact Info */}
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>+91 98765 43210</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>support@msmebazaar.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Bhubaneswar, Odisha, India</span>
                  </div>
                </div>
              </div>

              {/* Product Links */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Product</h3>
                <ul className="space-y-3">
                  {footerLinks.product.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Links */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Company</h3>
                <ul className="space-y-3">
                  {footerLinks.company.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Links */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Support</h3>
                <ul className="space-y-3">
                  {footerLinks.support.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-12 pt-8 border-t border-[var(--border-primary)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                  {footerLinks.legal.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--text-secondary)]">Follow us:</span>
                  <div className="flex gap-2">
                    {[
                      { icon: Facebook, href: '#' },
                      { icon: Twitter, href: '#' },
                      { icon: Linkedin, href: '#' },
                      { icon: Instagram, href: '#' },
                    ].map(({ icon: Icon, href }, index) => (
                      <motion.a
                        key={index}
                        href={href}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-secondary-hover)] transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon className="h-4 w-4" />
                      </motion.a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                © {new Date().getFullYear()} MSMEBazaar. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// Dropdown Menu Component
function DropdownMenu({
  label,
  items,
  isOpen,
  onToggle,
}: {
  label: string;
  items: Array<{ label: string; href: string; description?: string }>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
        onClick={onToggle}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-64 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl shadow-xl overflow-hidden z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="py-2">
              {items.map((item) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className="block px-4 py-3 hover:bg-[var(--interactive-secondary-hover)] transition-colors"
                  whileHover={{ x: 4 }}
                >
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      {item.description}
                    </div>
                  )}
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
