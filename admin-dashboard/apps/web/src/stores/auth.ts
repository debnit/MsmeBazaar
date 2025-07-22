import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'ANALYST' | 'FIELD_AGENT' | 'FRANCHISE'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED'
  organizationId?: string
  permissions: string[]
  regions: string[]
  departments: string[]
  lastLoginAt?: string
  createdAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  domain?: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled'
  trialEndsAt?: string
  maxUsers: number
  maxMsmes: number
  maxDeals: number
  timezone: string
  currency: string
  language: string
}

interface AuthState {
  // State
  user: User | null
  organization: Organization | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  refreshAuth: () => Promise<boolean>
  updateUser: (updates: Partial<User>) => void
  updateOrganization: (updates: Partial<Organization>) => void
  checkPermission: (permission: string) => boolean
  checkRole: (roles: string[]) => boolean
  
  // Multi-tenant
  switchOrganization: (orgId: string) => Promise<boolean>
  getCurrentTenant: () => Organization | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      organization: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Login action
      login: async (email: string, password: string) => {
        set({ isLoading: true })
        
        try {
          const response = await api.post('/auth/login', {
            email,
            password
          })

          const { user, organization, access_token, refresh_token } = response.data

          set({
            user,
            organization,
            token: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false
          })

          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

          toast.success(`Welcome back, ${user.firstName}!`)
          return true

        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Login failed'
          toast.error(message)
          return false
        }
      },

      // Logout action
      logout: () => {
        const { token } = get()
        
        // Blacklist token on server
        if (token) {
          api.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {
            // Ignore errors, just log out locally
          })
        }

        // Clear auth state
        set({
          user: null,
          organization: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false
        })

        // Remove token from API client
        delete api.defaults.headers.common['Authorization']

        toast.success('Logged out successfully')
      },

      // Refresh authentication
      refreshAuth: async () => {
        const { refreshToken } = get()
        
        if (!refreshToken) {
          return false
        }

        try {
          const response = await api.post('/auth/refresh', {
            refresh_token: refreshToken
          })

          const { access_token, refresh_token: newRefreshToken, user, organization } = response.data

          set({
            token: access_token,
            refreshToken: newRefreshToken,
            user,
            organization,
            isAuthenticated: true
          })

          // Update API client token
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

          return true

        } catch (error) {
          // Refresh failed, logout user
          get().logout()
          return false
        }
      },

      // Update user
      updateUser: (updates: Partial<User>) => {
        set(state => ({
          user: state.user ? { ...state.user, ...updates } : null
        }))
      },

      // Update organization
      updateOrganization: (updates: Partial<Organization>) => {
        set(state => ({
          organization: state.organization ? { ...state.organization, ...updates } : null
        }))
      },

      // Check permission
      checkPermission: (permission: string) => {
        const { user } = get()
        if (!user) return false
        
        // Super admin has all permissions
        if (user.role === 'SUPER_ADMIN') return true
        
        return user.permissions.includes(permission)
      },

      // Check role
      checkRole: (roles: string[]) => {
        const { user } = get()
        if (!user) return false
        
        return roles.includes(user.role)
      },

      // Switch organization (for super admin)
      switchOrganization: async (orgId: string) => {
        const { user } = get()
        
        if (!user || user.role !== 'SUPER_ADMIN') {
          toast.error('Permission denied')
          return false
        }

        try {
          const response = await api.post(`/auth/switch-org/${orgId}`)
          const { organization, access_token } = response.data

          set({
            organization,
            token: access_token
          })

          // Update API client token
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

          toast.success(`Switched to ${organization.name}`)
          return true

        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to switch organization'
          toast.error(message)
          return false
        }
      },

      // Get current tenant
      getCurrentTenant: () => {
        const { organization } = get()
        return organization
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        // Set token in API client after rehydration
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
      }
    }
  )
)

// API interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const success = await useAuthStore.getState().refreshAuth()
      
      if (success) {
        const token = useAuthStore.getState().token
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

// Permissions helper
export const Permissions = {
  // Organization permissions
  ORG_READ: 'org:read',
  ORG_WRITE: 'org:write',
  ORG_DELETE: 'org:delete',
  
  // User permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_INVITE: 'user:invite',
  
  // MSME permissions
  MSME_READ: 'msme:read',
  MSME_WRITE: 'msme:write',
  MSME_DELETE: 'msme:delete',
  MSME_VERIFY: 'msme:verify',
  
  // Deal permissions
  DEAL_READ: 'deal:read',
  DEAL_WRITE: 'deal:write',
  DEAL_DELETE: 'deal:delete',
  DEAL_ASSIGN: 'deal:assign',
  
  // Valuation permissions
  VALUATION_READ: 'valuation:read',
  VALUATION_WRITE: 'valuation:write',
  VALUATION_APPROVE: 'valuation:approve',
  
  // Workflow permissions
  WORKFLOW_READ: 'workflow:read',
  WORKFLOW_WRITE: 'workflow:write',
  WORKFLOW_EXECUTE: 'workflow:execute',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Billing permissions
  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write'
} as const

// Roles helper
export const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  TEAM_LEAD: 'TEAM_LEAD',
  ANALYST: 'ANALYST',
  FIELD_AGENT: 'FIELD_AGENT',
  FRANCHISE: 'FRANCHISE'
} as const