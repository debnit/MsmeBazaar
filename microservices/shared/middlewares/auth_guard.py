"""
Authentication Guard Middleware for MSMEBazaar
Comprehensive authentication and authorization middleware
"""

from typing import Optional, List, Dict, Any, Callable
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog
from ..utils.jwt_handler import jwt_handler, get_current_user_from_token

logger = structlog.get_logger()

# Security scheme for OpenAPI documentation
security = HTTPBearer()


class AuthGuard:
    """
    Authentication guard with role-based access control
    """
    
    def __init__(self, required_roles: Optional[List[str]] = None, required_scopes: Optional[List[str]] = None):
        self.required_roles = required_roles or []
        self.required_scopes = required_scopes or []
    
    async def __call__(self, request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
        """
        Authenticate and authorize user
        """
        try:
            # Extract token from Authorization header
            token = credentials.credentials
            
            # Verify token
            payload = jwt_handler.verify_token(token)
            if not payload:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check token type
            token_type = payload.get("token_type")
            if token_type not in ["access", "api_token"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Extract user information
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing user ID",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check user roles if required
            user_roles = payload.get("roles", [])
            if self.required_roles and not any(role in user_roles for role in self.required_roles):
                logger.warning(
                    "Insufficient roles for access",
                    user_id=user_id,
                    required_roles=self.required_roles,
                    user_roles=user_roles
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            
            # Check API token scopes if required
            if token_type == "api_token" and self.required_scopes:
                token_scopes = payload.get("scopes", [])
                if not any(scope in token_scopes for scope in self.required_scopes):
                    logger.warning(
                        "Insufficient scopes for API access",
                        user_id=user_id,
                        required_scopes=self.required_scopes,
                        token_scopes=token_scopes
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient API permissions"
                    )
            
            # Add user context to request state
            request.state.user = payload
            request.state.user_id = user_id
            request.state.token_type = token_type
            
            logger.debug(
                "User authenticated successfully",
                user_id=user_id,
                token_type=token_type,
                endpoint=str(request.url)
            )
            
            return payload
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Authentication error", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )


class OptionalAuthGuard:
    """
    Optional authentication - doesn't fail if no token provided
    """
    
    async def __call__(self, request: Request):
        """
        Optional authentication check
        """
        try:
            # Check for Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                # No authentication provided - set anonymous user
                request.state.user = None
                request.state.user_id = None
                request.state.token_type = None
                return None
            
            # Extract and verify token
            token = auth_header.split(" ")[1]
            payload = jwt_handler.verify_token(token)
            
            if payload:
                user_id = payload.get("sub")
                request.state.user = payload
                request.state.user_id = user_id
                request.state.token_type = payload.get("token_type")
                
                logger.debug("Optional authentication successful", user_id=user_id)
                return payload
            else:
                # Invalid token - treat as anonymous
                request.state.user = None
                request.state.user_id = None
                request.state.token_type = None
                return None
            
        except Exception as e:
            logger.warning("Optional authentication error", error=str(e))
            # On error, treat as anonymous user
            request.state.user = None
            request.state.user_id = None
            request.state.token_type = None
            return None


# Convenience functions for different authentication levels

async def require_auth(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Basic authentication requirement"""
    guard = AuthGuard()
    return await guard(request, credentials)


async def require_admin(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require admin role"""
    guard = AuthGuard(required_roles=["admin", "super_admin"])
    return await guard(request, credentials)


async def require_msme_owner(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require MSME owner role"""
    guard = AuthGuard(required_roles=["msme_owner", "admin", "super_admin"])
    return await guard(request, credentials)


async def require_buyer(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require buyer role"""
    guard = AuthGuard(required_roles=["buyer", "admin", "super_admin"])
    return await guard(request, credentials)


async def require_investor(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require investor role"""
    guard = AuthGuard(required_roles=["investor", "admin", "super_admin"])
    return await guard(request, credentials)


async def require_api_access(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require API token with basic access scope"""
    guard = AuthGuard(required_scopes=["read", "write"])
    return await guard(request, credentials)


async def require_api_read(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require API token with read scope"""
    guard = AuthGuard(required_scopes=["read"])
    return await guard(request, credentials)


async def require_api_write(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require API token with write scope"""
    guard = AuthGuard(required_scopes=["write"])
    return await guard(request, credentials)


async def optional_auth(request: Request):
    """Optional authentication"""
    guard = OptionalAuthGuard()
    return await guard(request)


def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    Get current authenticated user from request state
    """
    return getattr(request.state, 'user', None)


def get_current_user_id(request: Request) -> Optional[str]:
    """
    Get current authenticated user ID from request state
    """
    return getattr(request.state, 'user_id', None)


def is_admin(request: Request) -> bool:
    """
    Check if current user is admin
    """
    user = get_current_user(request)
    if not user:
        return False
    
    user_roles = user.get("roles", [])
    return any(role in ["admin", "super_admin"] for role in user_roles)


def is_msme_owner(request: Request) -> bool:
    """
    Check if current user is MSME owner
    """
    user = get_current_user(request)
    if not user:
        return False
    
    user_roles = user.get("roles", [])
    return any(role in ["msme_owner", "admin", "super_admin"] for role in user_roles)


def has_permission(request: Request, permission: str) -> bool:
    """
    Check if current user has specific permission
    """
    user = get_current_user(request)
    if not user:
        return False
    
    user_permissions = user.get("permissions", [])
    return permission in user_permissions


class PermissionChecker:
    """
    Permission-based access control
    """
    
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions
    
    async def __call__(self, request: Request, user: Dict[str, Any] = Depends(require_auth)):
        """
        Check if user has required permissions
        """
        user_permissions = user.get("permissions", [])
        
        # Check if user has any of the required permissions
        if not any(perm in user_permissions for perm in self.required_permissions):
            logger.warning(
                "Insufficient permissions",
                user_id=user.get("sub"),
                required_permissions=self.required_permissions,
                user_permissions=user_permissions
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return user


def require_permissions(permissions: List[str]):
    """
    Decorator-style permission checker
    
    Usage:
        @app.get("/admin/users")
        async def get_users(user = Depends(require_permissions(["user.read", "admin.access"]))):
            return {"users": []}
    """
    return PermissionChecker(permissions)


class ResourceOwnerChecker:
    """
    Check if user owns the requested resource
    """
    
    def __init__(self, resource_param: str = "resource_id", user_field: str = "user_id"):
        self.resource_param = resource_param
        self.user_field = user_field
    
    async def __call__(self, request: Request, user: Dict[str, Any] = Depends(require_auth)):
        """
        Check resource ownership
        """
        # Get resource ID from path parameters
        resource_id = request.path_params.get(self.resource_param)
        current_user_id = user.get("sub")
        
        if not resource_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing {self.resource_param} parameter"
            )
        
        # Allow admins to access any resource
        if is_admin(request):
            return user
        
        # Check if user owns the resource
        # This would typically involve a database lookup
        # For now, we'll assume the resource_id contains the owner's user_id
        if str(resource_id) != str(current_user_id):
            logger.warning(
                "Unauthorized resource access attempt",
                user_id=current_user_id,
                resource_id=resource_id,
                resource_param=self.resource_param
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this resource"
            )
        
        return user


def require_resource_owner(resource_param: str = "resource_id"):
    """
    Require user to own the requested resource
    
    Usage:
        @app.get("/users/{user_id}/profile")
        async def get_profile(user = Depends(require_resource_owner("user_id"))):
            return {"profile": {}}
    """
    return ResourceOwnerChecker(resource_param)