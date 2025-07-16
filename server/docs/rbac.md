# Role-Based Access Control (RBAC) Implementation

## Overview

MSMESquare implements a comprehensive Role-Based Access Control system that provides granular permissions for different user roles. The system supports ownership-based access control, multi-permission checks, and contextual permission validation.

## User Roles

### 1. Admin
- **Full system access** with all permissions
- Can manage users, moderate content, and access system administration
- Rate limit: 5000 requests per 15 minutes

### 2. Seller
- **MSME Management**: Create, update, and delete their own listings
- **Interest Tracking**: View buyer interests in their listings
- **Escrow Participation**: Read escrow account information
- **Valuation Access**: Get AI-powered business valuations
- Rate limit: 500 requests per 15 minutes

### 3. Buyer
- **Listing Access**: Browse and view all MSME listings
- **Interest Management**: Express and manage interest in listings
- **Loan Applications**: Apply for acquisition loans
- **Escrow Operations**: Fund escrow accounts and view transactions
- Rate limit: 500 requests per 15 minutes

### 4. Agent
- **Assignment Management**: Handle assigned listings and transactions
- **Commission Tracking**: View and manage commission payments
- **Support Services**: Assist buyers and sellers in transactions
- Rate limit: 1000 requests per 15 minutes

### 5. NBFC
- **Loan Processing**: Approve/reject loan applications
- **Compliance Management**: Maintain regulatory compliance
- **Analytics Access**: View loan performance and risk metrics
- Rate limit: 2000 requests per 15 minutes

## Permission Structure

### User Management
- `users:read` - View user information
- `users:write` - Create and update users
- `users:delete` - Delete users
- `users:admin` - Full user administration

### MSME Listings
- `msme-listings:read` - View listings
- `msme-listings:write` - Create and update listings
- `msme-listings:delete` - Delete listings
- `msme-listings:own` - Manage own listings only
- `msme-listings:moderate` - Moderate all listings

### Loan Applications
- `loan-applications:read` - View applications
- `loan-applications:write` - Create applications
- `loan-applications:delete` - Delete applications
- `loan-applications:own` - Manage own applications
- `loan-applications:approve` - Approve applications
- `loan-applications:reject` - Reject applications

### Escrow Management
- `escrow:read` - View escrow accounts
- `escrow:write` - Create escrow accounts
- `escrow:fund` - Fund escrow accounts
- `escrow:release` - Release funds
- `escrow:refund` - Process refunds

### Compliance & Monitoring
- `compliance:read` - View compliance records
- `compliance:write` - Create compliance records
- `compliance:own` - Manage own compliance
- `compliance:audit` - Audit compliance records
- `monitoring:read` - View system metrics
- `monitoring:write` - Manage monitoring settings

## RBAC Middleware Functions

### 1. `requirePermission(permission, options)`
Basic permission checking with optional ownership validation.

```typescript
app.get("/api/msme-listings/:id", 
  authenticateToken,
  requirePermission(PERMISSIONS.MSME_READ),
  handler
);

// With ownership check
app.put("/api/msme-listings/:id", 
  authenticateToken,
  requirePermission(PERMISSIONS.MSME_WRITE, {
    checkOwnership: true,
    resourceType: 'msme-listing',
    resourceIdParam: 'id'
  }),
  handler
);
```

### 2. `requireAllPermissions(permissions)`
Requires user to have ALL specified permissions.

```typescript
app.post("/api/admin/complex-operation", 
  authenticateToken,
  requireAllPermissions([
    PERMISSIONS.USERS_ADMIN,
    PERMISSIONS.SYSTEM_CONFIG
  ]),
  handler
);
```

### 3. `requireAnyPermission(permissions)`
Requires user to have at least ONE of the specified permissions.

```typescript
app.get("/api/financial-data", 
  authenticateToken,
  requireAnyPermission([
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.MONITORING_READ
  ]),
  handler
);
```

### 4. `requireRole(role)`
Simple role-based checking (legacy support).

```typescript
app.get("/api/admin/dashboard", 
  authenticateToken,
  requireRole('admin'),
  handler
);
```

## Resource Ownership Validation

