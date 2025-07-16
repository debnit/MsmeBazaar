/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization
 *   - name: Users
 *     description: User management operations
 *   - name: MSME Listings
 *     description: MSME business listing operations
 *   - name: Loan Applications
 *     description: Loan application management
 *   - name: Buyer Interests
 *     description: Buyer interest management
 *   - name: NBFC
 *     description: NBFC related operations
 *   - name: Matchmaking
 *     description: AI-powered matchmaking services
 *   - name: Valuation
 *     description: Business valuation services
 *   - name: Agent Scoring
 *     description: Agent performance scoring
 *   - name: Compliance
 *     description: Regulatory compliance management
 *   - name: Notifications
 *     description: Notification management
 *   - name: Monitoring
 *     description: System monitoring and analytics
 *   - name: Escrow
 *     description: Escrow account management
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMsmeListingSchema, insertLoanApplicationSchema, insertBuyerInterestSchema, insertNbfcDetailsSchema, insertLoanProductSchema, insertComplianceRecordSchema, subscriptionPlans, userSubscriptions } from "@shared/schema";
import { authenticateToken, type AuthenticatedRequest } from "./middleware/auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  requirePermission, 
  requireAllPermissions, 
  requireAnyPermission, 
  getUserPermissions,
  requireRole,
  PERMISSIONS 
} from "./middleware/rbac";
import { calculateValuation } from "./services/valuation";
import { findMatches } from "./services/matchmaking";
import { generateDocument } from "./services/document-generation";
import { complianceService } from "./services/compliance";
import { mobileAuth } from "./auth/mobile-auth";
import { monitoringService } from "./services/monitoring";
import { escrowService } from "./services/escrow";
import { monetizationService } from "./services/monetization";
import { memoryManager } from "./utils/memory-manager";
import { resourceOptimizer } from "./utils/resource-optimizer";
import { errorHandler } from "./utils/error-handler";
import jwt from "jsonwebtoken";
import { z } from "zod";
import Stripe from "stripe";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function registerRoutes(app: Express): Promise<Server> {
  // Load core routes first for minimal startup
  const coreRoutes = await import('./routes/core');
  app.use('/api', coreRoutes.default);
  
  // Check if we should load full routes or just core
  const { startupManager } = await import('./infrastructure/startup-manager');
  const allServicesInitialized = startupManager.getStatus().totalInitialized > 4;
  
  if (!allServicesInitialized) {
    console.log('🚀 Starting with core routes only');
    const httpServer = createServer(app);
    
    // Load full routes after startup
    setTimeout(async () => {
      try {
        await loadFullRoutes(app);
        console.log('✅ Full routes loaded');
      } catch (error) {
        console.error('❌ Failed to load full routes:', error);
      }
    }, 3000);
    
    return httpServer;
  }
  
  // Load full routes if all services are ready
  await loadFullRoutes(app);
  const httpServer = createServer(app);
  return httpServer;
}

