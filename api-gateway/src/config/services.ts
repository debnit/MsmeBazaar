export const servicesConfig = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:6000",
  msme: process.env.MSME_SERVICE_URL || "http://localhost:6000",
  valuation: process.env.VALUATION_SERVICE_URL || "http://localhost:6000",
  matchmaking: process.env.MATCHMAKING_SERVICE_URL || "http://localhost:6000",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:6000",
  admin: process.env.ADMIN_SERVICE_URL || "http://localhost:6000",
  compliance: process.env.COMPLIANCE_SERVICE_URL || "http://localhost:6000",
  eaasservice: process.env.EAAS_SERVICE_URL || "http://localhost:6000",
  gamificationservice: process.env.GAMIFICATION_SERVICE_URL || "http://localhost:6000",
  loanservice: process.env.LOAN_SERVICE_URL || "http://localhost:6000",
  mlmonitoringservice: process.env.ML_MONITORING_SERVICE_URL || "http://localhost:6000",
  msmelistingservice: process.env.MSME_LISTING_SERVICE_URL || "http://localhost:6000",
  nbfcservice: process.env.NBFC_SERVICE_URL || "http://localhost:6000",
  paymentservice: process.env.PAYMENT_SERVICE_URL || "http://localhost:6000",
  recommendationservice: process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:6000",
  searchmatchmakingservice: process.env.SEARCH_MATCHMAKING_SERVICE_URL || "http://localhost:6000",
  sellerservice: process.env.SELLER_SERVICE_URL || "http://localhost:6000",
  transactionmatchingservice: process.env.TRANSACTION_MATCHING_SERVICE_URL || "http://localhost:6000",
  userprofileservice: process.env.USER_PROFILE_SERVICE_URL || "http://localhost:6000"
} as const;

export type ServiceName = keyof typeof servicesConfig;
