-- MSMEBazaar v2.0 - User Feedback & Recommendation System Database Schema

-- User feedback table for recommendation system
CREATE TABLE user_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('msme', 'product', 'service', 'buyer', 'investor')),
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN (
        'like', 'dislike', 'click', 'view', 'purchase', 'bookmark', 'share', 'ignore', 'contact', 'rate'
    )),
    explicit_rating DECIMAL(3,2) CHECK (explicit_rating BETWEEN 1.0 AND 5.0),
    implicit_score DECIMAL(4,3) CHECK (implicit_score BETWEEN 0.0 AND 1.0),
    session_id VARCHAR(255),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user feedback
CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_item ON user_feedback(item_id, item_type);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_rating ON user_feedback(explicit_rating) WHERE explicit_rating IS NOT NULL;
CREATE INDEX idx_user_feedback_session ON user_feedback(session_id);
CREATE INDEX idx_user_feedback_created ON user_feedback(created_at);

-- User preferences table
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    industry_preferences JSONB DEFAULT '[]',
    location_preferences JSONB DEFAULT '[]',
    budget_range JSONB DEFAULT '{}', -- {min, max}
    company_size_preferences JSONB DEFAULT '[]',
    notification_preferences JSONB DEFAULT '{}',
    recommendation_settings JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user preferences
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_industry ON user_preferences USING GIN(industry_preferences);
CREATE INDEX idx_user_preferences_location ON user_preferences USING GIN(location_preferences);

-- Recommendation history table
CREATE TABLE recommendation_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    recommendation_request JSONB NOT NULL, -- Original request parameters
    recommendations JSONB NOT NULL, -- List of recommended items
    algorithm_used VARCHAR(100) NOT NULL,
    personalization_score DECIMAL(5,4),
    diversity_score DECIMAL(5,4),
    novelty_score DECIMAL(5,4),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recommendation history
CREATE INDEX idx_recommendation_history_user ON recommendation_history(user_id);
CREATE INDEX idx_recommendation_history_algorithm ON recommendation_history(algorithm_used);
CREATE INDEX idx_recommendation_history_created ON recommendation_history(created_at);

-- User interaction sessions table
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    session_data JSONB DEFAULT '{}',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    page_views INTEGER DEFAULT 0,
    interactions_count INTEGER DEFAULT 0
);

-- Create indexes for user sessions
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_started ON user_sessions(started_at);
CREATE INDEX idx_user_sessions_activity ON user_sessions(last_activity);

-- A/B testing for recommendation algorithms
CREATE TABLE recommendation_experiments (
    id SERIAL PRIMARY KEY,
    experiment_name VARCHAR(255) NOT NULL,
    description TEXT,
    algorithm_variants JSONB NOT NULL, -- List of algorithm configurations to test
    user_assignment_strategy VARCHAR(50) DEFAULT 'random', -- random, geographic, demographic
    start_date DATE NOT NULL,
    end_date DATE,
    target_metric VARCHAR(100) NOT NULL, -- click_through_rate, conversion_rate, user_satisfaction
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recommendation experiments
CREATE INDEX idx_recommendation_experiments_status ON recommendation_experiments(status);
CREATE INDEX idx_recommendation_experiments_dates ON recommendation_experiments(start_date, end_date);

-- User experiment assignments
CREATE TABLE user_experiment_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    experiment_id INTEGER REFERENCES recommendation_experiments(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metrics JSONB DEFAULT '{}'
);

-- Create indexes for user experiment assignments
CREATE INDEX idx_user_experiment_assignments_user ON user_experiment_assignments(user_id);
CREATE INDEX idx_user_experiment_assignments_experiment ON user_experiment_assignments(experiment_id);
CREATE UNIQUE INDEX idx_user_experiment_unique ON user_experiment_assignments(user_id, experiment_id);

-- Model training data table
CREATE TABLE model_training_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    interaction_value DECIMAL(5,4), -- Normalized interaction strength (0-1)
    features JSONB NOT NULL, -- Feature vector for the interaction
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(100) DEFAULT 'user_interaction',
    quality_score DECIMAL(3,2) DEFAULT 1.0 -- Data quality indicator
);

