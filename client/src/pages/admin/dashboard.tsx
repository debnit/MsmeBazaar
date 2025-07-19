import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { DataTable, Column } from '@/components/ui/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Award,
  Target,
  BarChart3,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

interface MSME {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  industry: string;
  status: 'active' | 'pending' | 'suspended';
  registrationDate: string;
  annualRevenue: number;
  employeeCount: number;
  location: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  lastActivity: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'seller' | 'buyer' | 'agent' | 'nbfc';
  status: 'active' | 'inactive' | 'banned';
  registrationDate: string;
  lastLogin: string;
  activityScore: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMSMEs: number;
  pendingVerifications: number;
  monthlyGrowth: number;
  totalRevenue: number;
  avgValuation: number;
  successfulTransactions: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'msmes' | 'analytics'>('overview');

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    retry: false,
  });

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  const { data: msmes, isLoading: msmesLoading, refetch: refetchMSMEs } = useQuery<MSME[]>({
    queryKey: ['/api/admin/msmes'],
    retry: false,
  });

  // User table columns
  const userColumns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      id: 'email',
      header: 'Email',
      accessor: 'email',
      sortable: true,
    },
    {
      id: 'role',
      header: 'Role',
      accessor: 'role',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={value === 'active' ? 'default' : value === 'inactive' ? 'secondary' : 'destructive'}
        >
          {value}
        </Badge>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      accessor: 'lastLogin',
      sortable: true,
    },
    {
      id: 'activityScore',
      header: 'Activity Score',
      accessor: 'activityScore',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <Progress value={value} className="w-12 h-2" />
          <span className="text-sm font-medium">{value}%</span>
        </div>
      ),
    },
  ];

  // MSME table columns
  const msmeColumns: Column<MSME>[] = [
    {
      id: 'businessName',
      header: 'Business Name',
      accessor: 'businessName',
      sortable: true,
    },
    {
      id: 'ownerName',
      header: 'Owner',
      accessor: 'ownerName',
      sortable: true,
    },
    {
      id: 'industry',
      header: 'Industry',
      accessor: 'industry',
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={value === 'active' ? 'default' : value === 'pending' ? 'secondary' : 'destructive'}
        >
          {value}
        </Badge>
      ),
    },
    {
      id: 'verificationStatus',
      header: 'Verification',
      accessor: 'verificationStatus',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={value === 'verified' ? 'default' : value === 'pending' ? 'secondary' : 'destructive'}
        >
          {value === 'verified' ? <CheckCircle className="w-3 h-3 mr-1" /> :
            value === 'pending' ? <Clock className="w-3 h-3 mr-1" /> :
              <AlertCircle className="w-3 h-3 mr-1" />}
          {value}
        </Badge>
      ),
    },
    {
      id: 'annualRevenue',
      header: 'Annual Revenue',
      accessor: 'annualRevenue',
      sortable: true,
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      id: 'employeeCount',
      header: 'Employees',
      accessor: 'employeeCount',
      sortable: true,
    },
  ];

  const handleUserAction = (action: string, user: User) => {
    switch (action) {
    case 'activate':
      toast({
        title: 'User Activated',
        description: `${user.name} has been activated successfully.`,
      });
      break;
    case 'deactivate':
      toast({
        title: 'User Deactivated',
        description: `${user.name} has been deactivated.`,
      });
      break;
    case 'ban':
      toast({
        title: 'User Banned',
        description: `${user.name} has been banned from the platform.`,
        variant: 'destructive',
      });
      break;
    }
    refetchUsers();
  };

  const handleMSMEAction = (action: string, msme: MSME) => {
    switch (action) {
    case 'verify':
      toast({
        title: 'MSME Verified',
        description: `${msme.businessName} has been verified successfully.`,
      });
      break;
    case 'reject':
      toast({
        title: 'MSME Rejected',
        description: `${msme.businessName} verification has been rejected.`,
        variant: 'destructive',
      });
      break;
    case 'suspend':
      toast({
        title: 'MSME Suspended',
        description: `${msme.businessName} has been suspended.`,
        variant: 'destructive',
      });
      break;
    }
    refetchMSMEs();
  };

  const renderUserDetails = (user: User) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold">User Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Name:</span>
            <p className="text-gray-600">{user.name}</p>
          </div>
          <div>
            <span className="font-medium">Email:</span>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <div>
            <span className="font-medium">Role:</span>
            <p className="text-gray-600 capitalize">{user.role}</p>
          </div>
          <div>
            <span className="font-medium">Status:</span>
            <Badge className="capitalize">{user.status}</Badge>
          </div>
          <div>
            <span className="font-medium">Registration Date:</span>
            <p className="text-gray-600">{user.registrationDate}</p>
          </div>
          <div>
            <span className="font-medium">Last Login:</span>
            <p className="text-gray-600">{user.lastLogin}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold">Activity Metrics</h4>
        <div>
          <div className="flex justify-between text-sm">
            <span>Activity Score</span>
            <span>{user.activityScore}%</span>
          </div>
          <Progress value={user.activityScore} className="mt-2" />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Actions</h4>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => handleUserAction('activate', user)}>
            <UserCheck className="w-4 h-4 mr-2" />
            Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleUserAction('deactivate', user)}>
            <UserX className="w-4 h-4 mr-2" />
            Deactivate
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleUserAction('ban', user)}>
            <Shield className="w-4 h-4 mr-2" />
            Ban User
          </Button>
        </div>
      </div>
    </div>
  );

  const renderMSMEDetails = (msme: MSME) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold">Business Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Business Name:</span>
            <p className="text-gray-600">{msme.businessName}</p>
          </div>
          <div>
            <span className="font-medium">Owner:</span>
            <p className="text-gray-600">{msme.ownerName}</p>
          </div>
          <div>
            <span className="font-medium">Industry:</span>
            <p className="text-gray-600">{msme.industry}</p>
          </div>
          <div>
            <span className="font-medium">Location:</span>
            <p className="text-gray-600">{msme.location}</p>
          </div>
          <div>
            <span className="font-medium">Status:</span>
            <Badge className="capitalize">{msme.status}</Badge>
          </div>
          <div>
            <span className="font-medium">Verification:</span>
            <Badge variant="outline" className="capitalize">{msme.verificationStatus}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold">Financial Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Annual Revenue:</span>
            <p className="text-gray-600">₹{msme.annualRevenue.toLocaleString()}</p>
          </div>
          <div>
            <span className="font-medium">Employee Count:</span>
            <p className="text-gray-600">{msme.employeeCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Actions</h4>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => handleMSMEAction('verify', msme)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Verify
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleMSMEAction('reject', msme)}>
            <AlertCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleMSMEAction('suspend', msme)}>
            <Clock className="w-4 h-4 mr-2" />
            Suspend
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage users, MSMEs, and monitor platform activity
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Total Users',
              value: stats?.totalUsers || 0,
              change: '+12%',
              icon: Users,
              color: 'blue',
            },
            {
              title: 'Active MSMEs',
              value: stats?.totalMSMEs || 0,
              change: '+8%',
              icon: Building2,
              color: 'green',
            },
            {
              title: 'Pending Reviews',
              value: stats?.pendingVerifications || 0,
              change: '-5%',
              icon: Clock,
              color: 'orange',
            },
            {
              title: 'Monthly Growth',
              value: `${stats?.monthlyGrowth || 0}%`,
              change: '+3%',
              icon: TrendingUp,
              color: 'purple',
            },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {statsLoading ? '...' : stat.value}
                        </p>
                      </div>
                      <div className={`
                        p-3 rounded-full
                        ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                        ${stat.color === 'green' ? 'bg-green-50 text-green-600' : ''}
                        ${stat.color === 'orange' ? 'bg-orange-50 text-orange-600' : ''}
                        ${stat.color === 'purple' ? 'bg-purple-50 text-purple-600' : ''}
                      `}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex items-center mt-4 text-sm">
                      <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                      <span className="font-medium text-green-600">{stat.change}</span>
                      <span className="text-gray-600 ml-1">vs last month</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'msmes', label: 'MSMEs', icon: Building2 },
              { id: 'analytics', label: 'Analytics', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Health</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Active Users</span>
                        <span>85%</span>
                      </div>
                      <Progress value={85} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>MSME Verification Rate</span>
                        <span>92%</span>
                      </div>
                      <Progress value={92} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Transaction Success</span>
                        <span>98%</span>
                      </div>
                      <Progress value={98} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest platform events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { action: 'New MSME registered', time: '2 minutes ago', type: 'success' },
                        { action: 'User verification completed', time: '5 minutes ago', type: 'info' },
                        { action: 'Transaction completed', time: '10 minutes ago', type: 'success' },
                        { action: 'Support ticket raised', time: '15 minutes ago', type: 'warning' },
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className={`
                            w-2 h-2 rounded-full
                            ${activity.type === 'success' ? 'bg-green-500' : ''}
                            ${activity.type === 'info' ? 'bg-blue-500' : ''}
                            ${activity.type === 'warning' ? 'bg-yellow-500' : ''}
                          `} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DataTable
                data={users || []}
                columns={userColumns}
                title="User Management"
                description="Manage and monitor all platform users"
                searchPlaceholder="Search users..."
                isLoading={usersLoading}
                renderRowDetails={renderUserDetails}
                onRefresh={refetchUsers}
                enableSelection={true}
                actions={[
                  {
                    label: 'Activate',
                    icon: UserCheck,
                    onClick: (user) => handleUserAction('activate', user),
                    variant: 'default',
                  },
                  {
                    label: 'Ban',
                    icon: Shield,
                    onClick: (user) => handleUserAction('ban', user),
                    variant: 'destructive',
                  },
                ]}
              />
            </motion.div>
          )}

          {activeTab === 'msmes' && (
            <motion.div
              key="msmes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DataTable
                data={msmes || []}
                columns={msmeColumns}
                title="MSME Management"
                description="Manage and verify MSME registrations"
                searchPlaceholder="Search MSMEs..."
                isLoading={msmesLoading}
                renderRowDetails={renderMSMEDetails}
                onRefresh={refetchMSMEs}
                enableSelection={true}
                actions={[
                  {
                    label: 'Verify',
                    icon: CheckCircle,
                    onClick: (msme) => handleMSMEAction('verify', msme),
                    variant: 'default',
                  },
                  {
                    label: 'Reject',
                    icon: AlertCircle,
                    onClick: (msme) => handleMSMEAction('reject', msme),
                    variant: 'destructive',
                  },
                ]}
              />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>Detailed platform insights and metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Advanced Analytics
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Comprehensive analytics dashboard coming soon
                    </p>
                    <Button>
                      <Target className="w-4 h-4 mr-2" />
                      View Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
