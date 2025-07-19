-- MSMEBazaar v2.0 - Transaction Matching Database Schema

-- Create extension for better JSON handling and geographic calculations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Buyers table
CREATE TABLE buyers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    industry_preferences JSONB DEFAULT '[]',
    budget_min DECIMAL(15,2) DEFAULT 0,
    budget_max DECIMAL(15,2),
    state VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address TEXT,
    company_size VARCHAR(50) CHECK (company_size IN ('micro', 'small', 'medium', 'large', 'enterprise')),
    payment_terms JSONB DEFAULT '[]',
    purchase_frequency VARCHAR(50) DEFAULT 'monthly',
    preferred_delivery_time INTEGER DEFAULT 30, -- days
    quality_requirements TEXT,
    compliance_requirements JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    verified BOOLEAN DEFAULT false,
    verification_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    last_login TIMESTAMP
);

-- Create indexes for buyers
CREATE INDEX idx_buyers_location ON buyers(state, city);
CREATE INDEX idx_buyers_industry ON buyers USING GIN(industry_preferences);
CREATE INDEX idx_buyers_budget ON buyers(budget_min, budget_max);
CREATE INDEX idx_buyers_status ON buyers(status, verified);

-- Investors table
CREATE TABLE investors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    investor_type VARCHAR(50) CHECK (investor_type IN ('individual', 'vc', 'pe', 'bank', 'government', 'corporate')),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    investment_focus JSONB DEFAULT '[]', -- Industries or sectors
    investment_min DECIMAL(15,2) DEFAULT 0,
    investment_max DECIMAL(15,2),
    preferred_stages JSONB DEFAULT '[]', -- seed, series_a, growth, etc.
    investment_criteria TEXT,
    state VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address TEXT,
    portfolio_size INTEGER DEFAULT 0,
    successful_exits INTEGER DEFAULT 0,
    average_ticket_size DECIMAL(15,2),
    investment_timeframe VARCHAR(50) DEFAULT 'long_term',
    due_diligence_requirements JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    verified BOOLEAN DEFAULT false,
    verification_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    last_login TIMESTAMP
);

-- Create indexes for investors
CREATE INDEX idx_investors_location ON investors(state, city);
CREATE INDEX idx_investors_focus ON investors USING GIN(investment_focus);
CREATE INDEX idx_investors_amount ON investors(investment_min, investment_max);
CREATE INDEX idx_investors_type ON investors(investor_type, status);

-- Enhanced MSMEs table (updating existing structure)
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS business_model VARCHAR(100);
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS target_market JSONB DEFAULT '[]';
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS competitive_advantages TEXT;
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS growth_stage VARCHAR(50) CHECK (growth_stage IN ('startup', 'growth', 'mature', 'expansion'));
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS funding_requirements DECIMAL(15,2);
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS export_countries JSONB DEFAULT '[]';
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS partnership_interests JSONB DEFAULT '[]';
ALTER TABLE msmes ADD COLUMN IF NOT EXISTS technology_adoption_level VARCHAR(50) DEFAULT 'basic';

