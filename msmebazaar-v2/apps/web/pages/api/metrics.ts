import { NextApiRequest, NextApiResponse } from 'next'

// Simple metrics store (in production, use proper prometheus client)
let requestCount = 0
let requestDuration: number[] = []
const startTime = Date.now()

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  requestCount++
  const uptime = (Date.now() - startTime) / 1000

  // Calculate average response time
  const avgResponseTime = requestDuration.length > 0 
    ? requestDuration.reduce((a, b) => a + b, 0) / requestDuration.length 
    : 0

  // Basic Prometheus format metrics
  const metrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} ${requestCount}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP nodejs_process_uptime_seconds Node.js process uptime in seconds
# TYPE nodejs_process_uptime_seconds gauge
nodejs_process_uptime_seconds ${process.uptime()}

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_sum ${requestDuration.reduce((a, b) => a + b, 0)}
http_request_duration_seconds_count ${requestDuration.length}
http_request_duration_seconds_bucket{le="0.1"} ${requestDuration.filter(d => d <= 0.1).length}
http_request_duration_seconds_bucket{le="0.5"} ${requestDuration.filter(d => d <= 0.5).length}
http_request_duration_seconds_bucket{le="1.0"} ${requestDuration.filter(d => d <= 1.0).length}
http_request_duration_seconds_bucket{le="+Inf"} ${requestDuration.length}

# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${process.memoryUsage().heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${process.memoryUsage().heapUsed}
nodejs_memory_usage_bytes{type="external"} ${process.memoryUsage().external}

# HELP nodejs_version_info Node.js version information
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}"} 1`

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  res.status(200).send(metrics)
}

// Middleware to track request duration
export function trackRequestDuration(duration: number) {
  requestDuration.push(duration)
  // Keep only last 1000 requests to prevent memory leaks
  if (requestDuration.length > 1000) {
    requestDuration = requestDuration.slice(-1000)
  }
}