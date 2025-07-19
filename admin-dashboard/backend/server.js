const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import services and routes
const adminRoutes = require('./routes/adminRoutes');
const RBACService = require('./services/rbacService');
const AnalyticsService = require('./services/analyticsService');
const WorkflowAutomationService = require('./services/workflowService');

class AdminDashboardServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 4000;
    this.rbacService = new RBACService();
    this.analyticsService = new AnalyticsService();
    this.workflowService = new WorkflowAutomationService();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL]
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/admin/system/health';
      },
    });

    // Apply rate limiting to admin routes
    this.app.use('/api/admin', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === 'production') {
      this.app.use(morgan('combined'));
    } else {
      this.app.use(morgan('dev'));
    }

    // Request ID middleware for tracing
    this.app.use((req, res, next) => {
      req.id = require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Request timing middleware
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      this.app.use(express.static(path.join(__dirname, '../frontend/build')));
    }
  }

  setupRoutes() {
    // Health check endpoint (public)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'admin-dashboard',
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API routes
    this.app.use('/api/admin', adminRoutes);

    // Public login endpoint (before RBAC middleware)
    this.app.post('/api/admin/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            error: 'Email and password are required',
          });
        }

        const result = await this.rbacService.authenticateUser(
          email,
          password,
          req.ip,
          req.get('User-Agent'),
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Initialize RBAC system endpoint (one-time setup)
    this.app.post('/api/admin/initialize', async (req, res) => {
      try {
        if (process.env.NODE_ENV === 'production') {
          return res.status(403).json({
            success: false,
            error: 'Initialization not allowed in production',
          });
        }

        await this.rbacService.initializeRBAC();

        // Create default super admin user
        const defaultAdmin = {
          email: 'admin@msmebazaar.com',
          password: 'Admin123!',
          firstName: 'System',
          lastName: 'Administrator',
          roleName: 'super_admin',
        };

        await this.rbacService.createAdminUser(defaultAdmin, null);

        res.json({
          success: true,
          message: 'RBAC system initialized successfully',
          defaultAdmin: {
            email: defaultAdmin.email,
            password: defaultAdmin.password,
          },
        });
      } catch (error) {
        console.error('Initialization error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Workflow automation endpoints
    this.app.post('/api/admin/workflows/msme-onboarding', async (req, res) => {
      try {
        const msmeData = req.body;

        // Example MSME onboarding automation
        const result = await this.automateMSMEOnboarding(msmeData);

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('MSME onboarding error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Catch-all handler for React app in production
    if (process.env.NODE_ENV === 'production') {
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
      });
    }

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', {
        error: error.message,
        stack: error.stack,
        requestId: req.id,
        path: req.path,
        method: req.method,
        body: req.body,
        user: req.user,
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV !== 'production';

      res.status(error.status || 500).json({
        success: false,
        error: isDevelopment ? error.message : 'Internal server error',
        ...(isDevelopment && { stack: error.stack }),
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  // Automated MSME Onboarding Implementation (as per user's request)
  async automateMSMEOnboarding(msmeData) {
    try {
      console.log('Starting automated MSME onboarding for:', msmeData.email);

      // Step 1: Send verification email/OTP
      await this.sendOTP(msmeData.email);

      // Step 2: Verify MSME details
      const isVerified = await this.verifyMSMEData(msmeData);

      // Step 3: Auto-generate invoices for MSME
      if (isVerified) {
        const invoice = await this.generateInvoice(msmeData);

        // Log successful onboarding
        console.log('MSME onboarding completed successfully for:', msmeData.email);

        return {
          status: 'completed',
          msmeId: msmeData.id,
          invoice,
          message: 'MSME onboarding completed successfully',
        };
      }
      throw new Error('MSME verification failed!');

    } catch (error) {
      console.error('MSME onboarding failed:', error);
      throw error;
    }
  }

  // Helper methods for MSME onboarding
  async sendOTP(email) {
    // Implementation for sending OTP
    console.log(`Sending OTP to ${email}`);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with expiration
    await this.workflowService.redis.setEx(`otp:${email}`, 600, otp); // 10 minutes

    // Send email via workflow service
    await this.workflowService.notificationQueue.add('send-notification', {
      type: 'email',
      to: email,
      subject: 'MSMEBazaar - Verification Code',
      template: 'otp',
      data: { otp },
    });

    return { sent: true, email };
  }

  async verifyMSMEData(msmeData) {
    // Implementation for MSME data verification
    console.log(`Verifying MSME data for ${msmeData.companyName}`);

    // Basic validation
    const requiredFields = ['companyName', 'email', 'gstin', 'pan', 'businessType'];
    const missingFields = requiredFields.filter(field => !msmeData[field]);

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return false;
    }

    // Validate GSTIN format (15 characters)
    if (msmeData.gstin && msmeData.gstin.length !== 15) {
      console.log('Invalid GSTIN format');
      return false;
    }

    // Validate PAN format (10 characters)
    if (msmeData.pan && msmeData.pan.length !== 10) {
      console.log('Invalid PAN format');
      return false;
    }

    // Additional business logic validation can be added here
    console.log('MSME data verification passed');
    return true;
  }

  async generateInvoice(msmeData) {
    // Implementation for invoice generation
    console.log(`Generating invoice for ${msmeData.companyName}`);

    const invoice = {
      id: `INV-${Date.now()}`,
      msmeId: msmeData.id,
      companyName: msmeData.companyName,
      amount: 0, // Platform setup fee
      status: 'generated',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      generatedAt: new Date(),
      items: [
        {
          description: 'Platform Setup and Onboarding',
          amount: 0,
          type: 'setup',
        },
      ],
    };

    // Store invoice in database (mock implementation)
    console.log('Invoice generated:', invoice.id);

    return invoice;
  }

  // Background job processing (as per user's example)
  async processOnboarding(msmeId) {
    try {
      const msme = await this.getMSMEById(msmeId);

      // Automate data processing and verification
      await this.automateMSMEOnboarding(msme);

      return {
        taskId: msmeId,
        status: 'Completed',
        completedAt: new Date(),
      };
    } catch (error) {
      console.error('Background onboarding processing failed:', error);
      return {
        taskId: msmeId,
        status: 'Failed',
        error: error.message,
        failedAt: new Date(),
      };
    }
  }

  async getMSMEById(msmeId) {
    // Mock implementation - replace with actual database query
    return {
      id: msmeId,
      companyName: 'Sample MSME',
      email: 'sample@msme.com',
      gstin: '123456789012345',
      pan: 'ABCDE1234F',
      businessType: 'Manufacturing',
    };
  }

  async start() {
    try {
      // Test database connections
      await this.testConnections();

      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Admin Dashboard Server running on port ${this.port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 API URL: http://localhost:${this.port}/api/admin`);

        if (process.env.NODE_ENV !== 'production') {
          console.log(`⚙️  Initialize RBAC: POST http://localhost:${this.port}/api/admin/initialize`);
          console.log('🔐 Default Admin: admin@msmebazaar.com / Admin123!');
        }
      });

      return this.server;
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async testConnections() {
    try {
      // Test database connection
      await this.analyticsService.db.query('SELECT 1');
      console.log('✅ Database connection successful');

      // Test Redis connection
      await this.analyticsService.redis.ping();
      console.log('✅ Redis connection successful');

    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  async shutdown() {
    console.log('Shutting down server...');

    try {
      // Close server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        console.log('✅ HTTP server closed');
      }

      // Close database connections
      await this.rbacService.close();
      await this.analyticsService.close();
      await this.workflowService.close();
      console.log('✅ Database connections closed');

      console.log('👋 Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new AdminDashboardServer();
  server.start();
}

module.exports = AdminDashboardServer;