-- Create indexes for enhanced MSME fields
CREATE INDEX IF NOT EXISTS idx_msmes_growth_stage ON msmes(growth_stage);
CREATE INDEX IF NOT EXISTS idx_msmes_funding ON msmes(funding_requirements);
CREATE INDEX IF NOT EXISTS idx_msmes_target_market ON msmes USING GIN(target_market);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    msme_id INTEGER REFERENCES msmes(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES buyers(id) ON DELETE SET NULL,
    investor_id INTEGER REFERENCES investors(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('sale', 'investment', 'partnership', 'service')),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'INR',
    description TEXT,
    terms_and_conditions TEXT,
    payment_terms VARCHAR(100),
    delivery_timeline INTEGER, -- days
    milestones JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN (
        'initiated', 'negotiating', 'under_review', 'approved', 
        'in_progress', 'completed', 'delivered', 'cancelled', 'disputed'
    )),
    initiated_by INTEGER, -- user_id who initiated
    approved_by INTEGER,   -- user_id who approved
    satisfaction_rating DECIMAL(3,2) CHECK (satisfaction_rating BETWEEN 1.0 AND 5.0),
    feedback TEXT,
    contract_signed_at TIMESTAMP,
    completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_msme ON transactions(msme_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_investor ON transactions(investor_id);
CREATE INDEX idx_transactions_type_status ON transactions(transaction_type, status);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_date ON transactions(created_at, completed_at);

-- Matching results cache table
CREATE TABLE matching_results (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('msme', 'buyer', 'investor')),
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('buyer', 'investor', 'partner', 'supplier')),
    matched_entity_id INTEGER NOT NULL,
    matched_entity_type VARCHAR(20) NOT NULL,
    match_score DECIMAL(5,4) NOT NULL CHECK (match_score BETWEEN 0 AND 1),
    match_reasons JSONB DEFAULT '[]',
    compatibility_factors JSONB DEFAULT '{}',
    distance_km DECIMAL(8,2),
    recommendation_rank INTEGER,
    algorithm_used VARCHAR(100),
    filters_applied JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes')
);

-- Create indexes for matching results
CREATE INDEX idx_matching_entity ON matching_results(entity_id, entity_type, match_type);
CREATE INDEX idx_matching_score ON matching_results(match_score DESC);
CREATE INDEX idx_matching_expires ON matching_results(expires_at);

-- Saved matches table (user bookmarks)
CREATE TABLE saved_matches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    entity_id INTEGER NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    matched_entity_id INTEGER NOT NULL,
    matched_entity_type VARCHAR(20) NOT NULL,
    match_score DECIMAL(5,4),
    notes TEXT,
    tags JSONB DEFAULT '[]',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    follow_up_date DATE,
    status VARCHAR(20) DEFAULT 'saved' CHECK (status IN ('saved', 'contacted', 'in_discussion', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for saved matches
CREATE INDEX idx_saved_matches_user ON saved_matches(user_id);
CREATE INDEX idx_saved_matches_status ON saved_matches(status, priority);
CREATE UNIQUE INDEX idx_saved_matches_unique ON saved_matches(user_id, entity_id, matched_entity_id);

-- Match interactions table (track user interactions with matches)
CREATE TABLE match_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    entity_id INTEGER NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    matched_entity_id INTEGER NOT NULL,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
        'view', 'click', 'save', 'contact', 'share', 'rate', 'report'
    )),
    interaction_data JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for match interactions
CREATE INDEX idx_interactions_user ON match_interactions(user_id);
CREATE INDEX idx_interactions_entity ON match_interactions(entity_id, entity_type);
CREATE INDEX idx_interactions_type ON match_interactions(interaction_type);
CREATE INDEX idx_interactions_date ON match_interactions(created_at);

