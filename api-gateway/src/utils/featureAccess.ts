// gateway/utils/featureAccess.ts
import { Feature } from "../../shared/config/featureFlagTypes";
import { featureFlags } from "../config/featureFlags";

interface AccessContext {
  role: string;
  isPro: boolean;
  userId: string;
}

export const canUserAccessFeature = (feature: Feature, ctx: AccessContext) => {
  const meta = featureFlags[feature];
  if (!meta?.enabled) return false;

  // Pro gating
  if (meta.proOnly && !ctx.isPro && !(meta.rolesEnabled?.includes(ctx.role as any))) {
    return false;
  }

  // Rollout bucket logic
  if (typeof meta.rolloutPercentage === "number" && meta.rolloutPercentage < 100) {
    const hash = Math.abs(hashString(ctx.userId + feature)) % 100;
    if (hash >= meta.rolloutPercentage) return false;
  }

  return true;
};

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  return hash;
};
