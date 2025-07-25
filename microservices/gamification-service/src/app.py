from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import asyncio
import redis.asyncio as redis
import json
from datetime import datetime, timedelta
import logging
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import asyncpg
import os
import httpx
from contextlib import asynccontextmanager
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
POINTS_AWARDED = Counter('gamification_points_awarded_total', 'Total points awarded', ['action', 'service'])
BADGES_EARNED = Counter('gamification_badges_earned_total', 'Total badges earned', ['badge_type'])
ACHIEVEMENTS_UNLOCKED = Counter('gamification_achievements_unlocked_total', 'Total achievements unlocked')
LEADERBOARD_REQUESTS = Counter('gamification_leaderboard_requests_total', 'Leaderboard requests')

class ActionType(str, Enum):
    REGISTRATION_COMPLETED = "registration_completed"
    MSME_REGISTERED = "msme_registered"
    VALUATION_COMPLETED = "valuation_completed"
    TRANSACTION_COMPLETED = "transaction_completed"
    PROFILE_COMPLETED = "profile_completed"
    REFERRAL_SUCCESSFUL = "referral_successful"
    DOCUMENT_UPLOADED = "document_uploaded"
    FIRST_LOGIN = "first_login"
    DAILY_LOGIN = "daily_login"
    SHARE_PLATFORM = "share_platform"
    REVIEW_SUBMITTED = "review_submitted"

class BadgeType(str, Enum):
    NEWCOMER = "newcomer"
    ENTREPRENEUR = "entrepreneur"
    EXPERT_TRADER = "expert_trader"
    VALUATION_MASTER = "valuation_master"
    SOCIAL_CONNECTOR = "social_connector"
    TRUSTED_PARTNER = "trusted_partner"
    PIONEER = "pioneer"
    AMBASSADOR = "ambassador"

class AchievementType(str, Enum):
    FIRST_STEPS = "first_steps"
    GETTING_STARTED = "getting_started"
    RISING_STAR = "rising_star"
    MARKET_LEADER = "market_leader"
    INDUSTRY_EXPERT = "industry_expert"

# Pydantic models
class PointsAward(BaseModel):
    user_id: str
    action: ActionType
    points: int
    service: str
    metadata: Optional[Dict[str, Any]] = {}

class UserStats(BaseModel):
    user_id: str
    total_points: int
    level: int
    badges: List[str]
    achievements: List[str]
    rank: Optional[int] = None
    next_level_points: int
    progress_percentage: float

