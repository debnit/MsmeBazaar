import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User types enum
export const userRoles = ['seller', 'buyer', 'agent', 'admin', 'nbfc'] as const;
export type UserRole = typeof userRoles[number];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
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
