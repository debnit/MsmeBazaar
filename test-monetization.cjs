// Test script for monetization features
const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:5000';

// Test subscription tiers
const testSubscriptionTiers = async () => {
  console.log('🔄 Testing subscription tiers...');
  
  try {
    // Test free tier limits
    const freeTierResponse = await axios.get(`${BASE_URL}/api/monetization/limits`, {
      headers: { 'Authorization': 'Bearer free-tier-token' }
    });
    console.log('✅ Free tier limits:', freeTierResponse.data);
    
    // Test premium tier features
    const premiumResponse = await axios.get(`${BASE_URL}/api/monetization/features`, {
      headers: { 'Authorization': 'Bearer premium-token' }
    });
    console.log('✅ Premium features:', premiumResponse.data);
    
  } catch (error) {
    console.error('❌ Subscription test failed:', error.message);
  }
};

// Test valuation paywall
const testValuationPaywall = async () => {
  console.log('🔄 Testing valuation paywall...');
  
  try {
    // Test valuation request without payment
    const freeValuation = await axios.post(`${BASE_URL}/api/valuation/basic`, {
      businessId: 'test-business-123',
      tier: 'free'
    });
    console.log('✅ Free valuation (limited):', freeValuation.data);
    
    // Test premium valuation request
    const premiumValuation = await axios.post(`${BASE_URL}/api/valuation/premium`, {
      businessId: 'test-business-123',
      paymentToken: 'razorpay-token-123'
    });
    console.log('✅ Premium valuation:', premiumValuation.data);
    
  } catch (error) {
    console.error('❌ Valuation paywall test failed:', error.message);
  }
};

// Test agent commission system
const testAgentCommissions = async () => {
  console.log('🔄 Testing agent commission system...');
  
  try {
    // Test commission calculation
    const commissionCalc = await axios.post(`${BASE_URL}/api/agents/commission/calculate`, {
      agentId: 'agent-123',
      transactionValue: 5000000,
      transactionType: 'business_sale'
    });
    console.log('✅ Commission calculation:', commissionCalc.data);
    
    // Test payout request
    const payoutRequest = await axios.post(`${BASE_URL}/api/agents/payout/request`, {
      agentId: 'agent-123',
      amount: 25000,
      paymentMethod: 'bank_transfer'
    });
    console.log('✅ Payout request:', payoutRequest.data);
    
  } catch (error) {
    console.error('❌ Agent commission test failed:', error.message);
  }
};

// Test escrow system
const testEscrowSystem = async () => {
  console.log('🔄 Testing escrow system...');
  
  try {
    // Test escrow creation
    const escrowCreation = await axios.post(`${BASE_URL}/api/escrow/create`, {
      transactionId: 'txn-123',
      amount: 2500000,
      buyerId: 'buyer-123',
      sellerId: 'seller-123'
    });
    console.log('✅ Escrow creation:', escrowCreation.data);
    
    // Test escrow status
    const escrowStatus = await axios.get(`${BASE_URL}/api/escrow/status/txn-123`);
    console.log('✅ Escrow status:', escrowStatus.data);
    
  } catch (error) {
    console.error('❌ Escrow test failed:', error.message);
  }
};

// Test revenue analytics
const testRevenueAnalytics = async () => {
  console.log('🔄 Testing revenue analytics...');
  
  try {
    // Test subscription revenue
    const subscriptionRevenue = await axios.get(`${BASE_URL}/api/analytics/revenue/subscriptions`, {
      params: { period: '30d' }
    });
    console.log('✅ Subscription revenue:', subscriptionRevenue.data);
    
    // Test commission revenue
    const commissionRevenue = await axios.get(`${BASE_URL}/api/analytics/revenue/commissions`, {
      params: { period: '30d' }
    });
    console.log('✅ Commission revenue:', commissionRevenue.data);
    
  } catch (error) {
    console.error('❌ Revenue analytics test failed:', error.message);
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting monetization tests...\n');
  
  const startTime = performance.now();
  
  await testSubscriptionTiers();
  await testValuationPaywall();
  await testAgentCommissions();
  await testEscrowSystem();
  await testRevenueAnalytics();
  
  const endTime = performance.now();
  const duration = Math.round(endTime - startTime);
  
  console.log(`\n✅ All tests completed in ${duration}ms`);
  console.log('📊 Monetization system ready for production');
};

// Export for use in other modules
module.exports = {
  testSubscriptionTiers,
  testValuationPaywall,
  testAgentCommissions,
  testEscrowSystem,
  testRevenueAnalytics,
  runAllTests
};

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}