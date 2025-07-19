-- =================================================================
-- MSMEBazaar Database Performance Optimization - Indexes
-- =================================================================

-- Drop existing indexes if they exist (for clean setup)
DROP INDEX IF EXISTS idx_msmes_name;
DROP INDEX IF EXISTS idx_msmes_city;
DROP INDEX IF EXISTS idx_msmes_industry;
DROP INDEX IF EXISTS idx_msmes_status;
DROP INDEX IF EXISTS idx_msmes_created_at;
DROP INDEX IF EXISTS idx_msmes_region_industry;
DROP INDEX IF EXISTS idx_msmes_search_vector;

-- =================================================================
-- PRIMARY INDEXES - Most Frequently Queried Columns
-- =================================================================

-- MSME name search (autocomplete, search functionality)
CREATE INDEX CONCURRENTLY idx_msmes_name 
ON msmes USING gin(to_tsvector('english', name));

-- Geographic searches (city-based filtering)
CREATE INDEX CONCURRENTLY idx_msmes_city 
ON msmes (city);

-- Industry-based filtering (sector analysis)
CREATE INDEX CONCURRENTLY idx_msmes_industry 
ON msmes (industry);

-- Status filtering (active, inactive, pending verification)
CREATE INDEX CONCURRENTLY idx_msmes_status 
ON msmes (status) WHERE status IS NOT NULL;

-- Time-based queries (recent listings, date ranges)
CREATE INDEX CONCURRENTLY idx_msmes_created_at 
ON msmes (created_at DESC);

-- =================================================================
-- COMPOSITE INDEXES - Multi-column Queries
-- =================================================================

-- Region + Industry filtering (common business query)
CREATE INDEX CONCURRENTLY idx_msmes_region_industry 
ON msmes (city, industry, status) 
WHERE status = 'active';

-- Business size + location (investment opportunity searches)
CREATE INDEX CONCURRENTLY idx_msmes_size_location 
ON msmes (employee_count, annual_turnover, city) 
WHERE status = 'active';

-- Industry + establishment date (mature business filtering)
CREATE INDEX CONCURRENTLY idx_msmes_industry_age 
ON msmes (industry, year_of_establishment DESC) 
WHERE status = 'active';

-- =================================================================
-- FULL-TEXT SEARCH INDEXES
-- =================================================================

-- Full-text search across name, description, and industry
CREATE INDEX CONCURRENTLY idx_msmes_search_vector 
ON msmes USING gin(
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(business_description, '') || ' ' || 
    COALESCE(industry, '') || ' ' ||
    COALESCE(key_products, '')
  )
);

-- =================================================================
-- TRANSACTION TABLE INDEXES
-- =================================================================

-- Transaction by MSME (business transaction history)
CREATE INDEX CONCURRENTLY idx_transactions_msme_id 
ON transactions (msme_id, created_at DESC);

-- Transaction by buyer (purchase history)
CREATE INDEX CONCURRENTLY idx_transactions_buyer_id 
ON transactions (buyer_id, created_at DESC);

-- Transaction status tracking
CREATE INDEX CONCURRENTLY idx_transactions_status 
ON transactions (status, created_at DESC);

-- Payment tracking
CREATE INDEX CONCURRENTLY idx_transactions_payment_status 
ON transactions (payment_status) 
WHERE payment_status IS NOT NULL;

-- =================================================================
-- USER TABLE INDEXES
-- =================================================================

-- User email lookup (authentication)
CREATE UNIQUE INDEX CONCURRENTLY idx_users_email 
ON users (email) 
WHERE email IS NOT NULL;

-- User phone lookup (OTP, SMS)
CREATE INDEX CONCURRENTLY idx_users_phone 
ON users (phone) 
WHERE phone IS NOT NULL;

-- User role filtering
CREATE INDEX CONCURRENTLY idx_users_role 
ON users (role, is_active) 
WHERE is_active = true;

-- =================================================================
-- VALUATION TABLE INDEXES
-- =================================================================

-- Valuation by MSME (business valuation history)
CREATE INDEX CONCURRENTLY idx_valuations_msme_id 
ON valuations (msme_id, created_at DESC);

-- Valuation by agent (agent performance tracking)
CREATE INDEX CONCURRENTLY idx_valuations_agent_id 
ON valuations (agent_id, created_at DESC);

-- Valuation status tracking
CREATE INDEX CONCURRENTLY idx_valuations_status 
ON valuations (status, created_at DESC);

-- =================================================================
-- INTEREST TABLE INDEXES
-- =================================================================

-- Buyer interest tracking
CREATE INDEX CONCURRENTLY idx_interests_buyer_id 
ON buyer_interests (buyer_id, created_at DESC);

-- MSME interest tracking
CREATE INDEX CONCURRENTLY idx_interests_msme_id 
ON buyer_interests (msme_id, status);

-- Active interests only
CREATE INDEX CONCURRENTLY idx_interests_active 
ON buyer_interests (msme_id, buyer_id) 
WHERE status = 'active';

-- =================================================================
-- PERFORMANCE MONITORING INDEXES
-- =================================================================

-- API request logging
CREATE INDEX CONCURRENTLY idx_api_logs_endpoint 
ON api_request_logs (endpoint, created_at DESC);

-- Error tracking
CREATE INDEX CONCURRENTLY idx_api_logs_status 
ON api_request_logs (status_code, created_at DESC) 
WHERE status_code >= 400;

-- =================================================================
-- LOCATION-BASED INDEXES (for geographic queries)
-- =================================================================

-- State-wise filtering
CREATE INDEX CONCURRENTLY idx_msmes_state 
ON msmes (state, city);

-- Pincode-based proximity searches
CREATE INDEX CONCURRENTLY idx_msmes_pincode 
ON msmes (pincode) 
WHERE pincode IS NOT NULL;

-- =================================================================
-- MAINTENANCE COMMANDS
-- =================================================================

-- Update table statistics for query planner
ANALYZE msmes;
ANALYZE transactions;
ANALYZE users;
ANALYZE valuations;
ANALYZE buyer_interests;

-- Check index usage statistics
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_tup_read DESC;

-- Check table sizes
-- SELECT schemaname, tablename, 
--        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;