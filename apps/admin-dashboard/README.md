# VyapaarMitra Admin Dashboard

A comprehensive business intelligence and system monitoring dashboard built with Next.js, TypeScript, and modern React patterns.

## 🚀 Features

### 📊 Analytics Overview
- **Real-time Metrics**: Total Active MSMEs, New Signups, Transactions, Pending Approvals
- **Performance Cards**: Conversion rates, successful transactions, active users
- **Trend Indicators**: Visual indicators showing percentage changes

### 📈 Interactive Charts
- **Bar Charts**: Weekly signups analysis
- **Line Charts**: Valuation trends over time
- **Pie Charts**: MSME distribution by region
- **Stacked Charts**: Active deals by sector with filtering

### 📋 Data Tables
- **Transaction Management**: Sortable, filterable, paginated transaction overview
- **MSME Listings**: Complete MSME database with search and filters
- **Export Functionality**: CSV and Excel export capabilities
- **Real-time Updates**: Live data refresh with React Query

### 🔔 System Monitoring
- **Live Notifications**: System alerts for new signups, API health, KYC issues
- **Prometheus Integration**: System metrics, uptime, latency monitoring
- **Health Checks**: Real-time API endpoint monitoring
- **Resource Usage**: CPU, memory, and disk usage tracking

### 🎨 UI/UX Features
- **Dark/Light Mode**: Automatic theme switching with next-themes
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Loading States**: Skeleton components and smooth transitions
- **Accessibility**: ARIA labels and keyboard navigation

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts for data visualization
- **State Management**: React Query for server state
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Testing**: Playwright for E2E testing

## 🏗️ Project Structure

```
apps/admin-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Main dashboard page
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── providers.tsx       # React Query & Theme providers
│   ├── components/
│   │   ├── dashboard/          # Dashboard-specific components
│   │   │   ├── analytics-overview.tsx
│   │   │   ├── charts-section.tsx
│   │   │   ├── key-metrics.tsx
│   │   │   ├── transaction-table.tsx
│   │   │   └── msme-table.tsx
│   │   └── ui/                 # Reusable UI components
│   │       ├── theme-toggle.tsx
│   │       └── date-filter-select.tsx
│   ├── lib/
│   │   └── api.ts              # API client with mock data
│   └── types/
│       └── dashboard.ts        # TypeScript type definitions
├── libs/ui/                    # Shared UI library
│   ├── components/ui/          # shadcn/ui components
│   └── lib/utils.ts           # Utility functions
└── tests/                      # E2E tests
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+

### Installation

1. **Clone and install dependencies**
```bash
cd apps/admin-dashboard
npm install
```

2. **Environment Variables**
Create `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
```

3. **Development Server**
```bash
npm run dev
```
Opens at [http://localhost:3001](http://localhost:3001)

4. **Build for Production**
```bash
npm run build
npm start
```

## 🧪 Testing

### End-to-End Testing with Playwright
```bash
# Install Playwright browsers
npx playwright install

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Debug tests
npm run test:debug
```

### Test Coverage
- Dashboard page rendering
- Data loading states
- Interactive filtering
- Chart responsiveness
- Theme switching
- Export functionality

## 📱 Responsive Design

The dashboard is fully responsive across devices:

- **Mobile** (320px+): Stacked layout, touch-friendly interactions
- **Tablet** (768px+): Grid-based layout, optimized charts
- **Desktop** (1024px+): Full feature set, multi-column layouts
- **Large Screens** (1440px+): Enhanced spacing and readability

## 🎯 API Integration

### Mock Data (Development)
The application includes comprehensive mock data for development:
- Realistic MSME and transaction data
- Dynamic chart data generation
- Simulated API latency
- Error state handling

### Production API
Configure these endpoints for production:
- `/admin/metrics` - Dashboard overview metrics
- `/admin/transactions` - Transaction data with filtering
- `/admin/msmes` - MSME listings
- `/admin/charts` - Chart data
- `/admin/alerts` - System notifications
- `/admin/system-metrics` - Prometheus metrics

### API Client Features
- Automatic retry logic
- Error boundary handling
- Request/response interceptors
- Token-based authentication
- Export functionality

## 🔧 Configuration

### Tailwind CSS Customization
The dashboard uses a custom Tailwind configuration with:
- Extended color palette for charts
- Custom component classes
- Animation utilities
- Responsive grid templates

### Theme Configuration
```typescript
// Supports system, light, and dark themes
const themes = {
  light: { /* light theme variables */ },
  dark: { /* dark theme variables */ },
  system: 'auto-detect'
}
```

## 📊 Performance Optimizations

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: `npm run analyze`
- **React Query Caching**: Optimized server state management
- **Debounced Search**: Reduced API calls
- **Skeleton Loading**: Enhanced perceived performance

## 🔒 Security Features

- **XSS Protection**: Sanitized user inputs
- **CSRF Protection**: Token-based validation
- **Input Validation**: Zod schema validation
- **Error Boundaries**: Graceful error handling
- **Route Protection**: Authentication checks

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NEXT_PUBLIC_API_BASE_URL=https://api.vyapaarmitra.in
NEXT_PUBLIC_PROMETHEUS_URL=https://prometheus.vyapaarmitra.in
NODE_ENV=production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is part of the VyapaarMitra platform. All rights reserved.

## 📞 Support

- **Documentation**: [Internal Wiki](https://wiki.vyapaarmitra.in)
- **Issues**: Create GitHub issues for bugs
- **Email**: tech@vyapaarmitra.in
- **Slack**: #admin-dashboard channel

---

**Built with ❤️ by the VyapaarMitra Team**