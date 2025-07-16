import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';

// Modern OpenAPI 3.0 specification
const openAPISpec = {
  openapi: '3.0.3',
  info: {
    title: 'MSMESquare API',
    version: '2.0.0',
    description: `
# MSMESquare API Documentation

A comprehensive fintech platform connecting MSMEs (Micro, Small & Medium Enterprises) with buyers, sellers, agents, and NBFCs for seamless business acquisition financing in India.

## Features
- **Multi-tier subscription model** (Free vs Pro at ₹499/month)
- **Multiple monetization streams** including agent commissions, valuation services, and API access
- **Advanced ML-powered matching** between buyers and sellers
- **Comprehensive escrow management** for secure transactions
- **Role-based access control** with granular permissions
- **Real-time notifications** and compliance monitoring

## Authentication
This API uses JWT tokens for authentication. Include the token in the Authorization header:
\`Authorization: Bearer your-jwt-token\`

## Rate Limiting
- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour
- Enterprise API: 10000 requests/hour

## Error Handling
All errors follow the standard HTTP status codes with detailed error messages in JSON format.
    `,
    contact: {
      name: 'MSMESquare Support',
      email: 'support@msmesquare.com',
      url: 'https://msmesquare.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' ? 'https://api.msmesquare.com' : 'http://localhost:5000',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'auth_token',
        description: 'Session cookie for browser authentication'
      }
    },
    schemas: {
      // Core entities
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          phone: { type: 'string', example: '+91-9876543210' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          role: { 
            type: 'string', 
            enum: ['seller', 'buyer', 'agent', 'admin', 'nbfc'],
            example: 'seller'
          },
          isVerified: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'email', 'role']
      },
      
      // Subscription related
      SubscriptionPlan: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'pro' },
          displayName: { type: 'string', example: 'Pro (Premium) Buyer' },
          description: { type: 'string', example: 'Full access to verified MSMEs with advanced features' },
          price: { type: 'number', example: 499.00 },
          currency: { type: 'string', example: 'INR' },
          billingCycle: { type: 'string', example: 'monthly' },
          features: { 
            type: 'array', 
            items: { type: 'string' },
            example: ['Early access to verified MSMEs', 'Full valuation PDF access', 'Advanced filters']
          },
          isActive: { type: 'boolean', example: true }
        }
      },
      
      // Monetization
      PaymentIntent: {
        type: 'object',
        properties: {
          clientSecret: { type: 'string', example: 'pi_1234567890_secret_abcdef' },
          amount: { type: 'number', example: 299.00 },
          currency: { type: 'string', example: 'inr' },
          status: { type: 'string', example: 'requires_payment_method' }
        }
      },
      
      RevenueAnalytics: {
        type: 'object',
        properties: {
          totalRevenue: { type: 'number', example: 125000.00 },
          revenueBySource: {
            type: 'object',
            properties: {
              commission: { type: 'number', example: 45000.00 },
              valuation: { type: 'number', example: 30000.00 },
              subscription: { type: 'number', example: 25000.00 },
              leads: { type: 'number', example: 15000.00 },
              escrow: { type: 'number', example: 10000.00 }
            }
          },
          monthlyRevenue: {
            type: 'object',
            additionalProperties: { type: 'number' },
            example: { "2024-01": 45000, "2024-02": 52000, "2024-03": 48000 }
          }
        }
      },
      
      // Common response patterns
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Validation failed' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          details: { type: 'object' }
        },
        required: ['message']
      },
      
      Success: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' }
        }
      }
    },
    
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Authentication required' }
          }
        }
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Insufficient permissions' }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Resource not found' }
          }
        }
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { message: 'Validation failed', details: { field: 'This field is required' } }
          }
        }
      }
    }
  },
  
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Returns the API health status',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 12345 }
                  }
                }
              }
            }
          }
        }
      }
    },
    
    '/api/subscription/plans': {
      get: {
        tags: ['Monetization'],
        summary: 'Get subscription plans',
        description: 'Retrieve all active subscription plans',
        responses: {
          '200': {
            description: 'List of subscription plans',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SubscriptionPlan' }
                }
              }
            }
          }
        }
      }
    },
    
    '/api/subscription/create': {
      post: {
        tags: ['Monetization'],
        summary: 'Create subscription payment',
        description: 'Create a payment intent for subscription upgrade',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  planId: { type: 'integer', example: 2 }
                },
                required: ['planId']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment intent created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaymentIntent' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    
    '/api/revenue/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Get revenue analytics',
        description: 'Retrieve comprehensive revenue analytics (admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date' },
            description: 'Start date for analytics range'
          },
          {
            name: 'endDate',
            in: 'query', 
            schema: { type: 'string', format: 'date' },
            description: 'End date for analytics range'
          }
        ],
        responses: {
          '200': {
            description: 'Revenue analytics data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RevenueAnalytics' }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' }
        }
      }
    }
  }
};

// Setup modern API documentation
export function setupModernDocs(app: Express) {
  // Generate OpenAPI spec with JSDoc comments
  const specs = swaggerJSDoc({
    definition: openAPISpec,
    apis: ['./server/routes.ts', './server/docs/*.ts']
  });

  // Serve OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  // Modern Swagger UI with custom theme
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .btn.authorize { background-color: #3498db; border-color: #3498db; }
      .swagger-ui .btn.authorize:hover { background-color: #2980b9; }
    `,
    customSiteTitle: 'MSMESquare API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true,
      requestInterceptor: (req: any) => {
        req.headers['X-API-Version'] = '2.0';
        return req;
      }
    }
  }));

  // Alternative Redoc documentation (more modern)
  app.get('/docs', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MSMESquare API Reference</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
          <style>
            body { margin: 0; padding: 0; }
            redoc { display: block; }
          </style>
        </head>
        <body>
          <redoc spec-url='/api-docs.json' theme='github'></redoc>
          <script src="https://cdn.redoc.ly/redoc/v2.1.3/bundles/redoc.standalone.js"></script>
        </body>
      </html>
    `);
  });

  console.log('📚 Modern API documentation available at:');
  console.log('   - Swagger UI: /api-docs');
  console.log('   - Redoc: /docs');
  console.log('   - OpenAPI spec: /api-docs.json');
}

// Legacy support function
export function setupSwagger(app: Express) {
  setupModernDocs(app);
}

// Export for backwards compatibility
export const createSwaggerDocs = setupModernDocs;