// PM2 ecosystem configuration for clustering
module.exports = {
  apps: [
    {
      name: 'msme-atlas-api',
      script: './server/fastify-server.ts',
      interpreter: 'tsx',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        HOST: '0.0.0.0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0',
        LOG_LEVEL: 'warn',
      },
      // Performance optimizations
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Auto-restart on file changes (development only)
      watch: process.env.NODE_ENV !== 'production',
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Resource limits
      max_old_space_size: 400,
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Advanced features
      source_map_support: true,
      instance_var: 'INSTANCE_ID',
      
      // Cluster settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Environment variables
      env_file: '.env.local',
    },
    {
      name: 'msme-atlas-worker',
      script: './server/workers/background-worker.ts',
      interpreter: 'tsx',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'background',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'background',
      },
      max_memory_restart: '300M',
      max_restarts: 5,
      min_uptime: '10s',
      cron_restart: '0 0 * * *', // Restart daily at midnight
    },
  ],
  
  // Deploy configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/msme-atlas.git',
      path: '/var/www/msme-atlas',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/yourusername/msme-atlas.git',
      path: '/var/www/msme-atlas-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};