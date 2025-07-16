import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

// Define granular permissions
export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_ADMIN: 'users:admin',
  
  // MSME listings
  MSME_READ: 'msme-listings:read',
  MSME_WRITE: 'msme-listings:write',
  MSME_DELETE: 'msme-listings:delete',
  MSME_OWN: 'msme-listings:own',
  MSME_MODERATE: 'msme-listings:moderate',
  
  // Loan applications
  LOANS_READ: 'loan-applications:read',
  LOANS_WRITE: 'loan-applications:write',
  LOANS_DELETE: 'loan-applications:delete',
  LOANS_OWN: 'loan-applications:own',
  LOANS_APPROVE: 'loan-applications:approve',
  LOANS_REJECT: 'loan-applications:reject',
  
  // Buyer interests
  INTERESTS_READ: 'buyer-interests:read',
  INTERESTS_WRITE: 'buyer-interests:write',
  INTERESTS_DELETE: 'buyer-interests:delete',
  INTERESTS_OWN: 'buyer-interests:own',
  
  // NBFC operations
  NBFC_READ: 'nbfc-details:read',
  NBFC_WRITE: 'nbfc-details:write',
  NBFC_DELETE: 'nbfc-details:delete',
  NBFC_OWN: 'nbfc-details:own',
  
  // Compliance
  COMPLIANCE_READ: 'compliance:read',
  COMPLIANCE_WRITE: 'compliance:write',
  COMPLIANCE_OWN: 'compliance:own',
  COMPLIANCE_AUDIT: 'compliance:audit',
  
  // Escrow
  ESCROW_READ: 'escrow:read',
  ESCROW_WRITE: 'escrow:write',
  ESCROW_FUND: 'escrow:fund',
  ESCROW_RELEASE: 'escrow:release',
  ESCROW_REFUND: 'escrow:refund',
  
  // Notifications
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_WRITE: 'notifications:write',
  NOTIFICATIONS_ADMIN: 'notifications:admin',
  
  // Monitoring & Analytics
  MONITORING_READ: 'monitoring:read',
  MONITORING_WRITE: 'monitoring:write',
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_WRITE: 'analytics:write',
  
  // Agent operations
  AGENT_ASSIGNMENTS: 'agent:assignments',
  AGENT_COMMISSIONS: 'agent:commissions',
  AGENT_SCORING: 'agent:scoring',
  
  // Valuation & Matchmaking
  VALUATION_READ: 'valuation:read',
  VALUATION_WRITE: 'valuation:write',
  MATCHMAKING_READ: 'matchmaking:read',
  MATCHMAKING_WRITE: 'matchmaking:write',
  
  // System administration
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs'
} as const;

