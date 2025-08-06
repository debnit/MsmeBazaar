export const servicesConfig = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:8000",
  msme: process.env.MSME_SERVICE_URL || "http://localhost:8002",
  valuation: process.env.VALUATION_SERVICE_URL || "http://localhost:8003",
  matchmaking: process.env.MATCHMAKING_SERVICE_URL || "http://localhost:8004",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8006",
  admin: process.env.ADMIN_SERVICE_URL || "http://localhost:8005",
  compliance: process.env.COMPLIANCE_SERVICE_URL || "http://localhost:8010",
  eaasservice: process.env.EAAS_SERVICE_URL || "http://localhost:8011",
  gamificationservice: process.env.GAMIFICATION_SERVICE_URL || "http://localhost:8012",
  loanservice: process.env.LOAN_SERVICE_URL || "http://localhost:8013",
  mlmonitoringservice: process.env.ML_MONITORING_SERVICE_URL || "http://localhost:8014",
  msmelistingservice: process.env.MSME_LISTING_SERVICE_URL || "http://localhost:8015",
  nbfcservice: process.env.NBFC_SERVICE_URL || "http://localhost:8016",
  paymentservice: process.env.PAYMENT_SERVICE_URL || "http://localhost:8017",
  recommendationservice: process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:8018",
  searchmatchmakingservice: process.env.SEARCH_MATCHMAKING_SERVICE_URL || "http://localhost:8019",
  sellerservice: process.env.SELLER_SERVICE_URL || "http://localhost:8020",
  transactionmatchingservice: process.env.TRANSACTION_MATCHING_SERVICE_URL || "http://localhost:8021",
  userprofileservice: process.env.USER_PROFILE_SERVICE_URL || "http://localhost:8022"
} as const;

export type ServiceName = keyof typeof servicesConfig;