-- Model performance metrics table
CREATE TABLE model_performance_metrics (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    roc_auc DECIMAL(5,4),
    test_samples INTEGER,
    training_samples INTEGER,
    feature_importance JSONB DEFAULT '{}',
    confusion_matrix JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for model performance
CREATE INDEX idx_model_metrics_name ON model_performance_metrics(model_name);
CREATE INDEX idx_model_metrics_timestamp ON model_performance_metrics(timestamp);

-- Model test data table
CREATE TABLE model_test_data (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    feature_data JSONB NOT NULL,
    ground_truth DECIMAL,
    ground_truth_label VARCHAR(100),
    prediction DECIMAL,
    prediction_confidence DECIMAL(5,4),
    is_correct BOOLEAN,
    data_source VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for model test data
CREATE INDEX idx_test_data_model ON model_test_data(model_name);
CREATE INDEX idx_test_data_correct ON model_test_data(is_correct);
CREATE INDEX idx_test_data_date ON model_test_data(created_at);

-- Partnership requests table
CREATE TABLE partnership_requests (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL, -- MSME requesting partnership
    target_id INTEGER NOT NULL,    -- MSME being requested for partnership
    partnership_type VARCHAR(50) NOT NULL CHECK (partnership_type IN (
        'supply_chain', 'technology_sharing', 'joint_venture', 
        'distribution', 'manufacturing', 'marketing'
    )),
    proposal_details TEXT,
    terms_offered JSONB DEFAULT '{}',
    expected_benefits TEXT,
    duration_months INTEGER,
    investment_required DECIMAL(15,2),
    revenue_sharing_model VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'accepted', 'rejected', 'counter_proposed'
    )),
    response_message TEXT,
    counter_proposal JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Create indexes for partnership requests
CREATE INDEX idx_partnership_requester ON partnership_requests(requester_id);
CREATE INDEX idx_partnership_target ON partnership_requests(target_id);
CREATE INDEX idx_partnership_status ON partnership_requests(status);
CREATE INDEX idx_partnership_type ON partnership_requests(partnership_type);

-- Investment proposals table
CREATE TABLE investment_proposals (
    id SERIAL PRIMARY KEY,
    investor_id INTEGER REFERENCES investors(id) ON DELETE CASCADE,
    msme_id INTEGER REFERENCES msmes(id) ON DELETE CASCADE,
    proposal_type VARCHAR(50) CHECK (proposal_type IN (
        'equity', 'debt', 'convertible', 'grant', 'revenue_sharing'
    )),
    amount_offered DECIMAL(15,2) NOT NULL,
    equity_percentage DECIMAL(5,2), -- for equity investments
    interest_rate DECIMAL(5,2),     -- for debt investments
    tenure_months INTEGER,
    terms_and_conditions TEXT,
    due_diligence_requirements JSONB DEFAULT '[]',
    milestones JSONB DEFAULT '[]',
    exit_strategy TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'sent', 'under_review', 'accepted', 'rejected', 
        'negotiating', 'finalized', 'withdrawn'
    )),
    response_message TEXT,
    counter_proposal JSONB DEFAULT '{}',
    legal_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '60 days')
);

-- Create indexes for investment proposals
CREATE INDEX idx_investment_investor ON investment_proposals(investor_id);
CREATE INDEX idx_investment_msme ON investment_proposals(msme_id);
CREATE INDEX idx_investment_status ON investment_proposals(status);
CREATE INDEX idx_investment_amount ON investment_proposals(amount_offered);

-- Create views for better data access

-- View for active MSMEs with location
CREATE VIEW active_msmes_with_location AS
SELECT 
    m.*,
    POINT(m.longitude, m.latitude) as location_point
FROM msmes m
WHERE m.status = 'active' AND m.verified = true;

-- View for match statistics
CREATE VIEW match_statistics AS
SELECT 
    entity_type,
    match_type,
    COUNT(*) as total_matches,
    AVG(match_score) as avg_match_score,
    MIN(match_score) as min_match_score,
    MAX(match_score) as max_match_score,
    COUNT(DISTINCT entity_id) as unique_entities,
    algorithm_used
FROM matching_results
WHERE expires_at > CURRENT_TIMESTAMP
GROUP BY entity_type, match_type, algorithm_used;

