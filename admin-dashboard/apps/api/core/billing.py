import stripe
from typing import Dict, Any, Optional
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from core.config import settings
from core.models import Organization, BillingInvoice, User
from core.database import get_db

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Subscription plans configuration
PLANS = {
    "free": {
        "name": "Free Plan",
        "price": 0,
        "max_users": 5,
        "max_msmes": 100,
        "max_deals": 50,
        "features": [
            "Basic MSME management",
            "Up to 5 users",
            "100 MSME records",
            "50 deals",
            "Email support"
        ]
    },
    "starter": {
        "name": "Starter Plan",
        "price": 2999,  # ₹29.99/month in paise
        "stripe_price_id": "price_starter_monthly",
        "max_users": 15,
        "max_msmes": 500,
        "max_deals": 200,
        "features": [
            "All Free features",
            "Up to 15 users",
            "500 MSME records",
            "200 deals",
            "Basic analytics",
            "WhatsApp notifications",
            "Priority support"
        ]
    },
    "pro": {
        "name": "Pro Plan",
        "price": 7999,  # ₹79.99/month in paise
        "stripe_price_id": "price_pro_monthly",
        "max_users": 50,
        "max_msmes": 2000,
        "max_deals": 1000,
        "features": [
            "All Starter features",
            "Up to 50 users",
            "2000 MSME records",
            "1000 deals",
            "Advanced analytics",
            "Workflow automation",
            "API access",
            "Custom branding",
            "Phone support"
        ]
    },
    "enterprise": {
        "name": "Enterprise Plan",
        "price": 19999,  # ₹199.99/month in paise
        "stripe_price_id": "price_enterprise_monthly",
        "max_users": -1,  # Unlimited
        "max_msmes": -1,  # Unlimited
        "max_deals": -1,  # Unlimited
        "features": [
            "All Pro features",
            "Unlimited users",
            "Unlimited MSME records",
            "Unlimited deals",
            "Advanced AI features",
            "Custom integrations",
            "White-label solution",
            "Dedicated account manager",
            "24/7 priority support"
        ]
    }
}

class StripeService:
    """Service for handling Stripe operations"""
    
    @staticmethod
    def create_customer(organization: Organization) -> str:
        """Create Stripe customer for organization"""
        try:
            customer = stripe.Customer.create(
                email=organization.billingEmail,
                name=organization.name,
                metadata={
                    "organization_id": organization.id,
                    "organization_slug": organization.slug
                }
            )
            return customer.id
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_subscription(customer_id: str, price_id: str, trial_days: int = 14) -> Dict[str, Any]:
        """Create Stripe subscription"""
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                trial_period_days=trial_days,
                metadata={
                    "plan": next(plan for plan, config in PLANS.items() 
                               if config.get("stripe_price_id") == price_id)
                }
            )
            return subscription
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    @staticmethod
    def update_subscription(subscription_id: str, new_price_id: str) -> Dict[str, Any]:
        """Update existing subscription"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            stripe.Subscription.modify(
                subscription_id,
                items=[{
                    'id': subscription['items']['data'][0].id,
                    'price': new_price_id,
                }]
            )
            
            return stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    @staticmethod
    def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> Dict[str, Any]:
        """Cancel subscription"""
        try:
            return stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=at_period_end
            )
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_billing_portal_session(customer_id: str, return_url: str) -> str:
        """Create billing portal session"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            return session.url
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: int = 14
    ) -> str:
        """Create Stripe checkout session"""
        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                subscription_data={
                    'trial_period_days': trial_days,
                }
            )
            return session.url
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")