// Define permissions for each role
const ROLE_PERMISSIONS = {
  admin: [
    // Full access to all resources
    PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_ADMIN,
    PERMISSIONS.MSME_READ, PERMISSIONS.MSME_WRITE, PERMISSIONS.MSME_DELETE, PERMISSIONS.MSME_MODERATE,
    PERMISSIONS.LOANS_READ, PERMISSIONS.LOANS_WRITE, PERMISSIONS.LOANS_DELETE, PERMISSIONS.LOANS_APPROVE, PERMISSIONS.LOANS_REJECT,
    PERMISSIONS.INTERESTS_READ, PERMISSIONS.INTERESTS_WRITE, PERMISSIONS.INTERESTS_DELETE,
    PERMISSIONS.NBFC_READ, PERMISSIONS.NBFC_WRITE, PERMISSIONS.NBFC_DELETE,
    PERMISSIONS.COMPLIANCE_READ, PERMISSIONS.COMPLIANCE_WRITE, PERMISSIONS.COMPLIANCE_AUDIT,
    PERMISSIONS.ESCROW_READ, PERMISSIONS.ESCROW_WRITE, PERMISSIONS.ESCROW_FUND, PERMISSIONS.ESCROW_RELEASE, PERMISSIONS.ESCROW_REFUND,
    PERMISSIONS.NOTIFICATIONS_READ, PERMISSIONS.NOTIFICATIONS_WRITE, PERMISSIONS.NOTIFICATIONS_ADMIN,
    PERMISSIONS.MONITORING_READ, PERMISSIONS.MONITORING_WRITE,
    PERMISSIONS.ANALYTICS_READ, PERMISSIONS.ANALYTICS_WRITE,
    PERMISSIONS.AGENT_ASSIGNMENTS, PERMISSIONS.AGENT_COMMISSIONS, PERMISSIONS.AGENT_SCORING,
    PERMISSIONS.VALUATION_READ, PERMISSIONS.VALUATION_WRITE,
    PERMISSIONS.MATCHMAKING_READ, PERMISSIONS.MATCHMAKING_WRITE,
    PERMISSIONS.SYSTEM_ADMIN, PERMISSIONS.SYSTEM_CONFIG, PERMISSIONS.SYSTEM_LOGS
  ],
  seller: [
    // Sellers can manage their own listings and view related data
    PERMISSIONS.MSME_READ, PERMISSIONS.MSME_WRITE, PERMISSIONS.MSME_OWN,
    PERMISSIONS.INTERESTS_READ,
    PERMISSIONS.LOANS_READ,
    PERMISSIONS.ESCROW_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.VALUATION_READ,
    PERMISSIONS.MATCHMAKING_READ,
    PERMISSIONS.AGENT_ASSIGNMENTS
  ],
  buyer: [
    // Buyers can browse listings, apply for loans, and manage interests
    PERMISSIONS.MSME_READ,
    PERMISSIONS.INTERESTS_READ, PERMISSIONS.INTERESTS_WRITE, PERMISSIONS.INTERESTS_OWN,
    PERMISSIONS.LOANS_READ, PERMISSIONS.LOANS_WRITE, PERMISSIONS.LOANS_OWN,
    PERMISSIONS.ESCROW_READ, PERMISSIONS.ESCROW_WRITE, PERMISSIONS.ESCROW_FUND,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.VALUATION_READ,
    PERMISSIONS.MATCHMAKING_READ,
    PERMISSIONS.AGENT_ASSIGNMENTS
  ],
  agent: [
    // Agents can view listings, manage assignments, and earn commissions
    PERMISSIONS.MSME_READ,
    PERMISSIONS.INTERESTS_READ,
    PERMISSIONS.LOANS_READ,
    PERMISSIONS.ESCROW_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.AGENT_ASSIGNMENTS, PERMISSIONS.AGENT_COMMISSIONS, PERMISSIONS.AGENT_SCORING,
    PERMISSIONS.VALUATION_READ,
    PERMISSIONS.MATCHMAKING_READ
  ],
  nbfc: [
    // NBFCs can manage loan applications and compliance
    PERMISSIONS.MSME_READ,
    PERMISSIONS.LOANS_READ, PERMISSIONS.LOANS_WRITE, PERMISSIONS.LOANS_APPROVE, PERMISSIONS.LOANS_REJECT,
    PERMISSIONS.NBFC_READ, PERMISSIONS.NBFC_WRITE, PERMISSIONS.NBFC_OWN,
    PERMISSIONS.COMPLIANCE_READ, PERMISSIONS.COMPLIANCE_WRITE, PERMISSIONS.COMPLIANCE_OWN,
    PERMISSIONS.ESCROW_READ,
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.VALUATION_READ,
    PERMISSIONS.ANALYTICS_READ
  ]
};

// Resource ownership checking
export interface ResourceOwnership {
  userId: number;
  resourceId: number;
  resourceType: string;
}

// Enhanced permission checking with ownership validation
export function requirePermission(permission: string, options: {
  checkOwnership?: boolean;
  resourceType?: string;
  resourceIdParam?: string;
} = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    const userId = req.user.userId;
    const userPermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    
    // Check if user has the required permission
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: permission,
        userRole: userRole,
        availablePermissions: userPermissions
      });
    }
    
    // Check ownership if required
    if (options.checkOwnership && options.resourceType && options.resourceIdParam) {
      const resourceId = parseInt(req.params[options.resourceIdParam]);
      const hasOwnership = await checkResourceOwnership(
        userId,
        resourceId,
        options.resourceType
      );
      
      if (!hasOwnership) {
        return res.status(403).json({
          message: "Access denied: Not the owner of this resource",
          resourceType: options.resourceType,
          resourceId: resourceId
        });
      }
    }
    
    next();
  };
}

