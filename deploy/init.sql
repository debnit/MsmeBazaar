-- MSMESquare Database Initialization Script
-- This script sets up the initial database structure and seed data

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);

CREATE INDEX IF NOT EXISTS idx_msme_listings_industry ON msme_listings(industry);
CREATE INDEX IF NOT EXISTS idx_msme_listings_location ON msme_listings(location);
CREATE INDEX IF NOT EXISTS idx_msme_listings_status ON msme_listings(status);
CREATE INDEX IF NOT EXISTS idx_msme_listings_revenue ON msme_listings(revenue);
CREATE INDEX IF NOT EXISTS idx_msme_listings_price ON msme_listings(asking_price);

CREATE INDEX IF NOT EXISTS idx_buyer_interests_status ON buyer_interests(status);
CREATE INDEX IF NOT EXISTS idx_buyer_interests_buyer ON buyer_interests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_interests_msme ON buyer_interests(msme_id);

CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_nbfc ON loan_applications(nbfc_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_buyer ON loan_applications(buyer_id);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_msme_listings_search ON msme_listings USING GIN(
    to_tsvector('english', 
        COALESCE(business_name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(industry, '') || ' ' || 
        COALESCE(location, '')
    )
);

-- Geospatial indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_msme_listings_coordinates ON msme_listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_coordinates ON users(latitude, longitude);

-- Create OTP storage table for mobile authentication
CREATE TABLE IF NOT EXISTS otp_store (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(15) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_store_phone ON otp_store(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_store_expires ON otp_store(expires_at);

-- Create notification templates
INSERT INTO notification_templates (template_id, name, type, template, variables, priority, is_active) VALUES
('otp_verification', 'OTP Verification', 'sms', 'Your MSMESquare verification code is: {{otp}}. Valid for 5 minutes.', '["otp"]', 'high', true),
('loan_approved', 'Loan Approved', 'sms', 'Congratulations! Your loan application for {{amount}} has been approved. Contact {{nbfc_name}} for next steps.', '["amount", "nbfc_name"]', 'high', true),
('loan_rejected', 'Loan Rejected', 'sms', 'Your loan application for {{amount}} has been rejected. Reason: {{reason}}', '["amount", "reason"]', 'medium', true),
('interest_received', 'New Interest', 'sms', 'A buyer has shown interest in your business {{business_name}}. Login to view details.', '["business_name"]', 'medium', true),
('deal_closed', 'Deal Closed', 'sms', 'Congratulations! Your deal for {{business_name}} has been closed successfully.', '["business_name"]', 'high', true),
('verification_required', 'Document Verification', 'sms', 'Please upload required documents for {{business_name}} verification.', '["business_name"]', 'medium', true),
('welcome', 'Welcome to MSMESquare', 'sms', 'Welcome to MSMESquare! Your account has been created successfully. Start exploring MSME opportunities.', '[]', 'low', true)
ON CONFLICT (template_id) DO NOTHING;

-- Create some sample industries for testing
INSERT INTO msme_listings (seller_id, business_name, industry, location, revenue, asking_price, description, status, latitude, longitude, created_at) VALUES
(1, 'Tech Solutions Pvt Ltd', 'Technology', 'Bhubaneswar', 5000000, 15000000, 'Software development company specializing in web applications', 'active', 20.2961, 85.8245, CURRENT_TIMESTAMP),
(2, 'Green Foods Processing', 'Food Processing', 'Cuttack', 3000000, 9000000, 'Organic food processing unit with modern equipment', 'active', 20.4625, 85.8828, CURRENT_TIMESTAMP),
(3, 'Textile Manufacturing Co', 'Textiles', 'Berhampur', 8000000, 25000000, 'Traditional handloom textile manufacturing', 'active', 19.3149, 84.7941, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Create performance monitoring views
CREATE OR REPLACE VIEW msme_analytics AS
SELECT 
    industry,
    location,
    COUNT(*) as total_listings,
    AVG(revenue) as avg_revenue,
    AVG(asking_price) as avg_asking_price,
    AVG(asking_price::decimal / NULLIF(revenue, 0)) as avg_multiple,
    MIN(created_at) as first_listing,
    MAX(created_at) as latest_listing
FROM msme_listings
WHERE status = 'active'
GROUP BY industry, location;

-- Create loan performance view
CREATE OR REPLACE VIEW loan_analytics AS
SELECT 
    nbfc_id,
    status,
    COUNT(*) as application_count,
    AVG(loan_amount) as avg_loan_amount,
    AVG(interest_rate) as avg_interest_rate,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_processing_days
FROM loan_applications
GROUP BY nbfc_id, status;

-- Create cleanup function for old records
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void AS $$
BEGIN
    -- Delete expired OTP records
    DELETE FROM otp_store WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Archive old notification history
    UPDATE notification_history 
    SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{archived}', 'true')
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
    AND metadata->>'archived' IS NULL;
    
    -- Log cleanup
    INSERT INTO notification_history (template_id, recipient, message, type, status, created_at)
    VALUES ('system', 'system', 'Database cleanup completed', 'system', 'delivered', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cleanup
CREATE OR REPLACE FUNCTION schedule_cleanup()
RETURNS trigger AS $$
BEGIN
    -- This would be called by a cron job or scheduled task
    PERFORM cleanup_old_records();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;