async function loadFullRoutes(app: Express) {
  // Add optimization middleware
  const { stabilityMiddleware, memoryMiddleware, cacheMiddleware, healthCheckMiddleware } = await import("./middleware/stability");
  app.use(stabilityMiddleware);
  app.use(memoryMiddleware);
  app.use(healthCheckMiddleware);
  app.use(errorHandler.middleware());
  
  // Only load heavy imports when needed
  const { monitoringService } = await import("./services/monitoring");
  const { complianceService } = await import("./services/compliance");
  const { escrowService } = await import("./services/escrow");
  const { notifications } = await import("./services/notifications");
  const { notificationService } = await import("./storage/notifications");
  const { authRateLimit, paymentRateLimit, apiRateLimit } = await import("./middleware/security");
  
  /**
   * @swagger
   * /health:
   *   get:
   *     tags: [Monitoring]
   *     summary: Health check endpoint
   *     description: Returns the health status of the API
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 uptime:
   *                   type: number
   *                   example: 12345
   *                 version:
   *                   type: string
   *                   example: 1.0.0
   */
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0"
    });
  });

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     tags: [Authentication]
   *     summary: Get current user
   *     description: Returns the current authenticated user's information
   *     security:
   *       - bearerAuth: []
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: User information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     tags: [Authentication]
   *     summary: Register a new user
   *     description: Creates a new user account with email, password, and role
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *               - role
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 example: password123
   *               firstName:
   *                 type: string
   *                 example: John
   *               lastName:
   *                 type: string
   *                 example: Doe
   *               role:
   *                 type: string
   *                 enum: [seller, buyer, agent, admin, nbfc]
   *                 example: seller
   *               phone:
   *                 type: string
   *                 example: "+91-9876543210"
   *     responses:
   *       200:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 token:
   *                   type: string
   *                   description: JWT authentication token
   *       400:
   *         description: Registration failed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      // Set cookie for browser compatibility
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     tags: [Authentication]
   *     summary: User login
   *     description: Authenticates a user with email and password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 example: password123
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 token:
   *                   type: string
   *                   description: JWT authentication token
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      // Set cookie for browser compatibility
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Redirect to dashboard after successful login
      res.redirect('/');
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await storage.getUser(authReq.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Simple login page route for testing
  app.get("/api/auth/login", (req, res) => {
    res.send(`
      <html>
        <body>
          <h2>MSMESquare Login</h2>
          <form action="/api/auth/login" method="post">
            <div>
              <label>Email:</label>
              <input type="email" name="email" required>
            </div>
            <div>
              <label>Password:</label>
              <input type="password" name="password" required>
            </div>
            <button type="submit">Login</button>
          </form>
          <p><a href="/api/auth/register-page">Don't have an account? Register here</a></p>
        </body>
      </html>
    `);
  });

  // Simple register page route for testing
  app.get("/api/auth/register-page", (req, res) => {
    res.send(`
      <html>
        <body>
          <h2>MSMESquare Register</h2>
          <form action="/api/auth/register" method="post">
            <div>
              <label>Email:</label>
              <input type="email" name="email" required>
            </div>
            <div>
              <label>Password:</label>
              <input type="password" name="password" required>
            </div>
            <div>
              <label>First Name:</label>
              <input type="text" name="firstName" required>
            </div>
            <div>
              <label>Last Name:</label>
              <input type="text" name="lastName" required>
            </div>
            <div>
              <label>Role:</label>
              <select name="role" required>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
                <option value="agent">Agent</option>
                <option value="nbfc">NBFC</option>
              </select>
            </div>
            <button type="submit">Register</button>
          </form>
          <p><a href="/api/auth/login">Already have an account? Login here</a></p>
        </body>
      </html>
    `);
  });

  // Mobile authentication routes
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
      }
      
      const result = await mobileAuth.sendOTP(phoneNumber);
      res.json(result);
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      
      if (!phoneNumber || !otp) {
        return res.status(400).json({ success: false, message: "Phone number and OTP are required" });
      }
      
      const result = await mobileAuth.verifyOTP(phoneNumber, otp);
      
      if (result.success && result.user && result.token) {
        // Set cookie for browser compatibility
        res.cookie('auth_token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ success: false, message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
      }
      
      const result = await mobileAuth.resendOTP(phoneNumber);
      res.json(result);
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ success: false, message: "Failed to resend OTP" });
    }
  });

  // RBAC-protected routes with granular permissions
  
  // MSME Listings Routes
  app.get("/api/msme-listings", async (req, res) => {
    try {
      const listings = await storage.getAllMsmeListings();
      res.json(listings);
    } catch (error) {
      console.error("Get MSME listings error:", error);
      res.status(500).json({ message: "Failed to fetch MSME listings" });
    }
  });

  app.post("/api/msme-listings", 
    authenticateToken, 
    requirePermission(PERMISSIONS.MSME_WRITE),
    async (req, res) => {
      try {
        const listingData = insertMsmeListingSchema.parse({
          ...req.body,
          sellerId: req.user.userId
        });
        
        const listing = await storage.createMsmeListing(listingData);
        res.status(201).json(listing);
      } catch (error) {
        console.error("Create MSME listing error:", error);
        res.status(400).json({ message: "Failed to create MSME listing" });
      }
    }
  );

  app.get("/api/msme-listings/:id", async (req, res) => {
    try {
      const listing = await storage.getMsmeListing(parseInt(req.params.id));
      if (!listing) {
        return res.status(404).json({ message: "MSME listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Get MSME listing error:", error);
      res.status(500).json({ message: "Failed to fetch MSME listing" });
    }
  });

  app.put("/api/msme-listings/:id", 
    authenticateToken,
    requirePermission(PERMISSIONS.MSME_WRITE, {
      checkOwnership: true,
      resourceType: 'msme-listing',
      resourceIdParam: 'id'
    }),
    async (req, res) => {
      try {
        const listingId = parseInt(req.params.id);
        const updateData = req.body;
        
        const listing = await storage.updateMsmeListing(listingId, updateData);
        res.json(listing);
      } catch (error) {
        console.error("Update MSME listing error:", error);
        res.status(400).json({ message: "Failed to update MSME listing" });
      }
    }
  );

  app.delete("/api/msme-listings/:id", 
    authenticateToken,
    requirePermission(PERMISSIONS.MSME_DELETE, {
      checkOwnership: true,
      resourceType: 'msme-listing',
      resourceIdParam: 'id'
    }),
    async (req, res) => {
      try {
        const listingId = parseInt(req.params.id);
        await storage.deleteMsmeListing(listingId);
        res.json({ success: true, message: "MSME listing deleted successfully" });
      } catch (error) {
        console.error("Delete MSME listing error:", error);
        res.status(500).json({ message: "Failed to delete MSME listing" });
      }
    }
  );

  // Loan Application Routes
  app.get("/api/loan-applications", 
    authenticateToken,
    requirePermission(PERMISSIONS.LOANS_READ),
    async (req, res) => {
      try {
        const applications = await storage.getAllLoanApplications();
        res.json(applications);
      } catch (error) {
        console.error("Get loan applications error:", error);
        res.status(500).json({ message: "Failed to fetch loan applications" });
      }
    }
  );

  app.post("/api/loan-applications", 
    authenticateToken,
    requirePermission(PERMISSIONS.LOANS_WRITE),
    async (req, res) => {
      try {
        const applicationData = insertLoanApplicationSchema.parse({
          ...req.body,
          buyerId: req.user.userId
        });
        
        const application = await storage.createLoanApplication(applicationData);
        res.status(201).json(application);
      } catch (error) {
        console.error("Create loan application error:", error);
        res.status(400).json({ message: "Failed to create loan application" });
      }
    }
  );

  app.put("/api/loan-applications/:id/approve", 
    authenticateToken,
    requirePermission(PERMISSIONS.LOANS_APPROVE),
    async (req, res) => {
      try {
        const applicationId = parseInt(req.params.id);
        const application = await storage.updateLoanApplication(applicationId, { 
          status: 'approved',
          approvedAt: new Date()
        });
        res.json(application);
      } catch (error) {
        console.error("Approve loan application error:", error);
        res.status(500).json({ message: "Failed to approve loan application" });
      }
    }
  );

  app.put("/api/loan-applications/:id/reject", 
    authenticateToken,
    requirePermission(PERMISSIONS.LOANS_REJECT),
    async (req, res) => {
      try {
        const applicationId = parseInt(req.params.id);
        const { reason } = req.body;
        
        const application = await storage.updateLoanApplication(applicationId, { 
          status: 'rejected',
          rejectedAt: new Date(),
          rejectionReason: reason
        });
        res.json(application);
      } catch (error) {
        console.error("Reject loan application error:", error);
        res.status(500).json({ message: "Failed to reject loan application" });
      }
    }
  );

  // Buyer Interest Routes
  app.get("/api/buyer-interests", 
    authenticateToken,
    requirePermission(PERMISSIONS.INTERESTS_READ),
    async (req, res) => {
      try {
        const interests = await storage.getAllBuyerInterests();
        res.json(interests);
      } catch (error) {
        console.error("Get buyer interests error:", error);
        res.status(500).json({ message: "Failed to fetch buyer interests" });
      }
    }
  );

  app.post("/api/buyer-interests", 
    authenticateToken,
    requirePermission(PERMISSIONS.INTERESTS_WRITE),
    async (req, res) => {
      try {
        const interestData = insertBuyerInterestSchema.parse({
          ...req.body,
          buyerId: req.user.userId
        });
        
        const interest = await storage.createBuyerInterest(interestData);
        res.status(201).json(interest);
      } catch (error) {
        console.error("Create buyer interest error:", error);
        res.status(400).json({ message: "Failed to create buyer interest" });
      }
    }
  );

  // Compliance Routes
  app.get("/api/compliance/:nbfcId", 
    authenticateToken,
    requirePermission(PERMISSIONS.COMPLIANCE_READ),
    async (req, res) => {
      try {
        const nbfcId = parseInt(req.params.nbfcId);
        const compliance = await storage.getComplianceRecord(nbfcId);
        res.json(compliance);
      } catch (error) {
        console.error("Get compliance record error:", error);
        res.status(500).json({ message: "Failed to fetch compliance record" });
      }
    }
  );

  app.post("/api/compliance/:nbfcId", 
    authenticateToken,
    requirePermission(PERMISSIONS.COMPLIANCE_WRITE),
    async (req, res) => {
      try {
        const nbfcId = parseInt(req.params.nbfcId);
        const complianceData = insertComplianceRecordSchema.parse({
          ...req.body,
          nbfcId
        });
        
        const compliance = await storage.createComplianceRecord(complianceData);
        res.status(201).json(compliance);
      } catch (error) {
        console.error("Create compliance record error:", error);
        res.status(400).json({ message: "Failed to create compliance record" });
      }
    }
  );

  // Valuation Routes
  app.post("/api/msme-listings/:id/valuation", 
    authenticateToken,
    requirePermission(PERMISSIONS.VALUATION_READ),
    async (req, res) => {
      try {
        const listingId = parseInt(req.params.id);
        const listing = await storage.getMsmeListing(listingId);
        
        if (!listing) {
          return res.status(404).json({ message: "MSME listing not found" });
        }
        
        // Mock valuation calculation
        const valuation = {
          estimatedValue: listing.revenue * 2.5,
          confidence: 0.85,
          factors: {
            financialScore: 0.8,
            industryMultiplier: 1.2,
            locationFactor: 1.0,
            growthPotential: 0.9,
            assetQuality: 0.7,
            marketPosition: 0.6,
            riskFactor: 0.3,
            timeToMarket: 0.8
          },
          methodology: "ML-based DCF with industry comparables",
          recommendation: "fairly_valued"
        };
        
        res.json(valuation);
      } catch (error) {
        console.error("Valuation error:", error);
        res.status(500).json({ message: "Failed to calculate valuation" });
      }
    }
  );

  // Monitoring routes
  app.get("/api/monitoring/health", authenticateToken, requirePermission(PERMISSIONS.MONITORING_READ), async (req, res) => {
    try {
      const metrics = monitoringService.getHealthMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Health metrics error:", error);
      res.status(500).json({ message: "Failed to fetch health metrics" });
    }
  });

  app.get("/api/monitoring/metrics", authenticateToken, requirePermission(PERMISSIONS.MONITORING_READ), async (req, res) => {
    try {
      const metrics = monitoringService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("System metrics error:", error);
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  // Escrow Routes
  app.post("/api/escrow", 
    authenticateToken,
    requirePermission(PERMISSIONS.ESCROW_WRITE),
    async (req, res) => {
      try {
        const escrowData = {
          ...req.body,
          buyerId: req.user.role === 'buyer' ? req.user.userId : req.body.buyerId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const account = await escrowService.createEscrowAccount(escrowData);
        res.status(201).json(account);
      } catch (error) {
        console.error("Create escrow error:", error);
        res.status(400).json({ message: "Failed to create escrow account" });
      }
    }
  );

  app.get("/api/escrow/:id", 
    authenticateToken,
    requirePermission(PERMISSIONS.ESCROW_READ),
    async (req, res) => {
      try {
        const escrowId = parseInt(req.params.id);
        const account = await escrowService.getEscrowAccount(escrowId);
        
        if (!account) {
          return res.status(404).json({ message: "Escrow account not found" });
        }
        
        res.json(account);
      } catch (error) {
        console.error("Get escrow error:", error);
        res.status(500).json({ message: "Failed to fetch escrow account" });
      }
    }
  );

  app.post("/api/escrow/:id/fund", 
    authenticateToken,
    requirePermission(PERMISSIONS.ESCROW_FUND),
    async (req, res) => {
      try {
        const escrowId = parseInt(req.params.id);
        const { amount } = req.body;
        
        const success = await escrowService.fundEscrow(escrowId, amount);
        res.json({ success, message: "Escrow funded successfully" });
      } catch (error) {
        console.error("Fund escrow error:", error);
        res.status(400).json({ message: error.message || "Failed to fund escrow" });
      }
    }
  );

  app.post("/api/escrow/:id/release", 
    authenticateToken,
    requirePermission(PERMISSIONS.ESCROW_RELEASE),
    async (req, res) => {
      try {
        const escrowId = parseInt(req.params.id);
        
        const success = await escrowService.releaseFunds(escrowId);
        res.json({ success, message: "Funds released successfully" });
      } catch (error) {
        console.error("Release funds error:", error);
        res.status(400).json({ message: error.message || "Failed to release funds" });
      }
    }
  );

  app.post("/api/escrow/:id/refund", 
    authenticateToken,
    requirePermission(PERMISSIONS.ESCROW_REFUND),
    async (req, res) => {
      try {
        const escrowId = parseInt(req.params.id);
        const { reason } = req.body;
        
        const success = await escrowService.refundEscrow(escrowId, reason);
        res.json({ success, message: "Refund processed successfully" });
      } catch (error) {
        console.error("Refund escrow error:", error);
        res.status(400).json({ message: error.message || "Failed to process refund" });
      }
    }
  );

  // Notification Routes
  app.get("/api/notifications", 
    authenticateToken,
    requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
    async (req, res) => {
      try {
        const notifications = [];
        res.json(notifications);
      } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
      }
    }
  );

  app.put("/api/notifications/:id/read", 
    authenticateToken,
    requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
    async (req, res) => {
      try {
        const notificationId = parseInt(req.params.id);
        // Implementation depends on notification service
        res.json({ success: true, message: "Notification marked as read" });
      } catch (error) {
        console.error("Mark notification read error:", error);
        res.status(500).json({ message: "Failed to mark notification as read" });
      }
    }
  );

  // Admin Routes
  app.get("/api/admin/users", 
    authenticateToken,
    requirePermission(PERMISSIONS.USERS_READ),
    async (req, res) => {
      try {
        const users = await storage.getAllUsers();
        res.json(users);
      } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({ message: "Failed to fetch users" });
      }
    }
  );

  app.put("/api/admin/users/:id/role", 
    authenticateToken,
    requirePermission(PERMISSIONS.USERS_ADMIN),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;
        
        const user = await storage.updateUser(userId, { role });
        res.json(user);
      } catch (error) {
        console.error("Update user role error:", error);
        res.status(400).json({ message: "Failed to update user role" });
      }
    }
  );

  app.delete("/api/admin/users/:id", 
    authenticateToken,
    requirePermission(PERMISSIONS.USERS_DELETE),
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        await storage.deleteUser(userId);
        res.json({ success: true, message: "User deleted successfully" });
      } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Failed to delete user" });
      }
    }
  );

  // Analytics Routes
  app.get("/api/analytics/dashboard", 
    authenticateToken,
    requirePermission(PERMISSIONS.ANALYTICS_READ),
    async (req, res) => {
      try {
        const analytics = {
          totalListings: await storage.getTotalMsmeListings(),
          totalUsers: await storage.getTotalUsers(),
          totalLoanApplications: await storage.getTotalLoanApplications(),
          recentActivity: await storage.getRecentActivity(),
          topIndustries: await storage.getTopIndustries(),
          monthlyGrowth: await storage.getMonthlyGrowth()
        };
        res.json(analytics);
      } catch (error) {
        console.error("Get analytics error:", error);
        res.status(500).json({ message: "Failed to fetch analytics" });
      }
    }
  );

  // User permissions endpoint
  app.get("/api/auth/permissions", authenticateToken, async (req, res) => {
    try {
      const permissions = getUserPermissions(req.user.role);
      res.json({
        role: req.user.role,
        permissions: permissions
      });
    } catch (error) {
      console.error("Get permissions error:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get("/api/monitoring/crash-rate", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const crashRate = monitoringService.getCrashRate(hours);
      res.json({ crashRate, period: `${hours} hours` });
    } catch (error) {
      console.error("Crash rate error:", error);
      res.status(500).json({ message: "Failed to fetch crash rate" });
    }
  });

  app.get("/api/monitoring/errors", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const errorsByRoute = monitoringService.getErrorsByRoute();
      const slowRoutes = monitoringService.getSlowRoutes();
      res.json({ errorsByRoute, slowRoutes });
    } catch (error) {
      console.error("Error analytics error:", error);
      res.status(500).json({ message: "Failed to fetch error analytics" });
    }
  });

  // Escrow routes
  app.post("/api/escrow/create", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const escrowData = {
        ...req.body,
        buyerId: authReq.user.userId // Ensure buyer is the authenticated user
      };
      
      const escrowAccount = await escrowService.createEscrowAccount(escrowData);
      res.json(escrowAccount);
    } catch (error) {
      console.error("Escrow creation error:", error);
      res.status(400).json({ message: error.message || "Failed to create escrow account" });
    }
  });

  app.post("/api/escrow/:escrowId/fund", authenticateToken, async (req, res) => {
    try {
      const escrowId = parseInt(req.params.escrowId);
      const { paymentMethod, transactionId } = req.body;
      
      const success = await escrowService.fundEscrowAccount(escrowId, paymentMethod, transactionId);
      res.json({ success });
    } catch (error) {
      console.error("Escrow funding error:", error);
      res.status(400).json({ message: error.message || "Failed to fund escrow account" });
    }
  });

  app.post("/api/escrow/milestone/complete", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const milestoneData = {
        ...req.body,
        completedBy: authReq.user.userId
      };
      
      const success = await escrowService.completeMilestone(milestoneData);
      res.json({ success });
    } catch (error) {
      console.error("Milestone completion error:", error);
      res.status(400).json({ message: error.message || "Failed to complete milestone" });
    }
  });

  app.post("/api/escrow/:escrowId/release", authenticateToken, async (req, res) => {
    try {
      const escrowId = parseInt(req.params.escrowId);
      const success = await escrowService.releaseFunds(escrowId);
      res.json({ success });
    } catch (error) {
      console.error("Escrow release error:", error);
      res.status(400).json({ message: error.message || "Failed to release funds" });
    }
  });

  app.post("/api/escrow/:escrowId/refund", authenticateToken, async (req, res) => {
    try {
      const escrowId = parseInt(req.params.escrowId);
      const { reason } = req.body;
      const success = await escrowService.refundFunds(escrowId, reason);
      res.json({ success });
    } catch (error) {
      console.error("Escrow refund error:", error);
      res.status(400).json({ message: error.message || "Failed to refund funds" });
    }
  });

  app.get("/api/escrow/:escrowId", authenticateToken, async (req, res) => {
    try {
      const escrowId = parseInt(req.params.escrowId);
      const escrow = await escrowService.getEscrowAccount(escrowId);
      
      if (!escrow) {
        return res.status(404).json({ message: "Escrow account not found" });
      }
      
      res.json(escrow);
    } catch (error) {
      console.error("Escrow fetch error:", error);
      res.status(500).json({ message: "Failed to fetch escrow account" });
    }
  });

  app.get("/api/escrow/user/:userId", authenticateToken, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const authReq = req as AuthenticatedRequest;
      
      // Users can only view their own escrows unless they're admin
      if (authReq.user.userId !== userId && authReq.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const escrows = await escrowService.getEscrowsByUser(userId);
      res.json(escrows);
    } catch (error) {
      console.error("User escrows fetch error:", error);
      res.status(500).json({ message: "Failed to fetch user escrows" });
    }
  });

  app.get("/api/escrow/analytics", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const analytics = await escrowService.getEscrowAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Escrow analytics error:", error);
      res.status(500).json({ message: "Failed to fetch escrow analytics" });
    }
  });

  // NBFC routes
  app.post("/api/nbfc/details", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const nbfcData = insertNbfcDetailsSchema.parse(req.body);
      const nbfc = await storage.createNbfcDetails({
        ...nbfcData,
        userId: authReq.user.userId
      });
      res.json(nbfc);
    } catch (error) {
      console.error("NBFC details creation error:", error);
      res.status(400).json({ message: "Failed to create NBFC details" });
    }
  });

  app.get("/api/nbfc/details", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const nbfc = await storage.getNbfcDetails(authReq.user.userId);
      res.json(nbfc);
    } catch (error) {
      console.error("Get NBFC details error:", error);
      res.status(500).json({ message: "Failed to get NBFC details" });
    }
  });

  app.post("/api/nbfc/loan-products", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const productData = insertLoanProductSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;
      const product = await storage.createLoanProduct({
        ...productData,
        nbfcId: authReq.user.userId
      });
      res.json(product);
    } catch (error) {
      console.error("Loan product creation error:", error);
      res.status(400).json({ message: "Failed to create loan product" });
    }
  });

  app.get("/api/nbfc/loan-products", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const products = await storage.getLoanProducts(authReq.user.userId);
      res.json(products);
    } catch (error) {
      console.error("Get loan products error:", error);
      res.status(500).json({ message: "Failed to get loan products" });
    }
  });

  app.get("/api/nbfc/loan-applications", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const applications = await storage.getLoanApplications({ nbfcId: authReq.user.userId });
      res.json(applications);
    } catch (error) {
      console.error("Get loan applications error:", error);
      res.status(500).json({ message: "Failed to get loan applications" });
    }
  });

  app.patch("/api/nbfc/loan-applications/:id", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const updates = req.body;
      const application = await storage.updateLoanApplication(applicationId, updates);
      res.json(application);
    } catch (error) {
      console.error("Update loan application error:", error);
      res.status(400).json({ message: "Failed to update loan application" });
    }
  });

  app.get("/api/nbfc/compliance", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const records = await storage.getComplianceRecords(authReq.user.userId);
      res.json(records);
    } catch (error) {
      console.error("Get compliance records error:", error);
      res.status(500).json({ message: "Failed to get compliance records" });
    }
  });

  // MSME listing routes
  app.post("/api/msme/listings", authenticateToken, requireRole("seller"), async (req, res) => {
    try {
      const listingData = insertMsmeListingSchema.parse(req.body);
      const listing = await storage.createMsmeListing({
        ...listingData,
        sellerId: (req as AuthenticatedRequest).user.userId
      });
      res.json(listing);
    } catch (error) {
      console.error("MSME listing creation error:", error);
      res.status(400).json({ message: "Failed to create MSME listing" });
    }
  });

  app.get("/api/msme/listings", authenticateToken, async (req, res) => {
    try {
      const { status, industry, city } = req.query;
      const listings = await storage.getMsmeListings({
        status: status as string,
        industry: industry as string,
        city: city as string
      });
      res.json(listings);
    } catch (error) {
      console.error("Get MSME listings error:", error);
      res.status(500).json({ message: "Failed to get MSME listings" });
    }
  });

  app.get("/api/msme/listings/:id", authenticateToken, async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getMsmeListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "MSME listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Get MSME listing error:", error);
      res.status(500).json({ message: "Failed to get MSME listing" });
    }
  });

  app.get("/api/msme/my-listings", authenticateToken, requireRole("seller"), async (req, res) => {
    try {
      const listings = await storage.getUserMsmeListings((req as AuthenticatedRequest).user.userId);
      res.json(listings);
    } catch (error) {
      console.error("Get user MSME listings error:", error);
      res.status(500).json({ message: "Failed to get user MSME listings" });
    }
  });

  app.patch("/api/msme/listings/:id", authenticateToken, async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const updates = req.body;
      
      // Check if user owns the listing or is admin
      const listing = await storage.getMsmeListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "MSME listing not found" });
      }
      
      const authReq = req as AuthenticatedRequest;
      if (listing.sellerId !== authReq.user.userId && authReq.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updatedListing = await storage.updateMsmeListing(listingId, updates);
      res.json(updatedListing);
    } catch (error) {
      console.error("Update MSME listing error:", error);
      res.status(400).json({ message: "Failed to update MSME listing" });
    }
  });

  // Valuation service
  app.post("/api/msme/valuation", authenticateToken, async (req, res) => {
    try {
      const { msmeId } = req.body;
      const listing = await storage.getMsmeListing(msmeId);
      
      if (!listing) {
        return res.status(404).json({ message: "MSME not found" });
      }
      
      const valuation = await validateValuation(listing);
      
      // Update listing with valuation
      await storage.updateMsmeListing(msmeId, { valuationAmount: valuation.amount.toString() });
      
      res.json(valuation);
    } catch (error) {
      console.error("Valuation error:", error);
      res.status(500).json({ message: "Failed to perform valuation" });
    }
  });

  // Buyer interest routes
  app.post("/api/buyer/interests", authenticateToken, requireRole("buyer"), async (req, res) => {
    try {
      const interestData = insertBuyerInterestSchema.parse(req.body);
      const interest = await storage.createBuyerInterest({
        ...interestData,
        buyerId: (req as AuthenticatedRequest).user.userId
      });
      res.json(interest);
    } catch (error) {
      console.error("Buyer interest creation error:", error);
      res.status(400).json({ message: "Failed to create buyer interest" });
    }
  });

  app.get("/api/buyer/interests", authenticateToken, requireRole("buyer"), async (req, res) => {
    try {
      const interests = await storage.getUserBuyerInterests((req as AuthenticatedRequest).user.userId);
      res.json(interests);
    } catch (error) {
      console.error("Get buyer interests error:", error);
      res.status(500).json({ message: "Failed to get buyer interests" });
    }
  });

  app.get("/api/buyer/matches", authenticateToken, requireRole("buyer"), async (req, res) => {
    try {
      const { industry, priceRange, location } = req.query;
      const matches = await findMatches({
        industry: industry as string,
        priceRange: priceRange as string,
        location: location as string
      });
      res.json(matches);
    } catch (error) {
      console.error("Get matches error:", error);
      res.status(500).json({ message: "Failed to get matches" });
    }
  });

  // Loan application routes
  app.post("/api/loan/applications", authenticateToken, requireRole("buyer"), async (req, res) => {
    try {
      const applicationData = insertLoanApplicationSchema.parse(req.body);
      const application = await storage.createLoanApplication({
        ...applicationData,
        buyerId: (req as AuthenticatedRequest).user.userId
      });
      res.json(application);
    } catch (error) {
      console.error("Loan application creation error:", error);
      res.status(400).json({ message: "Failed to create loan application" });
    }
  });

  app.get("/api/loan/applications", authenticateToken, async (req, res) => {
    try {
      const filters: any = {};
      
      const authReq = req as AuthenticatedRequest;
      if (authReq.user.role === "buyer") {
        filters.buyerId = authReq.user.userId;
      } else if (authReq.user.role === "nbfc") {
        filters.nbfcId = authReq.user.userId;
      }
      
      const applications = await storage.getLoanApplications(filters);
      res.json(applications);
    } catch (error) {
      console.error("Get loan applications error:", error);
      res.status(500).json({ message: "Failed to get loan applications" });
    }
  });

  // Document generation
  app.post("/api/documents/generate", authenticateToken, async (req, res) => {
    try {
      const { type, data } = req.body;
      const document = await generateDocument(type, data);
      res.json(document);
    } catch (error) {
      console.error("Document generation error:", error);
      res.status(500).json({ message: "Failed to generate document" });
    }
  });

  // Compliance check
  app.post("/api/compliance/check", authenticateToken, requireRole("nbfc"), async (req, res) => {
    try {
      const compliance = await checkCompliance((req as AuthenticatedRequest).user.userId);
      res.json(compliance);
    } catch (error) {
      console.error("Compliance check error:", error);
      res.status(500).json({ message: "Failed to check compliance" });
    }
  });

  // Dashboard analytics
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const stats = await storage.getDashboardStats(authReq.user.userId, authReq.user.role);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Initialize Stripe
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  }) : null;

  // Monetization routes
  
  // Get subscription plans
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
      res.json(plans);
    } catch (error) {
      console.error("Get subscription plans error:", error);
      res.status(500).json({ message: "Failed to get subscription plans" });
    }
  });

  // Create subscription for Pro plan
  app.post("/api/subscription/create", authenticateToken, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const authReq = req as AuthenticatedRequest;
      const { planId } = req.body;

      // Get plan details
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(plan.price * 100), // Convert to paise
        currency: "inr",
        metadata: {
          type: "subscription",
          userId: authReq.user.userId.toString(),
          planId: planId.toString()
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Create subscription error:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Get user's subscription status
  app.get("/api/subscription/status", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const subscription = await storage.getUserActiveSubscription(authReq.user.userId);
      
      if (!subscription) {
        return res.json({ plan: "free", status: "inactive" });
      }

      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId));
      
      res.json({
        plan: plan?.name || "free",
        status: subscription.status,
        endDate: subscription.endDate,
        features: plan?.features || []
      });
    } catch (error) {
      console.error("Get subscription status error:", error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Valuation PDF payment
  app.post("/api/valuation/pay", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { msmeId, amount = 299 } = req.body;

      const result = await monetizationService.createValuationPayment(
        authReq.user.userId,
        msmeId,
        amount
      );

      res.json({ clientSecret: result.paymentIntent.client_secret });
    } catch (error) {
      console.error("Valuation payment error:", error);
      res.status(500).json({ message: "Failed to create valuation payment" });
    }
  });

  // Matchmaking report payment
  app.post("/api/matchmaking/pay", authenticateToken, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { msmeId, amount = 99 } = req.body;

      const result = await monetizationService.createMatchmakingReportPayment(
        authReq.user.userId,
        msmeId,
        amount
      );

      res.json({ clientSecret: result.paymentIntent.client_secret });
    } catch (error) {
      console.error("Matchmaking payment error:", error);
      res.status(500).json({ message: "Failed to create matchmaking payment" });
    }
  });

  // Purchase lead (for sellers)
  app.post("/api/leads/purchase", authenticateToken, requireRole("seller"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { buyerId, msmeId, creditsRequired = 1 } = req.body;

      const result = await monetizationService.purchaseLead(
        authReq.user.userId,
        buyerId,
        msmeId,
        creditsRequired
      );

      res.json(result);
    } catch (error) {
      console.error("Purchase lead error:", error);
      res.status(500).json({ message: "Failed to purchase lead" });
    }
  });

  // Get lead credits (for sellers)
  app.get("/api/leads/credits", authenticateToken, requireRole("seller"), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const credits = await storage.getLeadCredits(authReq.user.userId);
      
      res.json(credits || { 
        totalCredits: 0, 
        usedCredits: 0, 
        remainingCredits: 0 
      });
    } catch (error) {
      console.error("Get lead credits error:", error);
      res.status(500).json({ message: "Failed to get lead credits" });
    }
  });

  // Create API access (for banks/NBFCs)
  app.post("/api/api-access/create", authenticateToken, requireAnyPermission(["api_access_create"]), async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { planType = "basic" } = req.body;

      const apiKey = await monetizationService.createApiAccess(
        authReq.user.userId,
        planType
      );

      res.json({ apiKey });
    } catch (error) {
      console.error("Create API access error:", error);
      res.status(500).json({ message: "Failed to create API access" });
    }
  });

  // Get revenue analytics (admin only)
  app.get("/api/revenue/analytics", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const analytics = await monetizationService.getRevenueAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(analytics);
    } catch (error) {
      console.error("Revenue analytics error:", error);
      res.status(500).json({ message: "Failed to get revenue analytics" });
    }
  });

  // Agent commission routes
  app.get("/api/agent/commissions", authenticateToken, requireRole("agent"), errorHandler.createAsyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const commissions = await storage.getAgentCommissions(authReq.user.userId);
    res.json(commissions);
  }));

  // Webhook for processing completed payments
  app.post("/api/webhook/stripe", (req, res, next) => {
    // Handle raw body for Stripe webhooks
    req.setEncoding('utf8');
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      req.body = data;
      next();
    });
  }, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const sig = req.headers["stripe-signature"];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !endpointSecret) {
        return res.status(400).json({ message: "Missing webhook signature" });
      }

      const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const { type, userId, msmeId } = paymentIntent.metadata;

        await monetizationService.processCompletedPayment(paymentIntent.id, type);

        // Handle subscription activation
        if (type === "subscription") {
          const { planId } = paymentIntent.metadata;
          // Create user subscription record
          await db.insert(userSubscriptions).values({
            userId: parseInt(userId),
            planId: parseInt(planId),
            status: "active",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          });
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ message: "Webhook error" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      // This would need a proper implementation in storage
      res.json({ message: "Admin users endpoint" });
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.patch("/api/admin/listings/:id/approve", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.updateMsmeListing(listingId, {
        isApproved: true,
        approvedBy: (req as AuthenticatedRequest).user.userId,
        approvedAt: new Date(),
        status: "active"
      });
      res.json(listing);
    } catch (error) {
      console.error("Approve listing error:", error);
      res.status(400).json({ message: "Failed to approve listing" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
