const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analyticsService');
const WorkflowAutomationService = require('../services/workflowService');
const RBACService = require('../services/rbacService');

// Initialize services
const analyticsService = new AnalyticsService();
const workflowService = new WorkflowAutomationService();
const rbacService = new RBACService();

// Apply authentication middleware to all admin routes
router.use(rbacService.requireAuth());

// ================================
// AUTHENTICATION & SESSION ROUTES
// ================================

// Admin login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await rbacService.authenticateUser(
      email, 
      password, 
      req.ip, 
      req.get('User-Agent')
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Admin logout
router.post('/auth/logout', async (req, res) => {
  try {
    await rbacService.logout(req.user.sessionId);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user info
router.get('/auth/me', async (req, res) => {
  try {
    const permissions = await rbacService.getUserPermissions(req.user.id);
    res.json({
      success: true,
      data: {
        user: req.user,
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================================
// DASHBOARD ANALYTICS ROUTES
// ================================

// Main dashboard data
router.get('/dashboard', rbacService.requirePermission('dashboard:read'), async (req, res) => {
  try {
    const dashboardData = await analyticsService.getDashboardData();
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Transaction analytics
router.get('/analytics/transactions', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const transactionData = await analyticsService.getTransactionData(period);
    
    res.json({
      success: true,
      data: transactionData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MSME analytics
router.get('/analytics/msmes', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const msmeData = await analyticsService.getActiveMSMEData();
    res.json({
      success: true,
      data: msmeData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Valuation analytics
router.get('/analytics/valuations', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const valuationData = await analyticsService.getValuationSummary(period);
    
    res.json({
      success: true,
      data: valuationData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// User analytics
router.get('/analytics/users', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const userData = await analyticsService.getUserAnalytics();
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Revenue analytics
router.get('/analytics/revenue', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const { period = '12m' } = req.query;
    const revenueData = await analyticsService.getRevenueAnalytics(period);
    
    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Performance metrics
router.get('/analytics/performance', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const performanceData = await analyticsService.getPerformanceMetrics();
    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Growth analytics
router.get('/analytics/growth', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const growthData = await analyticsService.getGrowthAnalytics();
    res.json({
      success: true,
      data: growthData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Industry analytics
router.get('/analytics/industry', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const industryData = await analyticsService.getIndustryAnalytics();
    res.json({
      success: true,
      data: industryData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Geographic analytics
router.get('/analytics/geographic', rbacService.requirePermission('analytics:read'), async (req, res) => {
  try {
    const geoData = await analyticsService.getGeographicAnalytics();
    res.json({
      success: true,
      data: geoData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export analytics data
router.get('/analytics/export/:type', rbacService.requirePermission('analytics:export'), async (req, res) => {
  try {
    const { type } = req.params;
    const { period, format = 'json' } = req.query;
    
    const data = await analyticsService.exportAnalyticsData(type, period, format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics.csv"`);
      res.send(data);
    } else {
      res.json({
        success: true,
        data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// WORKFLOW AUTOMATION ROUTES
// ================================

// Start MSME onboarding workflow
router.post('/workflows/onboarding', rbacService.requirePermission('workflows:create'), async (req, res) => {
  try {
    const { msmeData } = req.body;
    
    const workflow = await workflowService.startMSMEOnboarding(msmeData);
    
    res.json({
      success: true,
      data: workflow,
      message: 'MSME onboarding workflow started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start valuation workflow
router.post('/workflows/valuation', rbacService.requirePermission('workflows:create'), async (req, res) => {
  try {
    const { valuationData } = req.body;
    
    const workflow = await workflowService.startValuationWorkflow(valuationData);
    
    res.json({
      success: true,
      data: workflow,
      message: 'Valuation workflow started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow status
router.get('/workflows/:workflowId/status', rbacService.requirePermission('workflows:read'), async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // Get workflow status from database
    const statusResult = await workflowService.db.query(
      'SELECT * FROM workflows WHERE id = $1',
      [workflowId]
    );
    
    if (statusResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }
    
    const workflow = statusResult.rows[0];
    
    // Get workflow logs
    const logsResult = await workflowService.db.query(
      'SELECT * FROM workflow_logs WHERE entity_id = $1 ORDER BY created_at DESC',
      [workflow.entity_id]
    );
    
    res.json({
      success: true,
      data: {
        workflow,
        logs: logsResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trigger compliance monitoring
router.post('/workflows/compliance/:msmeId', rbacService.requirePermission('workflows:create'), async (req, res) => {
  try {
    const { msmeId } = req.params;
    
    const complianceResults = await workflowService.startComplianceMonitoring(msmeId);
    
    res.json({
      success: true,
      data: complianceResults,
      message: 'Compliance monitoring completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// USER MANAGEMENT ROUTES
// ================================

// Create admin user
router.post('/users', rbacService.requirePermission('users:create'), async (req, res) => {
  try {
    const userData = req.body;
    
    const user = await rbacService.createAdminUser(userData, req.user.id);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'Admin user created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get all admin users
router.get('/users', rbacService.requirePermission('users:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, team, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, 
             u.last_login, u.created_at, r.name as role_name, r.display_name as role_display,
             t.name as team_name
      FROM admin_users u
      JOIN admin_roles r ON u.role_id = r.id
      LEFT JOIN admin_teams t ON u.team_id = t.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND r.name = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (team) {
      query += ` AND t.id = $${paramIndex}`;
      params.push(team);
      paramIndex++;
    }

    if (search) {
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await rbacService.db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user by ID
router.get('/users/:id', rbacService.requirePermission('users:read'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await rbacService.db.query(
      `SELECT u.*, r.name as role_name, r.display_name as role_display, t.name as team_name
       FROM admin_users u
       JOIN admin_roles r ON u.role_id = r.id
       LEFT JOIN admin_teams t ON u.team_id = t.id
       WHERE u.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    delete user.password_hash; // Remove password hash from response
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user
router.put('/users/:id', rbacService.requirePermission('users:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Build update query dynamically
    const allowedFields = ['first_name', 'last_name', 'role_id', 'team_id', 'is_active'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await rbacService.db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log the update
    await rbacService.logAccess(
      req.user.id,
      'users',
      'update',
      id,
      req.ip,
      req.get('User-Agent'),
      true,
      { updated_fields: Object.keys(updateData) }
    );

    const user = result.rows[0];
    delete user.password_hash;

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// MSME MANAGEMENT ROUTES
// ================================

// Get all MSMEs with filtering
router.get('/msmes', rbacService.requirePermission('msmes:read'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      industry, 
      state, 
      verified, 
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, company_name, business_type, industry_category, 
             annual_turnover, employee_count, state, city, status, 
             verified, created_at, updated_at
      FROM msmes
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (industry) {
      query += ` AND industry_category = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }

    if (state) {
      query += ` AND state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }

    if (verified !== undefined) {
      query += ` AND verified = $${paramIndex}`;
      params.push(verified === 'true');
      paramIndex++;
    }

    if (search) {
      query += ` AND (company_name ILIKE $${paramIndex} OR gstin ILIKE $${paramIndex} OR pan ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Validate sort and order parameters
    const allowedSortFields = ['created_at', 'company_name', 'annual_turnover', 'employee_count'];
    const allowedOrderValues = ['ASC', 'DESC'];
    
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const orderValue = allowedOrderValues.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    query += ` ORDER BY ${sortField} ${orderValue} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await analyticsService.db.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM msmes WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset
    
    if (status) countQuery += ` AND status = $1`;
    if (industry) countQuery += ` AND industry_category = $${status ? 2 : 1}`;
    // ... add other filters for count query
    
    const countResult = await analyticsService.db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get MSME by ID
router.get('/msmes/:id', rbacService.requirePermission('msmes:read'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await analyticsService.db.query(
      'SELECT * FROM msmes WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'MSME not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Approve MSME
router.post('/msmes/:id/approve', rbacService.requirePermission('msmes:approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const result = await analyticsService.db.query(
      'UPDATE msmes SET verified = true, status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['active', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'MSME not found'
      });
    }
    
    // Log the approval
    await rbacService.logAccess(
      req.user.id,
      'msmes',
      'approve',
      id,
      req.ip,
      req.get('User-Agent'),
      true,
      { comments }
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'MSME approved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// AUDIT & LOGGING ROUTES
// ================================

// Get access logs
router.get('/audit/logs', rbacService.requirePermission('audit:read'), async (req, res) => {
  try {
    const filters = req.query;
    const logs = await rbacService.getAccessLogs(filters);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export audit logs
router.get('/audit/export', rbacService.requirePermission('audit:export'), async (req, res) => {
  try {
    const { format = 'json', ...filters } = req.query;
    const logs = await rbacService.getAccessLogs(filters);
    
    if (format === 'csv') {
      const csvData = analyticsService.convertToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: logs
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ================================
// SYSTEM HEALTH & STATUS ROUTES
// ================================

// System health check
router.get('/system/health', rbacService.requirePermission('system:manage'), async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        queue: 'healthy'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    // Test database connection
    try {
      await analyticsService.db.query('SELECT 1');
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }
    
    // Test Redis connection
    try {
      await analyticsService.redis.ping();
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
    }
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;