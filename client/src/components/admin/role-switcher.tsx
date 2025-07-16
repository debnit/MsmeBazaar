import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, Building, CreditCard, Users, Crown, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoleSwitcherProps {
  onRoleChange?: (role: string) => void;
}

const roleConfig = {
  admin: {
    icon: Crown,
    label: 'Admin',
    color: 'bg-purple-100 text-purple-800',
    description: 'Full system access and management'
  },
  seller: {
    icon: Building,
    label: 'Seller',
    color: 'bg-blue-100 text-blue-800',
    description: 'List and manage business sales'
  },
  buyer: {
    icon: User,
    label: 'Buyer',
    color: 'bg-green-100 text-green-800',
    description: 'Browse and purchase businesses'
  },
  agent: {
    icon: Users,
    label: 'Agent',
    color: 'bg-orange-100 text-orange-800',
    description: 'Facilitate transactions and earn commissions'
  },
  nbfc: {
    icon: CreditCard,
    label: 'NBFC',
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Provide financing and loan services'
  }
};

export function RoleSwitcher({ onRoleChange }: RoleSwitcherProps) {
  const { user, switchRole, isAdmin } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || 'buyer');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Only show role switcher for admins
  if (!isAdmin) {
    return null;
  }

  const handleRoleSwitch = async (newRole: string) => {
    if (newRole === user?.role) return;
    
    setIsLoading(true);
    try {
      await switchRole(newRole);
      setSelectedRole(newRole);
      onRoleChange?.(newRole);
      
      const roleInfo = roleConfig[newRole as keyof typeof roleConfig];
      toast({
        title: 'Role Switched',
        description: `Now acting as ${roleInfo.label}`,
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Role Switch Failed',
        description: 'Unable to switch role. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentRoleConfig = () => {
    return roleConfig[user?.role as keyof typeof roleConfig] || roleConfig.buyer;
  };

  const currentRole = getCurrentRoleConfig();
  const CurrentRoleIcon = currentRole.icon;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Role Switcher
        </CardTitle>
        <CardDescription>
          Temporarily act as different user types for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This is an invite-only feature for administrators. Role changes are temporary and for testing purposes only.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label className="text-sm font-medium">Current Role</label>
          <div className="flex items-center gap-2">
            <CurrentRoleIcon className="h-4 w-4" />
            <Badge className={currentRole.color}>
              {currentRole.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {currentRole.description}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Switch to Role</label>
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(roleConfig).map(([role, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => handleRoleSwitch(selectedRole)}
          disabled={isLoading || selectedRole === user?.role}
          className="w-full"
        >
          {isLoading ? 'Switching...' : 'Switch Role'}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>Available roles and permissions:</p>
          <ul className="mt-1 space-y-1">
            {Object.entries(roleConfig).map(([role, config]) => (
              <li key={role} className="flex items-center gap-2">
                <config.icon className="h-3 w-3" />
                <span className="font-medium">{config.label}:</span>
                <span>{config.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}