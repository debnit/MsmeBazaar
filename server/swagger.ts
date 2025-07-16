import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MSMESquare API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for MSMESquare - A fintech platform connecting MSMEs with buyers, sellers, agents, and NBFCs for seamless business acquisition financing in India.',
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
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_token'
        }
      },
      schemas: {
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
          }
        },
        MsmeListing: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            businessName: { type: 'string', example: 'Tech Solutions Pvt Ltd' },
            industry: { type: 'string', example: 'Technology' },
            location: { type: 'string', example: 'Bhubaneswar, Odisha' },
            askingPrice: { type: 'number', example: 5000000 },
            revenue: { type: 'number', example: 2000000 },
            profit: { type: 'number', example: 500000 },
            employees: { type: 'integer', example: 25 },
            description: { type: 'string', example: 'Leading software development company' },
            assets: { type: 'array', items: { type: 'string' } },
            liabilities: { type: 'array', items: { type: 'string' } },
            documents: { type: 'array', items: { type: 'string' } },
            status: { 
              type: 'string', 
              enum: ['active', 'sold', 'pending', 'inactive'],
              example: 'active'
            },
            sellerId: { type: 'integer', example: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        LoanApplication: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            msmeId: { type: 'integer', example: 1 },
            buyerId: { type: 'integer', example: 2 },
            nbfcId: { type: 'integer', example: 3 },
            loanAmount: { type: 'number', example: 4000000 },
            purpose: { type: 'string', example: 'Business acquisition' },
            documents: { type: 'array', items: { type: 'string' } },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'disbursed'],
              example: 'pending'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BuyerInterest: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            msmeId: { type: 'integer', example: 1 },
            buyerId: { type: 'integer', example: 2 },
            message: { type: 'string', example: 'Interested in acquiring this business' },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected'],
              example: 'pending'
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
            message: { type: 'string', example: 'Detailed error description' },
            statusCode: { type: 'integer', example: 400 }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        cookieAuth: []
      }
    ]
  },
  apis: ['./server/routes.ts', './server/auth/*.ts', './server/services/*.ts'] // Path to the API files
};

const specs = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'MSMESquare API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
      }
    }));
    
    // JSON endpoint for API specification
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
    
    console.log('📚 Swagger documentation available at /api-docs');
  }
}

export { specs };