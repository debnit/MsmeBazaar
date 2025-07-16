import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

// Role-based access control permissions
const permissions = {
  seller: ["create_listing", "update_own_listing", "view_own_listings"],
  buyer: ["view_listings", "create_interest", "apply_loan"],
  agent: ["view_assignments", "update_assignments", "view_commissions"],
  nbfc: ["view_applications", "approve_loans", "create_products", "view_compliance"],
  admin: ["*"] // Admin has all permissions
};

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    const userPermissions = permissions[userRole as keyof typeof permissions] || [];
    
    if (userPermissions.includes("*") || userPermissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({ message: "Insufficient permissions" });
    }
  };
}
