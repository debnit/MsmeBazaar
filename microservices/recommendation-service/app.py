"""
MSMEBazaar v2.0 - Advanced Recommendation Engine
Features:
- Collaborative Filtering (User-Based & Item-Based)
- Content-Based Filtering with TF-IDF
- Matrix Factorization using ALS (Alternating Least Squares)
- KNN-based recommendations
- Hybrid recommendation system
- Real-time user feedback integration
- Cold start problem handling
- Performance optimization with caching
"""

import asyncio
import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
import json
import redis
from sklearn.neighbors import NearestNeighbors
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from scipy.sparse import csr_matrix
from scipy.spatial.distance import cosine
import implicit
import joblib
import asyncpg
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import logging
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
recommendation_requests = Counter('recommendation_requests_total', 'Total recommendation requests', ['recommendation_type'])
recommendation_latency = Histogram('recommendation_latency_seconds', 'Recommendation response time')
recommendation_accuracy = Gauge('recommendation_accuracy', 'Recommendation accuracy score')
user_feedback_count = Counter('user_feedback_total', 'Total user feedback', ['feedback_type'])

app = FastAPI(title="MSMEBazaar Recommendation Engine", version="2.0.0")

# Pydantic Models
class UserPreferences(BaseModel):
    user_id: int
    industry_preferences: List[str] = []
    budget_range: Dict[str, float] = {}
    location_preferences: List[str] = []
    quality_requirements: List[str] = []
    delivery_preferences: Dict[str, Any] = {}

class RecommendationRequest(BaseModel):
    user_id: int
    entity_type: str = Field(..., regex="^(msme|product|service|buyer|investor)$")
    recommendation_type: str = Field(..., regex="^(collaborative|content_based|hybrid|similar_users)$")
    limit: int = Field(10, ge=1, le=50)
    filters: Dict = {}
    context: Dict = {}  # Current session context

class RecommendationItem(BaseModel):
    item_id: int
    item_type: str
    title: str
    description: str
    score: float
    confidence: float
    reasons: List[str]
    metadata: Dict
    rank: int

class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]
    algorithm_used: str
    personalization_score: float
    diversity_score: float
    novelty_score: float
    timestamp: datetime
    user_context: Dict

class UserFeedback(BaseModel):
    user_id: int
    item_id: int
    item_type: str
    feedback_type: str = Field(..., regex="^(like|dislike|click|view|purchase|bookmark|share|ignore)$")
    explicit_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    implicit_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    session_id: Optional[str] = None
    context: Dict = {}

