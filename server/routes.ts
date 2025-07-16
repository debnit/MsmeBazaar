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
import { insertUserSchema, insertMsmeListingSchema, insertLoanApplicationSchema, insertBuyerInterestSchema, insertNbfcDetailsSchema, insertLoanProductSchema } from "@shared/schema";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "./middleware/auth";
import { validateValuation } from "./services/valuation";
import { findMatches } from "./services/matchmaking";
import { generateDocument } from "./services/document-generation";
import { checkCompliance } from "./services/compliance";
import { mobileAuth } from "./auth/mobile-auth";
import { monitoringService } from "./services/monitoring";
import { escrowService } from "./services/escrow";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Monitoring routes
  app.get("/api/monitoring/health", authenticateToken, requireRole("admin"), async (req, res) => {
    try {
      const metrics = monitoringService.getHealthMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Health metrics error:", error);
      res.status(500).json({ message: "Failed to fetch health metrics" });
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
