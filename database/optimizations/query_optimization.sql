-- =================================================================
-- MSMEBazaar Query Optimization Guide
-- Advanced techniques for high-performance database queries
-- =================================================================

-- =================================================================
-- 1. QUERY ANALYSIS AND OPTIMIZATION
-- =================================================================

-- Enable query timing and analysis
SET enable_seqscan = off;  -- Force index usage for testing
SET work_mem = '256MB';    -- Increase work memory for complex queries
SET shared_buffers = '512MB'; -- Increase shared buffer cache

-- =================================================================
-- 2. OPTIMIZED MSME SEARCH QUERIES
-- =================================================================

-- BEFORE: Slow full-text search
-- SELECT * FROM msmes WHERE name ILIKE '%tech%' OR business_description ILIKE '%tech%';

-- AFTER: Optimized full-text search with indexes
EXPLAIN (ANALYZE, BUFFERS) 
SELECT m.id, m.name, m.city, m.industry, m.annual_turnover,
       ts_rank(search_vector, plainto_tsquery('english', 'technology')) as rank
FROM msmes m
WHERE m.search_vector @@ plainto_tsquery('english', 'technology')
  AND m.status = 'active'
ORDER BY rank DESC, m.created_at DESC
LIMIT 20;

-- Geographic proximity search with industry filter
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.id, m.name, m.city, m.industry, m.annual_turnover
FROM msmes m
WHERE m.city = 'Bhubaneswar'
  AND m.industry = 'Technology'
  AND m.status = 'active'
  AND m.annual_turnover BETWEEN 1000000 AND 50000000
ORDER BY m.created_at DESC
LIMIT 50;

-- Multi-region search with aggregation
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.state, m.industry, 
       COUNT(*) as msme_count,
       AVG(m.annual_turnover) as avg_turnover,
       SUM(m.employee_count) as total_employees
FROM msmes m
WHERE m.state IN ('Odisha', 'Gujarat', 'Maharashtra')
  AND m.status = 'active'
  AND m.created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY m.state, m.industry
HAVING COUNT(*) > 5
ORDER BY avg_turnover DESC;

-- =================================================================
-- 3. TRANSACTION PERFORMANCE QUERIES
-- =================================================================

-- Optimized transaction history with pagination
EXPLAIN (ANALYZE, BUFFERS)
SELECT t.id, t.transaction_type, t.amount, t.status,
       m.name as msme_name, u.email as buyer_email
FROM transactions t
JOIN msmes m ON t.msme_id = m.id
JOIN users u ON t.buyer_id = u.id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND t.status IN ('completed', 'pending')
ORDER BY t.created_at DESC
LIMIT 50 OFFSET 0;

-- Monthly transaction analytics (avoiding N+1 queries)
EXPLAIN (ANALYZE, BUFFERS)
WITH monthly_stats AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
  FROM transactions
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at), status
)
SELECT 
  month,
  SUM(CASE WHEN status = 'completed' THEN transaction_count ELSE 0 END) as completed_count,
  SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_amount,
  SUM(CASE WHEN status = 'pending' THEN transaction_count ELSE 0 END) as pending_count,
  SUM(CASE WHEN status = 'failed' THEN transaction_count ELSE 0 END) as failed_count
FROM monthly_stats
GROUP BY month
ORDER BY month DESC;

-- =================================================================
-- 4. USER PERFORMANCE QUERIES
-- =================================================================

-- User dashboard data (single query instead of multiple)
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  u.id, u.email, u.role, u.created_at,
  COUNT(DISTINCT m.id) as owned_msmes,
  COUNT(DISTINCT t_buyer.id) as purchases,
  COUNT(DISTINCT t_seller.id) as sales,
  COALESCE(SUM(t_seller.amount), 0) as total_sales_amount,
  COALESCE(AVG(v.valuation_amount), 0) as avg_valuation