class BillingService:
    """Service for billing operations"""
    
    @staticmethod
    def setup_organization_billing(organization: Organization, db: Session) -> Organization:
        """Set up billing for new organization"""
        if not organization.stripeCustomerId:
            customer_id = StripeService.create_customer(organization)
            organization.stripeCustomerId = customer_id
            db.commit()
        
        return organization
    
    @staticmethod
    def upgrade_organization(
        organization: Organization,
        plan: str,
        db: Session
    ) -> Dict[str, Any]:
        """Upgrade organization to paid plan"""
        if plan not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        plan_config = PLANS[plan]
        
        # Ensure Stripe customer exists
        if not organization.stripeCustomerId:
            organization = BillingService.setup_organization_billing(organization, db)
        
        # Create or update subscription
        if organization.stripeSubscriptionId:
            # Update existing subscription
            subscription = StripeService.update_subscription(
                organization.stripeSubscriptionId,
                plan_config["stripe_price_id"]
            )
        else:
            # Create new subscription
            subscription = StripeService.create_subscription(
                organization.stripeCustomerId,
                plan_config["stripe_price_id"]
            )
            organization.stripeSubscriptionId = subscription.id
        
        # Update organization limits and plan
        organization.plan = plan
        organization.maxUsers = plan_config["max_users"]
        organization.maxMsmes = plan_config["max_msmes"]
        organization.maxDeals = plan_config["max_deals"]
        organization.subscriptionStatus = subscription.status
        
        if subscription.trial_end:
            organization.trialEndsAt = datetime.fromtimestamp(subscription.trial_end)
        
        db.commit()
        
        return {
            "subscription": subscription,
            "organization": organization,
            "plan_config": plan_config
        }
    
    @staticmethod
    def cancel_subscription(organization: Organization, db: Session) -> Dict[str, Any]:
        """Cancel organization subscription"""
        if not organization.stripeSubscriptionId:
            raise HTTPException(status_code=400, detail="No active subscription")
        
        subscription = StripeService.cancel_subscription(organization.stripeSubscriptionId)
        
        # Update organization status
        organization.subscriptionStatus = subscription.status
        db.commit()
        
        return {"subscription": subscription}
    
    @staticmethod
    def get_billing_info(organization: Organization) -> Dict[str, Any]:
        """Get comprehensive billing information"""
        billing_info = {
            "organization": {
                "id": organization.id,
                "name": organization.name,
                "plan": organization.plan,
                "subscription_status": organization.subscriptionStatus,
                "trial_ends_at": organization.trialEndsAt.isoformat() if organization.trialEndsAt else None,
            },
            "current_plan": PLANS.get(organization.plan, PLANS["free"]),
            "limits": {
                "users": organization.maxUsers,
                "msmes": organization.maxMsmes,
                "deals": organization.maxDeals
            },
            "available_plans": PLANS
        }
        
        # Get Stripe subscription details if exists
        if organization.stripeSubscriptionId:
            try:
                subscription = stripe.Subscription.retrieve(organization.stripeSubscriptionId)
                billing_info["stripe_subscription"] = {
                    "id": subscription.id,
                    "status": subscription.status,
                    "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                    "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                    "cancel_at_period_end": subscription.cancel_at_period_end
                }
            except stripe.error.StripeError:
                pass
        
        return billing_info
    
    @staticmethod
    def create_billing_portal_url(organization: Organization, return_url: str) -> str:
        """Create billing portal URL"""
        if not organization.stripeCustomerId:
            raise HTTPException(status_code=400, detail="No Stripe customer")
        
        return StripeService.create_billing_portal_session(
            organization.stripeCustomerId,
            return_url
        )
    
    @staticmethod
    def create_upgrade_checkout_url(
        organization: Organization,
        plan: str,
        success_url: str,
        cancel_url: str
    ) -> str:
        """Create checkout URL for plan upgrade"""
        if plan not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        plan_config = PLANS[plan]
        
        if not plan_config.get("stripe_price_id"):
            raise HTTPException(status_code=400, detail="Plan not available for purchase")
        
        # Ensure Stripe customer exists
        if not organization.stripeCustomerId:
            customer_id = StripeService.create_customer(organization)
            organization.stripeCustomerId = customer_id
        
        return StripeService.create_checkout_session(
            organization.stripeCustomerId,
            plan_config["stripe_price_id"],
            success_url,
            cancel_url
        )

async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    if event['type'] == 'customer.subscription.created':
        await handle_subscription_created(event['data']['object'])
    elif event['type'] == 'customer.subscription.updated':
        await handle_subscription_updated(event['data']['object'])
    elif event['type'] == 'customer.subscription.deleted':
        await handle_subscription_deleted(event['data']['object'])
    elif event['type'] == 'invoice.payment_succeeded':
        await handle_payment_succeeded(event['data']['object'])
    elif event['type'] == 'invoice.payment_failed':
        await handle_payment_failed(event['data']['object'])
    
    return {"status": "success"}

async def handle_subscription_created(subscription):
    """Handle subscription creation"""
    # Update organization subscription status
    pass

async def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    # Update organization subscription status and limits
    pass

async def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    # Downgrade organization to free plan
    pass

async def handle_payment_succeeded(invoice):
    """Handle successful payment"""
    # Create billing invoice record
    pass

async def handle_payment_failed(invoice):
    """Handle failed payment"""
    # Send notification and update subscription status
    pass

# Usage tracking for billing
class UsageTracker:
    """Track usage for billing purposes"""
    
    @staticmethod
    def get_organization_usage(organization_id: str, db: Session) -> Dict[str, int]:
        """Get current usage statistics for organization"""
        # This would query the database for actual counts
        return {
            "users": 0,  # Count from users table
            "msmes": 0,  # Count from msmes table
            "deals": 0,  # Count from deals table
            "api_calls": 0,  # Count from API usage logs
            "storage_mb": 0  # Calculate from file uploads
        }
    
    @staticmethod
    def check_usage_limits(organization: Organization, db: Session) -> Dict[str, Any]:
        """Check if organization is within usage limits"""
        usage = UsageTracker.get_organization_usage(organization.id, db)
        
        limits = {
            "users": organization.maxUsers,
            "msmes": organization.maxMsmes,
            "deals": organization.maxDeals
        }
        
        violations = []
        for resource, limit in limits.items():
            if limit != -1 and usage.get(resource, 0) > limit:  # -1 means unlimited
                violations.append({
                    "resource": resource,
                    "current": usage[resource],
                    "limit": limit
                })
        
        return {
            "usage": usage,
            "limits": limits,
            "violations": violations,
            "within_limits": len(violations) == 0
        }