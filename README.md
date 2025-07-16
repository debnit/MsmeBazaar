# MSMESquare - National MSME Marketplace Platform

MSMESquare is a comprehensive fintech marketplace designed to connect MSMEs (Micro, Small & Medium Enterprises) with buyers, sellers, agents, and NBFCs (Non-Banking Financial Companies) for seamless business acquisition financing in India. The platform serves as a one-stop solution for MSME transactions, loan applications, and compliance management.

## 🚀 Features

### Core Platform Features
- **Multi-language Support**: English, Hindi, and Odia localization for low-literacy users
- **Mobile-first Authentication**: OTP-based mobile number authentication
- **Geographic Proximity Matching**: Haversine formula-based location matching for all 30 Odisha districts
- **ML-powered Valuation Engine**: Comprehensive business valuation with industry benchmarks
- **Intelligent Matchmaking**: AI-driven buyer-seller matching algorithms
- **Gamification System**: Points, badges, and leaderboards for user engagement
- **Compliance Management**: Automated RBI compliance checking for NBFCs
- **Document Generation**: Automated legal document creation

### User Roles
- **Sellers**: MSME owners looking to sell their businesses
- **Buyers**: Investors and companies looking to acquire MSMEs
- **Agents**: Intermediaries facilitating transactions
- **NBFCs**: Financial institutions providing acquisition loans
- **Admins**: Platform administrators

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** + **shadcn/ui** for styling
- **TanStack Query** for data fetching
- **Wouter** for routing
- **React Hook Form** + **Zod** for form validation

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **PostgreSQL** with **Drizzle ORM**
- **JWT** authentication
- **bcrypt** for password hashing

### Machine Learning
- **Custom Valuation Engine** with industry-specific metrics
- **Geographic Proximity Algorithm** using Haversine formula
- **Matchmaking Algorithm** with weighted scoring

### DevOps & Deployment
- **Docker** containerization
- **Docker Compose** for local development
- **Render** and **Railway** deployment configurations
- **PostgreSQL** database
- **Redis** for caching (optional)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd msme-square
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/msme_square

# Authentication
JWT_SECRET=your-secret-key-here

# SMS/OTP Service (Optional - uses mock service by default)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Application
NODE_ENV=development
PORT=5000
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

2. **Run database migrations**
   ```bash
   docker-compose exec app npm run db:push
   ```

### Using Docker Only

1. **Build the image**
   ```bash
   docker build -t msme-square .
   ```

2. **Run the container**
   ```bash
   docker run -p 5000:5000 \
     -e DATABASE_URL=your-database-url \
     -e JWT_SECRET=your-jwt-secret \
     msme-square
   ```

## ☁️ Cloud Deployment

### Render Deployment

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://render.com/dashboard)
   - Connect your GitHub repository
   - Use the `deploy/render.yaml` configuration

3. **Set environment variables**
   - Configure database connection
   - Set JWT secret and other required variables

### Railway Deployment

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy to Railway**
   ```bash
   railway login
   railway up
   ```

3. **Configure services**
   - PostgreSQL database
   - Redis (optional)
   - Environment variables

## 📱 Mobile Authentication

The platform supports mobile number-based authentication with OTP verification:

### SMS Service Configuration

For production, configure Twilio:
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

For development, the system uses a mock SMS service that logs OTPs to the console.

### Authentication Flow

1. User enters mobile number
2. System sends 6-digit OTP
3. User enters OTP for verification
4. System creates user account or logs in existing user
5. JWT token issued for session management

## 🧠 Machine Learning Features

### Valuation Engine

The ML valuation engine considers:
- Financial metrics (revenue, profit, assets)
- Industry multipliers and benchmarks
- Geographic location factors
- Growth potential and market position
- Risk assessment and time-to-market

### Matchmaking Algorithm

The matchmaking system uses:
- Industry compatibility matrix
- Geographic proximity scoring (Haversine formula)
- Budget and size matching
- Risk profile alignment
- Timeline preferences

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts with role-based access
- `msme_listings` - Business listings from sellers
- `loan_applications` - Loan requests from buyers
- `buyer_interests` - Buyer interest in specific MSMEs
- `nbfc_details` - NBFC-specific information
- `loan_products` - NBFC loan offerings
- `compliance_records` - Regulatory compliance tracking

### Relations
- Users can have multiple MSME listings
- Listings can have multiple buyer interests
- Loan applications link buyers, MSMEs, and NBFCs
- Compliance records track NBFC regulatory status

## 🔐 Security Features

- **JWT Authentication** with secure token management
- **Password Hashing** using bcrypt
- **Rate Limiting** on authentication endpoints
- **Input Validation** using Zod schemas
- **SQL Injection Protection** via Drizzle ORM
- **HTTPS Enforcement** in production

## 🌍 Internationalization

### Supported Languages
- **English** (en) - Primary language
- **Hindi** (hi) - National language support
- **Odia** (or) - Regional language for Odisha

### Features
- Dynamic language switching
- Localized number and date formatting
- Text-to-speech support for low-literacy users
- Cultural adaptation for Indian market

## 📊 Monitoring & Analytics

### Built-in Analytics
- User engagement metrics
- Transaction success rates
- Geographic distribution analysis
- Performance monitoring

### Logging
- Structured logging with Winston
- Error tracking and alerting
- Performance monitoring
- Security event logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in `/docs`
- Review the troubleshooting guide

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Core marketplace functionality
- ✅ Mobile authentication
- ✅ ML valuation engine
- ✅ Geographic matching

### Phase 2 (Planned)
- 🔄 Advanced compliance automation
- 🔄 Enhanced ML models
- 🔄 Mobile app development
- 🔄 Payment gateway integration

### Phase 3 (Future)
- 🔄 Multi-state expansion
- 🔄 Advanced analytics dashboard
- 🔄 API marketplace
- 🔄 Blockchain integration

---

**MSMESquare** - Empowering India's MSME ecosystem through technology and innovation.