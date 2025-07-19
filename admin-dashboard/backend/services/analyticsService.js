const { Pool } = require('pg');
const Redis = require('redis');
const moment = require('moment');

class AnalyticsService {
  constructor() {
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
    });
    
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL
    });
    
    this.redis.connect();
  }

  // Cache wrapper for expensive queries
  async getCachedData(key, queryFn, ttl = 300) {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const data = await queryFn();
      await this.redis.setEx(key, ttl, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return await queryFn();
    }
  }

  // 1. Transaction Analytics
  async getTransactionData(period = '30d') {
    const cacheKey = `transactions:${period}`;
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_transactions,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM transactions 
        WHERE created_at >= NOW() - INTERVAL '${period.replace('d', ' days')}'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    });
  }

  // 2. MSME Analytics
  async getActiveMSMEData() {
    const cacheKey = 'msmes:active_by_location';
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        SELECT 
          state,
          city,
          COUNT(*) as active_count,
          COUNT(CASE WHEN verified = true THEN 1 END) as verified_count,
          AVG(annual_turnover) as avg_turnover,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
        FROM msmes 
        WHERE status = 'active'
        GROUP BY state, city
        ORDER BY active_count DESC
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    });
  }

  // 3. Valuation Analytics
  async getValuationSummary(period = '30d') {
    const cacheKey = `valuations:summary:${period}`;
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          AVG(estimated_value) as avg_value,
          SUM(estimated_value) as total_value,
          AVG(confidence_score) as avg_confidence,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_count
        FROM valuations 
        WHERE created_at >= NOW() - INTERVAL '${period.replace('d', ' days')}'
        GROUP BY status
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    });
  }

  // 4. User Analytics
  async getUserAnalytics() {
    const cacheKey = 'users:analytics';
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        SELECT 
          role,
          COUNT(*) as total_users,
          COUNT(CASE WHEN verified = true THEN 1 END) as verified_users,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_weekly,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_monthly,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month
        FROM users 
        GROUP BY role
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    });
  }

  // 5. Revenue Analytics
  async getRevenueAnalytics(period = '12m') {
    const cacheKey = `revenue:${period}`;
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          SUM(amount) as total_revenue,
          COUNT(*) as transaction_count,
          AVG(amount) as avg_transaction_value,
          COUNT(DISTINCT user_id) as unique_customers
        FROM transactions 
        WHERE status = 'completed'
          AND created_at >= NOW() - INTERVAL '${period.replace('m', ' months')}'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    });
  }

  // 6. Performance Metrics
  async getPerformanceMetrics() {
    const cacheKey = 'performance:metrics';
    
    return this.getCachedData(cacheKey, async () => {
      const queries = await Promise.all([
        // Conversion rates
        this.db.query(`
          SELECT 
            (COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100) as conversion_rate
          FROM transactions
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `),
        
        // Average response time
        this.db.query(`
          SELECT 
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
          FROM valuations
          WHERE status = 'completed'
            AND created_at >= NOW() - INTERVAL '30 days'
        `),
        
        // User satisfaction
        this.db.query(`
          SELECT 
            AVG(rating) as avg_rating,
            COUNT(*) as total_reviews
          FROM reviews
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `),
        
        // System health
        this.db.query(`
          SELECT 
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_operations,
            COUNT(*) as total_operations
          FROM system_logs
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        `)
      ]);

      return {
        conversion_rate: queries[0].rows[0]?.conversion_rate || 0,
        avg_processing_time: queries[1].rows[0]?.avg_processing_time || 0,
        avg_rating: queries[2].rows[0]?.avg_rating || 0,
        total_reviews: queries[2].rows[0]?.total_reviews || 0,
        failed_operations: queries[3].rows[0]?.failed_operations || 0,
        total_operations: queries[3].rows[0]?.total_operations || 0,
        system_health: (1 - (queries[3].rows[0]?.failed_operations || 0) / Math.max(queries[3].rows[0]?.total_operations || 1, 1)) * 100
      };
    });
  }

  // 7. Growth Analytics
  async getGrowthAnalytics() {
    const cacheKey = 'growth:analytics';
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        WITH monthly_stats AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as new_msmes,
            SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as cumulative_msmes
          FROM msmes
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
        ),
        revenue_stats AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            SUM(amount) as monthly_revenue
          FROM transactions
          WHERE status = 'completed'
            AND created_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
        )
        SELECT 
          m.month,
          m.new_msmes,
          m.cumulative_msmes,
          COALESCE(r.monthly_revenue, 0) as monthly_revenue,
          LAG(m.new_msmes) OVER (ORDER BY m.month) as prev_month_msmes,
          LAG(r.monthly_revenue) OVER (ORDER BY m.month) as prev_month_revenue
        FROM monthly_stats m
        LEFT JOIN revenue_stats r ON m.month = r.month
        ORDER BY m.month ASC
      `;
      
      const result = await this.db.query(query);
      
      return result.rows.map(row => ({
        ...row,
        msme_growth_rate: row.prev_month_msmes ? 
          ((row.new_msmes - row.prev_month_msmes) / row.prev_month_msmes * 100) : 0,
        revenue_growth_rate: row.prev_month_revenue ? 
          ((row.monthly_revenue - row.prev_month_revenue) / row.prev_month_revenue * 100) : 0
      }));
    });
  }

  // 8. Industry Analytics
  async getIndustryAnalytics() {
    const cacheKey = 'industry:analytics';
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        SELECT 
          industry_category,
          COUNT(*) as msme_count,
          AVG(annual_turnover) as avg_turnover,
          SUM(annual_turnover) as total_turnover,
          COUNT(CASE WHEN verified = true THEN 1 END) as verified_count,
          AVG(employee_count) as avg_employees
        FROM msmes
        WHERE status = 'active'
        GROUP BY industry_category
        ORDER BY msme_count DESC
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    });
  }

  // 9. Geographic Analytics
  async getGeographicAnalytics() {
    const cacheKey = 'geographic:analytics';
    
    return this.getCachedData(cacheKey, async () => {
      const query = `
        SELECT 
          state,
          COUNT(*) as msme_count,
          AVG(annual_turnover) as avg_turnover,
          SUM(annual_turnover) as total_turnover,
          COUNT(DISTINCT city) as cities_count,
          COUNT(CASE WHEN verified = true THEN 1 END) as verified_count
        FROM msmes
        WHERE status = 'active'
        GROUP BY state
        ORDER BY msme_count DESC
      `;
      
      const result = await this.db.query(query);
      return result.rows;
    });
  }

  // 10. Real-time Dashboard Data
  async getDashboardData() {
    const cacheKey = 'dashboard:realtime';
    
    return this.getCachedData(cacheKey, async () => {
      const queries = await Promise.all([
        this.getTransactionData('7d'),
        this.getActiveMSMEData(),
        this.getValuationSummary('7d'),
        this.getUserAnalytics(),
        this.getPerformanceMetrics()
      ]);

      const [transactions, msmes, valuations, users, performance] = queries;

      // Calculate KPIs
      const totalTransactions = transactions.reduce((sum, day) => sum + day.total_transactions, 0);
      const totalRevenue = transactions.reduce((sum, day) => sum + parseFloat(day.total_amount || 0), 0);
      const totalMSMEs = msmes.reduce((sum, location) => sum + location.active_count, 0);
      const totalUsers = users.reduce((sum, role) => sum + role.total_users, 0);

      return {
        kpis: {
          total_transactions: totalTransactions,
          total_revenue: totalRevenue,
          total_msmes: totalMSMEs,
          total_users: totalUsers,
          conversion_rate: performance.conversion_rate,
          avg_rating: performance.avg_rating,
          system_health: performance.system_health
        },
        charts: {
          transactions,
          msmes,
          valuations,
          users
        },
        performance
      };
    }, 60); // Cache for 1 minute for real-time data
  }

  // Export data for reporting
  async exportAnalyticsData(type, period, format = 'json') {
    let data;
    
    switch (type) {
      case 'transactions':
        data = await this.getTransactionData(period);
        break;
      case 'msmes':
        data = await this.getActiveMSMEData();
        break;
      case 'valuations':
        data = await this.getValuationSummary(period);
        break;
      case 'revenue':
        data = await this.getRevenueAnalytics(period);
        break;
      case 'growth':
        data = await this.getGrowthAnalytics();
        break;
      default:
        data = await this.getDashboardData();
    }

    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return data;
  }

  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          typeof row[header] === 'string' ? `"${row[header]}"` : row[header]
        ).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  async close() {
    await this.db.end();
    await this.redis.quit();
  }
}

module.exports = AnalyticsService;