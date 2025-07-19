"""
MSMEBazaar v2.0 - Advanced Recommendation Engine
Features:
- Collaborative Filtering (User-Based & Item-Based)
- Content-Based Filtering
- Matrix Factorization (ALS)
- Hybrid Recommendations
- Real-time Learning
- Feedback Loop Integration
"""

import asyncio
import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import json
import redis
from sklearn.neighbors import NearestNeighbors
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from scipy.sparse import csr_matrix
import implicit
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
import asyncpg
from prometheus_client import Counter, Histogram, generate_latest
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
recommendation_requests = Counter('recommendation_requests_total', 'Total recommendation requests', ['type'])
recommendation_latency = Histogram('recommendation_latency_seconds', 'Recommendation response time')

app = FastAPI(title="MSMEBazaar Recommendation Engine", version="2.0.0")

# Pydantic Models
class UserPreferences(BaseModel):
    user_id: int
    industry_preferences: List[str] = []
    location_preferences: List[str] = []
    price_range: Tuple[float, float] = (0, 1000000)
    company_size_preference: str = "any"  # micro, small, medium, any

class RecommendationRequest(BaseModel):
    user_id: int
    request_type: str = Field(..., regex="^(msme|product|service|deal)$")
    limit: int = Field(10, ge=1, le=50)
    exclude_ids: List[int] = []
    context: Dict = {}  # Additional context like current page, search query, etc.

class FeedbackData(BaseModel):
    user_id: int
    item_id: int
    item_type: str
    feedback_type: str = Field(..., regex="^(view|click|like|dislike|purchase|inquiry)$")
    rating: Optional[float] = Field(None, ge=1, le=5)
    timestamp: Optional[datetime] = None

class RecommendationResponse(BaseModel):
    recommendations: List[Dict]
    algorithm_used: str
    confidence_scores: List[float]
    explanation: Dict
    timestamp: datetime