-- Create indexes for model training data
CREATE INDEX idx_model_training_data_user ON model_training_data(user_id);
CREATE INDEX idx_model_training_data_item ON model_training_data(item_id, item_type);
CREATE INDEX idx_model_training_data_interaction ON model_training_data(interaction_type);
CREATE INDEX idx_model_training_data_timestamp ON model_training_data(timestamp);
CREATE INDEX idx_model_training_data_source ON model_training_data(data_source);

-- Item features cache table
CREATE TABLE item_features_cache (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    features JSONB NOT NULL, -- Cached feature vector
    feature_version VARCHAR(50) NOT NULL, -- Version of feature extraction algorithm
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Create indexes for item features cache
CREATE INDEX idx_item_features_cache_item ON item_features_cache(item_id, item_type);
CREATE INDEX idx_item_features_cache_version ON item_features_cache(feature_version);
CREATE INDEX idx_item_features_cache_expires ON item_features_cache(expires_at);
CREATE UNIQUE INDEX idx_item_features_cache_unique ON item_features_cache(item_id, item_type, feature_version);

-- User similarity cache table
CREATE TABLE user_similarity_cache (
    id SERIAL PRIMARY KEY,
    user_id_1 INTEGER NOT NULL,
    user_id_2 INTEGER NOT NULL,
    similarity_score DECIMAL(6,5) NOT NULL, -- Cosine similarity score
    algorithm_used VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Create indexes for user similarity cache
CREATE INDEX idx_user_similarity_cache_user1 ON user_similarity_cache(user_id_1);
CREATE INDEX idx_user_similarity_cache_user2 ON user_similarity_cache(user_id_2);
CREATE INDEX idx_user_similarity_cache_score ON user_similarity_cache(similarity_score DESC);
CREATE INDEX idx_user_similarity_cache_expires ON user_similarity_cache(expires_at);
CREATE UNIQUE INDEX idx_user_similarity_cache_unique ON user_similarity_cache(user_id_1, user_id_2, algorithm_used);

-- Recommendation performance metrics
CREATE TABLE recommendation_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    algorithm_name VARCHAR(100) NOT NULL,
    user_segment VARCHAR(100), -- new_users, active_users, etc.
    total_recommendations INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4),
    conversion_rate DECIMAL(5,4),
    avg_user_satisfaction DECIMAL(3,2),
    diversity_score DECIMAL(4,3),
    novelty_score DECIMAL(4,3),
    coverage_score DECIMAL(4,3), -- Catalog coverage
    precision_at_k DECIMAL(4,3),
    recall_at_k DECIMAL(4,3),
    ndcg_at_k DECIMAL(4,3), -- Normalized Discounted Cumulative Gain
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recommendation metrics
CREATE INDEX idx_recommendation_metrics_date ON recommendation_metrics(metric_date);
CREATE INDEX idx_recommendation_metrics_algorithm ON recommendation_metrics(algorithm_name);
CREATE INDEX idx_recommendation_metrics_segment ON recommendation_metrics(user_segment);
CREATE UNIQUE INDEX idx_recommendation_metrics_unique ON recommendation_metrics(metric_date, algorithm_name, user_segment);

-- Views for analytics

-- Daily user feedback summary
CREATE VIEW daily_feedback_summary AS
SELECT 
    DATE(created_at) as feedback_date,
    feedback_type,
    item_type,
    COUNT(*) as feedback_count,
    AVG(explicit_rating) as avg_rating,
    AVG(implicit_score) as avg_implicit_score,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT item_id) as unique_items
FROM user_feedback
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), feedback_type, item_type
ORDER BY feedback_date DESC, feedback_count DESC;

