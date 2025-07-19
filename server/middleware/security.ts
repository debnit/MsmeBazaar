import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

// Security Headers Middleware
export const securityHeaders = (app: FastifyInstance) => {
  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.msmebazaar.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        childSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};

// CORS Configuration
export const corsSetup = (app: FastifyInstance) => {
  app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://msmebazaar.com',
        'https://www.msmebazaar.com',
        'https://app.msmebazaar.com'
      ];

      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID'
    ]
  });
};

// Rate Limiting
export const rateLimitSetup = (app: FastifyInstance) => {
  // Global rate limit
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req: FastifyRequest) => {
      return req.ip;
    },
    errorResponseBuilder: (req: FastifyRequest, context: any) => {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        retryAfter: Math.round(context.ttl / 1000)
      };
    }
  });

  // Stricter rate limit for auth endpoints
  app.register(async function (app: FastifyInstance) {
    await app.register(rateLimit, {
      max: 5,
      timeWindow: '1 minute',
      keyGenerator: (req: FastifyRequest) => {
        return req.ip;
      }
    });

    app.register(async function (app: FastifyInstance) {
      app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
        if (req.url.startsWith('/api/auth/')) {
          // Additional rate limiting logic for auth endpoints
        }
      });
    });
  });
};

// Request ID Middleware
export const requestIdMiddleware = (app: FastifyInstance) => {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const requestId = req.headers['x-request-id'] as string || 
                     `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    req.headers['x-request-id'] = requestId;
    reply.header('x-request-id', requestId);
  });
};

// JWT Token Validation Middleware
export const jwtAuthMiddleware = (app: FastifyInstance) => {
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const protectedRoutes = [
      '/api/users',
      '/api/msmes',
      '/api/valuations',
      '/api/transactions',
      '/api/dashboard'
    ];

    const isProtectedRoute = protectedRoutes.some(route => 
      req.url.startsWith(route)
    );

    if (isProtectedRoute) {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7);
      
      try {
        // JWT verification logic would go here
        // For now, we'll just check if token exists
        if (!token) {
          throw new Error('Invalid token');
        }
        
        // Add user info to request object
        (req as any).user = { id: 'user_id', role: 'user' };
      } catch (error) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }
    }
  });
};

// Input Sanitization Middleware
export const inputSanitizationMiddleware = (app: FastifyInstance) => {
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      sanitizeObject(req.query);
    }
  });
};

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potential XSS attacks
      obj[key] = obj[key]
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// API Key Middleware for Public API Access
export const apiKeyMiddleware = (app: FastifyInstance) => {
  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const publicApiRoutes = ['/api/public'];
    
    const isPublicApiRoute = publicApiRoutes.some(route => 
      req.url.startsWith(route)
    );

    if (isPublicApiRoute) {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'API key required for public API access'
        });
      }

      // Validate API key (in production, check against database)
      const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
      
      if (!validApiKeys.includes(apiKey)) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }
    }
  });
};

// Request Logging Middleware
export const requestLoggingMiddleware = (app: FastifyInstance) => {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    app.log.info({
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    }, 'Incoming request');

    reply.header('x-response-time', '0');
  });

  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const responseTime = Date.now() - parseInt(reply.getHeader('x-response-time') as string || '0');
    reply.header('x-response-time', responseTime.toString());

    app.log.info({
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, 'Request completed');
  });
};

// Error Handling Middleware
export const errorHandlingMiddleware = (app: FastifyInstance) => {
  app.setErrorHandler(async (error: any, req: FastifyRequest, reply: FastifyReply) => {
    const requestId = req.headers['x-request-id'];
    
    app.log.error({
      requestId,
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url
    }, 'Request error');

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        requestId
      });
    }

    return reply.code(error.statusCode || 500).send({
      error: error.name || 'Internal Server Error',
      message: error.message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  });
};

// Main security setup function
export const setupSecurity = (app: FastifyInstance) => {
  // Apply all security middleware
  securityHeaders(app);
  corsSetup(app);
  rateLimitSetup(app);
  requestIdMiddleware(app);
  jwtAuthMiddleware(app);
  inputSanitizationMiddleware(app);
  apiKeyMiddleware(app);
  requestLoggingMiddleware(app);
  errorHandlingMiddleware(app);

  app.log.info('Security middleware configured successfully');
};