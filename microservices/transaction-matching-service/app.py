"""
MSMEBazaar v2.0 - Advanced Transaction Matching Service
Features:
- K-Means clustering for MSME and buyer grouping
- Decision tree and logistic regression for partner filtering
- Multi-criteria matching (industry, size, location, history)
- Real-time matching recommendations
- Performance optimization with caching
- ML model retraining capabilities
"""

import asyncio
import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
import json
import redis
from sklearn.cluster import KMeans
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.decomposition import PCA
import joblib
import asyncpg
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, generate_latest
import logging
from geopy.distance import geodesic
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
matching_requests = Counter('matching_requests_total', 'Total matching requests', ['match_type'])
matching_latency = Histogram('matching_latency_seconds', 'Matching response time')
successful_matches = Counter('successful_matches_total', 'Total successful matches', ['industry'])

app = FastAPI(title="MSMEBazaar Transaction Matching Service", version="2.0.0")

# Pydantic Models
class MSMEProfile(BaseModel):
    id: int
    company_name: str
    industry_category: str
    business_type: str
    annual_turnover: float
    employee_count: int
    location: Dict[str, str]  # {state, city, latitude, longitude}
    establishment_year: int
    exports: bool = False
    certifications: List[str] = []
    services: List[str] = []
    products: List[str] = []

class BuyerProfile(BaseModel):
    id: int
    company_name: str
    industry_preferences: List[str]
    budget_range: Dict[str, float]  # {min, max}
    location: Dict[str, str]
    company_size: str
    purchase_history: List[Dict] = []
    preferred_payment_terms: List[str] = []

class InvestorProfile(BaseModel):
    id: int
    name: str
    investment_focus: List[str]
    investment_range: Dict[str, float]
    preferred_stages: List[str]  # seed, series_a, growth, etc.
    location: Dict[str, str]
    portfolio_companies: List[Dict] = []

class MatchingRequest(BaseModel):
    entity_id: int
    entity_type: str = Field(..., regex="^(msme|buyer|investor)$")
    match_type: str = Field(..., regex="^(buyer|investor|partner|supplier)$")
    criteria: Dict = {}
    limit: int = Field(10, ge=1, le=50)
    filters: Dict = {}

class MatchResult(BaseModel):
    matched_entity: Dict
    match_score: float
    match_reasons: List[str]
    compatibility_factors: Dict
    distance_km: Optional[float] = None
    recommendation_rank: int

class MatchingResponse(BaseModel):
    matches: List[MatchResult]
    total_candidates: int
    algorithm_used: str
    matching_criteria: Dict
    timestamp: datetime