FROM users u
LEFT JOIN msmes m ON u.id = m.owner_id AND m.status = 'active'
LEFT JOIN transactions t_buyer ON u.id = t_buyer.buyer_id AND t_buyer.status = 'completed'
LEFT JOIN transactions t_seller ON u.id = t_seller.seller_id AND t_seller.status = 'completed'
LEFT JOIN valuations v ON m.id = v.msme_id AND v.status = 'completed'
WHERE u.id = $1  -- Parameter for specific user
GROUP BY u.id, u.email, u.role, u.created_at;

-- =================================================================
-- 5. AVOID N+1 QUERY PATTERNS
-- =================================================================

-- BAD: N+1 Query Pattern
-- SELECT * FROM msmes; -- 1 query
-- For each MSME: SELECT * FROM transactions WHERE msme_id = ?; -- N queries

-- GOOD: Single Query with JOIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  m.id, m.name, m.city, m.industry,
  COALESCE(t.transaction_count, 0) as transaction_count,
  COALESCE(t.total_transaction_amount, 0) as total_transaction_amount,
  COALESCE(t.latest_transaction_date, NULL) as latest_transaction_date
FROM msmes m
LEFT JOIN (
  SELECT 
    msme_id,
    COUNT(*) as transaction_count,
    SUM(amount) as total_transaction_amount,
    MAX(created_at) as latest_transaction_date
  FROM transactions
  WHERE status = 'completed'
  GROUP BY msme_id
) t ON m.id = t.msme_id
WHERE m.status = 'active'
ORDER BY m.created_at DESC
LIMIT 100;

-- =================================================================
-- 6. COMPLEX AGGREGATION QUERIES
-- =================================================================

-- Industry analysis with window functions
EXPLAIN (ANALYZE, BUFFERS)
WITH industry_metrics AS (
  SELECT 
    m.industry,
    m.state,
    COUNT(*) as msme_count,
    AVG(m.annual_turnover) as avg_turnover,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.annual_turnover) as median_turnover,
    AVG(m.employee_count) as avg_employees
  FROM msmes m
  WHERE m.status = 'active'
    AND m.annual_turnover > 0
    AND m.employee_count > 0
  GROUP BY m.industry, m.state
)
SELECT 
  industry,
  state,
  msme_count,
  avg_turnover,
  median_turnover,
  avg_employees,
  RANK() OVER (PARTITION BY industry ORDER BY avg_turnover DESC) as state_rank_in_industry,
  PERCENT_RANK() OVER (ORDER BY avg_turnover) as turnover_percentile
FROM industry_metrics
WHERE msme_count >= 10  -- Only industries with significant presence
ORDER BY industry, state_rank_in_industry;

-- =================================================================
-- 7. SEARCH AND FILTER OPTIMIZATION
-- =================================================================

-- Advanced MSME search with multiple filters
CREATE OR REPLACE FUNCTION search_msmes(
  p_search_term TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_min_turnover DECIMAL DEFAULT NULL,
  p_max_turnover DECIMAL DEFAULT NULL,
  p_min_employees INTEGER DEFAULT NULL,
  p_max_employees INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  name VARCHAR(255),
  industry VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(100),
  annual_turnover DECIMAL(15,2),
  employee_count INTEGER,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.industry,
    m.city,
    m.state,
    m.annual_turnover,
    m.employee_count,
    CASE 
      WHEN p_search_term IS NOT NULL THEN
        ts_rank(m.search_vector, plainto_tsquery('english', p_search_term))
      ELSE 1.0
    END::REAL as search_rank
  FROM msmes m
  WHERE m.status = 'active'
    AND (p_search_term IS NULL OR m.search_vector @@ plainto_tsquery('english', p_search_term))
    AND (p_industry IS NULL OR m.industry = p_industry)
    AND (p_city IS NULL OR m.city = p_city)
    AND (p_state IS NULL OR m.state = p_state)
    AND (p_min_turnover IS NULL OR m.annual_turnover >= p_min_turnover)
    AND (p_max_turnover IS NULL OR m.annual_turnover <= p_max_turnover)
    AND (p_min_employees IS NULL OR m.employee_count >= p_min_employees)
    AND (p_max_employees IS NULL OR m.employee_count <= p_max_employees)
  ORDER BY search_rank DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- =================================================================
-- 8. MATERIALIZED VIEWS FOR HEAVY QUERIES
-- =================================================================

-- Create materialized view for dashboard statistics
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
  COUNT(DISTINCT m.id) as total_msmes,
  COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.id END) as active_msmes,
  COUNT(DISTINCT m.industry) as total_industries,
  COUNT(DISTINCT m.city) as total_cities,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT t.id) as total_transactions,
  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as total_transaction_value,
  AVG(m.annual_turnover) as avg_msme_turnover,
  DATE_TRUNC('day', CURRENT_TIMESTAMP) as last_updated
