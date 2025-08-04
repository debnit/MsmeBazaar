// Valuation microservice with ML capabilities
import express from 'express';
import cors from 'cors';
import { serverMemoryManager } from '../shared/memory-management';

const app = express();
const PORT = process.env.VALUATION_SERVICE_PORT || 3003;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'valuation', status: 'healthy', timestamp: new Date().toISOString() });
});

// Business valuation endpoint
app.post('/valuate', async (req, res) => {
  try {
    const { businessData } = req.body;
    
    const valuation = await serverMemoryManager.loadPage(
      `valuation-${JSON.stringify(businessData)}`,
      () => calculateValuation(businessData),
      'medium'
    );
    
    res.json(valuation);
  } catch (error) {
    res.status(500).json({ error: 'Valuation failed' });
  }
});

// Advanced ML-based valuation calculation
async function calculateValuation(data: any) {
  // Simulate ML processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const {
    revenue = 0,
    profit = 0,
    assets = 0,
    employees = 0,
    industry = 'general',
    location = 'unknown'
  } = data;

  // Industry multipliers
  const industryMultipliers = {
    'technology': 8.5,
    'healthcare': 7.2,
    'finance': 6.8,
    'manufacturing': 5.5,
    'retail': 4.2,
    'services': 4.8,
    'general': 4.0
  };

  // Location multipliers (for Indian cities)
  const locationMultipliers = {
    'mumbai': 1.3,
    'bangalore': 1.25,
    'delhi': 1.2,
    'hyderabad': 1.15,
    'pune': 1.1,
    'chennai': 1.1,
    'kolkata': 1.05,
    'unknown': 1.0
  };

  const industryMultiplier = industryMultipliers[industry.toLowerCase()] || 4.0;
  const locationMultiplier = locationMultipliers[location.toLowerCase()] || 1.0;

  // Base valuation using multiple methods
  const revenueMultiple = revenue * industryMultiplier;
  const profitMultiple = profit * 15; // 15x profit multiple
  const assetValue = assets * 0.8; // 80% of asset value
  const employeeValue = employees * 50000; // ₹50k per employee

  // Weighted average
  const baseValuation = (
    revenueMultiple * 0.4 +
    profitMultiple * 0.3 +
    assetValue * 0.2 +
    employeeValue * 0.1
  );

  const finalValuation = baseValuation * locationMultiplier;

  return {
    valuation: Math.round(finalValuation),
    breakdown: {
      revenueMultiple: Math.round(revenueMultiple),
      profitMultiple: Math.round(profitMultiple),
      assetValue: Math.round(assetValue),
      employeeValue: Math.round(employeeValue)
    },
    multipliers: {
      industry: industryMultiplier,
      location: locationMultiplier
    },
    confidence: calculateConfidence(data),
    timestamp: new Date().toISOString()
  };
}

function calculateConfidence(data: any): number {
  let score = 0;
  
  if (data.revenue > 0) score += 25;
  if (data.profit > 0) score += 25;
  if (data.assets > 0) score += 20;
  if (data.employees > 0) score += 15;
  if (data.industry !== 'general') score += 10;
  if (data.location !== 'unknown') score += 5;
  
  return Math.min(score, 100);
}

// Get valuation history
app.get('/history/:businessId', async (req, res) => {
  try {
    // Simulate history retrieval
    const history = await serverMemoryManager.loadPage(
      `history-${req.params.businessId}`,
      () => Promise.resolve([]),
      'low'
    );
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`📊 Valuation service running on port ${PORT}`);
  });
}

export default app;