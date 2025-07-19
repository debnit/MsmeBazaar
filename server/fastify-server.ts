// High-performance Fastify server with clustering support
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { setupVite } from './vite';
import { setupModernDocs } from './docs/openapi';
import { initializeInstantResponses } from './infrastructure/instant-response';
import { initializeServerMemoryManagement } from './infrastructure/memory-management';
import { startupManager } from './infrastructure/startup-manager';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  trustProxy: true,
  keepAliveTimeout: 60000,
  connectionTimeout: 60000,
}).withTypeProvider<TypeBoxTypeProvider>();

// Security middleware
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
    },
  },
});

// CORS configuration
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com', 'https://www.yourdomain.com']
    : true,
  credentials: true,
});

// Rate limiting with Redis support
await fastify.register(rateLimit, {
  max: 100, // requests per minute
  timeWindow: '1 minute',
  redis: process.env.REDIS_URL ? {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  } : undefined,
  keyGenerator: (request) => {
    return request.ip;
  },
  errorResponseBuilder: (request, context) => {
    return {
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.ttl}ms`,
      date: Date.now(),
    };
  },
});

// Compression
await fastify.register(compress, {
  encodings: ['gzip', 'deflate'],
  threshold: 1024,
});

// Initialize advanced systems
console.log('⚡ Starting in mission-critical performance mode...');
await initializeInstantResponses();
await initializeServerMemoryManagement();
await startupManager.initializeCoreServices();

// Health check endpoint
fastify.get('/health', {
  schema: {
    response: {
      200: Type.Object({
        status: Type.String(),
        timestamp: Type.String(),
        uptime: Type.Number(),
        version: Type.String(),
        cluster: Type.Optional(Type.Object({
          workerId: Type.Number(),
          pid: Type.Number(),
        })),
      }),
    },
  },
}, async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    cluster: {
      workerId: process.env.pm_id ? parseInt(process.env.pm_id) : 0,
      pid: process.pid,
    },
  };
});

// Cluster info endpoint
fastify.get('/cluster/info', {
  schema: {
    response: {
      200: Type.Object({
        cluster: Type.Object({
          workerId: Type.Number(),
          pid: Type.Number(),
          memory: Type.Object({
            rss: Type.Number(),
            heapTotal: Type.Number(),
            heapUsed: Type.Number(),
            external: Type.Number(),
          }),
          uptime: Type.Number(),
        }),
      }),
    },
  },
}, async (request, reply) => {
  const memoryUsage = process.memoryUsage();
  return {
    cluster: {
      workerId: process.env.pm_id ? parseInt(process.env.pm_id) : 0,
      pid: process.pid,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      uptime: process.uptime(),
    },
  };
});

// API routes with enhanced performance
fastify.register(async (fastify) => {
  // Authentication endpoints
  fastify.post('/api/auth/login', {
    schema: {
      body: Type.Object({
        email: Type.String({ format: 'email' }),
        password: Type.String({ minLength: 6 }),
      }),
      response: {
        200: Type.Object({
          token: Type.String(),
          user: Type.Object({
            id: Type.String(),
            email: Type.String(),
            role: Type.String(),
          }),
        }),
      },
    },
  }, async (request, reply) => {
    // Mock authentication for demonstration
    const { email, password } = request.body;

    // Simulate database lookup with caching
    const user = {
      id: '1',
      email,
      role: 'user',
    };

    const token = 'mock-jwt-token';

    return { token, user };
  });

  // MSME listings with caching
  fastify.get('/api/msme/listings', {
    schema: {
      response: {
        200: Type.Array(Type.Object({
          id: Type.String(),
          name: Type.String(),
          industry: Type.String(),
          revenue: Type.Number(),
          location: Type.String(),
        })),
      },
    },
  }, async (request, reply) => {
    // Mock listings with caching
    const listings = [
      { id: '1', name: 'Tech Startup', industry: 'technology', revenue: 1000000, location: 'Bangalore' },
      { id: '2', name: 'Manufacturing Co', industry: 'manufacturing', revenue: 2000000, location: 'Mumbai' },
    ];

    // Add cache headers
    reply.header('Cache-Control', 'public, max-age=300'); // 5 minutes
    return listings;
  });

  // Valuation service
  fastify.post('/api/valuation/calculate', {
    schema: {
      body: Type.Object({
        revenue: Type.Number(),
        profit: Type.Number(),
        industry: Type.String(),
        location: Type.String(),
      }),
      response: {
        200: Type.Object({
          valuation: Type.Number(),
          confidence: Type.Number(),
          timestamp: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { revenue, profit, industry, location } = request.body;

    // Simulate ML-based valuation
    const multiplier = industry === 'technology' ? 8.5 : 4.0;
    const valuation = revenue * multiplier;

    return {
      valuation,
      confidence: 85,
      timestamp: new Date().toISOString(),
    };
  });
});

// Setup documentation
await setupModernDocs(fastify);

// Setup Vite for development
if (process.env.NODE_ENV === 'development') {
  await setupVite(fastify);
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    await fastify.close();
    console.log('Server closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '5000');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    console.log(`🚀 Fastify server running on port ${port}`);
    console.log(`📊 Worker ${process.pid} started`);
    console.log(`📚 API documentation available at: http://${host}:${port}/api-docs`);

    // Initialize secondary services after startup
    setTimeout(async () => {
      await startupManager.initializeSecondaryServices();
      console.log('🎉 All services initialized - monitoring enabled');
    }, 1000);

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export default fastify;
