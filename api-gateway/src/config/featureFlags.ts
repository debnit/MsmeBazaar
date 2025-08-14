// gateway/config/featureFlags.ts
import path from "path";
import fs from "fs";
import { Feature, FeatureMeta } from "../../shared/config/featureFlagTypes";

export const featureFlags: Record<Feature, FeatureMeta> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../shared/config/featureFlags.json"), "utf8")
);
