module.exports = {
  apps: [
    {
      name: "typinghub-backend",
      script: "./server.js",
      instances: 1,
      exec_mode: "fork",
      // Default env (used when starting without --env flag) — set to production for VPS safety
      env: {
        NODE_ENV: "production",
        PORT: 9501,
        FRONTEND_URL: "https://typinghub.in"
      },
      // Use: pm2 start ecosystem.config.js --env production
      env_production: {
        NODE_ENV: "production",
        PORT: 9501,
        FRONTEND_URL: "https://typinghub.in"
      },
      // Use: pm2 start ecosystem.config.js --env development (local dev only)
      env_development: {
        NODE_ENV: "development",
        PORT: 9501,
        FRONTEND_URL: "http://localhost:3000"
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      max_memory_restart: "1G",
      restart_delay: 10000,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
}; 