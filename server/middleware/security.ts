import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Rate limiting configurations based on user role and subscription
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
    skip: (req: Request) => {
      // Skip rate limiting for admin users
      return req.user?.role === 'admin';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Dynamic rate limiting based on subscription tier
export const subscriptionBasedRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req: Request) => {
    if (!req.user) return 100; // Anonymous users: 100/hour
    
    // Get user's subscription status
    const subscription = await storage.getUserActiveSubscription(req.user.id);
    
    switch (req.user.role) {
      case 'admin':
        return 0; // Unlimited for admins
      case 'nbfc':
        return subscription ? 5000 : 1000; // NBFCs get higher limits
      case 'agent':
        return subscription ? 2000 : 500;
      case 'buyer':
        return subscription ? 1000 : 200; // Pro buyers get 5x more
      case 'seller':
        return subscription ? 800 : 300;
      default:
        return 100;
    }
  },
  keyGenerator: (req: Request) => {
    return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'SUBSCRIPTION_RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded for your subscription tier. Upgrade to Pro for higher limits.',
      upgradeUrl: '/subscription/upgrade'
    });
  }
});

// Slow down middleware for sensitive operations
export const sensitiveOperationSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per 15 minutes at full speed
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  keyGenerator: (req: Request) => {
    return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  }
});

// Specific rate limits for different endpoints
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts');
export const paymentRateLimit = createRateLimit(60 * 60 * 1000, 10, 'Too many payment attempts');
export const apiRateLimit = createRateLimit(60 * 60 * 1000, 1000, 'API rate limit exceeded');
export const strictRateLimit = createRateLimit(60 * 1000, 10, 'Too many requests');

// Security headers with Helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.redoc.ly"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.redoc.ly"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// Abuse detection middleware
export const abuseDetection = async (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip;
  
  // Block known bot patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i, /python/i
  ];
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBot && !req.path.startsWith('/api-docs')) {
    return res.status(403).json({
      error: 'AUTOMATED_ACCESS_BLOCKED',
      message: 'Automated access is not allowed. Please contact support for API access.'
    });
  }
  
  // Check for suspicious request patterns
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /\bselect\b.*\bfrom\b/i,  // SQL injection
    /<script/i,  // XSS attempts
    /\bunion\b.*\bselect\b/i  // SQL union attacks
  ];
  
  const requestString = JSON.stringify(req.body) + req.url + req.headers.referer;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
  
  if (isSuspicious) {
    console.warn(`Suspicious request detected from ${ip}: ${req.method} ${req.url}`);
    return res.status(400).json({
      error: 'SUSPICIOUS_REQUEST',
      message: 'Request blocked due to suspicious patterns'
    });
  }
  
  next();
};

// IP-based blocking middleware
const blockedIPs = new Set<string>();
const suspiciousActivity = new Map<string, { count: number, lastSeen: number }>();

export const ipProtection = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  
  // Check if IP is blocked
  if (blockedIPs.has(ip)) {
    return res.status(403).json({
      error: 'IP_BLOCKED',
      message: 'Your IP address has been blocked due to suspicious activity'
    });
  }
  
  // Track suspicious activity
  const now = Date.now();
  const activity = suspiciousActivity.get(ip) || { count: 0, lastSeen: now };
  
  // Reset counter if more than 1 hour has passed
  if (now - activity.lastSeen > 60 * 60 * 1000) {
    activity.count = 0;
  }
  
  activity.count++;
  activity.lastSeen = now;
  suspiciousActivity.set(ip, activity);
  
  // Block IP if too many suspicious requests
  if (activity.count > 50) {
    blockedIPs.add(ip);
    console.warn(`IP ${ip} blocked due to excessive suspicious activity`);
  }
  
  next();
};

// Request logging for audit purposes
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
      userRole: req.user?.role,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length') || 0
    };
    
    // Log to console in development, should be database/file in production
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', JSON.stringify(logData));
    }
    
    // Log sensitive operations
    if (req.url.includes('/payment') || req.url.includes('/escrow') || req.url.includes('/subscription')) {
      console.log('SENSITIVE OPERATION:', JSON.stringify(logData));
    }
  });
  
  next();
};