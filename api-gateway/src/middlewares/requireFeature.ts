// gateway/middleware/requireFeature.ts
import { Request, Response, NextFunction } from "express";
import { Feature } from "../../shared/config/featureFlagTypes";
import { canUserAccessFeature } from "../utils/featureAccess";

export const requireFeature = (feature: Feature) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // populated by JWT middleware

    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!canUserAccessFeature(feature, {
      role: user.role,
      isPro: user.isPro,
      userId: user.id
    })) {
      return res.status(403).json({
        success: false,
        message: `Feature "${feature}" not enabled or access denied`
      });
    }

    next();
  };
};
