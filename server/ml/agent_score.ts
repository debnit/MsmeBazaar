// src/utils/agentScoring.ts

export type AgentInput = {
  agentId: string;
  verified: boolean;
  dealsClosed: number;
  avgDealSize: number; // in INR
  responseTimeHours: number;
  buyerFeedbackScore: number; // out of 5
  sellerFeedbackScore: number; // out of 5
};

export type AgentScoreOutput = {
  agentId: string;
  finalScore: number; // out of 100
  rating: 'Gold' | 'Silver' | 'Bronze';
  insights: string[];
};

export function scoreAgent(agent: AgentInput): AgentScoreOutput {
  let score = 0;
  const insights: string[] = [];

  // Weightage 1: KYC Verification
  if (agent.verified) {
    score += 15;
    insights.push('✅ KYC Verified');
  } else {
    insights.push('⚠️ KYC not verified');
  }

  // Weightage 2: Deal History
  if (agent.dealsClosed > 50) {
    score += 20;
    insights.push('📈 Excellent deal history');
  } else if (agent.dealsClosed > 10) {
    score += 10;
    insights.push('🟡 Moderate deal history');
  } else {
    score += 5;
    insights.push('🔴 Needs more closures');
  }

  // Weightage 3: Avg Deal Size
  if (agent.avgDealSize > 1000000) {
    score += 15;
    insights.push('💰 Handles large deals');
  } else if (agent.avgDealSize > 300000) {
    score += 10;
    insights.push('💼 Handles mid-range deals');
  } else {
    score += 5;
    insights.push('📉 Deals are smaller');
  }

  // Weightage 4: Response Time (lower is better)
  if (agent.responseTimeHours < 2) {
    score += 15;
    insights.push('⚡ Very responsive');
  } else if (agent.responseTimeHours < 12) {
    score += 8;
    insights.push('🕐 Reasonably responsive');
  } else {
    score += 3;
    insights.push('🐢 Slow response');
  }

  // Weightage 5: Feedback (Avg of buyer + seller)
  const feedbackAvg =
    (agent.buyerFeedbackScore + agent.sellerFeedbackScore) / 2;
  if (feedbackAvg >= 4.5) {
    score += 20;
    insights.push('🌟 Excellent reviews');
  } else if (feedbackAvg >= 3.5) {
    score += 10;
    insights.push('🙂 Decent reviews');
  } else {
    score += 5;
    insights.push('⚠️ Needs improvement');
  }

  // Normalize score to 100
  score = Math.min(100, score);

  // Final rating
  let rating: 'Gold' | 'Silver' | 'Bronze';
  if (score >= 80) {rating = 'Gold';}
  else if (score >= 60) {rating = 'Silver';}
  else {rating = 'Bronze';}

  return {
    agentId: agent.agentId,
    finalScore: score,
    rating,
    insights,
  };
}