class RecommendationEngine:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.db_pool = None
        
        # ML Models
        self.user_knn_model = None
        self.item_knn_model = None
        self.als_model = None
        self.content_vectorizer = None
        self.content_features = None
        
        # Data matrices
        self.user_item_matrix = None
        self.item_content_matrix = None
        self.user_profiles = {}
        self.item_profiles = {}
        
        # Scalers
        self.feature_scaler = StandardScaler()
        self.rating_scaler = MinMaxScaler()
        
        # Configuration
        self.min_interactions = 5
        self.cache_ttl = 3600  # 1 hour
        self.diversity_weight = 0.3
        self.novelty_weight = 0.2
        
        # Cold start thresholds
        self.new_user_threshold = 3  # interactions
        self.new_item_threshold = 5  # interactions

    async def initialize(self):
        """Initialize database connection and load data"""
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
            
            # Load data and train models
            await self.load_interaction_data()
            await self.load_content_data()
            await self.train_models()
            
            logger.info("Recommendation engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize recommendation engine: {e}")
            raise

    async def load_interaction_data(self):
        """Load user-item interaction data"""
        try:
            async with self.db_pool.acquire() as conn:
                # Load transaction data
                interaction_query = """
                    SELECT 
                        COALESCE(t.buyer_id, t.investor_id) as user_id,
                        t.msme_id as item_id,
                        'msme' as item_type,
                        CASE 
                            WHEN t.status IN ('completed', 'delivered') THEN 5.0
                            WHEN t.status IN ('in_progress', 'approved') THEN 4.0
                            WHEN t.status IN ('negotiating', 'under_review') THEN 3.0
                            ELSE 2.0
                        END as rating,
                        t.amount,
                        t.created_at,
                        t.satisfaction_rating
                    FROM transactions t
                    WHERE t.created_at >= NOW() - INTERVAL '2 years'
                    AND (t.buyer_id IS NOT NULL OR t.investor_id IS NOT NULL)
                    
                    UNION ALL
                    
                    SELECT 
                        mi.user_id,
                        mi.matched_entity_id as item_id,
                        mi.matched_entity_type as item_type,
                        CASE mi.interaction_type
                            WHEN 'purchase' THEN 5.0
                            WHEN 'contact' THEN 4.0
                            WHEN 'save' THEN 3.0
                            WHEN 'click' THEN 2.0
                            WHEN 'view' THEN 1.0
                            ELSE 1.0
                        END as rating,
                        NULL as amount,
                        mi.created_at,
                        NULL as satisfaction_rating
                    FROM match_interactions mi
                    WHERE mi.created_at >= NOW() - INTERVAL '6 months'
                    
                    UNION ALL
                    
                    SELECT 
                        uf.user_id,
                        uf.item_id,
                        uf.item_type,
                        COALESCE(uf.explicit_rating, uf.implicit_score * 5) as rating,
                        NULL as amount,
                        uf.created_at,
                        uf.explicit_rating as satisfaction_rating
                    FROM user_feedback uf
                    WHERE uf.created_at >= NOW() - INTERVAL '1 year'
                """
                
                interactions = await conn.fetch(interaction_query)
                
                # Convert to DataFrame
                self.interactions_df = pd.DataFrame([
                    {
                        'user_id': row['user_id'],
                        'item_id': row['item_id'],
                        'item_type': row['item_type'],
                        'rating': float(row['rating']),
                        'amount': float(row['amount']) if row['amount'] else 0,
                        'timestamp': row['created_at']
                    }
                    for row in interactions if row['user_id'] and row['item_id']
                ])
                
                if not self.interactions_df.empty:
                    # Filter users and items with minimum interactions
                    user_counts = self.interactions_df['user_id'].value_counts()
                    item_counts = self.interactions_df['item_id'].value_counts()
                    
                    valid_users = user_counts[user_counts >= self.min_interactions].index
                    valid_items = item_counts[item_counts >= self.min_interactions].index
                    
                    self.interactions_df = self.interactions_df[
                        (self.interactions_df['user_id'].isin(valid_users)) &
                        (self.interactions_df['item_id'].isin(valid_items))
                    ]
                    
                    # Create user-item matrix
                    self.user_item_matrix = self.interactions_df.pivot_table(
                        index='user_id',
                        columns='item_id',
                        values='rating',
                        fill_value=0
                    )
                    
                    logger.info(f"Loaded {len(self.interactions_df)} interactions for {len(valid_users)} users and {len(valid_items)} items")
                else:
                    logger.warning("No interaction data found")
                    self.interactions_df = pd.DataFrame()
                    self.user_item_matrix = pd.DataFrame()
                    
        except Exception as e:
            logger.error(f"Failed to load interaction data: {e}")
            raise

    async def load_content_data(self):
        """Load content features for items"""
        try:
            async with self.db_pool.acquire() as conn:
                # Load MSME content features
                msme_query = """
                    SELECT 
                        m.id,
                        m.company_name,
                        m.industry_category,
                        m.business_type,
                        m.annual_turnover,
                        m.employee_count,
                        m.state,
                        m.city,
                        m.year_of_establishment,
                        m.is_exporter,
                        COALESCE(m.certifications, '[]') as certifications,
                        COALESCE(m.services, '[]') as services,
                        COALESCE(m.products, '[]') as products,
                        COALESCE(m.target_market, '[]') as target_market,
                        m.growth_stage,
                        m.technology_adoption_level
                    FROM msmes m
                    WHERE m.status = 'active' AND m.verified = true
                """
                
                msme_results = await conn.fetch(msme_query)
                
                # Convert to DataFrame
                self.content_df = pd.DataFrame([
                    {
                        'item_id': row['id'],
                        'item_type': 'msme',
                        'title': row['company_name'],
                        'industry': row['industry_category'],
                        'business_type': row['business_type'],
                        'annual_turnover': float(row['annual_turnover'] or 0),
                        'employee_count': int(row['employee_count'] or 0),
                        'location': f"{row['city']} {row['state']}",
                        'establishment_year': row['year_of_establishment'],
                        'is_exporter': row['is_exporter'] or False,
                        'certifications': json.loads(row['certifications']),
                        'services': json.loads(row['services']),
                        'products': json.loads(row['products']),
                        'target_market': json.loads(row['target_market']),
                        'growth_stage': row['growth_stage'],
                        'tech_level': row['technology_adoption_level']
                    }
                    for row in msme_results
                ])
                
                if not self.content_df.empty:
                    # Create content features
                    await self.create_content_features()
                    logger.info(f"Loaded content features for {len(self.content_df)} items")
                else:
                    logger.warning("No content data found")
                    
        except Exception as e:
            logger.error(f"Failed to load content data: {e}")
            raise

    async def create_content_features(self):
        """Create content-based features using TF-IDF and other techniques"""
        try:
            # Create text features
            text_features = []
            for _, row in self.content_df.iterrows():
                # Combine textual information
                text_content = []
                text_content.append(row['industry'])
                text_content.append(row['business_type'])
                text_content.append(row['location'])
                text_content.append(row['growth_stage'] or '')
                text_content.append(row['tech_level'] or '')
                
                # Add services and products
                if row['services']:
                    text_content.extend(row['services'])
                if row['products']:
                    text_content.extend(row['products'])
                if row['certifications']:
                    text_content.extend(row['certifications'])
                if row['target_market']:
                    text_content.extend(row['target_market'])
                
                text_features.append(' '.join(filter(None, text_content)))
            
            # Create TF-IDF vectors
            self.content_vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=2
            )
            
            if text_features:
                tfidf_matrix = self.content_vectorizer.fit_transform(text_features)
                
                # Create numerical features
                numerical_features = []
                for _, row in self.content_df.iterrows():
                    features = [
                        np.log1p(row['annual_turnover']),  # Log transform
                        np.log1p(row['employee_count']),
                        (datetime.now().year - row['establishment_year']) if row['establishment_year'] else 0,
                        1 if row['is_exporter'] else 0,
                        len(row['certifications']) if row['certifications'] else 0,
                        len(row['services']) if row['services'] else 0,
                        len(row['products']) if row['products'] else 0,
                        len(row['target_market']) if row['target_market'] else 0
                    ]
                    numerical_features.append(features)
                
                # Scale numerical features
                numerical_features_scaled = self.feature_scaler.fit_transform(numerical_features)
                
                # Combine TF-IDF and numerical features
                from scipy.sparse import hstack
                self.item_content_matrix = hstack([
                    tfidf_matrix,
                    csr_matrix(numerical_features_scaled)
                ])
                
                logger.info(f"Created content features matrix: {self.item_content_matrix.shape}")
            else:
                logger.warning("No text features found for content-based filtering")
                
        except Exception as e:
            logger.error(f"Failed to create content features: {e}")
            raise

    async def train_models(self):
        """Train recommendation models"""
        try:
            if self.user_item_matrix is not None and not self.user_item_matrix.empty:
                # Train User-Based KNN
                self.user_knn_model = NearestNeighbors(
                    n_neighbors=20,
                    algorithm='auto',
                    metric='cosine'
                )
                
                # Convert to sparse matrix for efficiency
                user_item_sparse = csr_matrix(self.user_item_matrix.values)
                
                if user_item_sparse.shape[0] > 0:
                    self.user_knn_model.fit(user_item_sparse)
                    
                    # Train Item-Based KNN
                    self.item_knn_model = NearestNeighbors(
                        n_neighbors=20,
                        algorithm='auto',
                        metric='cosine'
                    )
                    self.item_knn_model.fit(user_item_sparse.T)  # Transpose for item-based
                    
                    # Train ALS Model
                    self.als_model = implicit.als.AlternatingLeastSquares(
                        factors=50,
                        regularization=0.1,
                        iterations=20,
                        random_state=42
                    )
                    
                    # Convert ratings to implicit feedback (binary)
                    implicit_matrix = (user_item_sparse > 0).astype(np.float32)
                    self.als_model.fit(implicit_matrix)
                    
                    logger.info("Trained collaborative filtering models successfully")
                else:
                    logger.warning("Insufficient data to train collaborative models")
            else:
                logger.warning("No user-item matrix available for training")
                
        except Exception as e:
            logger.error(f"Failed to train models: {e}")
            raise

    async def get_collaborative_recommendations(self, user_id: int, limit: int = 10) -> List[RecommendationItem]:
        """Get recommendations using collaborative filtering"""
        try:
            recommendations = []
            
            if (self.user_knn_model is None or 
                self.user_item_matrix is None or 
                user_id not in self.user_item_matrix.index):
                return await self.get_cold_start_recommendations(user_id, limit)
            
            # Get user vector
            user_vector = self.user_item_matrix.loc[user_id].values.reshape(1, -1)
            
            # Find similar users
            distances, indices = self.user_knn_model.kneighbors(user_vector, n_neighbors=min(20, len(self.user_item_matrix)))
            
            # Get items from similar users
            similar_users = self.user_item_matrix.index[indices[0][1:]]  # Exclude self
            item_scores = {}
            
            for sim_user_idx, sim_user in enumerate(similar_users):
                similarity = 1 / (1 + distances[0][sim_user_idx + 1])  # Convert distance to similarity
                
                user_ratings = self.user_item_matrix.loc[sim_user]
                unrated_items = user_ratings[user_ratings > 0].index
                
                # Remove items already rated by target user
                target_user_items = set(self.user_item_matrix.loc[user_id][self.user_item_matrix.loc[user_id] > 0].index)
                unrated_items = [item for item in unrated_items if item not in target_user_items]
                
                for item in unrated_items:
                    if item not in item_scores:
                        item_scores[item] = 0
                    item_scores[item] += similarity * user_ratings[item]
            
            # Sort and get top recommendations
            sorted_items = sorted(item_scores.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            for rank, (item_id, score) in enumerate(sorted_items):
                # Get item details
                item_details = await self.get_item_details(item_id, 'msme')
                
                if item_details:
                    recommendations.append(RecommendationItem(
                        item_id=item_id,
                        item_type='msme',
                        title=item_details.get('title', f'MSME {item_id}'),
                        description=item_details.get('description', ''),
                        score=float(score),
                        confidence=min(0.9, score / max(item_scores.values()) if item_scores else 0),
                        reasons=['Similar users liked this', 'Collaborative filtering match'],
                        metadata=item_details,
                        rank=rank + 1
                    ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in collaborative recommendations: {e}")
            return []

    async def get_content_based_recommendations(self, user_id: int, limit: int = 10) -> List[RecommendationItem]:
        """Get recommendations using content-based filtering"""
        try:
            if self.item_content_matrix is None:
                return await self.get_cold_start_recommendations(user_id, limit)
            
            # Get user's interaction history
            user_interactions = await self.get_user_interaction_history(user_id)
            
            if not user_interactions:
                return await self.get_cold_start_recommendations(user_id, limit)
            
            # Create user profile based on liked items
            liked_items = [item['item_id'] for item in user_interactions if item['rating'] >= 3.0]
            
            if not liked_items:
                return await self.get_cold_start_recommendations(user_id, limit)
            
            # Get indices of liked items
            item_indices = []
            for item_id in liked_items:
                if item_id in self.content_df['item_id'].values:
                    idx = self.content_df[self.content_df['item_id'] == item_id].index[0]
                    item_indices.append(idx)
            
            if not item_indices:
                return await self.get_cold_start_recommendations(user_id, limit)
            
            # Create user profile by averaging liked item features
            user_profile = np.mean(self.item_content_matrix[item_indices], axis=0)
            
            # Calculate similarity with all items
            similarities = cosine_similarity(user_profile.reshape(1, -1), self.item_content_matrix)[0]
            
            # Get top similar items (excluding already interacted items)
            interacted_items = set([item['item_id'] for item in user_interactions])
            
            recommendations = []
            item_similarity_pairs = []
            
            for idx, similarity in enumerate(similarities):
                item_id = self.content_df.iloc[idx]['item_id']
                if item_id not in interacted_items:
                    item_similarity_pairs.append((item_id, similarity, idx))
            
            # Sort by similarity
            item_similarity_pairs.sort(key=lambda x: x[1], reverse=True)
            
            for rank, (item_id, similarity, idx) in enumerate(item_similarity_pairs[:limit]):
                item_details = await self.get_item_details(item_id, 'msme')
                
                if item_details:
                    # Generate content-based reasons
                    reasons = await self.generate_content_reasons(item_id, liked_items)
                    
                    recommendations.append(RecommendationItem(
                        item_id=item_id,
                        item_type='msme',
                        title=item_details.get('title', f'MSME {item_id}'),
                        description=item_details.get('description', ''),
                        score=float(similarity),
                        confidence=min(0.9, similarity),
                        reasons=reasons,
                        metadata=item_details,
                        rank=rank + 1
                    ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in content-based recommendations: {e}")
            return []

    async def get_hybrid_recommendations(self, user_id: int, limit: int = 10) -> List[RecommendationItem]:
        """Get recommendations using hybrid approach"""
        try:
            # Get recommendations from both approaches
            collaborative_recs = await self.get_collaborative_recommendations(user_id, limit * 2)
            content_recs = await self.get_content_based_recommendations(user_id, limit * 2)
            
            # Combine and re-rank
            all_recommendations = {}
            
            # Add collaborative recommendations with weight
            for rec in collaborative_recs:
                all_recommendations[rec.item_id] = {
                    'item': rec,
                    'collaborative_score': rec.score,
                    'content_score': 0,
                    'reasons': set(rec.reasons)
                }
            
            # Add content-based recommendations with weight
            for rec in content_recs:
                if rec.item_id in all_recommendations:
                    all_recommendations[rec.item_id]['content_score'] = rec.score
                    all_recommendations[rec.item_id]['reasons'].update(rec.reasons)
                else:
                    all_recommendations[rec.item_id] = {
                        'item': rec,
                        'collaborative_score': 0,
                        'content_score': rec.score,
                        'reasons': set(rec.reasons)
                    }
            
            # Calculate hybrid scores
            for item_id, data in all_recommendations.items():
                # Weighted combination
                hybrid_score = (0.6 * data['collaborative_score'] + 
                               0.4 * data['content_score'])
                
                # Apply diversity and novelty bonuses
                diversity_bonus = await self.calculate_diversity_bonus(item_id, user_id)
                novelty_bonus = await self.calculate_novelty_bonus(item_id, user_id)
                
                final_score = hybrid_score + (self.diversity_weight * diversity_bonus) + (self.novelty_weight * novelty_bonus)
                
                data['final_score'] = final_score
                data['item'].score = final_score
                data['item'].reasons = list(data['reasons'])
            
            # Sort by final score and return top recommendations
            sorted_recs = sorted(
                all_recommendations.values(),
                key=lambda x: x['final_score'],
                reverse=True
            )[:limit]
            
            # Update ranks
            for rank, rec_data in enumerate(sorted_recs):
                rec_data['item'].rank = rank + 1
            
            return [rec_data['item'] for rec_data in sorted_recs]
            
        except Exception as e:
            logger.error(f"Error in hybrid recommendations: {e}")
            return []

    async def get_cold_start_recommendations(self, user_id: int, limit: int = 10) -> List[RecommendationItem]:
        """Handle cold start problem for new users"""
        try:
            # Get popular items (most interactions)
            if not self.interactions_df.empty:
                popular_items = (self.interactions_df
                               .groupby('item_id')
                               .agg({
                                   'rating': ['count', 'mean'],
                                   'user_id': 'nunique'
                               })
                               .round(2))
                
                popular_items.columns = ['interaction_count', 'avg_rating', 'unique_users']
                popular_items = popular_items.sort_values(['interaction_count', 'avg_rating'], ascending=False)
                
                recommendations = []
                for rank, (item_id, stats) in enumerate(popular_items.head(limit).iterrows()):
                    item_details = await self.get_item_details(item_id, 'msme')
                    
                    if item_details:
                        recommendations.append(RecommendationItem(
                            item_id=item_id,
                            item_type='msme',
                            title=item_details.get('title', f'MSME {item_id}'),
                            description=item_details.get('description', ''),
                            score=float(stats['avg_rating']),
                            confidence=0.5,  # Lower confidence for cold start
                            reasons=['Popular choice', 'Highly rated by other users'],
                            metadata=item_details,
                            rank=rank + 1
                        ))
                
                return recommendations
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error in cold start recommendations: {e}")
            return []

    async def get_similar_users_recommendations(self, user_id: int, limit: int = 10) -> List[RecommendationItem]:
        """Get recommendations based on similar users using ALS"""
        try:
            if self.als_model is None or user_id not in self.user_item_matrix.index:
                return await self.get_cold_start_recommendations(user_id, limit)
            
            # Get user index
            user_idx = list(self.user_item_matrix.index).index(user_id)
            
            # Get recommendations from ALS model
            item_ids = list(self.user_item_matrix.columns)
            recommendations_als = self.als_model.recommend(
                user_idx,
                csr_matrix(self.user_item_matrix.values)[user_idx],
                N=limit,
                filter_already_liked_items=True
            )
            
            recommendations = []
            for rank, (item_idx, score) in enumerate(recommendations_als):
                item_id = item_ids[item_idx]
                item_details = await self.get_item_details(item_id, 'msme')
                
                if item_details:
                    recommendations.append(RecommendationItem(
                        item_id=item_id,
                        item_type='msme',
                        title=item_details.get('title', f'MSME {item_id}'),
                        description=item_details.get('description', ''),
                        score=float(score),
                        confidence=min(0.85, score),
                        reasons=['Matrix factorization match', 'Similar user patterns'],
                        metadata=item_details,
                        rank=rank + 1
                    ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in ALS recommendations: {e}")
            return []

    async def get_item_details(self, item_id: int, item_type: str) -> Optional[Dict]:
        """Get detailed information about an item"""
        try:
            async with self.db_pool.acquire() as conn:
                if item_type == 'msme':
                    query = """
                        SELECT m.id, m.company_name, m.industry_category, 
                               m.business_type, m.annual_turnover, m.employee_count,
                               m.state, m.city, m.description, m.services, m.products
                        FROM msmes m
                        WHERE m.id = $1 AND m.status = 'active'
                    """
                    result = await conn.fetchrow(query, item_id)
                    
                    if result:
                        return {
                            'title': result['company_name'],
                            'description': result['description'] or f"{result['business_type']} company in {result['industry_category']}",
                            'industry': result['industry_category'],
                            'business_type': result['business_type'],
                            'location': f"{result['city']}, {result['state']}",
                            'annual_turnover': result['annual_turnover'],
                            'employee_count': result['employee_count'],
                            'services': json.loads(result['services'] or '[]'),
                            'products': json.loads(result['products'] or '[]')
                        }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting item details: {e}")
            return None

    async def get_user_interaction_history(self, user_id: int) -> List[Dict]:
        """Get user's interaction history"""
        try:
            if not self.interactions_df.empty:
                user_interactions = self.interactions_df[
                    self.interactions_df['user_id'] == user_id
                ].to_dict('records')
                return user_interactions
            return []
            
        except Exception as e:
            logger.error(f"Error getting user history: {e}")
            return []

    async def generate_content_reasons(self, item_id: int, liked_items: List[int]) -> List[str]:
        """Generate explanations for content-based recommendations"""
        try:
            reasons = []
            
            if item_id in self.content_df['item_id'].values and liked_items:
                item_data = self.content_df[self.content_df['item_id'] == item_id].iloc[0]
                
                # Compare with liked items
                for liked_item_id in liked_items[:3]:  # Check top 3 liked items
                    if liked_item_id in self.content_df['item_id'].values:
                        liked_data = self.content_df[self.content_df['item_id'] == liked_item_id].iloc[0]
                        
                        # Check similarity factors
                        if item_data['industry'] == liked_data['industry']:
                            reasons.append(f"Same industry as {liked_data['title']}")
                        
                        if item_data['location'] == liked_data['location']:
                            reasons.append(f"Same location as {liked_data['title']}")
                        
                        # Check service/product overlap
                        item_services = set(item_data['services'] or [])
                        liked_services = set(liked_data['services'] or [])
                        if item_services.intersection(liked_services):
                            reasons.append("Similar services to your preferences")
                        
                        if len(reasons) >= 3:
                            break
                
                # Add general reasons if not enough specific ones
                if len(reasons) < 2:
                    reasons.extend([
                        "Matches your industry preferences",
                        "Similar business characteristics"
                    ])
            
            return reasons[:3]  # Limit to 3 reasons
            
        except Exception as e:
            logger.error(f"Error generating content reasons: {e}")
            return ["Content-based match"]

    async def calculate_diversity_bonus(self, item_id: int, user_id: int) -> float:
        """Calculate diversity bonus for recommendation"""
        try:
            # Get user's interaction history
            user_history = await self.get_user_interaction_history(user_id)
            
            if not user_history:
                return 0.0
            
            # Get industries/categories from user history
            user_industries = set()
            for interaction in user_history:
                item_details = await self.get_item_details(interaction['item_id'], interaction['item_type'])
                if item_details:
                    user_industries.add(item_details.get('industry', ''))
            
            # Check if current item is from a different industry
            item_details = await self.get_item_details(item_id, 'msme')
            if item_details:
                item_industry = item_details.get('industry', '')
                if item_industry not in user_industries:
                    return 0.2  # Diversity bonus
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating diversity bonus: {e}")
            return 0.0

    async def calculate_novelty_bonus(self, item_id: int, user_id: int) -> float:
        """Calculate novelty bonus for recommendation"""
        try:
            # Check if item is new (recent addition or low interaction count)
            if not self.interactions_df.empty:
                item_interactions = self.interactions_df[
                    self.interactions_df['item_id'] == item_id
                ]
                
                if len(item_interactions) < self.new_item_threshold:
                    return 0.15  # Novelty bonus for new items
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating novelty bonus: {e}")
            return 0.0

    async def record_user_feedback(self, feedback: UserFeedback):
        """Record user feedback for model improvement"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO user_feedback 
                    (user_id, item_id, item_type, feedback_type, explicit_rating, 
                     implicit_score, session_id, context, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                feedback.user_id, feedback.item_id, feedback.item_type,
                feedback.feedback_type, feedback.explicit_rating,
                feedback.implicit_score, feedback.session_id,
                json.dumps(feedback.context), datetime.now()
                )
                
                # Update metrics
                user_feedback_count.labels(feedback_type=feedback.feedback_type).inc()
                
                # Trigger model update if enough new feedback
                await self.check_model_update_trigger()
                
        except Exception as e:
            logger.error(f"Error recording feedback: {e}")

    async def check_model_update_trigger(self):
        """Check if models need to be retrained based on new feedback"""
        try:
            # Simple trigger: retrain if we have enough new feedback
            cache_key = "last_model_update"
            last_update = self.redis_client.get(cache_key)
            
            if not last_update:
                # Set initial timestamp
                self.redis_client.setex(cache_key, 86400, datetime.now().isoformat())
                return
            
            # Check if enough time has passed and we have new interactions
            last_update_time = datetime.fromisoformat(last_update)
            hours_since_update = (datetime.now() - last_update_time).total_seconds() / 3600
            
            if hours_since_update >= 6:  # Retrain every 6 hours
                # Queue background task for model retraining
                logger.info("Triggering model retraining due to new feedback")
                await self.retrain_models_background()
                self.redis_client.setex(cache_key, 86400, datetime.now().isoformat())
                
        except Exception as e:
            logger.error(f"Error checking model update trigger: {e}")

    async def retrain_models_background(self):
        """Background task to retrain models"""
        try:
            logger.info("Starting background model retraining...")
            await self.load_interaction_data()
            await self.train_models()
            logger.info("Background model retraining completed")
        except Exception as e:
            logger.error(f"Background model retraining failed: {e}")

# Initialize service
recommendation_engine = RecommendationEngine()

@app.on_event("startup")
async def startup_event():
    await recommendation_engine.initialize()

@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get personalized recommendations for a user"""
    try:
        recommendation_requests.labels(recommendation_type=request.recommendation_type).inc()
        
        with recommendation_latency.time():
            # Check cache first
            cache_key = f"recommendations:{request.user_id}:{request.recommendation_type}:{request.limit}"
            cached_result = recommendation_engine.redis_client.get(cache_key)
            
            if cached_result:
                cached_data = json.loads(cached_result)
                return RecommendationResponse(**cached_data)
            
            # Generate recommendations based on type
            recommendations = []
            algorithm_used = ""
            
            if request.recommendation_type == "collaborative":
                recommendations = await recommendation_engine.get_collaborative_recommendations(
                    request.user_id, request.limit
                )
                algorithm_used = "collaborative_filtering_knn"
                
            elif request.recommendation_type == "content_based":
                recommendations = await recommendation_engine.get_content_based_recommendations(
                    request.user_id, request.limit
                )
                algorithm_used = "content_based_tfidf"
                
            elif request.recommendation_type == "hybrid":
                recommendations = await recommendation_engine.get_hybrid_recommendations(
                    request.user_id, request.limit
                )
                algorithm_used = "hybrid_collaborative_content"
                
            elif request.recommendation_type == "similar_users":
                recommendations = await recommendation_engine.get_similar_users_recommendations(
                    request.user_id, request.limit
                )
                algorithm_used = "matrix_factorization_als"
            
            # Calculate metrics
            personalization_score = len(recommendations) / request.limit if recommendations else 0
            
            # Calculate diversity (unique industries/categories)
            industries = set()
            for rec in recommendations:
                if 'industry' in rec.metadata:
                    industries.add(rec.metadata['industry'])
            diversity_score = len(industries) / len(recommendations) if recommendations else 0
            
            # Calculate novelty (average newness of items)
            novelty_score = sum(1 - (rec.rank - 1) / len(recommendations) for rec in recommendations) / len(recommendations) if recommendations else 0
            
            response = RecommendationResponse(
                recommendations=recommendations,
                algorithm_used=algorithm_used,
                personalization_score=personalization_score,
                diversity_score=diversity_score,
                novelty_score=novelty_score,
                timestamp=datetime.now(),
                user_context=request.context
            )
            
            # Cache result
            recommendation_engine.redis_client.setex(
                cache_key,
                recommendation_engine.cache_ttl,
                response.json()
            )
            
            return response
            
    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")

@app.post("/api/feedback")
async def record_feedback(feedback: UserFeedback):
    """Record user feedback for recommendation improvement"""
    try:
        await recommendation_engine.record_user_feedback(feedback)
        return {"status": "success", "message": "Feedback recorded successfully"}
    except Exception as e:
        logger.error(f"Feedback recording error: {e}")
        raise HTTPException(status_code=500, detail="Failed to record feedback")

@app.get("/api/user_profile/{user_id}")
async def get_user_profile(user_id: int):
    """Get user's recommendation profile and preferences"""
    try:
        # Get user interaction history
        interactions = await recommendation_engine.get_user_interaction_history(user_id)
        
        # Analyze preferences
        industries = {}
        locations = {}
        avg_rating = 0
        
        for interaction in interactions:
            item_details = await recommendation_engine.get_item_details(
                interaction['item_id'], interaction['item_type']
            )
            
            if item_details:
                # Count industries
                industry = item_details.get('industry', 'Unknown')
                industries[industry] = industries.get(industry, 0) + 1
                
                # Count locations
                location = item_details.get('location', 'Unknown')
                locations[location] = locations.get(location, 0) + 1
                
                avg_rating += interaction['rating']
        
        if interactions:
            avg_rating /= len(interactions)
        
        # Sort preferences
        top_industries = sorted(industries.items(), key=lambda x: x[1], reverse=True)[:5]
        top_locations = sorted(locations.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "user_id": user_id,
            "total_interactions": len(interactions),
            "average_rating": round(avg_rating, 2),
            "preferred_industries": top_industries,
            "preferred_locations": top_locations,
            "recommendation_readiness": "ready" if len(interactions) >= recommendation_engine.min_interactions else "cold_start"
        }
        
    except Exception as e:
        logger.error(f"User profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user profile")

@app.post("/api/retrain_models")
async def trigger_model_retraining(background_tasks: BackgroundTasks):
    """Trigger manual model retraining"""
    try:
        background_tasks.add_task(recommendation_engine.retrain_models_background)
        return {"status": "success", "message": "Model retraining triggered"}
    except Exception as e:
        logger.error(f"Retrain trigger error: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger retraining")

@app.get("/api/recommendation_stats")
async def get_recommendation_stats():
    """Get recommendation system statistics"""
    try:
        stats = {
            "total_users": len(recommendation_engine.user_item_matrix.index) if recommendation_engine.user_item_matrix is not None else 0,
            "total_items": len(recommendation_engine.user_item_matrix.columns) if recommendation_engine.user_item_matrix is not None else 0,
            "total_interactions": len(recommendation_engine.interactions_df) if not recommendation_engine.interactions_df.empty else 0,
            "models_trained": {
                "user_knn": recommendation_engine.user_knn_model is not None,
                "item_knn": recommendation_engine.item_knn_model is not None,
                "als": recommendation_engine.als_model is not None,
                "content_vectorizer": recommendation_engine.content_vectorizer is not None
            },
            "cache_size": recommendation_engine.redis_client.dbsize(),
            "content_features_shape": list(recommendation_engine.item_content_matrix.shape) if recommendation_engine.item_content_matrix is not None else [0, 0],
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