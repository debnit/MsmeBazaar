import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Building2,
  Users,
  Target,
  Award,
  Bell,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Zap,
  Crown,
  Flame,
  ChevronRight,
  Activity,
  BarChart3,
  PieChart,
  Globe,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { api, queryKeys } from '@/lib/api';
import { useToastHelpers } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  SuspenseAnalyticsDashboard,
  SuspenseGamificationDashboard,
  SuspenseMSMETable,
  LazySection,
  PerformanceWrapper,
  ProgressiveImage,
} from '@/components/performance/LazyComponents';

interface DashboardStats {
  totalMSMEs: number;
  totalValuations: number;
  avgValuation: number;
  growthRate: number;
  totalUsers: number;
  activeTransactions: number;
  monthlyRevenue: number;
  userLevel: number;
  userPoints: number;
  userRank: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  badge?: string;
  onClick?: () => void;
}

interface RecentActivity {
  id: string;
  type: 'valuation' | 'transaction' | 'registration' | 'achievement';
  title: string;
  description: string;
  timestamp: Date;
  value?: number;
  status: 'completed' | 'pending' | 'processing';
}

export default function DashboardV2() {
  const { user } = useAuth();
  const { success, error } = useToastHelpers();
  const [selectedView, setSelectedView] = useState<'overview' | 'analytics' | 'gamification'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch dashboard data
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: () => api.dashboard.getStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: userStats } = useQuery({
    queryKey: queryKeys.userProfile(),
    queryFn: () => api.users.getProfile(),
    enabled: !!user,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api.dashboard.getRecentActivity(),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list({ limit: 5 }),
  });

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'register-msme',
      title: 'Register MSME',
      description: 'Add a new MSME to the platform',
      icon: <Building2 className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500',
      href: '/msme/register',
      badge: '+200 pts',
    },
    {
      id: 'request-valuation',
      title: 'Get Valuation',
      description: 'Request professional valuation',
      icon: <Target className="h-6 w-6" />,
      color: 'from-green-500 to-emerald-500',
      href: '/valuation/request',
      badge: '+50 pts',
    },
    {
      id: 'browse-msmes',
      title: 'Browse MSMEs',
      description: 'Explore business opportunities',
      icon: <Search className="h-6 w-6" />,
      color: 'from-purple-500 to-pink-500',
      href: '/browse',
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'Insights and performance metrics',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'from-orange-500 to-red-500',
      href: '/analytics',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const StatsCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, change, icon, color, subtitle }) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        'relative p-6 rounded-xl bg-gradient-to-br shadow-soft border border-border/50',
        'hover:shadow-medium transition-all duration-300 cursor-pointer',
        color,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            change >= 0 ? 'text-green-100' : 'text-red-100',
          )}>
            {change >= 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-white/80 mb-1">{title}</h3>
        <motion.p
          className="text-3xl font-bold text-white"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </motion.p>
        {subtitle && (
          <p className="text-sm text-white/60 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-white/5 rounded-xl"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );

  const QuickActionCard: React.FC<{ action: QuickAction }> = ({ action }) => (
    <motion.a
      href={action.href}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative p-6 rounded-xl bg-gradient-to-br shadow-soft border border-border/50',
        'hover:shadow-medium transition-all duration-300 cursor-pointer group',
        action.color,
        'text-white overflow-hidden',
      )}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
            {action.icon}
          </div>
          {action.badge && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-white/20 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm"
            >
              {action.badge}
            </motion.span>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-2 group-hover:text-white/90 transition-colors">
          {action.title}
        </h3>
        <p className="text-sm text-white/80 group-hover:text-white/70 transition-colors">
          {action.description}
        </p>

        <div className="flex items-center mt-4 text-sm font-medium">
          <span>Get Started</span>
          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Animated background effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
    </motion.a>
  );

  const ActivityItem: React.FC<{ activity: RecentActivity }> = ({ activity }) => {
    const getIcon = () => {
      switch (activity.type) {
      case 'valuation': return <Target className="h-4 w-4 text-blue-500" />;
      case 'transaction': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'registration': return <Building2 className="h-4 w-4 text-purple-500" />;
      case 'achievement': return <Award className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
      }
    };

    const getStatusColor = () => {
      switch (activity.status) {
      case 'completed': return 'text-green-500';
      case 'processing': return 'text-yellow-500';
      case 'pending': return 'text-blue-500';
      default: return 'text-muted-foreground';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
        className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
      >
        <div className="p-2 bg-muted rounded-full">
          {getIcon()}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium">{activity.title}</h4>
          <p className="text-xs text-muted-foreground">{activity.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-xs font-medium', getStatusColor())}>
              {activity.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {activity.timestamp.toLocaleDateString()}
            </span>
          </div>
        </div>
        {activity.value && (
          <div className="text-right">
            <span className="text-sm font-bold text-green-600">
              +{activity.value.toLocaleString()}
            </span>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        )}
      </motion.div>
    );
  };

  const WelcomeSection = () => (
    <motion.div
      variants={itemVariants}
      className="relative p-8 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.firstName || 'User'}! 👋
            </h1>
            <p className="text-white/80 text-lg mb-4">
              Ready to grow your MSME business today?
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="font-medium">Level {userStats?.level || 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-400" />
                <span className="font-medium">{userStats?.total_points || 0} points</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Rank #{userStats?.rank || '---'}</span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <Bell className="h-6 w-6" />
            {notifications?.data?.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
              >
                {notifications.data.length}
              </motion.span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
    </motion.div>
  );

  const ViewTabs = () => (
    <motion.div variants={itemVariants} className="flex space-x-1 bg-muted p-1 rounded-lg">
      {[
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'gamification', label: 'Rewards', icon: Award },
      ].map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setSelectedView(tab.id as any)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all duration-200',
              selectedView === tab.id
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <PerformanceWrapper componentName="DashboardV2">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 p-6 max-w-7xl mx-auto"
      >
        {/* Welcome Section */}
        <WelcomeSection />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total MSMEs"
            value={dashboardStats?.data?.totalMSMEs || 0}
            change={12.5}
            icon={<Building2 className="h-6 w-6 text-white" />}
            color="from-blue-500 to-cyan-500"
            subtitle="Registered businesses"
          />
          <StatsCard
            title="Valuations"
            value={dashboardStats?.data?.totalValuations || 0}
            change={8.2}
            icon={<Target className="h-6 w-6 text-white" />}
            color="from-green-500 to-emerald-500"
            subtitle="This month"
          />
          <StatsCard
            title="Avg. Valuation"
            value={`₹${(dashboardStats?.data?.avgValuation || 0).toLocaleString()}`}
            change={15.3}
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            color="from-purple-500 to-pink-500"
            subtitle="In lakhs"
          />
          <StatsCard
            title="Active Users"
            value={dashboardStats?.data?.totalUsers || 0}
            change={5.7}
            icon={<Users className="h-6 w-6 text-white" />}
            color="from-orange-500 to-red-500"
            subtitle="Online now"
          />
        </div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <QuickActionCard key={action.id} action={action} />
            ))}
          </div>
        </motion.div>

        {/* View Tabs */}
        <ViewTabs />

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {selectedView === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                  <LazySection
                    fallback={<div className="h-96 bg-muted rounded-lg animate-pulse" />}
                    className="card-base p-6"
                  >
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Recent Activity
                    </h3>
                    <div className="space-y-2">
                      {recentActivity?.slice(0, 8).map((activity: RecentActivity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                      ))}
                    </div>
                  </LazySection>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Performance Summary */}
                  <motion.div variants={itemVariants} className="card-base p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-primary" />
                      Performance
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Growth Rate</span>
                        <span className="font-semibold text-green-600">+{dashboardStats?.data?.growthRate || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <motion.div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(dashboardStats?.data?.growthRate || 0, 100)}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Quick Links */}
                  <motion.div variants={itemVariants} className="card-base p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Quick Links
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Help Center', href: '/help', icon: <ExternalLink className="h-4 w-4" /> },
                        { label: 'API Documentation', href: '/docs', icon: <ExternalLink className="h-4 w-4" /> },
                        { label: 'Community Forum', href: '/community', icon: <ExternalLink className="h-4 w-4" /> },
                        { label: 'Contact Support', href: '/support', icon: <Mail className="h-4 w-4" /> },
                      ].map((link) => (
                        <motion.a
                          key={link.label}
                          href={link.href}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          {link.icon}
                          <span className="text-sm">{link.label}</span>
                        </motion.a>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {selectedView === 'analytics' && (
              <SuspenseAnalyticsDashboard />
            )}

            {selectedView === 'gamification' && (
              <SuspenseGamificationDashboard />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Notifications Panel */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="fixed top-20 right-6 w-80 bg-background border rounded-lg shadow-lg z-50"
            >
              <div className="p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications?.data?.map((notification: any) => (
                  <motion.div
                    key={notification.id}
                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                    className="p-4 border-b last:border-b-0"
                  >
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </PerformanceWrapper>
  );
}
