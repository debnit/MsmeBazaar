const { Pool } = require('pg');
const Redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class RBACService {
  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
    });
    
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL
    });
    
    this.redis.connect();

    // Define comprehensive role hierarchy and permissions
    this.roleHierarchy = {
      super_admin: {
        level: 100,
        inherits: [],
        permissions: ['*'] // All permissions
      },
      admin: {
        level: 90,
        inherits: ['manager'],
        permissions: [
          'system:manage',
          'users:create', 'users:read', 'users:update', 'users:delete',
          'roles:create', 'roles:read', 'roles:update', 'roles:delete',
          'msmes:create', 'msmes:read', 'msmes:update', 'msmes:delete',
          'valuations:create', 'valuations:read', 'valuations:update', 'valuations:delete',
          'analytics:read', 'analytics:export',
          'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete',
          'reports:create', 'reports:read', 'reports:export',
          'settings:read', 'settings:update',
          'audit:read'
        ]
      },
      manager: {
        level: 70,
        inherits: ['senior_agent'],
        permissions: [
          'team:manage',
          'msmes:read', 'msmes:update', 'msmes:approve',
          'valuations:read', 'valuations:update', 'valuations:approve',
          'analytics:read',
          'workflows:read', 'workflows:update',
          'reports:read',
          'users:read', 'users:update:own_team'
        ]
      },
      senior_agent: {
        level: 50,
        inherits: ['agent'],
        permissions: [
          'msmes:read', 'msmes:update:assigned',
          'valuations:read', 'valuations:update:assigned',
          'analytics:read:limited',
          'workflows:read:assigned',
          'reports:read:own'
        ]
      },
      agent: {
        level: 30,
        inherits: ['viewer'],
        permissions: [
          'msmes:read:assigned',
          'valuations:read:assigned',
          'workflows:read:assigned'
        ]
      },
      viewer: {
        level: 10,
        inherits: [],
        permissions: [
          'dashboard:read',
          'profile:read', 'profile:update:own'
        ]
      }
    };

    // Resource-specific permissions
    this.resourcePermissions = {
      msmes: ['create', 'read', 'update', 'delete', 'approve', 'suspend'],
      users: ['create', 'read', 'update', 'delete', 'suspend', 'activate'],
      valuations: ['create', 'read', 'update', 'delete', 'approve'],
      analytics: ['read', 'export', 'create_reports'],
      workflows: ['create', 'read', 'update', 'delete', 'execute'],
      system: ['manage', 'backup', 'restore', 'maintenance'],
      reports: ['create', 'read', 'update', 'delete', 'export', 'share'],
      settings: ['read', 'update', 'reset'],
      audit: ['read', 'export'],
      team: ['manage', 'assign', 'review'],
      dashboard: ['read', 'customize'],
      profile: ['read', 'update']
    };
  }

  // Initialize RBAC tables and default data
  async initializeRBAC() {
    try {
      // Create RBAC tables
      await this.createRBACTables();
      
      // Insert default roles and permissions
      await this.insertDefaultRoles();
      await this.insertDefaultPermissions();
      
      console.log('RBAC system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RBAC system:', error);
      throw error;
    }
  }

  async createRBACTables() {
    const queries = [
      // Roles table
      `CREATE TABLE IF NOT EXISTS admin_roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        level INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // Permissions table
      `CREATE TABLE IF NOT EXISTS admin_permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        resource VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Role-Permission mapping
      `CREATE TABLE IF NOT EXISTS admin_role_permissions (
        role_id INTEGER REFERENCES admin_roles(id) ON DELETE CASCADE,
        permission_id INTEGER REFERENCES admin_permissions(id) ON DELETE CASCADE,
        granted_at TIMESTAMP DEFAULT NOW(),
        granted_by INTEGER,
        PRIMARY KEY (role_id, permission_id)
      )`,

      // Admin users table
      `CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role_id INTEGER REFERENCES admin_roles(id),
        team_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // User sessions
      `CREATE TABLE IF NOT EXISTS admin_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Resource access logs
      `CREATE TABLE IF NOT EXISTS admin_access_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES admin_users(id),
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        resource_id VARCHAR(100),
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Team management
      `CREATE TABLE IF NOT EXISTS admin_teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        manager_id INTEGER REFERENCES admin_users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    ];

    for (const query of queries) {
      await this.db.query(query);
    }
  }

  async insertDefaultRoles() {
    const roles = [
      { name: 'super_admin', display_name: 'Super Administrator', level: 100, description: 'Full system access' },
      { name: 'admin', display_name: 'Administrator', level: 90, description: 'Administrative access' },
      { name: 'manager', display_name: 'Manager', level: 70, description: 'Team management access' },
      { name: 'senior_agent', display_name: 'Senior Agent', level: 50, description: 'Advanced agent access' },
      { name: 'agent', display_name: 'Agent', level: 30, description: 'Standard agent access' },
      { name: 'viewer', display_name: 'Viewer', level: 10, description: 'Read-only access' }
    ];

    for (const role of roles) {
      await this.db.query(
        `INSERT INTO admin_roles (name, display_name, level, description) 
         VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
        [role.name, role.display_name, role.level, role.description]
      );
    }
  }

  async insertDefaultPermissions() {
    const permissions = [];
    
    // Generate permissions for each resource
    for (const [resource, actions] of Object.entries(this.resourcePermissions)) {
      for (const action of actions) {
        permissions.push({
          name: `${resource}:${action}`,
          resource,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`
        });
      }
    }

    // Add wildcard permission
    permissions.push({
      name: '*',
      resource: '*',
      action: '*',
      description: 'All permissions'
    });

    for (const permission of permissions) {
      await this.db.query(
        `INSERT INTO admin_permissions (name, resource, action, description) 
         VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
        [permission.name, permission.resource, permission.action, permission.description]
      );
    }

    // Assign permissions to roles
    await this.assignRolePermissions();
  }

  async assignRolePermissions() {
    for (const [roleName, roleConfig] of Object.entries(this.roleHierarchy)) {
      const roleResult = await this.db.query(
        'SELECT id FROM admin_roles WHERE name = $1',
        [roleName]
      );

      if (roleResult.rows.length === 0) continue;
      
      const roleId = roleResult.rows[0].id;
      
      // Get all permissions for this role (including inherited)
      const allPermissions = this.getAllRolePermissions(roleName);
      
      for (const permissionName of allPermissions) {
        const permissionResult = await this.db.query(
          'SELECT id FROM admin_permissions WHERE name = $1',
          [permissionName]
        );

        if (permissionResult.rows.length > 0) {
          const permissionId = permissionResult.rows[0].id;
          
          await this.db.query(
            `INSERT INTO admin_role_permissions (role_id, permission_id) 
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleId, permissionId]
          );
        }
      }
    }
  }

  getAllRolePermissions(roleName) {
    const role = this.roleHierarchy[roleName];
    if (!role) return [];

    let permissions = [...role.permissions];

    // Add inherited permissions
    for (const inheritedRole of role.inherits) {
      permissions = permissions.concat(this.getAllRolePermissions(inheritedRole));
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  // Authentication methods
  async createAdminUser(userData, createdBy) {
    const { email, password, firstName, lastName, roleName, teamId } = userData;

    try {
      // Check if user already exists
      const existingUser = await this.db.query(
        'SELECT id FROM admin_users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
      }

      // Get role ID
      const roleResult = await this.db.query(
        'SELECT id FROM admin_roles WHERE name = $1 AND is_active = true',
        [roleName]
      );

      if (roleResult.rows.length === 0) {
        throw new Error('Invalid role');
      }

      const roleId = roleResult.rows[0].id;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const userResult = await this.db.query(
        `INSERT INTO admin_users (email, password_hash, first_name, last_name, role_id, team_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [email, passwordHash, firstName, lastName, roleId, teamId]
      );

      const userId = userResult.rows[0].id;

      // Log the action
      await this.logAccess(createdBy, 'users', 'create', userId, null, null, true, { created_user: userId });

      return { userId, email, role: roleName };
    } catch (error) {
      console.error('Failed to create admin user:', error);
      throw error;
    }
  }

  async authenticateUser(email, password, ipAddress, userAgent) {
    try {
      // Get user with role information
      const userResult = await this.db.query(
        `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, 
                u.is_active, u.failed_login_attempts, u.locked_until,
                r.name as role_name, r.level as role_level
         FROM admin_users u
         JOIN admin_roles r ON u.role_id = r.id
         WHERE u.email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        await this.logAccess(null, 'auth', 'login', null, ipAddress, userAgent, false, { reason: 'user_not_found', email });
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Check if user is active
      if (!user.is_active) {
        await this.logAccess(user.id, 'auth', 'login', null, ipAddress, userAgent, false, { reason: 'user_inactive' });
        throw new Error('Account is inactive');
      }

      // Check if user is locked
      if (user.locked_until && new Date() < user.locked_until) {
        await this.logAccess(user.id, 'auth', 'login', null, ipAddress, userAgent, false, { reason: 'account_locked' });
        throw new Error('Account is locked');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        // Increment failed login attempts
        const failedAttempts = user.failed_login_attempts + 1;
        let lockUntil = null;

        // Lock account after 5 failed attempts for 30 minutes
        if (failedAttempts >= 5) {
          lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        }

        await this.db.query(
          'UPDATE admin_users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [failedAttempts, lockUntil, user.id]
        );

        await this.logAccess(user.id, 'auth', 'login', null, ipAddress, userAgent, false, { reason: 'invalid_password', failed_attempts: failedAttempts });
        throw new Error('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      await this.db.query(
        'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Create session
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

      await this.db.query(
        'INSERT INTO admin_sessions (id, user_id, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)',
        [sessionId, user.id, ipAddress, userAgent, expiresAt]
      );

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role_name,
          sessionId
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Cache user permissions
      await this.cacheUserPermissions(user.id, user.role_name);

      await this.logAccess(user.id, 'auth', 'login', null, ipAddress, userAgent, true);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role_name,
          roleLevel: user.role_level
        },
        expiresAt
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async cacheUserPermissions(userId, roleName) {
    const permissions = this.getAllRolePermissions(roleName);
    await this.redis.setEx(`user_permissions:${userId}`, 3600, JSON.stringify(permissions)); // Cache for 1 hour
  }

  async getUserPermissions(userId) {
    try {
      const cached = await this.redis.get(`user_permissions:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database if not cached
      const result = await this.db.query(
        `SELECT p.name 
         FROM admin_users u
         JOIN admin_roles r ON u.role_id = r.id
         JOIN admin_role_permissions rp ON r.id = rp.role_id
         JOIN admin_permissions p ON rp.permission_id = p.id
         WHERE u.id = $1 AND u.is_active = true AND r.is_active = true AND p.is_active = true`,
        [userId]
      );

      const permissions = result.rows.map(row => row.name);
      
      // Cache the result
      await this.redis.setEx(`user_permissions:${userId}`, 3600, JSON.stringify(permissions));
      
      return permissions;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  // Permission checking methods
  async hasPermission(userId, permission, resourceId = null) {
    try {
      const permissions = await this.getUserPermissions(userId);
      
      // Check for wildcard permission
      if (permissions.includes('*')) {
        return true;
      }

      // Check exact permission
      if (permissions.includes(permission)) {
        return true;
      }

      // Check resource-specific permissions (e.g., msmes:read:assigned)
      if (resourceId) {
        const resourceSpecificPermission = `${permission}:${resourceId}`;
        if (permissions.includes(resourceSpecificPermission)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  // Middleware functions
  requireAuth() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify session is still active
        const sessionResult = await this.db.query(
          'SELECT id FROM admin_sessions WHERE id = $1 AND user_id = $2 AND expires_at > NOW()',
          [decoded.sessionId, decoded.userId]
        );

        if (sessionResult.rows.length === 0) {
          return res.status(401).json({ error: 'Session expired' });
        }

        // Attach user info to request
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          sessionId: decoded.sessionId
        };

        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  requirePermission(permission) {
    return async (req, res, next) => {
      try {
        const hasAccess = await this.hasPermission(req.user.id, permission, req.params.id);
        
        if (!hasAccess) {
          await this.logAccess(
            req.user.id, 
            permission.split(':')[0], 
            permission.split(':')[1], 
            req.params.id,
            req.ip,
            req.get('User-Agent'),
            false,
            { reason: 'insufficient_permissions', required_permission: permission }
          );
          
          return res.status(403).json({ 
            error: 'Access denied', 
            required_permission: permission 
          });
        }

        // Log successful access
        await this.logAccess(
          req.user.id,
          permission.split(':')[0],
          permission.split(':')[1],
          req.params.id,
          req.ip,
          req.get('User-Agent'),
          true
        );

        next();
      } catch (error) {
        console.error('Permission middleware error:', error);
        return res.status(500).json({ error: 'Permission check failed' });
      }
    };
  }

  requireRole(roleName) {
    return (req, res, next) => {
      if (req.user.role !== roleName) {
        return res.status(403).json({ 
          error: 'Access denied', 
          required_role: roleName,
          user_role: req.user.role 
        });
      }
      next();
    };
  }

  requireMinimumLevel(level) {
    return async (req, res, next) => {
      try {
        const roleResult = await this.db.query(
          'SELECT level FROM admin_roles WHERE name = $1',
          [req.user.role]
        );

        if (roleResult.rows.length === 0 || roleResult.rows[0].level < level) {
          return res.status(403).json({ 
            error: 'Insufficient role level',
            required_level: level 
          });
        }

        next();
      } catch (error) {
        console.error('Role level check error:', error);
        return res.status(500).json({ error: 'Role level check failed' });
      }
    };
  }

  // Audit logging
  async logAccess(userId, resource, action, resourceId, ipAddress, userAgent, success, details = {}) {
    try {
      await this.db.query(
        `INSERT INTO admin_access_logs (user_id, resource, action, resource_id, ip_address, user_agent, success, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, resource, action, resourceId, ipAddress, userAgent, success, JSON.stringify(details)]
      );
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  }

  // Utility methods
  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  async logout(sessionId) {
    try {
      await this.db.query(
        'DELETE FROM admin_sessions WHERE id = $1',
        [sessionId]
      );
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  async getAccessLogs(filters = {}) {
    const { userId, resource, action, startDate, endDate, success, limit = 100, offset = 0 } = filters;
    
    let query = `
      SELECT al.*, u.email, u.first_name, u.last_name
      FROM admin_access_logs al
      LEFT JOIN admin_users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND al.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (resource) {
      query += ` AND al.resource = $${paramIndex}`;
      params.push(resource);
      paramIndex++;
    }

    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (success !== undefined) {
      query += ` AND al.success = $${paramIndex}`;
      params.push(success);
      paramIndex++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async close() {
    await this.db.end();
    await this.redis.quit();
  }
}

module.exports = RBACService;