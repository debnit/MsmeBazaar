import { storage } from "../storage";

export interface ComplianceStatus {
  overall: "compliant" | "non_compliant" | "under_review";
  masterDirections: ComplianceItem;
  scaleBasedRegulation: ComplianceItem;
  lendingGuidelines: ComplianceItem;
  capitalAdequacy: ComplianceItem;
  assetClassification: ComplianceItem;
  provisioning: ComplianceItem;
  exposureLimits: ComplianceItem;
  sreaMembership: ComplianceItem;
  lastUpdated: Date;
}

export interface ComplianceItem {
  status: "compliant" | "non_compliant" | "under_review";
  details: string;
  lastChecked: Date;
  nextReview: Date;
}

export async function checkCompliance(nbfcId: number): Promise<ComplianceStatus> {
  // Mock compliance checking service
  // In a real implementation, this would check various RBI compliance requirements
  
  const nbfcDetails = await storage.getNbfcDetails(nbfcId);
  
  if (!nbfcDetails) {
    throw new Error("NBFC details not found");
  }
  
  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  // Generate compliance status based on NBFC details
  const masterDirections: ComplianceItem = {
    status: "compliant",
    details: "All master directions are being followed as per RBI guidelines dated October 2024",
    lastChecked: now,
    nextReview: nextMonth
  };
  
  const scaleBasedRegulation: ComplianceItem = {
    status: nbfcDetails.tier === "base" ? "compliant" : "under_review",
    details: `Current tier: ${nbfcDetails.tier}. Scale-based regulation compliance verified.`,
    lastChecked: now,
    nextReview: nextMonth
  };
  
  const lendingGuidelines: ComplianceItem = {
    status: "compliant",
    details: "MSME lending guidelines are being followed. Fair practices code implemented.",
    lastChecked: now,
    nextReview: nextMonth
  };
  
  const capitalAdequacy: ComplianceItem = {
    status: checkCapitalAdequacy(nbfcDetails),
    details: `Net worth: ₹${nbfcDetails.netWorth} Cr. Minimum capital requirements met.`,
    lastChecked: now,
    nextReview: nextMonth
  };
  
  const assetClassification: ComplianceItem = {
    status: "compliant",
    details: "Asset classification norms are being followed. NPA levels within limits.",
    lastChecked: now,
    nextReview: nextMonth
  };
  
  const provisioning: ComplianceItem = {
    status: "compliant",
    details: "Adequate provisioning maintained as per RBI norms.",
    lastChecked: now,
    nextReview: nextMonth
  };
  
  const exposureLimits: ComplianceItem = {
    status: "compliant",
    details: "Single borrower and group exposure limits are within prescribed limits.",
    lastChecked: now,
    nextReview: nextMonth
  };
  
  const sreaMembership: ComplianceItem = {
    status: "compliant",
    details: "Active membership with MFIN (recognized SRO). Regular compliance reporting.",
    lastChecked: now,
    nextReview: nextMonth
  };
  
  // Calculate overall compliance
  const items = [
    masterDirections,
    scaleBasedRegulation,
    lendingGuidelines,
    capitalAdequacy,
    assetClassification,
    provisioning,
    exposureLimits,
    sreaMembership
  ];
  
  const nonCompliantItems = items.filter(item => item.status === "non_compliant");
  const underReviewItems = items.filter(item => item.status === "under_review");
  
  let overall: "compliant" | "non_compliant" | "under_review";
  if (nonCompliantItems.length > 0) {
    overall = "non_compliant";
  } else if (underReviewItems.length > 0) {
    overall = "under_review";
  } else {
    overall = "compliant";
  }
  
  return {
    overall,
    masterDirections,
    scaleBasedRegulation,
    lendingGuidelines,
    capitalAdequacy,
    assetClassification,
    provisioning,
    exposureLimits,
    sreaMembership,
    lastUpdated: now
  };
}

function checkCapitalAdequacy(nbfcDetails: any): "compliant" | "non_compliant" | "under_review" {
  const netWorth = Number(nbfcDetails.netWorth) || 0;
  const minCapital = 2; // 2 Crore minimum as per RBI guidelines
  
  if (netWorth >= minCapital) {
    return "compliant";
  } else if (netWorth >= minCapital * 0.8) {
    return "under_review";
  } else {
    return "non_compliant";
  }
}

// Create compliance records for tracking
export async function createComplianceRecord(nbfcId: number, compliance: ComplianceStatus): Promise<void> {
  const complianceItems = [
    { type: "master_directions", status: compliance.masterDirections.status, details: compliance.masterDirections.details },
    { type: "scale_based_regulation", status: compliance.scaleBasedRegulation.status, details: compliance.scaleBasedRegulation.details },
    { type: "lending_guidelines", status: compliance.lendingGuidelines.status, details: compliance.lendingGuidelines.details },
    { type: "capital_adequacy", status: compliance.capitalAdequacy.status, details: compliance.capitalAdequacy.details },
    { type: "asset_classification", status: compliance.assetClassification.status, details: compliance.assetClassification.details },
    { type: "provisioning", status: compliance.provisioning.status, details: compliance.provisioning.details },
    { type: "exposure_limits", status: compliance.exposureLimits.status, details: compliance.exposureLimits.details },
    { type: "srea_membership", status: compliance.sreaMembership.status, details: compliance.sreaMembership.details },
  ];
  
  for (const item of complianceItems) {
    await storage.createComplianceRecord({
      nbfcId,
      complianceType: item.type,
      status: item.status,
      lastReviewDate: new Date(),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      details: { description: item.details },
      documents: [],
      notes: "Automated compliance check"
    });
  }
}