The system automatically validates resource ownership for supported resource types:

- **msme-listing**: Validates seller ownership
- **loan-application**: Validates buyer ownership
- **buyer-interest**: Validates buyer ownership
- **nbfc-details**: Validates NBFC user ownership
- **compliance-record**: Validates through NBFC ownership

## API Endpoints with RBAC

### MSME Listings
- `GET /api/msme-listings` - Public (no auth required)
- `POST /api/msme-listings` - Requires `msme-listings:write` (sellers only)
- `PUT /api/msme-listings/:id` - Requires `msme-listings:write` + ownership
- `DELETE /api/msme-listings/:id` - Requires `msme-listings:delete` + ownership

### Loan Applications
- `GET /api/loan-applications` - Requires `loan-applications:read`
- `POST /api/loan-applications` - Requires `loan-applications:write` (buyers)
- `PUT /api/loan-applications/:id/approve` - Requires `loan-applications:approve` (NBFCs)
- `PUT /api/loan-applications/:id/reject` - Requires `loan-applications:reject` (NBFCs)

### Escrow Management
- `POST /api/escrow` - Requires `escrow:write`
- `GET /api/escrow/:id` - Requires `escrow:read`
- `POST /api/escrow/:id/fund` - Requires `escrow:fund` (buyers)
- `POST /api/escrow/:id/release` - Requires `escrow:release` (admins/agents)
- `POST /api/escrow/:id/refund` - Requires `escrow:refund` (admins)

### Admin Operations
- `GET /api/admin/users` - Requires `users:read` (admins)
- `PUT /api/admin/users/:id/role` - Requires `users:admin` (admins)
- `DELETE /api/admin/users/:id` - Requires `users:delete` (admins)

### Analytics & Monitoring
- `GET /api/analytics/dashboard` - Requires `analytics:read`
- `GET /api/monitoring/health` - Requires `monitoring:read`
- `GET /api/monitoring/metrics` - Requires `monitoring:read`

## Permission Checking Flow

1. **Authentication**: Verify JWT token and extract user information
2. **Permission Lookup**: Get user's permissions based on role
3. **Base Permission Check**: Verify user has required permission
4. **Ownership Validation**: If required, check resource ownership
5. **Access Decision**: Allow or deny access based on checks

## Error Responses

### Insufficient Permissions
```json
{
  "message": "Insufficient permissions",
  "required": "msme-listings:write",
  "userRole": "buyer",
  "availablePermissions": ["msme-listings:read", "buyer-interests:write"]
}
```

### Ownership Violation
```json
{
  "message": "Access denied: Not the owner of this resource",
  "resourceType": "msme-listing",
  "resourceId": 123
}
```

## Rate Limiting

Rate limits are enforced based on user roles:

- **Admin**: 5000 requests per 15 minutes
- **NBFC**: 2000 requests per 15 minutes
- **Agent**: 1000 requests per 15 minutes
- **Buyer/Seller**: 500 requests per 15 minutes
- **Unauthenticated**: 100 requests per 15 minutes

## Testing RBAC

### Check User Permissions
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/auth/permissions
```

### Test Permission Denial
```bash
# Buyer trying to create listing (should fail)
curl -X POST \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessName": "Test", "industry": "Tech"}' \
  http://localhost:5000/api/msme-listings
```

### Test Ownership Validation
```bash
# User trying to update another user's listing (should fail)
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"businessName": "Updated Name"}' \
  http://localhost:5000/api/msme-listings/123
```

## Security Considerations

1. **Token Validation**: All protected routes require valid JWT tokens
2. **Role Isolation**: Users can only access resources appropriate to their role
3. **Ownership Enforcement**: Users can only modify resources they own
4. **Rate Limiting**: Prevents abuse and ensures fair resource usage
5. **Audit Trail**: All permission checks are logged for security monitoring

## Future Enhancements

1. **Dynamic Permissions**: Allow runtime permission assignment
2. **Resource-Level Permissions**: More granular resource-specific permissions
3. **Time-Based Access**: Temporary permission grants
4. **Delegation**: Allow users to delegate permissions to others
5. **Multi-Factor Authentication**: Enhanced security for sensitive operations