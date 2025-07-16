// Security middleware with rate limiting and protection
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configurations
const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// Different rate limits for different endpoints
export const rateLimits = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per 15 minutes
    'Too many requests from this IP, please try again later'
  ),

  // Strict rate limit for authentication
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    10, // 10 attempts per 15 minutes
    'Too many authentication attempts, please try again later'
  ),

  // Moderate rate limit for API endpoints
  api: createRateLimit(
    1 * 60 * 1000, // 1 minute
    100, // 100 requests per minute
    'API rate limit exceeded, please slow down'
  ),

  // Strict rate limit for password reset
  passwordReset: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts per hour
    'Too many password reset attempts, please try again later'
  ),

  // Admin endpoints
  admin: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    50, // 50 requests per 15 minutes
    'Admin rate limit exceeded'
  ),

  // File upload
  upload: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    20, // 20 uploads per 15 minutes
    'Too many file uploads, please try again later'
  ),

  // Search endpoints
  search: createRateLimit(
    1 * 60 * 1000, // 1 minute
    30, // 30 searches per minute
    'Search rate limit exceeded'
  ),
};

// Helmet configuration for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
});

// Compression middleware
export const compressionConfig = compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024,
  level: 6,
  memLevel: 8,
});

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      return next();
    }
    
    res.status(403).json({
      error: 'Forbidden',
      message: 'IP address not allowed',
      timestamp: new Date().toISOString(),
    });
  };
};

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Check for common attack patterns
  const suspicious = [
    'SELECT * FROM',
    'DROP TABLE',
    'INSERT INTO',
    'UPDATE SET',
    'DELETE FROM',
    '<script>',
    'javascript:',
    'onload=',
    'onerror=',
    '../../../',
    '..\\..\\',
  ];

  const requestData = JSON.stringify({
    url: req.url,
    query: req.query,
    body: req.body,
    headers: req.headers,
  }).toLowerCase();

  for (const pattern of suspicious) {
    if (requestData.includes(pattern.toLowerCase())) {
      console.warn(`Suspicious request detected from ${req.ip}: ${pattern}`);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request contains suspicious content',
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

// Request size limiter
export const requestSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request size exceeds ${maxSize} bytes`,
        timestamp: new Date().toISOString(),
      });
    }
    
    next();
  };
};

// API key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required',
      timestamp: new Date().toISOString(),
    });
  }
  
  // In production, validate against database
  const validApiKeys = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
  ].filter(Boolean);
  
  if (!validApiKeys.includes(apiKey as string)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};

// CORS configuration
export const corsConfig = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://yourdomain.com',
      'https://www.yourdomain.com',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };
    
    if (res.statusCode >= 400) {
      console.error('Request error:', logData);
    } else {
      console.log('Request:', logData);
    }
  });
  
  next();
};

// Export all middleware
export const securityMiddleware = {
  rateLimits,
  helmetConfig,
  compressionConfig,
  ipWhitelist,
  validateRequest,
  requestSizeLimit,
  validateApiKey,
  corsConfig,
  securityHeaders,
  requestLogger,
};