class Badge(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    requirements: Dict[str, Any]
    points_required: int
    rarity: str  # common, uncommon, rare, epic, legendary

class Achievement(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    requirements: Dict[str, Any]
    points_reward: int
    badge_reward: Optional[str] = None

class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_points: int
    level: int
    badges_count: int
    rank: int

class Notification(BaseModel):
    user_id: str
    type: str  # points, badge, achievement, level_up
    title: str
    message: str
    data: Dict[str, Any]
    created_at: datetime

# Database and Redis connection
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.redis = await redis.from_url(
        os.getenv('REDIS_URL', 'redis://localhost:6379'),
        encoding='utf-8',
        decode_responses=True
    )
    app.state.db_pool = await asyncpg.create_pool(
        os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/msme_db'),
        min_size=10,
        max_size=20
    )
    logger.info("Gamification service started")
    yield
    # Shutdown
    await app.state.redis.close()
    await app.state.db_pool.close()
    logger.info("Gamification service stopped")

app = FastAPI(
    title="MSME Gamification Service",
    description="Microservice for gamification, rewards, badges, and leaderboards",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Points configuration
POINTS_CONFIG = {
    ActionType.REGISTRATION_COMPLETED: 100,
    ActionType.MSME_REGISTERED: 200,
    ActionType.VALUATION_COMPLETED: 50,
    ActionType.TRANSACTION_COMPLETED: 150,
    ActionType.PROFILE_COMPLETED: 75,
    ActionType.REFERRAL_SUCCESSFUL: 300,
    ActionType.DOCUMENT_UPLOADED: 25,
    ActionType.FIRST_LOGIN: 50,
    ActionType.DAILY_LOGIN: 10,
    ActionType.SHARE_PLATFORM: 20,
    ActionType.REVIEW_SUBMITTED: 40,
}

# Level thresholds
LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 7000, 9000, 12000, 16000, 21000]

# Badge definitions
BADGES_CONFIG = {
    BadgeType.NEWCOMER: Badge(
        id="newcomer",
        name="Newcomer",
        description="Welcome to MSMEBazaar! Complete your first action.",
        icon="🌟",
        requirements={"total_points": 50},
        points_required=50,
        rarity="common"
    ),
    BadgeType.ENTREPRENEUR: Badge(
        id="entrepreneur",
        name="Entrepreneur",
        description="Register your first MSME on the platform.",
        icon="🏢",
        requirements={"msmes_registered": 1},
        points_required=200,
        rarity="uncommon"
    ),
    BadgeType.EXPERT_TRADER: Badge(
        id="expert_trader",
        name="Expert Trader",
        description="Complete 10 successful transactions.",
        icon="💼",
        requirements={"transactions_completed": 10},
        points_required=1500,
        rarity="rare"
    ),
    BadgeType.VALUATION_MASTER: Badge(
        id="valuation_master",
        name="Valuation Master",
        description="Get 25 valuations for your MSMEs.",
        icon="📊",
        requirements={"valuations_completed": 25},
        points_required=1250,
        rarity="rare"
    ),
    BadgeType.SOCIAL_CONNECTOR: Badge(
        id="social_connector",
        name="Social Connector",
        description="Successfully refer 5 new users to the platform.",
        icon="🤝",
        requirements={"referrals_successful": 5},
        points_required=1500,
        rarity="epic"
    ),
    BadgeType.TRUSTED_PARTNER: Badge(
        id="trusted_partner",
        name="Trusted Partner",
        description="Maintain a 5-star rating with 50+ reviews.",
        icon="⭐",
        requirements={"average_rating": 5.0, "reviews_count": 50},
        points_required=2500,
        rarity="epic"
    ),
    BadgeType.PIONEER: Badge(
        id="pioneer",
        name="Pioneer",
        description="Be among the first 100 users on the platform.",
        icon="🚀",
        requirements={"user_rank": 100},
        points_required=0,
        rarity="legendary"
    ),
    BadgeType.AMBASSADOR: Badge(
        id="ambassador",
        name="Platform Ambassador",
        description="Reach level 10 and help 20+ users.",
        icon="👑",
        requirements={"level": 10, "help_count": 20},
        points_required=5000,
        rarity="legendary"
    ),
}

# Achievement definitions
ACHIEVEMENTS_CONFIG = {
    AchievementType.FIRST_STEPS: Achievement(
        id="first_steps",
        name="First Steps",
        description="Complete your profile and get started!",
        icon="👶",
        requirements={"profile_completed": True},
        points_reward=75,
        badge_reward="newcomer"
    ),
    AchievementType.GETTING_STARTED: Achievement(
        id="getting_started",
        name="Getting Started",
        description="Register your first MSME and get your first valuation.",
        icon="🌱",
        requirements={"msmes_registered": 1, "valuations_completed": 1},
        points_reward=250,
        badge_reward="entrepreneur"
    ),
    AchievementType.RISING_STAR: Achievement(
        id="rising_star",
        name="Rising Star",
        description="Reach level 5 and complete 5 transactions.",
        icon="⭐",
        requirements={"level": 5, "transactions_completed": 5},
        points_reward=500,
    ),
    AchievementType.MARKET_LEADER: Achievement(
        id="market_leader",
        name="Market Leader",
        description="Be in the top 10 on the leaderboard.",
        icon="🏆",
        requirements={"leaderboard_rank": 10},
        points_reward=1000,
    ),
    AchievementType.INDUSTRY_EXPERT: Achievement(
        id="industry_expert",
        name="Industry Expert",
        description="Reach level 15 with 100+ transactions.",
        icon="🎓",
        requirements={"level": 15, "transactions_completed": 100},
        points_reward=2000,
        badge_reward="ambassador"
    ),
}

# Authentication dependency
async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Validate JWT token with auth service
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{os.getenv('AUTH_SERVICE_URL')}/validate-token",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=401, detail="Invalid token")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Auth service unavailable")

# Core gamification functions
async def calculate_level(total_points: int) -> tuple[int, int, float]:
    """Calculate user level, points to next level, and progress percentage"""
    level = 0
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if total_points >= threshold:
            level = i
        else:
            break
    
    next_level_points = LEVEL_THRESHOLDS[min(level + 1, len(LEVEL_THRESHOLDS) - 1)] - total_points
    if level == len(LEVEL_THRESHOLDS) - 1:
        next_level_points = 0
        progress_percentage = 100.0
    else:
        current_level_points = LEVEL_THRESHOLDS[level]
        next_threshold = LEVEL_THRESHOLDS[level + 1]
        progress_percentage = ((total_points - current_level_points) / (next_threshold - current_level_points)) * 100
    
    return level, next_level_points, progress_percentage

async def check_badge_eligibility(user_id: str, user_stats: dict) -> List[str]:
    """Check which new badges the user is eligible for"""
    earned_badges = set(user_stats.get('badges', []))
    new_badges = []
    
    for badge_type, badge in BADGES_CONFIG.items():
        if badge.id not in earned_badges:
            requirements_met = True
            for req_key, req_value in badge.requirements.items():
                if user_stats.get(req_key, 0) < req_value:
                    requirements_met = False
                    break
            
            if requirements_met:
                new_badges.append(badge.id)
    
    return new_badges

async def check_achievement_eligibility(user_id: str, user_stats: dict) -> List[str]:
    """Check which new achievements the user is eligible for"""
    earned_achievements = set(user_stats.get('achievements', []))
    new_achievements = []
    
    for achievement_type, achievement in ACHIEVEMENTS_CONFIG.items():
        if achievement.id not in earned_achievements:
            requirements_met = True
            for req_key, req_value in achievement.requirements.items():
                if user_stats.get(req_key, 0) < req_value:
                    requirements_met = False
                    break
            
            if requirements_met:
                new_achievements.append(achievement.id)
    
    return new_achievements

async def send_push_notification(user_id: str, notification: Notification):
    """Send push notification to user"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{os.getenv('NOTIFICATION_SERVICE_URL')}/api/send-push",
                json={
                    "user_id": user_id,
                    "title": notification.title,
                    "message": notification.message,
                    "data": notification.data
                }
            )
    except Exception as e:
        logger.error(f"Push notification error: {e}")

# API Endpoints
@app.post("/api/award-points")
async def award_points(
    award: PointsAward,
    background_tasks: BackgroundTasks
):
    """Award points to a user for completing an action"""
    try:
        # Get or create user stats
        async with app.state.db_pool.acquire() as conn:
            user_stats = await conn.fetchrow(
                "SELECT * FROM user_gamification_stats WHERE user_id = $1",
                award.user_id
            )
            
            if not user_stats:
                # Create new user stats
                await conn.execute(
                    """
                    INSERT INTO user_gamification_stats 
                    (user_id, total_points, level, badges, achievements, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    award.user_id, 0, 0, [], [], datetime.now()
                )
                user_stats = {
                    'user_id': award.user_id,
                    'total_points': 0,
                    'level': 0,
                    'badges': [],
                    'achievements': [],
                    'msmes_registered': 0,
                    'valuations_completed': 0,
                    'transactions_completed': 0,
                    'referrals_successful': 0,
                    'profile_completed': False
                }
            else:
                user_stats = dict(user_stats)
        
        # Calculate points to award
        base_points = POINTS_CONFIG.get(award.action, award.points)
        
        # Apply multipliers for special events or user level
        multiplier = 1.0
        if user_stats['level'] >= 10:
            multiplier = 1.2  # 20% bonus for high-level users
        
        points_to_award = int(base_points * multiplier)
        
        # Update user stats
        new_total_points = user_stats['total_points'] + points_to_award
        old_level = user_stats['level']
        new_level, next_level_points, progress_percentage = await calculate_level(new_total_points)
        
        # Update action-specific counters
        action_field_map = {
            ActionType.MSME_REGISTERED: 'msmes_registered',
            ActionType.VALUATION_COMPLETED: 'valuations_completed',
            ActionType.TRANSACTION_COMPLETED: 'transactions_completed',
            ActionType.REFERRAL_SUCCESSFUL: 'referrals_successful',
            ActionType.PROFILE_COMPLETED: 'profile_completed'
        }
        
        updates = {
            'total_points': new_total_points,
            'level': new_level
        }
        
        if award.action in action_field_map:
            field = action_field_map[award.action]
            if field == 'profile_completed':
                updates[field] = True
            else:
                updates[field] = user_stats.get(field, 0) + 1
            user_stats[field] = updates[field]
        
        # Check for new badges and achievements
        user_stats['total_points'] = new_total_points
        user_stats['level'] = new_level
        
        new_badges = await check_badge_eligibility(award.user_id, user_stats)
        new_achievements = await check_achievement_eligibility(award.user_id, user_stats)
        
        if new_badges:
            current_badges = user_stats.get('badges', [])
            updates['badges'] = current_badges + new_badges
            
        if new_achievements:
            current_achievements = user_stats.get('achievements', [])
            updates['achievements'] = current_achievements + new_achievements
        
        # Update database
        set_clause = ", ".join([f"{k} = ${i+2}" for i, k in enumerate(updates.keys())])
        values = [award.user_id] + list(updates.values())
        
        async with app.state.db_pool.acquire() as conn:
            await conn.execute(
                f"UPDATE user_gamification_stats SET {set_clause}, updated_at = $1 WHERE user_id = $2",
                datetime.now(), *values[1:], award.user_id
            )
            
            # Log the points transaction
            await conn.execute(
                """
                INSERT INTO points_transactions 
                (user_id, action, points, service, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                award.user_id, award.action.value, points_to_award, 
                award.service, json.dumps(award.metadata), datetime.now()
            )
        
        # Cache updated stats
        await app.state.redis.setex(
            f"user_stats:{award.user_id}",
            3600,
            json.dumps({**user_stats, **updates})
        )
        
        # Send notifications for level up, badges, achievements
        notifications = []
        
        if new_level > old_level:
            notifications.append(Notification(
                user_id=award.user_id,
                type="level_up",
                title="Level Up! 🎉",
                message=f"Congratulations! You've reached level {new_level}!",
                data={"new_level": new_level, "points_earned": points_to_award},
                created_at=datetime.now()
            ))
        
        for badge_id in new_badges:
            badge = BADGES_CONFIG[BadgeType(badge_id)]
            notifications.append(Notification(
                user_id=award.user_id,
                type="badge",
                title="New Badge Earned! 🏆",
                message=f"You've earned the '{badge.name}' badge!",
                data={"badge_id": badge_id, "badge_name": badge.name},
                created_at=datetime.now()
            ))
            BADGES_EARNED.labels(badge_type=badge_id).inc()
        
        for achievement_id in new_achievements:
            achievement = ACHIEVEMENTS_CONFIG[AchievementType(achievement_id)]
            notifications.append(Notification(
                user_id=award.user_id,
                type="achievement",
                title="Achievement Unlocked! 🌟",
                message=f"You've unlocked the '{achievement.name}' achievement!",
                data={"achievement_id": achievement_id, "achievement_name": achievement.name},
                created_at=datetime.now()
            ))
            ACHIEVEMENTS_UNLOCKED.inc()
        
        # Send push notifications
        for notification in notifications:
            background_tasks.add_task(send_push_notification, award.user_id, notification)
        
        # Update metrics
        POINTS_AWARDED.labels(action=award.action.value, service=award.service).inc()
        
        return {
            "success": True,
            "points_awarded": points_to_award,
            "total_points": new_total_points,
            "new_level": new_level,
            "level_up": new_level > old_level,
            "new_badges": new_badges,
            "new_achievements": new_achievements,
            "next_level_points": next_level_points,
            "progress_percentage": progress_percentage
        }
        
    except Exception as e:
        logger.error(f"Points award error: {e}")
        raise HTTPException(status_code=500, detail="Failed to award points")

@app.get("/api/user/{user_id}/stats", response_model=UserStats)
async def get_user_stats(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get user's gamification stats"""
    try:
        # Check cache first
        cached_stats = await app.state.redis.get(f"user_stats:{user_id}")
        if cached_stats:
            stats_data = json.loads(cached_stats)
        else:
            # Get from database
            async with app.state.db_pool.acquire() as conn:
                user_stats = await conn.fetchrow(
                    "SELECT * FROM user_gamification_stats WHERE user_id = $1",
                    user_id
                )
                
                if not user_stats:
                    # Return default stats for new user
                    return UserStats(
                        user_id=user_id,
                        total_points=0,
                        level=0,
                        badges=[],
                        achievements=[],
                        next_level_points=100,
                        progress_percentage=0.0
                    )
                
                stats_data = dict(user_stats)
                
                # Cache the stats
                await app.state.redis.setex(
                    f"user_stats:{user_id}",
                    3600,
                    json.dumps(stats_data, default=str)
                )
        
        # Calculate current level info
        level, next_level_points, progress_percentage = await calculate_level(stats_data['total_points'])
        
        # Get user's rank
        async with app.state.db_pool.acquire() as conn:
            rank_result = await conn.fetchval(
                """
                SELECT rank FROM (
                    SELECT user_id, RANK() OVER (ORDER BY total_points DESC) as rank
                    FROM user_gamification_stats
                ) ranked WHERE user_id = $1
                """,
                user_id
            )
        
        return UserStats(
            user_id=user_id,
            total_points=stats_data['total_points'],
            level=level,
            badges=stats_data.get('badges', []),
            achievements=stats_data.get('achievements', []),
            rank=rank_result,
            next_level_points=next_level_points,
            progress_percentage=progress_percentage
        )
        
    except Exception as e:
        logger.error(f"User stats retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user stats")

@app.get("/api/leaderboard")
async def get_leaderboard(
    limit: int = 50,
    offset: int = 0,
    period: str = "all_time",  # all_time, monthly, weekly
    current_user: dict = Depends(get_current_user)
):
    """Get platform leaderboard"""
    try:
        cache_key = f"leaderboard:{period}:{limit}:{offset}"
        cached_leaderboard = await app.state.redis.get(cache_key)
        
        if cached_leaderboard:
            return json.loads(cached_leaderboard)
        
        # Build query based on period
        time_filter = ""
        if period == "monthly":
            time_filter = "WHERE ugs.updated_at >= NOW() - INTERVAL '30 days'"
        elif period == "weekly":
            time_filter = "WHERE ugs.updated_at >= NOW() - INTERVAL '7 days'"
        
        async with app.state.db_pool.acquire() as conn:
            leaderboard_data = await conn.fetch(
                f"""
                SELECT 
                    ugs.user_id,
                    u.username,
                    ugs.total_points,
                    ugs.level,
                    array_length(ugs.badges, 1) as badges_count,
                    RANK() OVER (ORDER BY ugs.total_points DESC) as rank
                FROM user_gamification_stats ugs
                JOIN users u ON ugs.user_id = u.id
                {time_filter}
                ORDER BY ugs.total_points DESC
                LIMIT $1 OFFSET $2
                """,
                limit, offset
            )
        
        leaderboard = [
            LeaderboardEntry(
                user_id=row['user_id'],
                username=row['username'],
                total_points=row['total_points'],
                level=row['level'],
                badges_count=row['badges_count'] or 0,
                rank=row['rank']
            ).model_dump() for row in leaderboard_data
        ]
        
        result = {
            "leaderboard": leaderboard,
            "period": period,
            "total_users": len(leaderboard_data)
        }
        
        # Cache for 10 minutes
        await app.state.redis.setex(cache_key, 600, json.dumps(result))
        
        LEADERBOARD_REQUESTS.inc()
        
        return result
        
    except Exception as e:
        logger.error(f"Leaderboard retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leaderboard")

@app.get("/api/badges")
async def get_all_badges():
    """Get all available badges"""
    return {
        "badges": [badge.model_dump() for badge in BADGES_CONFIG.values()]
    }

@app.get("/api/achievements")
async def get_all_achievements():
    """Get all available achievements"""
    return {
        "achievements": [achievement.model_dump() for achievement in ACHIEVEMENTS_CONFIG.values()]
    }

@app.get("/api/user/{user_id}/notifications")
async def get_user_notifications(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get user's gamification notifications"""
    try:
        async with app.state.db_pool.acquire() as conn:
            notifications = await conn.fetch(
                """
                SELECT * FROM gamification_notifications 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2 OFFSET $3
                """,
                user_id, limit, offset
            )
        
        return {
            "notifications": [dict(notification) for notification in notifications]
        }
        
    except Exception as e:
        logger.error(f"Notifications retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notifications")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check Redis connection
        await app.state.redis.ping()
        
        # Check database connection
        async with app.state.db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        
        return {
            "status": "healthy",
            "service": "gamification-service",
            "version": "2.0.0",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8003)),
        reload=os.getenv("ENVIRONMENT") == "development"
    )