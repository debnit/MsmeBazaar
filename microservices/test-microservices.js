// Simple test script to demonstrate microservices functionality
const express = require('express');
const cors = require('cors');

// Simulate microservices for testing
const services = {
  auth: express(),
  msme: express(),
  valuation: express(),
  gateway: express()
};

// Auth Service Mock
services.auth.use(cors());
services.auth.use(express.json());
services.auth.get('/health', (req, res) => {
  res.json({ service: 'auth', status: 'healthy', timestamp: new Date().toISOString() });
});
services.auth.post('/login', (req, res) => {
  res.json({ token: 'mock-jwt-token', user: { id: 1, email: 'test@example.com' } });
});

// MSME Service Mock
services.msme.use(cors());
services.msme.use(express.json());
services.msme.get('/health', (req, res) => {
  res.json({ service: 'msme', status: 'healthy', timestamp: new Date().toISOString() });
});
services.msme.get('/listings', (req, res) => {
  res.json([
    { id: 1, name: 'Tech Startup', industry: 'technology', revenue: 1000000 },
    { id: 2, name: 'Manufacturing Co', industry: 'manufacturing', revenue: 2000000 }
  ]);
});

// Valuation Service Mock
services.valuation.use(cors());
services.valuation.use(express.json());
services.valuation.get('/health', (req, res) => {
  res.json({ service: 'valuation', status: 'healthy', timestamp: new Date().toISOString() });
});
services.valuation.post('/valuate', (req, res) => {
  const { revenue = 1000000, industry = 'general' } = req.body;
  const multiplier = industry === 'technology' ? 8.5 : 4.0;
  res.json({
    valuation: revenue * multiplier,
    confidence: 85,
    timestamp: new Date().toISOString()
  });
});

// API Gateway Mock
services.gateway.use(cors());
services.gateway.use(express.json());
services.gateway.get('/health', (req, res) => {
  res.json({ service: 'gateway', status: 'healthy', timestamp: new Date().toISOString() });
});
services.gateway.get('/health/all', async (req, res) => {
  const healthChecks = await Promise.allSettled([
    fetch('http://localhost:3001/health').then(r => r.json()),
    fetch('http://localhost:3002/health').then(r => r.json()),
    fetch('http://localhost:3003/health').then(r => r.json())
  ]);
  
  res.json({
    gateway: 'healthy',
    services: healthChecks.map(result => 
      result.status === 'fulfilled' ? result.value : { error: result.reason }
    ),
    timestamp: new Date().toISOString()
  });
});

// Start all services
const ports = { auth: 3001, msme: 3002, valuation: 3003, gateway: 3000 };

Object.entries(services).forEach(([name, app]) => {
  app.listen(ports[name], () => {
    console.log(`🚀 ${name} service running on port ${ports[name]}`);
  });
});

console.log('🎉 All microservices started successfully!');
console.log('📋 Available endpoints:');
console.log('   Gateway: http://localhost:3000/health');
console.log('   Auth: http://localhost:3001/health');
console.log('   MSME: http://localhost:3002/health');
console.log('   Valuation: http://localhost:3003/health');
console.log('   All Health: http://localhost:3000/health/all');