class RecommendationEngine:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.db_pool = None
        
        # Models
        self.user_knn_model = None
        self.item_knn_model = None
        self.content_model = None
        self.matrix_factorization_model = None
        self.tfidf_vectorizer = None
        
        # Data
        self.user_item_matrix = None
        self.content_features = None
        self.item_features_df = None
        self.user_profiles = {}
        
        # Model parameters
        self.n_neighbors = 20
        self.n_factors = 50
        self.cache_ttl = 3600  # 1 hour

    async def initialize(self):
        """Initialize database connection and load models"""
        try:
            self.db_pool = await asyncpg.create_pool(
                host='localhost',
                port=5432,
                user='postgres',
                password='password',
                database='msmebazaar',
                min_size=10,
                max_size=20
            )
            
            # Load or train models
            await self.load_data()
            await self.train_models()
            
            logger.info("Recommendation engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize recommendation engine: {e}")
            raise

    async def load_data(self):
        """Load data from database and prepare matrices"""
        try:
            async with self.db_pool.acquire() as conn:
                # Load user interactions
                interactions_query = """
                    SELECT user_id, item_id, item_type, interaction_type, rating, created_at
                    FROM user_interactions 
                    WHERE created_at >= NOW() - INTERVAL '6 months'
                """
                interactions = await conn.fetch(interactions_query)
                
                # Load MSME data
                msmes_query = """
                    SELECT id, company_name, industry_category, state, city, 
                           annual_turnover, employee_count, business_type,
                           description, services, products
                    FROM msmes 
                    WHERE status = 'active' AND verified = true
                """
                msmes = await conn.fetch(msmes_query)
                
                # Load user profiles
                users_query = """
                    SELECT id, industry_preferences, location_preferences, 
                           company_size_preference, price_range_min, price_range_max
                    FROM user_preferences
                """
                users = await conn.fetch(users_query)
            
            # Convert to DataFrames
            self.interactions_df = pd.DataFrame(interactions)
            self.msmes_df = pd.DataFrame(msmes)
            self.users_df = pd.DataFrame(users)
            
            # Create user-item interaction matrix
            self.create_interaction_matrix()
            
            # Prepare content features
            self.prepare_content_features()
            
            logger.info(f"Loaded {len(self.interactions_df)} interactions, {len(self.msmes_df)} MSMEs")
            
        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            raise

    def create_interaction_matrix(self):
        """Create user-item interaction matrix for collaborative filtering"""
        try:
            # Weight different interaction types
            interaction_weights = {
                'view': 1.0,
                'click': 2.0,
                'like': 3.0,
                'inquiry': 4.0,
                'purchase': 5.0
            }
            
            # Apply weights to interactions
            self.interactions_df['weighted_score'] = self.interactions_df['interaction_type'].map(
                interaction_weights
            ).fillna(1.0)
            
            # Use explicit rating if available, otherwise use weighted score
            self.interactions_df['final_score'] = self.interactions_df['rating'].fillna(
                self.interactions_df['weighted_score']
            )
            
            # Create pivot table
            self.user_item_matrix = self.interactions_df.pivot_table(
                index='user_id',
                columns='item_id',
                values='final_score',
                fill_value=0
            )
            
            # Convert to sparse matrix for efficiency
            self.user_item_sparse = csr_matrix(self.user_item_matrix.values)
            
            logger.info(f"Created user-item matrix: {self.user_item_matrix.shape}")
            
        except Exception as e:
            logger.error(f"Failed to create interaction matrix: {e}")
            raise

    def prepare_content_features(self):
        """Prepare content-based features for MSMEs"""
        try:
            # Combine text features
            self.msmes_df['combined_text'] = (
                self.msmes_df['company_name'].fillna('') + ' ' +
                self.msmes_df['industry_category'].fillna('') + ' ' +
                self.msmes_df['business_type'].fillna('') + ' ' +
                self.msmes_df['description'].fillna('') + ' ' +
                self.msmes_df['services'].fillna('') + ' ' +
                self.msmes_df['products'].fillna('')
            )
            
            # Create TF-IDF features
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
            self.content_features = self.tfidf_vectorizer.fit_transform(
                self.msmes_df['combined_text']
            )
            
            # Create categorical features
            categorical_features = pd.get_dummies(
                self.msmes_df[['industry_category', 'state', 'business_type']]
            )
            
            # Normalize numerical features
            numerical_features = self.msmes_df[['annual_turnover', 'employee_count']].fillna(0)
            numerical_features = (numerical_features - numerical_features.mean()) / numerical_features.std()
            
            logger.info(f"Prepared content features: {self.content_features.shape}")
            
        except Exception as e:
            logger.error(f"Failed to prepare content features: {e}")
            raise

    async def train_models(self):
        """Train all recommendation models"""
        try:
            # Train collaborative filtering models
            await self.train_collaborative_filtering()
            
            # Train content-based model
            await self.train_content_based()
            
            # Train matrix factorization model
            await self.train_matrix_factorization()
            
            logger.info("All models trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train models: {e}")
            raise

    async def train_collaborative_filtering(self):
        """Train KNN models for collaborative filtering"""
        try:
            if self.user_item_matrix is not None and not self.user_item_matrix.empty:
                # User-based collaborative filtering
                self.user_knn_model = NearestNeighbors(
                    n_neighbors=min(self.n_neighbors, len(self.user_item_matrix)),
                    metric='cosine',
                    algorithm='brute'
                )
                self.user_knn_model.fit(self.user_item_matrix.values)
                
                # Item-based collaborative filtering
                self.item_knn_model = NearestNeighbors(
                    n_neighbors=min(self.n_neighbors, len(self.user_item_matrix.columns)),
                    metric='cosine',
                    algorithm='brute'
                )
                self.item_knn_model.fit(self.user_item_matrix.T.values)
                
                logger.info("Collaborative filtering models trained")
            
        except Exception as e:
            logger.error(f"Failed to train collaborative filtering: {e}")

    async def train_content_based(self):
        """Train content-based recommendation model"""
        try:
            if self.content_features is not None:
                # Calculate content similarity matrix
                self.content_similarity = cosine_similarity(self.content_features)
                logger.info("Content-based model trained")
            
        except Exception as e:
            logger.error(f"Failed to train content-based model: {e}")

    async def train_matrix_factorization(self):
        """Train matrix factorization model using ALS"""
        try:
            if self.user_item_sparse is not None:
                # Use implicit library for ALS
                self.matrix_factorization_model = implicit.als.AlternatingLeastSquares(
                    factors=self.n_factors,
                    regularization=0.1,
                    iterations=20
                )
                
                # Train the model
                self.matrix_factorization_model.fit(self.user_item_sparse)
                logger.info("Matrix factorization model trained")
            
        except Exception as e:
            logger.error(f"Failed to train matrix factorization: {e}")

    async def get_collaborative_recommendations(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Get recommendations using collaborative filtering"""
        try:
            if self.user_knn_model is None or user_id not in self.user_item_matrix.index:
                return []
            
            # Get user vector
            user_idx = self.user_item_matrix.index.get_loc(user_id)
            user_vector = self.user_item_matrix.iloc[user_idx].values.reshape(1, -1)
            
            # Find similar users
            distances, indices = self.user_knn_model.kneighbors(user_vector)
            
            # Get recommendations from similar users
            recommendations = {}
            user_items = set(self.user_item_matrix.columns[self.user_item_matrix.iloc[user_idx] > 0])
            
            for idx in indices[0][1:]:  # Skip self
                similar_user_items = self.user_item_matrix.iloc[idx]
                for item_id, rating in similar_user_items.items():
                    if rating > 0 and item_id not in user_items:
                        if item_id not in recommendations:
                            recommendations[item_id] = 0
                        recommendations[item_id] += rating * (1 / (1 + distances[0][list(indices[0]).index(idx)]))
            
            # Sort and return top recommendations
            sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            # Get item details
            result = []
            for item_id, score in sorted_recs:
                item_data = await self.get_item_details(item_id)
                if item_data:
                    result.append({
                        'item_id': item_id,
                        'score': float(score),
                        'details': item_data
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Collaborative filtering error: {e}")
            return []

    async def get_content_based_recommendations(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Get recommendations using content-based filtering"""
        try:
            if self.content_similarity is None:
                return []
            
            # Get user's interaction history
            user_interactions = self.interactions_df[self.interactions_df['user_id'] == user_id]
            
            if user_interactions.empty:
                return await self.get_popular_recommendations(limit)
            
            # Get user's preferred items
            user_items = user_interactions['item_id'].tolist()
            
            # Calculate content-based scores
            recommendations = {}
            for item_id in user_items:
                if item_id in self.msmes_df['id'].values:
                    item_idx = self.msmes_df[self.msmes_df['id'] == item_id].index[0]
                    similarities = self.content_similarity[item_idx]
                    
                    for idx, similarity in enumerate(similarities):
                        candidate_id = self.msmes_df.iloc[idx]['id']
                        if candidate_id not in user_items and similarity > 0.1:
                            if candidate_id not in recommendations:
                                recommendations[candidate_id] = 0
                            recommendations[candidate_id] += similarity
            
            # Sort and return top recommendations
            sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            # Get item details
            result = []
            for item_id, score in sorted_recs:
                item_data = await self.get_item_details(item_id)
                if item_data:
                    result.append({
                        'item_id': item_id,
                        'score': float(score),
                        'details': item_data
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Content-based filtering error: {e}")
            return []

    async def get_matrix_factorization_recommendations(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Get recommendations using matrix factorization (ALS)"""
        try:
            if self.matrix_factorization_model is None or user_id not in self.user_item_matrix.index:
                return []
            
            user_idx = self.user_item_matrix.index.get_loc(user_id)
            
            # Get recommendations
            recommendations = self.matrix_factorization_model.recommend(
                user_idx, 
                self.user_item_sparse[user_idx], 
                N=limit,
                filter_already_liked_items=True
            )
            
            # Convert to result format
            result = []
            for item_idx, score in recommendations:
                item_id = self.user_item_matrix.columns[item_idx]
                item_data = await self.get_item_details(item_id)
                if item_data:
                    result.append({
                        'item_id': item_id,
                        'score': float(score),
                        'details': item_data
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Matrix factorization error: {e}")
            return []

    async def get_hybrid_recommendations(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Get hybrid recommendations combining multiple approaches"""
        try:
            # Get recommendations from different algorithms
            collab_recs = await self.get_collaborative_recommendations(user_id, limit * 2)
            content_recs = await self.get_content_based_recommendations(user_id, limit * 2)
            mf_recs = await self.get_matrix_factorization_recommendations(user_id, limit * 2)
            
            # Combine scores with weights
            weights = {'collaborative': 0.4, 'content': 0.3, 'matrix_factorization': 0.3}
            
            combined_scores = {}
            
            # Add collaborative filtering scores
            for rec in collab_recs:
                item_id = rec['item_id']
                combined_scores[item_id] = weights['collaborative'] * rec['score']
            
            # Add content-based scores
            for rec in content_recs:
                item_id = rec['item_id']
                if item_id in combined_scores:
                    combined_scores[item_id] += weights['content'] * rec['score']
                else:
                    combined_scores[item_id] = weights['content'] * rec['score']
            
            # Add matrix factorization scores
            for rec in mf_recs:
                item_id = rec['item_id']
                if item_id in combined_scores:
                    combined_scores[item_id] += weights['matrix_factorization'] * rec['score']
                else:
                    combined_scores[item_id] = weights['matrix_factorization'] * rec['score']
            
            # Sort and get top recommendations
            sorted_recs = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            # Get item details
            result = []
            for item_id, score in sorted_recs:
                item_data = await self.get_item_details(item_id)
                if item_data:
                    result.append({
                        'item_id': item_id,
                        'score': float(score),
                        'details': item_data
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Hybrid recommendations error: {e}")
            return await self.get_popular_recommendations(limit)

    async def get_popular_recommendations(self, limit: int = 10) -> List[Dict]:
        """Get popular items as fallback recommendations"""
        try:
            # Get most popular items based on interactions
            popular_items = (
                self.interactions_df
                .groupby('item_id')
                .agg({'final_score': 'sum', 'user_id': 'nunique'})
                .reset_index()
            )
            
            # Calculate popularity score
            popular_items['popularity_score'] = (
                popular_items['final_score'] * 0.7 + 
                popular_items['user_id'] * 0.3
            )
            
            # Sort by popularity
            popular_items = popular_items.sort_values('popularity_score', ascending=False).head(limit)
            
            # Get item details
            result = []
            for _, item in popular_items.iterrows():
                item_data = await self.get_item_details(item['item_id'])
                if item_data:
                    result.append({
                        'item_id': item['item_id'],
                        'score': float(item['popularity_score']),
                        'details': item_data
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Popular recommendations error: {e}")
            return []

    async def get_item_details(self, item_id: int) -> Optional[Dict]:
        """Get detailed information about an item"""
        try:
            # Check cache first
            cache_key = f"item_details:{item_id}"
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            # Get from database
            async with self.db_pool.acquire() as conn:
                query = """
                    SELECT id, company_name, industry_category, state, city,
                           annual_turnover, employee_count, business_type,
                           description, contact_email, website, rating
                    FROM msmes WHERE id = $1 AND status = 'active'
                """
                result = await conn.fetchrow(query, item_id)
                
                if result:
                    item_data = dict(result)
                    # Cache the result
                    self.redis_client.setex(cache_key, self.cache_ttl, json.dumps(item_data, default=str))
                    return item_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting item details: {e}")
            return None

    async def record_feedback(self, feedback: FeedbackData):
        """Record user feedback for model improvement"""
        try:
            async with self.db_pool.acquire() as conn:
                # Insert feedback into database
                await conn.execute("""
                    INSERT INTO user_interactions 
                    (user_id, item_id, item_type, interaction_type, rating, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, 
                feedback.user_id, 
                feedback.item_id, 
                feedback.item_type,
                feedback.feedback_type,
                feedback.rating,
                feedback.timestamp or datetime.now()
                )
                
                # Update recommendation cache
                await self.invalidate_user_cache(feedback.user_id)
                
                logger.info(f"Recorded feedback for user {feedback.user_id}, item {feedback.item_id}")
                
        except Exception as e:
            logger.error(f"Error recording feedback: {e}")

    async def invalidate_user_cache(self, user_id: int):
        """Invalidate cached recommendations for a user"""
        try:
            pattern = f"recommendations:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")

    def get_recommendation_explanation(self, user_id: int, recommendations: List[Dict], algorithm: str) -> Dict:
        """Generate explanation for recommendations"""
        try:
            explanation = {
                'algorithm': algorithm,
                'factors': [],
                'user_profile': {},
                'confidence': 0.0
            }
            
            if algorithm == 'collaborative':
                explanation['factors'].append("Based on users with similar preferences")
                explanation['confidence'] = 0.8
            elif algorithm == 'content':
                explanation['factors'].append("Based on your previous interactions and item features")
                explanation['confidence'] = 0.7
            elif algorithm == 'matrix_factorization':
                explanation['factors'].append("Based on latent factors in your behavior")
                explanation['confidence'] = 0.75
            elif algorithm == 'hybrid':
                explanation['factors'].append("Combined multiple recommendation techniques")
                explanation['confidence'] = 0.85
            else:
                explanation['factors'].append("Based on popular items")
                explanation['confidence'] = 0.5
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating explanation: {e}")
            return {'algorithm': algorithm, 'factors': [], 'confidence': 0.0}

# Initialize recommendation engine
recommendation_engine = RecommendationEngine()

@app.on_event("startup")
async def startup_event():
    await recommendation_engine.initialize()

@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get personalized recommendations for a user"""
    try:
        recommendation_requests.labels(type=request.request_type).inc()
        
        with recommendation_latency.time():
            # Check cache first
            cache_key = f"recommendations:{request.user_id}:{request.request_type}:{request.limit}"
            cached_result = recommendation_engine.redis_client.get(cache_key)
            
            if cached_result:
                return RecommendationResponse.parse_raw(cached_result)
            
            # Determine recommendation algorithm based on user data availability
            user_interactions = recommendation_engine.interactions_df[
                recommendation_engine.interactions_df['user_id'] == request.user_id
            ]
            
            if len(user_interactions) >= 5:
                # Use hybrid approach for users with sufficient data
                recommendations = await recommendation_engine.get_hybrid_recommendations(
                    request.user_id, request.limit
                )
                algorithm_used = "hybrid"
            elif len(user_interactions) >= 2:
                # Use content-based for users with some data
                recommendations = await recommendation_engine.get_content_based_recommendations(
                    request.user_id, request.limit
                )
                algorithm_used = "content_based"
            else:
                # Use popular items for new users
                recommendations = await recommendation_engine.get_popular_recommendations(request.limit)
                algorithm_used = "popular"
            
            # Filter out excluded items
            if request.exclude_ids:
                recommendations = [
                    rec for rec in recommendations 
                    if rec['item_id'] not in request.exclude_ids
                ]
            
            # Extract confidence scores
            confidence_scores = [rec['score'] for rec in recommendations]
            
            # Generate explanation
            explanation = recommendation_engine.get_recommendation_explanation(
                request.user_id, recommendations, algorithm_used
            )
            
            # Create response
            response = RecommendationResponse(
                recommendations=recommendations,
                algorithm_used=algorithm_used,
                confidence_scores=confidence_scores,
                explanation=explanation,
                timestamp=datetime.now()
            )
            
            # Cache the result
            recommendation_engine.redis_client.setex(
                cache_key, 
                recommendation_engine.cache_ttl, 
                response.json()
            )
            
            return response
            
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

@app.post("/api/recommendations/feedback")
async def record_feedback(feedback: FeedbackData, background_tasks: BackgroundTasks):
    """Record user feedback for recommendation improvement"""
    try:
        background_tasks.add_task(recommendation_engine.record_feedback, feedback)
        return {"status": "success", "message": "Feedback recorded"}
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        raise HTTPException(status_code=500, detail="Failed to record feedback")

@app.get("/api/recommendations/similar/{item_id}")
async def get_similar_items(item_id: int, limit: int = 10):
    """Get items similar to a specific item"""
    try:
        if recommendation_engine.content_similarity is None:
            raise HTTPException(status_code=503, detail="Content model not available")
        
        # Find item index
        item_row = recommendation_engine.msmes_df[recommendation_engine.msmes_df['id'] == item_id]
        if item_row.empty:
            raise HTTPException(status_code=404, detail="Item not found")
        
        item_idx = item_row.index[0]
        similarities = recommendation_engine.content_similarity[item_idx]
        
        # Get top similar items
        similar_indices = np.argsort(similarities)[::-1][1:limit+1]  # Exclude self
        
        recommendations = []
        for idx in similar_indices:
            similar_item_id = recommendation_engine.msmes_df.iloc[idx]['id']
            item_data = await recommendation_engine.get_item_details(similar_item_id)
            if item_data:
                recommendations.append({
                    'item_id': similar_item_id,
                    'score': float(similarities[idx]),
                    'details': item_data
                })
        
        return {
            "similar_items": recommendations,
            "algorithm": "content_based_similarity"
        }
        
    except Exception as e:
        logger.error(f"Similar items error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get similar items")

@app.post("/api/recommendations/retrain")
async def trigger_model_retrain(background_tasks: BackgroundTasks):
    """Trigger model retraining (admin only)"""
    try:
        background_tasks.add_task(retrain_models)
        return {"status": "success", "message": "Model retraining triggered"}
    except Exception as e:
        logger.error(f"Retrain error: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger retraining")

async def retrain_models():
    """Background task to retrain recommendation models"""
    try:
        logger.info("Starting model retraining...")
        await recommendation_engine.load_data()
        await recommendation_engine.train_models()
        logger.info("Model retraining completed")
    except Exception as e:
        logger.error(f"Model retraining failed: {e}")

@app.get("/api/recommendations/stats")
async def get_recommendation_stats():
    """Get recommendation engine statistics"""
    try:
        stats = {
            "total_users": len(recommendation_engine.user_item_matrix.index) if recommendation_engine.user_item_matrix is not None else 0,
            "total_items": len(recommendation_engine.msmes_df),
            "total_interactions": len(recommendation_engine.interactions_df),
            "models_trained": {
                "collaborative": recommendation_engine.user_knn_model is not None,
                "content_based": recommendation_engine.content_similarity is not None,
                "matrix_factorization": recommendation_engine.matrix_factorization_model is not None
            },
            "cache_size": recommendation_engine.redis_client.dbsize(),
            "last_updated": datetime.now().isoformat()
        }
        return stats
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get stats")

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)