// Check if user owns a specific resource
async function checkResourceOwnership(
  userId: number,
  resourceId: number,
  resourceType: string
): Promise<boolean> {
  // Import storage here to avoid circular dependency
  const { storage } = await import("../storage");
  
  try {
    switch (resourceType) {
      case 'msme-listing':
        const listing = await storage.getMsmeListing(resourceId);
        return listing?.sellerId === userId;
      
      case 'loan-application':
        const loan = await storage.getLoanApplication(resourceId);
        return loan?.buyerId === userId;
      
      case 'buyer-interest':
        const interest = await storage.getBuyerInterest(resourceId);
        return interest?.buyerId === userId;
      
      case 'nbfc-details':
        const nbfc = await storage.getNbfcDetails(resourceId);
        return nbfc?.userId === userId;
      
      case 'compliance-record':
        const compliance = await storage.getComplianceRecord(resourceId);
        // Check if user owns the NBFC associated with this compliance record
        if (compliance?.nbfcId) {
          const nbfcDetails = await storage.getNbfcDetails(compliance.nbfcId);
          return nbfcDetails?.userId === userId;
        }
        return false;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return false;
  }
}

// Multiple permissions check (user must have ALL permissions)
export function requireAllPermissions(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    
    const missingPermissions = permissions.filter(p => !userPermissions.includes(p));
    
    if (missingPermissions.length > 0) {
      return res.status(403).json({
        message: "Insufficient permissions",
        missing: missingPermissions,
        userRole: userRole
      });
    }
    
    next();
  };
}

// Any permission check (user must have at least ONE permission)
export function requireAnyPermission(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    
    const hasAnyPermission = permissions.some(p => userPermissions.includes(p));
    
    if (!hasAnyPermission) {
      return res.status(403).json({
        message: "Insufficient permissions",
        required: permissions,
        userRole: userRole
      });
    }
    
    next();
  };
}

// Get user permissions
export function getUserPermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
}

// Check if user has specific permission
export function hasPermission(role: string, permission: string): boolean {
  const userPermissions = getUserPermissions(role);
  return userPermissions.includes(permission);
}

// Rate limiting based on role
export function getRoleLimits(role: string): { windowMs: number; max: number } {
  const limits = {
    admin: { windowMs: 15 * 60 * 1000, max: 5000 }, // 5000 requests per 15 minutes
    nbfc: { windowMs: 15 * 60 * 1000, max: 2000 },  // 2000 requests per 15 minutes
    agent: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 requests per 15 minutes
    buyer: { windowMs: 15 * 60 * 1000, max: 500 },  // 500 requests per 15 minutes
    seller: { windowMs: 15 * 60 * 1000, max: 500 }, // 500 requests per 15 minutes
  };
  
  return limits[role as keyof typeof limits] || { windowMs: 15 * 60 * 1000, max: 100 };
}

// Legacy support - simple role checking
export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "Insufficient role permissions",
        required: role,
        userRole: req.user.role
      });
    }
    next();
  };
}

// Context-aware permission checking
export function requireContextualPermission(
  basePermission: string,
  contextChecks: {
    ownResource?: boolean;
    resourceType?: string;
    resourceIdParam?: string;
  } = {}
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    const userId = req.user.userId;
    const userPermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    
    // Check base permission
    if (!userPermissions.includes(basePermission)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        required: basePermission,
        userRole: userRole
      });
    }
    
    // Additional context checks
    if (contextChecks.ownResource && contextChecks.resourceType && contextChecks.resourceIdParam) {
      const resourceId = parseInt(req.params[contextChecks.resourceIdParam]);
      const hasOwnership = await checkResourceOwnership(
        userId,
        resourceId,
        contextChecks.resourceType
      );
      
      if (!hasOwnership) {
        return res.status(403).json({
          message: "Access denied: Not authorized for this resource",
          resourceType: contextChecks.resourceType,
          resourceId: resourceId
        });
      }
    }
    
    next();
  };
}