-- User engagement metrics
CREATE VIEW user_engagement_metrics AS
SELECT 
    user_id,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    COUNT(*) as total_interactions,
    AVG(CASE WHEN explicit_rating IS NOT NULL THEN explicit_rating END) as avg_rating,
    COUNT(CASE WHEN feedback_type = 'like' THEN 1 END) as likes_given,
    COUNT(CASE WHEN feedback_type = 'dislike' THEN 1 END) as dislikes_given,
    COUNT(CASE WHEN feedback_type = 'bookmark' THEN 1 END) as bookmarks_saved,
    COUNT(CASE WHEN feedback_type = 'contact' THEN 1 END) as contacts_made,
    MAX(created_at) as last_interaction,
    MIN(created_at) as first_interaction
FROM user_feedback
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY user_id;

-- Item popularity metrics
CREATE VIEW item_popularity_metrics AS
SELECT 
    item_id,
    item_type,
    COUNT(*) as total_interactions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(CASE WHEN explicit_rating IS NOT NULL THEN explicit_rating END) as avg_rating,
    COUNT(CASE WHEN feedback_type = 'like' THEN 1 END) as likes_count,
    COUNT(CASE WHEN feedback_type = 'view' THEN 1 END) as views_count,
    COUNT(CASE WHEN feedback_type = 'contact' THEN 1 END) as contacts_count,
    MAX(created_at) as last_interaction
FROM user_feedback
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY item_id, item_type
ORDER BY total_interactions DESC;

-- Recommendation algorithm performance comparison
CREATE VIEW algorithm_performance_comparison AS
SELECT 
    algorithm_name,
    DATE_TRUNC('week', metric_date) as week,
    AVG(click_through_rate) as avg_ctr,
    AVG(conversion_rate) as avg_conversion,
    AVG(avg_user_satisfaction) as avg_satisfaction,
    AVG(diversity_score) as avg_diversity,
    AVG(novelty_score) as avg_novelty,
    SUM(total_recommendations) as total_recs
FROM recommendation_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY algorithm_name, DATE_TRUNC('week', metric_date)
ORDER BY week DESC, avg_satisfaction DESC;

-- Functions