-- View for transaction success rates
CREATE VIEW transaction_success_rates AS
SELECT 
    transaction_type,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END) as successful_transactions,
    ROUND(
        COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as success_rate_percentage,
    AVG(satisfaction_rating) as avg_satisfaction,
    AVG(EXTRACT(DAYS FROM (completed_at - created_at))) as avg_completion_days
FROM transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY transaction_type;

-- View for entity match recommendations
CREATE VIEW entity_recommendations AS
SELECT 
    mr.entity_id,
    mr.entity_type,
    mr.match_type,
    mr.matched_entity_id,
    mr.matched_entity_type,
    mr.match_score,
    mr.recommendation_rank,
    mr.distance_km,
    CASE 
        WHEN mr.entity_type = 'msme' AND mr.match_type = 'buyer' THEN b.company_name
        WHEN mr.entity_type = 'msme' AND mr.match_type = 'investor' THEN i.name
        WHEN mr.entity_type = 'msme' AND mr.match_type = 'partner' THEN m.company_name
    END as matched_entity_name,
    mr.created_at
FROM matching_results mr
LEFT JOIN buyers b ON mr.matched_entity_id = b.id AND mr.matched_entity_type = 'buyer'
LEFT JOIN investors i ON mr.matched_entity_id = i.id AND mr.matched_entity_type = 'investor'
LEFT JOIN msmes m ON mr.matched_entity_id = m.id AND mr.matched_entity_type = 'msme'
WHERE mr.expires_at > CURRENT_TIMESTAMP;

-- Functions for distance calculations
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL, lng1 DECIMAL, 
    lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    -- Haversine formula for distance calculation
    RETURN 6371 * acos(
        cos(radians(lat1)) * cos(radians(lat2)) * 
        cos(radians(lng2) - radians(lng1)) + 
        sin(radians(lat1)) * sin(radians(lat2))
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired matching results
CREATE OR REPLACE FUNCTION clean_expired_matches() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM matching_results WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_buyers_updated_at 
    BEFORE UPDATE ON buyers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investors_updated_at 
    BEFORE UPDATE ON investors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_matches_updated_at 
    BEFORE UPDATE ON saved_matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partnership_requests_updated_at 
    BEFORE UPDATE ON partnership_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_proposals_updated_at 
    BEFORE UPDATE ON investment_proposals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing

-- Sample buyers
INSERT INTO buyers (company_name, contact_person, email, phone, industry_preferences, budget_min, budget_max, state, city, latitude, longitude, company_size, payment_terms) VALUES
('TechCorp Solutions', 'Rajesh Kumar', 'rajesh@techcorp.com', '+91-98765-43210', '["technology", "software"]', 500000, 5000000, 'Maharashtra', 'Mumbai', 19.0760, 72.8777, 'large', '["net_30", "advance_payment"]'),
('Global Textiles Ltd', 'Priya Sharma', 'priya@globaltextiles.com', '+91-87654-32109', '["textiles", "manufacturing"]', 1000000, 10000000, 'Gujarat', 'Ahmedabad', 23.0225, 72.5714, 'enterprise', '["net_45", "letter_of_credit"]'),
('Food Processing Co', 'Amit Patel', 'amit@foodprocessing.com', '+91-76543-21098', '["food_processing", "agriculture"]', 200000, 2000000, 'Punjab', 'Ludhiana', 30.9010, 75.8573, 'medium', '["net_60", "cash_on_delivery"]');

-- Sample investors
INSERT INTO investors (name, investor_type, email, phone, investment_focus, investment_min, investment_max, preferred_stages, state, city, latitude, longitude, average_ticket_size) VALUES
('Innovation Ventures', 'vc', 'contact@innovationvc.com', '+91-99887-76543', '["technology", "fintech", "healthcare"]', 2000000, 50000000, '["series_a", "series_b"]', 'Karnataka', 'Bangalore', 12.9716, 77.5946, 10000000),
('Growth Capital Partners', 'pe', 'info@growthcapital.com', '+91-88776-65432', '["manufacturing", "logistics", "agriculture"]', 5000000, 100000000, '["growth", "expansion"]', 'Delhi', 'New Delhi', 28.6139, 77.2090, 25000000),
('Small Business Fund', 'government', 'contact@sbfund.gov.in', '+91-77665-54321', '["manufacturing", "textiles", "handicrafts"]', 100000, 5000000, '["seed", "early_stage"]', 'Rajasthan', 'Jaipur', 26.9124, 75.7873, 1000000);

-- Sample transactions
INSERT INTO transactions (msme_id, buyer_id, transaction_type, amount, description, status, satisfaction_rating, created_at, completed_at) VALUES
(1, 1, 'sale', 750000, 'Software development services', 'completed', 4.5, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(2, 2, 'sale', 1500000, 'Textile manufacturing order', 'in_progress', NULL, CURRENT_TIMESTAMP - INTERVAL '15 days', NULL),
(3, 3, 'sale', 300000, 'Food processing equipment', 'completed', 4.2, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '10 days');

-- Create a scheduled job to clean expired matches (if using pg_cron extension)
-- SELECT cron.schedule('clean-expired-matches', '0 */6 * * *', 'SELECT clean_expired_matches();');