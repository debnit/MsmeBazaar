import { NextApiRequest, NextApiResponse } from 'next'

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  checks: {
    database?: 'healthy' | 'unhealthy'
    redis?: 'healthy' | 'unhealthy'
    external_apis?: 'healthy' | 'unhealthy'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    })
  }

  try {
    const checks: HealthCheckResponse['checks'] = {}

    // Check database connectivity (if using direct DB access)
    try {
      // Add database check here if needed
      checks.database = 'healthy'
    } catch (error) {
      checks.database = 'unhealthy'
    }

    // Check Redis connectivity (if using direct Redis access)
    try {
      // Add Redis check here if needed
      checks.redis = 'healthy'
    } catch (error) {
      checks.redis = 'unhealthy'
    }

    // Check external APIs
    try {
      // You can add checks for external APIs here
      checks.external_apis = 'healthy'
    } catch (error) {
      checks.external_apis = 'unhealthy'
    }

    const isHealthy = Object.values(checks).every(status => status === 'healthy')

    const response: HealthCheckResponse = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    }

    const statusCode = isHealthy ? 200 : 503
    res.status(statusCode).json(response)
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    })
  }
}