-- Function to calculate user similarity
CREATE OR REPLACE FUNCTION calculate_user_similarity(
    user1_id INTEGER,
    user2_id INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    similarity_score DECIMAL;
    common_items INTEGER;
    user1_ratings RECORD;
    user2_ratings RECORD;
    dot_product DECIMAL := 0;
    norm1 DECIMAL := 0;
    norm2 DECIMAL := 0;
BEGIN
    -- Check if users have common rated items
    SELECT COUNT(DISTINCT f1.item_id) INTO common_items
    FROM user_feedback f1
    INNER JOIN user_feedback f2 ON f1.item_id = f2.item_id AND f1.item_type = f2.item_type
    WHERE f1.user_id = user1_id 
    AND f2.user_id = user2_id
    AND f1.explicit_rating IS NOT NULL 
    AND f2.explicit_rating IS NOT NULL;
    
    -- Return 0 if no common items
    IF common_items = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calculate cosine similarity
    FOR user1_ratings IN
        SELECT f1.item_id, f1.item_type, f1.explicit_rating as rating1, f2.explicit_rating as rating2
        FROM user_feedback f1
        INNER JOIN user_feedback f2 ON f1.item_id = f2.item_id AND f1.item_type = f2.item_type
        WHERE f1.user_id = user1_id 
        AND f2.user_id = user2_id
        AND f1.explicit_rating IS NOT NULL 
        AND f2.explicit_rating IS NOT NULL
    LOOP
        dot_product := dot_product + (user1_ratings.rating1 * user1_ratings.rating2);
        norm1 := norm1 + (user1_ratings.rating1 * user1_ratings.rating1);
        norm2 := norm2 + (user1_ratings.rating2 * user1_ratings.rating2);
    END LOOP;
    
    -- Calculate final similarity
    IF norm1 > 0 AND norm2 > 0 THEN
        similarity_score := dot_product / (sqrt(norm1) * sqrt(norm2));
    ELSE
        similarity_score := 0;
    END IF;
    
    RETURN similarity_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's preferred industries
CREATE OR REPLACE FUNCTION get_user_preferred_industries(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 5
) RETURNS TABLE(industry VARCHAR, interaction_count BIGINT, avg_rating DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.industry_category,
        COUNT(*) as interaction_count,
        AVG(uf.explicit_rating) as avg_rating
    FROM user_feedback uf
    INNER JOIN msmes m ON uf.item_id = m.id AND uf.item_type = 'msme'
    WHERE uf.user_id = p_user_id
    AND uf.feedback_type IN ('like', 'bookmark', 'contact', 'rate')
    GROUP BY m.industry_category
    ORDER BY interaction_count DESC, avg_rating DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean item features cache
    DELETE FROM item_features_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean user similarity cache
    DELETE FROM user_similarity_cache WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean old recommendation history (keep last 6 months)
    DELETE FROM recommendation_history WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Clean old user sessions (keep last 3 months)
    DELETE FROM user_sessions WHERE started_at < CURRENT_TIMESTAMP - INTERVAL '3 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers

-- Update timestamp trigger for user_preferences
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_user_preferences_timestamp();

-- Update timestamp trigger for user_feedback
CREATE OR REPLACE FUNCTION update_user_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_feedback_updated_at
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW EXECUTE FUNCTION update_user_feedback_timestamp();

-- Trigger to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last activity and increment interaction count
    UPDATE user_sessions 
    SET 
        last_activity = CURRENT_TIMESTAMP,
        interactions_count = interactions_count + 1
    WHERE session_id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_on_feedback
    AFTER INSERT ON user_feedback
    FOR EACH ROW 
    WHEN (NEW.session_id IS NOT NULL)
    EXECUTE FUNCTION update_session_activity();

-- Sample data for testing

-- Insert sample user preferences
INSERT INTO user_preferences (user_id, industry_preferences, location_preferences, budget_range) VALUES
(1, '["technology", "manufacturing"]', '["Maharashtra", "Karnataka"]', '{"min": 100000, "max": 5000000}'),
(2, '["textiles", "agriculture"]', '["Gujarat", "Punjab"]', '{"min": 500000, "max": 10000000}'),
(3, '["healthcare", "consulting"]', '["Delhi", "Tamil Nadu"]', '{"min": 200000, "max": 2000000}');

-- Insert sample user feedback
INSERT INTO user_feedback (user_id, item_id, item_type, feedback_type, explicit_rating, implicit_score, session_id) VALUES
(1, 1, 'msme', 'like', 4.5, 1.0, 'session_1'),
(1, 2, 'msme', 'view', NULL, 0.3, 'session_1'),
(1, 3, 'msme', 'bookmark', 4.0, 0.8, 'session_1'),
(2, 1, 'msme', 'contact', 5.0, 1.0, 'session_2'),
(2, 4, 'msme', 'like', 3.5, 0.7, 'session_2'),
(3, 2, 'msme', 'dislike', 2.0, 0.2, 'session_3'),
(3, 5, 'msme', 'rate', 4.2, 0.9, 'session_3');

-- Insert sample user sessions
INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, page_views, interactions_count) VALUES
('session_1', 1, '192.168.1.1', 'Mozilla/5.0...', 5, 3),
('session_2', 2, '192.168.1.2', 'Chrome/91.0...', 8, 2),
('session_3', 3, '192.168.1.3', 'Safari/14.0...', 3, 2);

-- Create a scheduled job to clean expired cache (if using pg_cron extension)
-- SELECT cron.schedule('clean-recommendation-cache', '0 2 * * *', 'SELECT clean_expired_cache();');