class TransactionMatchingService:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.db_pool = None
        
        # ML Models
        self.msme_clustering_model = None
        self.buyer_clustering_model = None
        self.compatibility_classifier = None
        self.success_predictor = None
        
        # Scalers and encoders
        self.msme_scaler = StandardScaler()
        self.buyer_scaler = StandardScaler()
        self.industry_encoder = LabelEncoder()
        self.location_encoder = LabelEncoder()
        
        # Data storage
        self.msme_profiles = {}
        self.buyer_profiles = {}
        self.investor_profiles = {}
        self.transaction_history = []
        
        # Model parameters
        self.n_clusters_msme = 8
        self.n_clusters_buyer = 6
        self.cache_ttl = 1800  # 30 minutes

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
            await self.load_profiles_data()
            await self.train_clustering_models()
            await self.train_compatibility_models()
            
            logger.info("Transaction matching service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize transaction matching service: {e}")
            raise

    async def load_profiles_data(self):
        """Load MSME, buyer, and investor profiles from database"""
        try:
            async with self.db_pool.acquire() as conn:
                # Load MSME profiles
                msme_query = """
                    SELECT m.id, m.company_name, m.industry_category, m.business_type,
                           m.annual_turnover, m.employee_count, m.state, m.city,
                           m.latitude, m.longitude, m.year_of_establishment,
                           m.is_exporter, m.certifications, m.services, m.products,
                           m.created_at
                    FROM msmes m
                    WHERE m.status = 'active' AND m.verified = true
                """
                msme_results = await conn.fetch(msme_query)
                
                for row in msme_results:
                    self.msme_profiles[row['id']] = {
                        'id': row['id'],
                        'company_name': row['company_name'],
                        'industry_category': row['industry_category'],
                        'business_type': row['business_type'],
                        'annual_turnover': float(row['annual_turnover'] or 0),
                        'employee_count': int(row['employee_count'] or 0),
                        'location': {
                            'state': row['state'],
                            'city': row['city'],
                            'latitude': float(row['latitude'] or 0),
                            'longitude': float(row['longitude'] or 0)
                        },
                        'establishment_year': row['year_of_establishment'],
                        'exports': row['is_exporter'] or False,
                        'certifications': row['certifications'] or [],
                        'services': row['services'] or [],
                        'products': row['products'] or []
                    }
                
                # Load buyer profiles
                buyer_query = """
                    SELECT b.id, b.company_name, b.industry_preferences,
                           b.budget_min, b.budget_max, b.state, b.city,
                           b.latitude, b.longitude, b.company_size,
                           b.payment_terms, b.created_at
                    FROM buyers b
                    WHERE b.status = 'active'
                """
                buyer_results = await conn.fetch(buyer_query)
                
                for row in buyer_results:
                    self.buyer_profiles[row['id']] = {
                        'id': row['id'],
                        'company_name': row['company_name'],
                        'industry_preferences': row['industry_preferences'] or [],
                        'budget_range': {
                            'min': float(row['budget_min'] or 0),
                            'max': float(row['budget_max'] or 1000000)
                        },
                        'location': {
                            'state': row['state'],
                            'city': row['city'],
                            'latitude': float(row['latitude'] or 0),
                            'longitude': float(row['longitude'] or 0)
                        },
                        'company_size': row['company_size'],
                        'preferred_payment_terms': row['payment_terms'] or []
                    }
                
                # Load investor profiles
                investor_query = """
                    SELECT i.id, i.name, i.investment_focus, i.investment_min,
                           i.investment_max, i.preferred_stages, i.state, i.city,
                           i.latitude, i.longitude, i.created_at
                    FROM investors i
                    WHERE i.status = 'active'
                """
                investor_results = await conn.fetch(investor_query)
                
                for row in investor_results:
                    self.investor_profiles[row['id']] = {
                        'id': row['id'],
                        'name': row['name'],
                        'investment_focus': row['investment_focus'] or [],
                        'investment_range': {
                            'min': float(row['investment_min'] or 0),
                            'max': float(row['investment_max'] or 10000000)
                        },
                        'preferred_stages': row['preferred_stages'] or [],
                        'location': {
                            'state': row['state'],
                            'city': row['city'],
                            'latitude': float(row['latitude'] or 0),
                            'longitude': float(row['longitude'] or 0)
                        }
                    }
                
                # Load transaction history
                transaction_query = """
                    SELECT t.msme_id, t.buyer_id, t.investor_id, t.transaction_type,
                           t.amount, t.status, t.created_at, t.completed_at,
                           t.satisfaction_rating
                    FROM transactions t
                    WHERE t.created_at >= NOW() - INTERVAL '2 years'
                """
                transaction_results = await conn.fetch(transaction_query)
                
                self.transaction_history = []
                for row in transaction_results:
                    self.transaction_history.append({
                        'msme_id': row['msme_id'],
                        'buyer_id': row['buyer_id'],
                        'investor_id': row['investor_id'],
                        'transaction_type': row['transaction_type'],
                        'amount': float(row['amount'] or 0),
                        'status': row['status'],
                        'created_at': row['created_at'],
                        'completed_at': row['completed_at'],
                        'satisfaction_rating': row['satisfaction_rating']
                    })
                
                logger.info(f"Loaded {len(self.msme_profiles)} MSMEs, {len(self.buyer_profiles)} buyers, {len(self.investor_profiles)} investors")
                
        except Exception as e:
            logger.error(f"Failed to load profiles data: {e}")
            raise

    async def train_clustering_models(self):
        """Train K-Means clustering models for MSMEs and buyers"""
        try:
            # Prepare MSME features for clustering
            msme_features = []
            msme_ids = []
            
            for msme_id, profile in self.msme_profiles.items():
                features = [
                    profile['annual_turnover'],
                    profile['employee_count'],
                    profile['establishment_year'],
                    1 if profile['exports'] else 0,
                    len(profile['certifications']),
                    len(profile['services']),
                    len(profile['products']),
                    profile['location']['latitude'],
                    profile['location']['longitude']
                ]
                
                # Add industry category encoding
                industry_encoded = hash(profile['industry_category']) % 100
                features.append(industry_encoded)
                
                msme_features.append(features)
                msme_ids.append(msme_id)
            
            if msme_features:
                msme_features_array = np.array(msme_features)
                
                # Scale features
                msme_features_scaled = self.msme_scaler.fit_transform(msme_features_array)
                
                # Train MSME clustering model
                self.msme_clustering_model = KMeans(
                    n_clusters=min(self.n_clusters_msme, len(msme_features)),
                    random_state=42,
                    n_init=10
                )
                msme_clusters = self.msme_clustering_model.fit_predict(msme_features_scaled)
                
                # Store cluster assignments
                for i, msme_id in enumerate(msme_ids):
                    self.msme_profiles[msme_id]['cluster'] = int(msme_clusters[i])
                
                logger.info(f"Trained MSME clustering model with {len(set(msme_clusters))} clusters")
            
            # Prepare buyer features for clustering
            buyer_features = []
            buyer_ids = []
            
            for buyer_id, profile in self.buyer_profiles.items():
                features = [
                    profile['budget_range']['min'],
                    profile['budget_range']['max'],
                    len(profile['industry_preferences']),
                    len(profile['preferred_payment_terms']),
                    profile['location']['latitude'],
                    profile['location']['longitude']
                ]
                
                # Add company size encoding
                size_encoding = {'micro': 1, 'small': 2, 'medium': 3, 'large': 4, 'enterprise': 5}
                features.append(size_encoding.get(profile['company_size'], 3))
                
                buyer_features.append(features)
                buyer_ids.append(buyer_id)
            
            if buyer_features:
                buyer_features_array = np.array(buyer_features)
                
                # Scale features
                buyer_features_scaled = self.buyer_scaler.fit_transform(buyer_features_array)
                
                # Train buyer clustering model
                self.buyer_clustering_model = KMeans(
                    n_clusters=min(self.n_clusters_buyer, len(buyer_features)),
                    random_state=42,
                    n_init=10
                )
                buyer_clusters = self.buyer_clustering_model.fit_predict(buyer_features_scaled)
                
                # Store cluster assignments
                for i, buyer_id in enumerate(buyer_ids):
                    self.buyer_profiles[buyer_id]['cluster'] = int(buyer_clusters[i])
                
                logger.info(f"Trained buyer clustering model with {len(set(buyer_clusters))} clusters")
                
        except Exception as e:
            logger.error(f"Failed to train clustering models: {e}")
            raise

    async def train_compatibility_models(self):
        """Train compatibility and success prediction models"""
        try:
            # Prepare training data from transaction history
            training_features = []
            training_labels = []
            success_labels = []
            
            for transaction in self.transaction_history:
                msme_id = transaction['msme_id']
                buyer_id = transaction['buyer_id']
                
                if msme_id in self.msme_profiles and buyer_id in self.buyer_profiles:
                    msme = self.msme_profiles[msme_id]
                    buyer = self.buyer_profiles[buyer_id]
                    
                    # Extract features for compatibility prediction
                    features = self.extract_compatibility_features(msme, buyer)
                    training_features.append(features)
                    
                    # Label: 1 if transaction was successful, 0 otherwise
                    is_successful = transaction['status'] in ['completed', 'delivered']
                    training_labels.append(1 if is_successful else 0)
                    
                    # Success rating for regression
                    rating = transaction.get('satisfaction_rating', 3.0)
                    success_labels.append(rating if rating is not None else 3.0)
            
            if len(training_features) > 50:  # Minimum samples for training
                X = np.array(training_features)
                y_compatibility = np.array(training_labels)
                y_success = np.array(success_labels)
                
                # Train compatibility classifier
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y_compatibility, test_size=0.2, random_state=42
                )
                
                # Use Random Forest for better performance
                self.compatibility_classifier = RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42
                )
                self.compatibility_classifier.fit(X_train, y_train)
                
                # Evaluate model
                y_pred = self.compatibility_classifier.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
                logger.info(f"Compatibility classifier accuracy: {accuracy:.3f}")
                
                # Train success predictor (regression)
                from sklearn.ensemble import RandomForestRegressor
                self.success_predictor = RandomForestRegressor(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42
                )
                
                X_train_reg, X_test_reg, y_train_reg, y_test_reg = train_test_split(
                    X, y_success, test_size=0.2, random_state=42
                )
                
                self.success_predictor.fit(X_train_reg, y_train_reg)
                
                logger.info("Trained compatibility and success prediction models")
            else:
                logger.warning("Insufficient training data for compatibility models")
                
        except Exception as e:
            logger.error(f"Failed to train compatibility models: {e}")

    def extract_compatibility_features(self, msme: Dict, buyer: Dict) -> List[float]:
        """Extract features for compatibility prediction"""
        features = []
        
        # Industry compatibility
        msme_industry = msme['industry_category']
        buyer_preferences = buyer['industry_preferences']
        industry_match = 1 if msme_industry in buyer_preferences else 0
        features.append(industry_match)
        
        # Size compatibility
        msme_turnover = msme['annual_turnover']
        buyer_budget = buyer['budget_range']['max']
        size_ratio = min(msme_turnover / max(buyer_budget, 1), 5.0)  # Cap at 5x
        features.append(size_ratio)
        
        # Geographic distance
        distance = self.calculate_distance(msme['location'], buyer['location'])
        normalized_distance = min(distance / 1000.0, 5.0)  # Normalize by 1000km, cap at 5
        features.append(normalized_distance)
        
        # Business maturity
        current_year = datetime.now().year
        msme_age = current_year - msme['establishment_year']
        normalized_age = min(msme_age / 10.0, 5.0)  # Normalize by 10 years
        features.append(normalized_age)
        
        # Export capability
        features.append(1 if msme['exports'] else 0)
        
        # Certification count
        cert_count = len(msme['certifications'])
        features.append(min(cert_count / 5.0, 2.0))  # Normalize, cap at 2
        
        # Service/product diversity
        diversity = len(msme['services']) + len(msme['products'])
        features.append(min(diversity / 10.0, 2.0))  # Normalize, cap at 2
        
        # Cluster compatibility
        msme_cluster = msme.get('cluster', -1)
        buyer_cluster = buyer.get('cluster', -1)
        cluster_match = 1 if msme_cluster == buyer_cluster else 0
        features.append(cluster_match)
        
        return features

    async def find_buyer_matches(self, msme_id: int, filters: Dict = {}, limit: int = 10) -> List[MatchResult]:
        """Find potential buyers for an MSME"""
        try:
            if msme_id not in self.msme_profiles:
                raise ValueError(f"MSME {msme_id} not found")
            
            msme = self.msme_profiles[msme_id]
            matches = []
            
            for buyer_id, buyer in self.buyer_profiles.items():
                # Apply filters
                if not self.apply_filters(buyer, filters):
                    continue
                
                # Calculate match score
                match_score, reasons, factors = self.calculate_buyer_match_score(msme, buyer)
                
                if match_score > 0.3:  # Minimum threshold
                    distance = self.calculate_distance(msme['location'], buyer['location'])
                    
                    matches.append(MatchResult(
                        matched_entity=buyer,
                        match_score=match_score,
                        match_reasons=reasons,
                        compatibility_factors=factors,
                        distance_km=distance,
                        recommendation_rank=0  # Will be set after sorting
                    ))
            
            # Sort by match score and assign ranks
            matches.sort(key=lambda x: x.match_score, reverse=True)
            for i, match in enumerate(matches[:limit]):
                match.recommendation_rank = i + 1
            
            return matches[:limit]
            
        except Exception as e:
            logger.error(f"Error finding buyer matches: {e}")
            return []

    async def find_investor_matches(self, msme_id: int, filters: Dict = {}, limit: int = 10) -> List[MatchResult]:
        """Find potential investors for an MSME"""
        try:
            if msme_id not in self.msme_profiles:
                raise ValueError(f"MSME {msme_id} not found")
            
            msme = self.msme_profiles[msme_id]
            matches = []
            
            for investor_id, investor in self.investor_profiles.items():
                # Apply filters
                if not self.apply_filters(investor, filters):
                    continue
                
                # Calculate match score
                match_score, reasons, factors = self.calculate_investor_match_score(msme, investor)
                
                if match_score > 0.4:  # Minimum threshold for investors
                    distance = self.calculate_distance(msme['location'], investor['location'])
                    
                    matches.append(MatchResult(
                        matched_entity=investor,
                        match_score=match_score,
                        match_reasons=reasons,
                        compatibility_factors=factors,
                        distance_km=distance,
                        recommendation_rank=0
                    ))
            
            # Sort by match score and assign ranks
            matches.sort(key=lambda x: x.match_score, reverse=True)
            for i, match in enumerate(matches[:limit]):
                match.recommendation_rank = i + 1
            
            return matches[:limit]
            
        except Exception as e:
            logger.error(f"Error finding investor matches: {e}")
            return []

    async def find_msme_partners(self, msme_id: int, filters: Dict = {}, limit: int = 10) -> List[MatchResult]:
        """Find potential MSME partners for collaboration"""
        try:
            if msme_id not in self.msme_profiles:
                raise ValueError(f"MSME {msme_id} not found")
            
            source_msme = self.msme_profiles[msme_id]
            matches = []
            
            for partner_id, partner_msme in self.msme_profiles.items():
                if partner_id == msme_id:  # Skip self
                    continue
                
                # Apply filters
                if not self.apply_filters(partner_msme, filters):
                    continue
                
                # Calculate partnership compatibility
                match_score, reasons, factors = self.calculate_partnership_score(source_msme, partner_msme)
                
                if match_score > 0.35:  # Minimum threshold for partnerships
                    distance = self.calculate_distance(source_msme['location'], partner_msme['location'])
                    
                    matches.append(MatchResult(
                        matched_entity=partner_msme,
                        match_score=match_score,
                        match_reasons=reasons,
                        compatibility_factors=factors,
                        distance_km=distance,
                        recommendation_rank=0
                    ))
            
            # Sort by match score and assign ranks
            matches.sort(key=lambda x: x.match_score, reverse=True)
            for i, match in enumerate(matches[:limit]):
                match.recommendation_rank = i + 1
            
            return matches[:limit]
            
        except Exception as e:
            logger.error(f"Error finding MSME partners: {e}")
            return []

    def calculate_buyer_match_score(self, msme: Dict, buyer: Dict) -> Tuple[float, List[str], Dict]:
        """Calculate match score between MSME and buyer"""
        score = 0.0
        reasons = []
        factors = {}
        
        # Industry compatibility (30% weight)
        industry_score = 0.0
        if msme['industry_category'] in buyer['industry_preferences']:
            industry_score = 1.0
            reasons.append("Industry match")
        elif len(buyer['industry_preferences']) == 0:
            industry_score = 0.5
            reasons.append("Open to all industries")
        
        score += industry_score * 0.3
        factors['industry_compatibility'] = industry_score
        
        # Budget compatibility (25% weight)
        budget_score = 0.0
        msme_capacity = msme['annual_turnover'] / 12  # Monthly capacity
        buyer_budget = buyer['budget_range']['max']
        
        if msme_capacity >= buyer['budget_range']['min']:
            if msme_capacity <= buyer_budget:
                budget_score = 1.0
                reasons.append("Perfect budget fit")
            else:
                # Partial score if MSME can handle larger orders
                budget_score = min(buyer_budget / msme_capacity, 1.0)
                reasons.append("Can handle larger orders")
        
        score += budget_score * 0.25
        factors['budget_compatibility'] = budget_score
        
        # Geographic proximity (20% weight)
        distance = self.calculate_distance(msme['location'], buyer['location'])
        geo_score = max(0, 1 - distance / 500)  # Penalty after 500km
        
        if distance < 50:
            reasons.append("Very close location")
        elif distance < 200:
            reasons.append("Reasonable distance")
        
        score += geo_score * 0.2
        factors['geographic_proximity'] = geo_score
        
        # Business credibility (15% weight)
        credibility_score = 0.0
        
        # Age factor
        current_year = datetime.now().year
        business_age = current_year - msme['establishment_year']
        age_score = min(business_age / 5, 1.0)  # Max score after 5 years
        credibility_score += age_score * 0.4
        
        # Certification factor
        cert_score = min(len(msme['certifications']) / 3, 1.0)  # Max score with 3+ certs
        credibility_score += cert_score * 0.3
        
        # Export capability
        if msme['exports']:
            credibility_score += 0.3
            reasons.append("Export experience")
        
        score += credibility_score * 0.15
        factors['business_credibility'] = credibility_score
        
        # ML prediction bonus (10% weight)
        ml_score = 0.0
        if self.compatibility_classifier:
            try:
                features = self.extract_compatibility_features(msme, buyer)
                compatibility_prob = self.compatibility_classifier.predict_proba([features])[0][1]
                ml_score = compatibility_prob
                
                if compatibility_prob > 0.7:
                    reasons.append("High ML compatibility score")
                    
            except Exception as e:
                logger.warning(f"ML prediction failed: {e}")
        
        score += ml_score * 0.1
        factors['ml_compatibility'] = ml_score
        
        return min(score, 1.0), reasons, factors

    def calculate_investor_match_score(self, msme: Dict, investor: Dict) -> Tuple[float, List[str], Dict]:
        """Calculate match score between MSME and investor"""
        score = 0.0
        reasons = []
        factors = {}
        
        # Investment focus compatibility (35% weight)
        focus_score = 0.0
        if msme['industry_category'] in investor['investment_focus']:
            focus_score = 1.0
            reasons.append("Industry focus match")
        elif len(investor['investment_focus']) == 0:
            focus_score = 0.4
        
        score += focus_score * 0.35
        factors['focus_compatibility'] = focus_score
        
        # Investment size compatibility (30% weight)
        size_score = 0.0
        msme_valuation = msme['annual_turnover'] * 2.5  # Simple valuation estimate
        
        if (investor['investment_range']['min'] <= msme_valuation <= 
            investor['investment_range']['max']):
            size_score = 1.0
            reasons.append("Investment size match")
        elif msme_valuation < investor['investment_range']['min']:
            size_score = msme_valuation / investor['investment_range']['min']
        else:
            size_score = investor['investment_range']['max'] / msme_valuation
        
        score += size_score * 0.3
        factors['investment_size'] = size_score
        
        # Growth potential (20% weight)
        growth_score = 0.0
        
        # Industry growth potential (simplified)
        high_growth_industries = ['technology', 'healthcare', 'renewable_energy', 'fintech']
        if msme['industry_category'].lower() in high_growth_industries:
            growth_score += 0.4
            reasons.append("High-growth industry")
        
        # Export potential
        if msme['exports']:
            growth_score += 0.3
            
        # Business maturity
        current_year = datetime.now().year
        business_age = current_year - msme['establishment_year']
        if 2 <= business_age <= 8:  # Sweet spot for investors
            growth_score += 0.3
            reasons.append("Optimal business age")
        
        score += min(growth_score, 1.0) * 0.2
        factors['growth_potential'] = min(growth_score, 1.0)
        
        # Location preference (10% weight)
        distance = self.calculate_distance(msme['location'], investor['location'])
        location_score = max(0, 1 - distance / 1000)  # 1000km range
        
        score += location_score * 0.1
        factors['location_preference'] = location_score
        
        # Track record and credibility (5% weight)
        credibility_score = 0.0
        
        # Certifications
        if len(msme['certifications']) > 0:
            credibility_score += 0.5
            
        # Product/service diversity
        if len(msme['services']) + len(msme['products']) > 3:
            credibility_score += 0.5
            reasons.append("Diverse offerings")
        
        score += min(credibility_score, 1.0) * 0.05
        factors['credibility'] = min(credibility_score, 1.0)
        
        return min(score, 1.0), reasons, factors

    def calculate_partnership_score(self, msme1: Dict, msme2: Dict) -> Tuple[float, List[str], Dict]:
        """Calculate partnership compatibility score between two MSMEs"""
        score = 0.0
        reasons = []
        factors = {}
        
        # Complementary industries (30% weight)
        industry_score = 0.0
        if msme1['industry_category'] != msme2['industry_category']:
            # Check for complementary industries
            complementary_pairs = [
                ('manufacturing', 'logistics'),
                ('technology', 'consulting'),
                ('agriculture', 'food_processing'),
                ('textiles', 'fashion'),
                ('chemicals', 'pharmaceuticals')
            ]
            
            industries = {msme1['industry_category'], msme2['industry_category']}
            for pair in complementary_pairs:
                if set(pair) == industries:
                    industry_score = 1.0
                    reasons.append("Complementary industries")
                    break
            else:
                industry_score = 0.6  # Different but not specifically complementary
        else:
            industry_score = 0.3  # Same industry, some collaboration potential
        
        score += industry_score * 0.3
        factors['industry_synergy'] = industry_score
        
        # Size compatibility (25% weight)
        size_ratio = min(msme1['annual_turnover'], msme2['annual_turnover']) / \
                    max(msme1['annual_turnover'], msme2['annual_turnover'])
        size_score = size_ratio  # Better if similar sizes
        
        if 0.5 <= size_ratio <= 2.0:
            reasons.append("Similar business sizes")
        
        score += size_score * 0.25
        factors['size_compatibility'] = size_score
        
        # Geographic synergy (20% weight)
        distance = self.calculate_distance(msme1['location'], msme2['location'])
        
        if distance < 100:
            geo_score = 1.0
            reasons.append("Close proximity for collaboration")
        elif distance < 300:
            geo_score = 0.7
            reasons.append("Regional partnership potential")
        else:
            geo_score = max(0.3, 1 - distance / 1000)
        
        score += geo_score * 0.2
        factors['geographic_synergy'] = geo_score
        
        # Capability complementarity (15% weight)
        capability_score = 0.0
        
        # Export capabilities
        if msme1['exports'] != msme2['exports']:
            capability_score += 0.3
            reasons.append("Export experience sharing")
        
        # Certification overlap/complement
        certs1 = set(msme1['certifications'])
        certs2 = set(msme2['certifications'])
        
        if certs1.intersection(certs2):
            capability_score += 0.2  # Some common standards
        if certs1.difference(certs2) or certs2.difference(certs1):
            capability_score += 0.3  # Complementary certifications
        
        # Service/product complementarity
        services1 = set(msme1['services'])
        services2 = set(msme2['services'])
        
        if services1.difference(services2):
            capability_score += 0.2
            reasons.append("Complementary services")
        
        score += min(capability_score, 1.0) * 0.15
        factors['capability_synergy'] = min(capability_score, 1.0)
        
        # Business maturity compatibility (10% weight)
        current_year = datetime.now().year
        age1 = current_year - msme1['establishment_year']
        age2 = current_year - msme2['establishment_year']
        
        age_diff = abs(age1 - age2)
        maturity_score = max(0, 1 - age_diff / 10)  # Penalty for large age differences
        
        if age_diff <= 3:
            reasons.append("Similar business maturity")
        
        score += maturity_score * 0.1
        factors['maturity_compatibility'] = maturity_score
        
        return min(score, 1.0), reasons, factors

    def calculate_distance(self, location1: Dict, location2: Dict) -> float:
        """Calculate distance between two locations in kilometers"""
        try:
            if (location1.get('latitude') and location1.get('longitude') and
                location2.get('latitude') and location2.get('longitude')):
                
                coord1 = (location1['latitude'], location1['longitude'])
                coord2 = (location2['latitude'], location2['longitude'])
                
                return geodesic(coord1, coord2).kilometers
            else:
                # Fallback: estimate based on state/city if coordinates not available
                if location1.get('state') == location2.get('state'):
                    if location1.get('city') == location2.get('city'):
                        return 10  # Same city
                    else:
                        return 200  # Same state, different city
                else:
                    return 800  # Different states
                    
        except Exception as e:
            logger.warning(f"Distance calculation failed: {e}")
            return 500  # Default moderate distance

    def apply_filters(self, profile: Dict, filters: Dict) -> bool:
        """Apply filters to profile"""
        try:
            for key, value in filters.items():
                if key == 'min_turnover' and profile.get('annual_turnover', 0) < value:
                    return False
                elif key == 'max_turnover' and profile.get('annual_turnover', 0) > value:
                    return False
                elif key == 'state' and profile.get('location', {}).get('state') != value:
                    return False
                elif key == 'industry' and profile.get('industry_category') != value:
                    return False
                elif key == 'max_distance':
                    # This would need the source location for comparison
                    pass
                    
            return True
            
        except Exception as e:
            logger.warning(f"Filter application failed: {e}")
            return True

    async def get_cached_matches(self, cache_key: str) -> Optional[List[MatchResult]]:
        """Get cached matching results"""
        try:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                return [MatchResult(**match) for match in json.loads(cached_data)]
            return None
        except Exception as e:
            logger.warning(f"Cache retrieval failed: {e}")
            return None

    async def cache_matches(self, cache_key: str, matches: List[MatchResult]):
        """Cache matching results"""
        try:
            serializable_matches = [match.dict() for match in matches]
            self.redis_client.setex(
                cache_key, 
                self.cache_ttl, 
                json.dumps(serializable_matches, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache storage failed: {e}")

# Initialize service
matching_service = TransactionMatchingService()

@app.on_event("startup")
async def startup_event():
    await matching_service.initialize()

@app.post("/api/transaction_match", response_model=MatchingResponse)
async def match_transactions(request: MatchingRequest):
    """Find matching partners/buyers/investors for an entity"""
    try:
        matching_requests.labels(match_type=request.match_type).inc()
        
        with matching_latency.time():
            # Generate cache key
            cache_key = f"matches:{request.entity_type}:{request.entity_id}:{request.match_type}:{hash(str(request.dict()))}"
            
            # Check cache first
            cached_matches = await matching_service.get_cached_matches(cache_key)
            if cached_matches:
                return MatchingResponse(
                    matches=cached_matches,
                    total_candidates=len(cached_matches),
                    algorithm_used="cached_results",
                    matching_criteria=request.criteria,
                    timestamp=datetime.now()
                )
            
            # Perform matching based on request type
            matches = []
            algorithm_used = ""
            
            if request.entity_type == "msme":
                if request.match_type == "buyer":
                    matches = await matching_service.find_buyer_matches(
                        request.entity_id, request.filters, request.limit
                    )
                    algorithm_used = "msme_buyer_matching"
                    
                elif request.match_type == "investor":
                    matches = await matching_service.find_investor_matches(
                        request.entity_id, request.filters, request.limit
                    )
                    algorithm_used = "msme_investor_matching"
                    
                elif request.match_type == "partner":
                    matches = await matching_service.find_msme_partners(
                        request.entity_id, request.filters, request.limit
                    )
                    algorithm_used = "msme_partnership_matching"
            
            # Cache results
            if matches:
                await matching_service.cache_matches(cache_key, matches)
                
                # Update success metrics
                for match in matches:
                    if 'industry_category' in match.matched_entity:
                        successful_matches.labels(
                            industry=match.matched_entity['industry_category']
                        ).inc()
            
            response = MatchingResponse(
                matches=matches,
                total_candidates=len(matches),
                algorithm_used=algorithm_used,
                matching_criteria=request.criteria,
                timestamp=datetime.now()
            )
            
            return response
            
    except Exception as e:
        logger.error(f"Matching error: {e}")
        raise HTTPException(status_code=500, detail="Failed to find matches")

@app.get("/api/similar_entities/{entity_type}/{entity_id}")
async def get_similar_entities(entity_type: str, entity_id: int, limit: int = 10):
    """Get entities similar to the given entity based on clustering"""
    try:
        if entity_type == "msme" and entity_id in matching_service.msme_profiles:
            source_cluster = matching_service.msme_profiles[entity_id].get('cluster', -1)
            
            similar_entities = []
            for msme_id, profile in matching_service.msme_profiles.items():
                if msme_id != entity_id and profile.get('cluster') == source_cluster:
                    similar_entities.append(profile)
                    
            return {
                "similar_entities": similar_entities[:limit],
                "cluster_id": source_cluster,
                "algorithm": "k_means_clustering"
            }
            
        elif entity_type == "buyer" and entity_id in matching_service.buyer_profiles:
            source_cluster = matching_service.buyer_profiles[entity_id].get('cluster', -1)
            
            similar_entities = []
            for buyer_id, profile in matching_service.buyer_profiles.items():
                if buyer_id != entity_id and profile.get('cluster') == source_cluster:
                    similar_entities.append(profile)
                    
            return {
                "similar_entities": similar_entities[:limit],
                "cluster_id": source_cluster,
                "algorithm": "k_means_clustering"
            }
        else:
            raise HTTPException(status_code=404, detail="Entity not found")
            
    except Exception as e:
        logger.error(f"Similar entities error: {e}")
        raise HTTPException(status_code=500, detail="Failed to find similar entities")

@app.post("/api/retrain_models")
async def retrain_matching_models(background_tasks: BackgroundTasks):
    """Trigger retraining of matching models"""
    try:
        background_tasks.add_task(retrain_models_task)
        return {"status": "success", "message": "Model retraining triggered"}
    except Exception as e:
        logger.error(f"Retrain trigger error: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger retraining")

async def retrain_models_task():
    """Background task to retrain matching models"""
    try:
        logger.info("Starting model retraining...")
        await matching_service.load_profiles_data()
        await matching_service.train_clustering_models()
        await matching_service.train_compatibility_models()
        logger.info("Model retraining completed")
    except Exception as e:
        logger.error(f"Model retraining failed: {e}")

@app.get("/api/matching_stats")
async def get_matching_stats():
    """Get matching service statistics"""
    try:
        stats = {
            "total_msmes": len(matching_service.msme_profiles),
            "total_buyers": len(matching_service.buyer_profiles),
            "total_investors": len(matching_service.investor_profiles),
            "total_transactions": len(matching_service.transaction_history),
            "models_trained": {
                "msme_clustering": matching_service.msme_clustering_model is not None,
                "buyer_clustering": matching_service.buyer_clustering_model is not None,
                "compatibility_classifier": matching_service.compatibility_classifier is not None,
                "success_predictor": matching_service.success_predictor is not None
            },
            "cache_size": matching_service.redis_client.dbsize(),
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
    uvicorn.run(app, host="0.0.0.0", port=8008)