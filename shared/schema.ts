import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, varchar, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User types enum
export const userRoles = ['seller', 'buyer', 'agent', 'admin', 'nbfc'] as const;
export type UserRole = typeof userRoles[number];



// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }).unique(),
  password: text("password"),
  role: varchar("role", { length: 20 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  authMethod: varchar("auth_method", { length: 20 }).default("email"),
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NBFC specific details
export const nbfcDetails = pgTable("nbfc_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  rbiLicenseNumber: varchar("rbi_license_number", { length: 50 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 100 }),
  companyType: varchar("company_type", { length: 50 }),
  establishedYear: integer("established_year"),
  authorizedCapital: decimal("authorized_capital", { precision: 15, scale: 2 }),
  paidUpCapital: decimal("paid_up_capital", { precision: 15, scale: 2 }),
  netWorth: decimal("net_worth", { precision: 15, scale: 2 }),
  totalAssets: decimal("total_assets", { precision: 15, scale: 2 }),
  tier: varchar("tier", { length: 20 }), // Base, Upper, Middle, Top
  complianceStatus: varchar("compliance_status", { length: 50 }).default("active"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  website: varchar("website", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MSME listings
export const msmeListings = pgTable("msme_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => users.id).notNull(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  businessType: varchar("business_type", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  subIndustry: varchar("sub_industry", { length: 100 }),
  establishedYear: integer("established_year"),
  legalStructure: varchar("legal_structure", { length: 50 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  gstNumber: varchar("gst_number", { length: 20 }),
  panNumber: varchar("pan_number", { length: 15 }),
  
  // Financial details
  annualTurnover: decimal("annual_turnover", { precision: 15, scale: 2 }),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }),
  totalAssets: decimal("total_assets", { precision: 15, scale: 2 }),
  totalLiabilities: decimal("total_liabilities", { precision: 15, scale: 2 }),
  currentAssets: decimal("current_assets", { precision: 15, scale: 2 }),
  currentLiabilities: decimal("current_liabilities", { precision: 15, scale: 2 }),
  
  // Operational details
  employeeCount: integer("employee_count"),
  productionCapacity: text("production_capacity"),
  majorClients: text("major_clients"),
  majorSuppliers: text("major_suppliers"),
  
  // Location
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  
  // Valuation and status
  askingPrice: decimal("asking_price", { precision: 15, scale: 2 }),
  valuationAmount: decimal("valuation_amount", { precision: 15, scale: 2 }),
  isDistressed: boolean("is_distressed").default(false),
  distressReason: text("distress_reason"),
  
  // Listing status
  status: varchar("status", { length: 50 }).default("draft"), // draft, active, under_review, sold, suspended
  isApproved: boolean("is_approved").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Metadata
  description: text("description"),
  images: json("images"),
  documents: json("documents"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan applications
export const loanApplications = pgTable("loan_applications", {
  id: serial("id").primaryKey(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  buyerId: integer("buyer_id").references(() => users.id).notNull(),
  nbfcId: integer("nbfc_id").references(() => users.id).notNull(),
  agentId: integer("agent_id").references(() => users.id),
  
  // Loan details
  loanAmount: decimal("loan_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  tenure: integer("tenure"), // in months
  loanPurpose: varchar("loan_purpose", { length: 100 }),
  collateral: text("collateral"),
  
  // Application status
  status: varchar("status", { length: 50 }).default("pending"), // pending, under_review, approved, rejected, disbursed
  approvalDate: timestamp("approval_date"),
  disbursementDate: timestamp("disbursement_date"),
  
  // Risk assessment
  creditScore: integer("credit_score"),
  riskGrade: varchar("risk_grade", { length: 5 }),
  riskAssessment: json("risk_assessment"),
  
  // Processing details
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }),
  adminFee: decimal("admin_fee", { precision: 10, scale: 2 }),
  totalFees: decimal("total_fees", { precision: 10, scale: 2 }),
  
  // Documents
  documents: json("documents"),
  internalNotes: text("internal_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buyer interests
export const buyerInterests = pgTable("buyer_interests", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").references(() => users.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  interestType: varchar("interest_type", { length: 50 }), // inquiry, shortlisted, offer_made
  offerAmount: decimal("offer_amount", { precision: 15, scale: 2 }),
  message: text("message"),
  status: varchar("status", { length: 50 }).default("active"), // active, withdrawn, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent assignments
export const agentAssignments = pgTable("agent_assignments", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => users.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id),
  commission: decimal("commission", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 50 }).default("active"), // active, completed, cancelled
  earnings: decimal("earnings", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NBFC loan products
export const loanProducts = pgTable("loan_products", {
  id: serial("id").primaryKey(),
  nbfcId: integer("nbfc_id").references(() => users.id).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  productType: varchar("product_type", { length: 100 }), // acquisition_loan, working_capital, equipment_finance
  minAmount: decimal("min_amount", { precision: 15, scale: 2 }),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }),
  interestRateMin: decimal("interest_rate_min", { precision: 5, scale: 2 }),
  interestRateMax: decimal("interest_rate_max", { precision: 5, scale: 2 }),
  tenureMin: integer("tenure_min"), // in months
  tenureMax: integer("tenure_max"), // in months
  processingFee: decimal("processing_fee", { precision: 5, scale: 2 }),
  eligibilityCriteria: text("eligibility_criteria"),
  requiredDocuments: json("required_documents"),
  features: json("features"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Compliance tracking
export const complianceRecords = pgTable("compliance_records", {
  id: serial("id").primaryKey(),
  nbfcId: integer("nbfc_id").references(() => users.id).notNull(),
  complianceType: varchar("compliance_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // compliant, non_compliant, under_review
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  details: json("details"),
  documents: json("documents"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  msmeListings: many(msmeListings),
  buyerInterests: many(buyerInterests),
  agentAssignments: many(agentAssignments),
  loanApplications: many(loanApplications),
  nbfcDetails: one(nbfcDetails),
}));

export const nbfcDetailsRelations = relations(nbfcDetails, ({ one }) => ({
  user: one(users, {
    fields: [nbfcDetails.userId],
    references: [users.id],
  }),
}));

export const msmeListingsRelations = relations(msmeListings, ({ one, many }) => ({
  seller: one(users, {
    fields: [msmeListings.sellerId],
    references: [users.id],
  }),
  buyerInterests: many(buyerInterests),
  agentAssignments: many(agentAssignments),
  loanApplications: many(loanApplications),
}));

export const loanApplicationsRelations = relations(loanApplications, ({ one }) => ({
  msme: one(msmeListings, {
    fields: [loanApplications.msmeId],
    references: [msmeListings.id],
  }),
  buyer: one(users, {
    fields: [loanApplications.buyerId],
    references: [users.id],
  }),
  nbfc: one(users, {
    fields: [loanApplications.nbfcId],
    references: [users.id],
  }),
}));

export const buyerInterestsRelations = relations(buyerInterests, ({ one }) => ({
  buyer: one(users, {
    fields: [buyerInterests.buyerId],
    references: [users.id],
  }),
  msme: one(msmeListings, {
    fields: [buyerInterests.msmeId],
    references: [msmeListings.id],
  }),
}));

export const agentAssignmentsRelations = relations(agentAssignments, ({ one }) => ({
  agent: one(users, {
    fields: [agentAssignments.agentId],
    references: [users.id],
  }),
  msme: one(msmeListings, {
    fields: [agentAssignments.msmeId],
    references: [msmeListings.id],
  }),
}));

export const loanProductsRelations = relations(loanProducts, ({ one }) => ({
  nbfc: one(users, {
    fields: [loanProducts.nbfcId],
    references: [users.id],
  }),
}));

export const complianceRecordsRelations = relations(complianceRecords, ({ one }) => ({
  nbfc: one(users, {
    fields: [complianceRecords.nbfcId],
    references: [users.id],
  }),
}));

// Schema definitions
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNbfcDetailsSchema = createInsertSchema(nbfcDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMsmeListingSchema = createInsertSchema(msmeListings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoanApplicationSchema = createInsertSchema(loanApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuyerInterestSchema = createInsertSchema(buyerInterests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentAssignmentSchema = createInsertSchema(agentAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoanProductSchema = createInsertSchema(loanProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceRecordSchema = createInsertSchema(complianceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// VaaS (Valuation-as-a-Service) Tables
export const valuationRequests = pgTable("valuation_requests", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  msmeId: integer("msme_id").references(() => msmeListings.id),
  requestData: text("request_data").notNull(),
  status: text("status").notNull().default("pending"),
  tier: text("tier").notNull(),
  amount: integer("amount").notNull(),
  paymentId: text("payment_id"),
  result: text("result"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const valuationReports = pgTable("valuation_reports", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  msmeId: integer("msme_id").references(() => msmeListings.id),
  estimatedValue: integer("estimated_value").notNull(),
  confidence: real("confidence").notNull(),
  methodology: text("methodology"),
  reportPath: text("report_path"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertValuationRequestSchema = createInsertSchema(valuationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertValuationReportSchema = createInsertSchema(valuationReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// AI and Analytics Tables
export const vectorEmbeddings = pgTable("vector_embeddings", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull(),
  entityType: varchar("entity_type", { length: 20 }).notNull(), // 'msme', 'buyer', 'agent'
  embedding: real("embedding").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  userMessage: text("user_message").notNull(),
  assistantResponse: text("assistant_response").notNull(),
  userRole: varchar("user_role", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: json("tags"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: integer("entity_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
  details: text("details"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type NbfcDetails = typeof nbfcDetails.$inferSelect;
export type InsertNbfcDetails = z.infer<typeof insertNbfcDetailsSchema>;
export type MsmeListing = typeof msmeListings.$inferSelect;
export type InsertMsmeListing = z.infer<typeof insertMsmeListingSchema>;
export type LoanApplication = typeof loanApplications.$inferSelect;
export type InsertLoanApplication = z.infer<typeof insertLoanApplicationSchema>;
export type BuyerInterest = typeof buyerInterests.$inferSelect;
export type InsertBuyerInterest = z.infer<typeof insertBuyerInterestSchema>;
export type AgentAssignment = typeof agentAssignments.$inferSelect;
export type InsertAgentAssignment = z.infer<typeof insertAgentAssignmentSchema>;
export type LoanProduct = typeof loanProducts.$inferSelect;
export type InsertLoanProduct = z.infer<typeof insertLoanProductSchema>;
export type ComplianceRecord = typeof complianceRecords.$inferSelect;
export type InsertComplianceRecord = z.infer<typeof insertComplianceRecordSchema>;
export type VectorEmbedding = typeof vectorEmbeddings.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ValuationRequest = typeof valuationRequests.$inferSelect;
export type InsertValuationRequest = z.infer<typeof insertValuationRequestSchema>;
export type ValuationReport = typeof valuationReports.$inferSelect;
export type InsertValuationReport = z.infer<typeof insertValuationReportSchema>;

// Escrow accounts table
export const escrowAccounts = pgTable("escrow_accounts", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").references(() => users.id).notNull(),
  sellerId: integer("seller_id").references(() => users.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  status: varchar("status", { length: 20 }).default("pending"),
  releaseConditions: json("release_conditions").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Escrow milestones table
export const escrowMilestones = pgTable("escrow_milestones", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrow_id").references(() => escrowAccounts.id).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  evidence: text("evidence"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Escrow transactions table
export const escrowTransactions = pgTable("escrow_transactions", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrow_id").references(() => escrowAccounts.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  transactionId: varchar("transaction_id", { length: 100 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification tables
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  templateId: varchar("template_id", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  template: text("template").notNull(),
  variables: json("variables").default([]),
  priority: varchar("priority", { length: 20 }).default("medium"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  templateId: varchar("template_id", { length: 100 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("queued"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  messageId: varchar("message_id", { length: 100 }),
  error: text("error"),
  metadata: json("metadata"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  templateId: varchar("template_id", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true),
  channels: json("channels").default(["sms"]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  billingCycle: varchar("billing_cycle", { length: 20 }).default("monthly"), // monthly, yearly
  features: json("features"), // JSON array of features
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, cancelled, expired, pending
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionId: varchar("transaction_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buyer contact limits tracking
export const buyerContactLimits = pgTable("buyer_contact_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  contactedAt: timestamp("contacted_at").defaultNow(),
  contactType: varchar("contact_type", { length: 50 }), // email, phone, message
  monthYear: varchar("month_year", { length: 7 }), // Format: YYYY-MM for tracking monthly limits
});

// Valuation access tracking
export const valuationAccess = pgTable("valuation_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  accessType: varchar("access_type", { length: 20 }), // summary, full_pdf
  accessedAt: timestamp("accessed_at").defaultNow(),
  monthYear: varchar("month_year", { length: 7 }), // Format: YYYY-MM for tracking monthly limits
});

// Agent commission tracking
export const agentCommissions = pgTable("agent_commissions", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").references(() => users.id).notNull(),
  dealId: integer("deal_id").references(() => loanApplications.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(), // Percentage
  dealValue: decimal("deal_value", { precision: 15, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, paid, cancelled
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Valuation payments
export const valuationPayments = pgTable("valuation_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  paymentId: varchar("payment_id", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, failed
  pdfGenerated: boolean("pdf_generated").default(false),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Matchmaking report payments
export const matchmakingReportPayments = pgTable("matchmaking_report_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  paymentId: varchar("payment_id", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, failed
  reportGenerated: boolean("report_generated").default(false),
  reportUrl: varchar("report_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lead credits for MSMEs
export const leadCredits = pgTable("lead_credits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // MSME seller
  totalCredits: integer("total_credits").default(0),
  usedCredits: integer("used_credits").default(0),
  remainingCredits: integer("remaining_credits").default(0),
  lastPurchaseAt: timestamp("last_purchase_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lead purchases
export const leadPurchases = pgTable("lead_purchases", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").references(() => users.id).notNull(), // MSME seller
  buyerId: integer("buyer_id").references(() => users.id).notNull(), // Buyer info being purchased
  msmeId: integer("msme_id").references(() => msmeListings.id).notNull(),
  creditsUsed: integer("credits_used").default(1),
  contactInfo: json("contact_info"), // Buyer's contact details
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

// API access for banks/NBFCs
export const apiAccess = pgTable("api_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  apiKey: varchar("api_key", { length: 100 }).unique().notNull(),
  planType: varchar("plan_type", { length: 50 }).notNull(), // basic, premium, enterprise
  requestsLimit: integer("requests_limit").default(1000),
  requestsUsed: integer("requests_used").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform revenue tracking
export const platformRevenue = pgTable("platform_revenue", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 50 }).notNull(), // commission, valuation, matchmaking, escrow, leads, api, success_fee
  userId: integer("user_id").references(() => users.id),
  dealId: integer("deal_id").references(() => loanApplications.id),
  msmeId: integer("msme_id").references(() => msmeListings.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR"),
  percentage: decimal("percentage", { precision: 5, scale: 2 }), // For percentage-based fees
  status: varchar("status", { length: 20 }).default("pending"), // pending, collected, refunded
  metadata: json("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
});

// Escrow and notification types
export const insertEscrowAccountSchema = createInsertSchema(escrowAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEscrowMilestoneSchema = createInsertSchema(escrowMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEscrowTransactionSchema = createInsertSchema(escrowTransactions).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuyerContactLimitSchema = createInsertSchema(buyerContactLimits).omit({
  id: true,
  contactedAt: true,
});

export const insertValuationAccessSchema = createInsertSchema(valuationAccess).omit({
  id: true,
  accessedAt: true,
});

export const insertAgentCommissionSchema = createInsertSchema(agentCommissions).omit({
  id: true,
  createdAt: true,
});

export const insertValuationPaymentSchema = createInsertSchema(valuationPayments).omit({
  id: true,
  createdAt: true,
});

export const insertMatchmakingReportPaymentSchema = createInsertSchema(matchmakingReportPayments).omit({
  id: true,
  createdAt: true,
});

export const insertLeadCreditSchema = createInsertSchema(leadCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadPurchaseSchema = createInsertSchema(leadPurchases).omit({
  id: true,
  purchasedAt: true,
});

export const insertApiAccessSchema = createInsertSchema(apiAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformRevenueSchema = createInsertSchema(platformRevenue).omit({
  id: true,
  createdAt: true,
});

export type EscrowAccount = typeof escrowAccounts.$inferSelect;
export type InsertEscrowAccount = z.infer<typeof insertEscrowAccountSchema>;
export type EscrowMilestone = typeof escrowMilestones.$inferSelect;
export type InsertEscrowMilestone = z.infer<typeof insertEscrowMilestoneSchema>;
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type InsertEscrowTransaction = z.infer<typeof insertEscrowTransactionSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationHistoryRecord = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type BuyerContactLimit = typeof buyerContactLimits.$inferSelect;
export type InsertBuyerContactLimit = z.infer<typeof insertBuyerContactLimitSchema>;
export type ValuationAccess = typeof valuationAccess.$inferSelect;
export type InsertValuationAccess = z.infer<typeof insertValuationAccessSchema>;
export type AgentCommission = typeof agentCommissions.$inferSelect;
export type InsertAgentCommission = z.infer<typeof insertAgentCommissionSchema>;
export type ValuationPayment = typeof valuationPayments.$inferSelect;
export type InsertValuationPayment = z.infer<typeof insertValuationPaymentSchema>;
export type MatchmakingReportPayment = typeof matchmakingReportPayments.$inferSelect;
export type InsertMatchmakingReportPayment = z.infer<typeof insertMatchmakingReportPaymentSchema>;
export type LeadCredit = typeof leadCredits.$inferSelect;
export type InsertLeadCredit = z.infer<typeof insertLeadCreditSchema>;
export type LeadPurchase = typeof leadPurchases.$inferSelect;
export type InsertLeadPurchase = z.infer<typeof insertLeadPurchaseSchema>;
export type ApiAccess = typeof apiAccess.$inferSelect;
export type InsertApiAccess = z.infer<typeof insertApiAccessSchema>;
export type PlatformRevenue = typeof platformRevenue.$inferSelect;
export type InsertPlatformRevenue = z.infer<typeof insertPlatformRevenueSchema>;
