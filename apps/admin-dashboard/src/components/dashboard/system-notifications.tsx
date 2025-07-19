'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, X, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { api } from '@/lib/api'
import { SystemAlert } from '@/types/dashboard'
import { formatDistanceToNow } from 'date-fns'

export function SystemNotifications() {
  const queryClient = useQueryClient()
  
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: () => api.getSystemAlerts(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) => api.markAlertAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] })
    },
  })

  const dismissMutation = useMutation({
    mutationFn: (alertId: string) => api.dismissAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] })
    },
  })

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'new_signup':
        return <Info className="h-5 w-5 text-blue-500" />
      case 'api_health':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'incomplete_kyc':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'system_error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'low_wallet':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getSeverityColor = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'low':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="skeleton h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const notifications = alerts?.data || []
  const unreadCount = notifications.filter(alert => !alert.isRead).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            {notifications.length} total
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications at this time</p>
            </div>
          ) : (
            notifications.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border-l-4 rounded-lg transition-all hover:shadow-sm ${getSeverityColor(alert.severity)} ${
                  !alert.isRead ? 'border-r-2 border-r-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className={`font-medium text-sm ${!alert.isRead ? 'font-semibold' : ''}`}>
                          {alert.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                            </span>
                            <span className="capitalize font-medium">
                              {alert.severity}
                            </span>
                            {alert.relatedEntity && (
                              <span>
                                {alert.relatedEntity.type}: {alert.relatedEntity.name}
                              </span>
                            )}
                          </div>
                          
                          {alert.actionRequired && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                              Action Required
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!alert.isRead && (
                          <button
                            onClick={() => markAsReadMutation.mutate(alert.id)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="Mark as read"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => dismissMutation.mutate(alert.id)}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Dismiss"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {notifications.length > 5 && (
          <div className="mt-4 pt-4 border-t">
            <button className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all notifications
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}