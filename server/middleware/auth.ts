import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: string;
  };
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  // Check for token in Authorization header first
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  
  // If no auth header, check for token in cookies
  if (!token && req.cookies) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
