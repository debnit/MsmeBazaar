# MSMESquare - Replit Project Guide

## Overview

MSMESquare is a comprehensive fintech marketplace designed to connect MSMEs (Micro, Small & Medium Enterprises) with buyers, sellers, agents, and NBFCs (Non-Banking Financial Companies) for seamless business acquisition financing in India. The platform serves as a one-stop solution for MSME transactions, loan applications, and compliance management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 16, 2025
- **Project Rebranding**: Changed project name from MSMEAtlas to MSMESquare across all UI components
- **Language Localization System**: Implemented comprehensive multilingual support for English, Hindi, and Odia to serve low-literacy MSME users across India and Odisha
- **Geographic Proximity Service**: Added distance-based matchmaking using Haversine formula with coordinates for all 30 Odisha districts
- **Enhanced Matchmaking**: Updated algorithms to incorporate geographic proximity scoring (20% weight) and distance filtering
- **Accessibility Features**: Added text-to-speech toolbar and language selector for improved user experience
- **Authentication System**: Fixed JWT token authentication with cookie support for better browser compatibility
- **Frontend Components**: Created localized landing page and dashboard with multilingual content support
- **Mobile Authentication**: Implemented mobile number-based authentication with OTP verification system
- **ML Engines**: Added comprehensive valuation engine and geographic proximity-based matchmaking algorithm
- **Containerization**: Created Docker, Docker Compose, and deployment configurations for Render/Railway platforms
- **Production Readiness**: Enhanced schema to support multiple authentication methods and deployment independence
- **Database Migration**: Successfully converted storage layer from Map() objects to PostgreSQL/Drizzle ORM with dedicated storage directory structure
- **Advanced Services**: Implemented comprehensive monitoring service with crash detection, performance tracking, and error logging
- **Escrow & Notifications**: Added database-backed escrow management system and notification service infrastructure for MSG91 integration
- **DevOps Infrastructure**: Created complete CI/CD pipeline with GitHub Actions for automated testing and deployment to Render/Railway
- **Docker Containerization**: Added docker-compose.yml for local development with PostgreSQL, Redis, Nginx load balancer, and all services
- **ML Scheduler Service**: Implemented automated ML model retraining system with weekly model updates, 6-hourly valuation refresh, and daily cleanup

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **API Design**: RESTful API with role-based access control
- **Authentication**: JWT tokens with bcrypt password hashing
- **Middleware**: Custom authentication and RBAC middleware

### Database Architecture
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon serverless PostgreSQL for scalability
- **Schema Management**: Drizzle migrations with type-safe queries
- **Data Access**: Repository pattern with storage abstraction layer

## Key Components

### User Management System
- **Multi-role Support**: Sellers, Buyers, Agents, NBFCs, and Admins
- **Authentication**: Email/password with JWT tokens
- **Profile Management**: Role-specific profile data and settings
- **Access Control**: Fine-grained permissions based on user roles

### MSME Marketplace
- **Listing Management**: Complete CRUD operations for MSME listings
- **Search & Filter**: Advanced filtering by industry, location, price range
- **Valuation Service**: Mock ML-based business valuation
- **Matchmaking**: Algorithm to connect buyers with suitable MSMEs

### Loan Application System
- **Application Processing**: End-to-end loan application workflow
- **NBFC Integration**: Direct connection with financial institutions
- **Document Generation**: Automated legal document creation
- **Status Tracking**: Real-time application status updates

### Compliance Management
- **RBI Compliance**: Automated compliance checking for NBFCs
- **Regulatory Reporting**: Built-in compliance status monitoring
- **Document Management**: Secure storage and retrieval of compliance documents

## Data Flow

### User Registration & Authentication
1. User registers with role selection (seller/buyer/agent/nbfc/admin)
2. Password hashed with bcrypt before storage
3. JWT token generated upon successful authentication
4. Role-based dashboard redirection

### MSME Listing Process
1. Seller creates MSME listing with financial details
2. Valuation service calculates estimated business value
3. Listing published to marketplace after validation
4. Buyers can search, filter, and express interest

### Loan Application Flow
1. Buyer selects MSME and applies for acquisition loan
2. Application routed to appropriate NBFC based on criteria
3. NBFC reviews application and supporting documents
4. Loan approval/rejection with automated notifications

### Compliance Monitoring
1. NBFC details validated against RBI requirements
2. Periodic compliance checks run automatically
3. Status updates tracked in compliance records
4. Alerts generated for non-compliance issues

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe database ORM with migration support
- **@tanstack/react-query**: Data fetching and caching for React
- **@radix-ui components**: Accessible UI component primitives
- **jsonwebtoken**: JWT token generation and validation
- **bcrypt**: Password hashing and validation

### Development Tools
- **Vite**: Build tool with hot module replacement
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first styling framework
- **React Hook Form**: Form state management
- **Zod**: Schema validation library

## Deployment Strategy

### Development Environment
- **Local Setup**: PostgreSQL database with Drizzle migrations
- **Hot Reload**: Vite dev server with Express proxy
- **Database Push**: `npm run db:push` for schema changes

### Production Build
- **Frontend**: Vite builds optimized React bundle
- **Backend**: esbuild bundles Express server for Node.js
- **Database**: Production PostgreSQL with migration scripts
- **Environment**: Configurable via environment variables

### Replit Compatibility
- **Monorepo Structure**: Single repository with client/server separation
- **Runtime Detection**: Automatic Replit environment detection
- **Development Banner**: Replit branding for development mode
- **Cartographer Integration**: Replit-specific debugging tools

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **JWT_SECRET**: Secret key for JWT token signing
- **NODE_ENV**: Environment mode (development/production)
- **PORT**: Server port configuration

The application is designed to be fully portable between Replit and other environments while maintaining optimal performance and developer experience in both contexts.