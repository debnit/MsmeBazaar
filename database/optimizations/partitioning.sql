-- =================================================================
-- MSMEBazaar Database Partitioning Strategy
-- Horizontal partitioning for improved performance and scalability
-- =================================================================

-- =================================================================
-- 1. REGIONAL PARTITIONING FOR MSMES
-- =================================================================

-- Drop existing table if recreating
-- DROP TABLE IF EXISTS msmes CASCADE;

-- Create partitioned MSME table by region
CREATE TABLE msmes_partitioned (
    id SERIAL,
    name VARCHAR(255) NOT NULL,
    business_description TEXT,
    industry VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    annual_turnover DECIMAL(15,2),
    employee_count INTEGER,
    year_of_establishment INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    gstin VARCHAR(15),
    pan VARCHAR(10),
    udhyam_number VARCHAR(50),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(15),
    website VARCHAR(255),
    key_products TEXT[],
    certifications TEXT[],
    owner_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY LIST (state);

-- Create partitions for major states
CREATE TABLE msmes_odisha PARTITION OF msmes_partitioned 
FOR VALUES IN ('Odisha', 'OR');

CREATE TABLE msmes_gujarat PARTITION OF msmes_partitioned 
FOR VALUES IN ('Gujarat', 'GJ');

CREATE TABLE msmes_maharashtra PARTITION OF msmes_partitioned 
FOR VALUES IN ('Maharashtra', 'MH');

CREATE TABLE msmes_karnataka PARTITION OF msmes_partitioned 
FOR VALUES IN ('Karnataka', 'KA');

CREATE TABLE msmes_tamil_nadu PARTITION OF msmes_partitioned 
FOR VALUES IN ('Tamil Nadu', 'TN');

CREATE TABLE msmes_uttar_pradesh PARTITION OF msmes_partitioned 
FOR VALUES IN ('Uttar Pradesh', 'UP');

CREATE TABLE msmes_west_bengal PARTITION OF msmes_partitioned 
FOR VALUES IN ('West Bengal', 'WB');

CREATE TABLE msmes_rajasthan PARTITION OF msmes_partitioned 
FOR VALUES IN ('Rajasthan', 'RJ');

-- Default partition for other states
CREATE TABLE msmes_other PARTITION OF msmes_partitioned DEFAULT;

-- =================================================================
-- 2. TIME-BASED PARTITIONING FOR TRANSACTIONS
-- =================================================================

-- Create partitioned transaction table by date
CREATE TABLE transactions_partitioned (
    id SERIAL,
    msme_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    transaction_type VARCHAR(50),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50),
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    agreement_url VARCHAR(500),
    notes TEXT,
    metadata JSONB,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for current year and next year
CREATE TABLE transactions_2024_01 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE transactions_2024_02 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE transactions_2024_03 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE transactions_2024_04 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

CREATE TABLE transactions_2024_05 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');

CREATE TABLE transactions_2024_06 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

CREATE TABLE transactions_2024_07 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');

CREATE TABLE transactions_2024_08 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');

CREATE TABLE transactions_2024_09 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');

CREATE TABLE transactions_2024_10 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

CREATE TABLE transactions_2024_11 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE transactions_2024_12 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- 2025 partitions
CREATE TABLE transactions_2025_01 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE transactions_2025_02 PARTITION OF transactions_partitioned 
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Continue creating monthly partitions as needed...

-- =================================================================
-- 3. HYBRID PARTITIONING FOR VALUATIONS
-- =================================================================

-- Partition by both region and time for optimal query performance
CREATE TABLE valuations_partitioned (
    id SERIAL,
    msme_id INTEGER NOT NULL,
    agent_id INTEGER,
    valuation_amount DECIMAL(15,2),
    valuation_method VARCHAR(100),
    financial_metrics JSONB,
    market_analysis JSONB,
    risk_assessment JSONB,
    growth_potential JSONB,
    final_report_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    region VARCHAR(100),
    industry VARCHAR(100),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create quarterly partitions for valuations
CREATE TABLE valuations_2024_q1 PARTITION OF valuations_partitioned 
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE valuations_2024_q2 PARTITION OF valuations_partitioned 
FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE valuations_2024_q3 PARTITION OF valuations_partitioned 
FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');

CREATE TABLE valuations_2024_q4 PARTITION OF valuations_partitioned 
FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

CREATE TABLE valuations_2025_q1 PARTITION OF valuations_partitioned 
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

-- =================================================================
-- 4. LOG PARTITIONING FOR PERFORMANCE MONITORING
-- =================================================================

-- Partition API logs by date (daily partitions for recent data)
CREATE TABLE api_request_logs_partitioned (
    id SERIAL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create daily partitions for current month
CREATE TABLE api_logs_2024_07_19 PARTITION OF api_request_logs_partitioned 
FOR VALUES FROM ('2024-07-19') TO ('2024-07-20');

CREATE TABLE api_logs_2024_07_20 PARTITION OF api_request_logs_partitioned 
FOR VALUES FROM ('2024-07-20') TO ('2024-07-21');

-- Continue creating daily partitions...

-- =================================================================
-- 5. PARTITION MAINTENANCE PROCEDURES
-- =================================================================

-- Function to automatically create new transaction partitions
CREATE OR REPLACE FUNCTION create_monthly_transaction_partition(year INTEGER, month INTEGER)
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    start_date := make_date(year, month, 1);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'transactions_' || year || '_' || lpad(month::text, 2, '0');
    
    EXECUTE format('CREATE TABLE %I PARTITION OF transactions_partitioned 
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Function to create new API log partitions
CREATE OR REPLACE FUNCTION create_daily_log_partition(target_date DATE)
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    start_date := target_date;
    end_date := target_date + INTERVAL '1 day';
    partition_name := 'api_logs_' || to_char(target_date, 'YYYY_MM_DD');
    
    EXECUTE format('CREATE TABLE %I PARTITION OF api_request_logs_partitioned 
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions (data retention)
CREATE OR REPLACE FUNCTION drop_old_partitions(months_to_keep INTEGER DEFAULT 12)
RETURNS void AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
BEGIN
    cutoff_date := CURRENT_DATE - (months_to_keep || ' months')::INTERVAL;
    
    -- Drop old transaction partitions
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'transactions_%' 
        AND tablename ~ '\d{4}_\d{2}$'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(partition_record.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 6. PARTITION INDEXES
-- =================================================================

-- Create indexes on each partition for optimal performance
DO $$
DECLARE
    partition_name TEXT;
BEGIN
    -- Index all MSME partitions
    FOR partition_name IN 
        SELECT tablename FROM pg_tables 
        WHERE tablename LIKE 'msmes_%' 
    LOOP
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || partition_name || '_city ON ' || partition_name || ' (city)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || partition_name || '_industry ON ' || partition_name || ' (industry)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || partition_name || '_status ON ' || partition_name || ' (status)';
    END LOOP;
    
    -- Index all transaction partitions
    FOR partition_name IN 
        SELECT tablename FROM pg_tables 
        WHERE tablename LIKE 'transactions_%' 
    LOOP
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || partition_name || '_msme_id ON ' || partition_name || ' (msme_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || partition_name || '_buyer_id ON ' || partition_name || ' (buyer_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_' || partition_name || '_status ON ' || partition_name || ' (status)';
    END LOOP;
END $$;

-- =================================================================
-- 7. PARTITION MONITORING QUERIES
-- =================================================================

-- Check partition sizes
CREATE VIEW partition_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE tablename LIKE 'msmes_%' 
   OR tablename LIKE 'transactions_%' 
   OR tablename LIKE 'valuations_%'
   OR tablename LIKE 'api_logs_%'
ORDER BY size_bytes DESC;

-- Check partition constraint exclusion effectiveness
CREATE VIEW partition_pruning_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    seq_scan as sequential_scans,
    seq_tup_read as seq_tuples_read,
    idx_scan as index_scans,
    idx_tup_fetch as index_tuples_fetched
FROM pg_stat_user_tables
WHERE relname LIKE 'msmes_%' 
   OR relname LIKE 'transactions_%' 
   OR relname LIKE 'valuations_%'
ORDER BY seq_scan DESC;