FROM msmes m
CROSS JOIN users u
CROSS JOIN transactions t;

-- Refresh materialized view (run this periodically)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;

-- Industry-wise statistics materialized view
CREATE MATERIALIZED VIEW industry_statistics AS
SELECT 
  m.industry,
  COUNT(*) as msme_count,
  COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_count,
  AVG(m.annual_turnover) as avg_turnover,
  SUM(m.annual_turnover) as total_turnover,
  AVG(m.employee_count) as avg_employees,
  SUM(m.employee_count) as total_employees,
  COUNT(DISTINCT m.city) as cities_present,
  MIN(m.year_of_establishment) as oldest_establishment,
  MAX(m.year_of_establishment) as newest_establishment,
  COUNT(DISTINCT t.id) as total_transactions,
  COALESCE(SUM(t.amount), 0) as total_transaction_value
FROM msmes m
LEFT JOIN transactions t ON m.id = t.msme_id AND t.status = 'completed'
GROUP BY m.industry;

-- =================================================================
-- 9. QUERY PERFORMANCE MONITORING
-- =================================================================

-- Create view to monitor slow queries
CREATE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- Create function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance(query_text TEXT)
RETURNS TABLE (
  execution_time_ms NUMERIC,
  planning_time_ms NUMERIC,
  total_cost NUMERIC,
  rows_returned BIGINT,
  buffers_read INTEGER,
  buffers_hit INTEGER,
  cache_hit_ratio NUMERIC
) AS $$
DECLARE
  explain_result TEXT;
BEGIN
  -- This would need to be implemented with dynamic SQL execution
  -- For now, return placeholder values
  RETURN QUERY
  SELECT 
    0::NUMERIC as execution_time_ms,
    0::NUMERIC as planning_time_ms,
    0::NUMERIC as total_cost,
    0::BIGINT as rows_returned,
    0::INTEGER as buffers_read,
    0::INTEGER as buffers_hit,
    0::NUMERIC as cache_hit_ratio;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 10. MAINTENANCE QUERIES
-- =================================================================

-- Update table statistics (run regularly)
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE msmes;
  ANALYZE transactions;
  ANALYZE users;
  ANALYZE valuations;
  ANALYZE buyer_interests;
  
  -- Refresh materialized views
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY industry_statistics;
  
  RAISE NOTICE 'Table statistics updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Check for missing indexes
CREATE VIEW missing_indexes AS
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  seq_scan,
  seq_tup_read,
  CASE 
    WHEN seq_scan > 1000 AND seq_tup_read > 10000 
    THEN 'Consider adding index'
    ELSE 'OK'
  END as recommendation
FROM pg_stat_user_tables
JOIN pg_attribute ON pg_stat_user_tables.relid = pg_attribute.attrelid
WHERE attnum > 0
  AND NOT attisdropped
  AND seq_scan > 100
ORDER BY seq_scan DESC, seq_tup_read DESC;

-- =================================================================
-- 11. EXAMPLE USAGE
-- =================================================================

-- Example of optimized MSME search
SELECT * FROM search_msmes(
  p_search_term := 'technology software',
  p_state := 'Odisha',
  p_min_turnover := 1000000,
  p_max_turnover := 10000000,
  p_limit := 20,
  p_offset := 0
);

-- Example of transaction analytics
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as transactions,
  SUM(amount) as revenue,
  AVG(amount) as avg_transaction_size
FROM transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  AND status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;