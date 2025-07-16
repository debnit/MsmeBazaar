// Agent gamification system with leaderboards, rewards, and streaks
import { storage } from '../storage';
import { queueManager } from '../infrastructure/queue-system';
import { notificationService } from './notification-service';

interface AgentProfile {
  agentId: string;
  level: number;
  experience: number;
  totalEarnings: number;
  rank: number;
  badges: Badge[];
  streaks: Streak[];
  achievements: Achievement[];
  statistics: AgentStats;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
  category: 'sales' | 'client' | 'performance' | 'special';
}

interface Streak {
  type: 'daily_login' | 'weekly_deals' | 'monthly_target' | 'client_satisfaction';
  currentStreak: number;
  bestStreak: number;
  lastUpdateDate: string;
  active: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
  completedAt?: string;
  reward?: Reward;
}

interface Reward {
  type: 'points' | 'badge' | 'commission_boost' | 'priority_listing' | 'cash';
  value: number;
  description: string;
  expiresAt?: string;
}

interface AgentStats {
  totalDeals: number;
  totalRevenue: number;
  averageRating: number;
  clientRetentionRate: number;
  responseTime: number;
  conversionRate: number;
  monthlyGrowth: number;
}

interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category: 'earnings' | 'deals' | 'rating' | 'growth';
  entries: LeaderboardEntry[];
  lastUpdated: string;
}

interface LeaderboardEntry {
  agentId: string;
  agentName: string;
  score: number;
  rank: number;
  change: number; // Position change from last period
  avatar?: string;
  level: number;
  badge?: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'team' | 'global';
  startDate: string;
  endDate: string;
  target: number;
  currentProgress: number;
  participants: string[];
  rewards: Reward[];
  status: 'upcoming' | 'active' | 'completed';
}

interface Team {
  id: string;
  name: string;
  members: string[];
  leader: string;
  totalPoints: number;
  averageRating: number;
  teamBadges: Badge[];
  challenges: string[];
}

class AgentGamificationService {
  private agentProfiles: Map<string, AgentProfile> = new Map();
  private leaderboards: Map<string, Leaderboard> = new Map();
  private challenges: Map<string, Challenge> = new Map();
  private teams: Map<string, Team> = new Map();

  constructor() {
    this.initializeGamificationSystem();
  }

  // Get agent profile with all gamification data
  async getAgentProfile(agentId: string): Promise<AgentProfile> {
    if (!this.agentProfiles.has(agentId)) {
      await this.createAgentProfile(agentId);
    }
    return this.agentProfiles.get(agentId)!;
  }

  // Update agent stats after a transaction
  async updateAgentStats(agentId: string, transaction: any): Promise<void> {
    const profile = await this.getAgentProfile(agentId);
    
    // Update statistics
    profile.statistics.totalDeals += 1;
    profile.statistics.totalRevenue += transaction.amount;
    profile.totalEarnings += transaction.commission;
    
    // Award experience points
    const experienceGained = this.calculateExperiencePoints(transaction);
    profile.experience += experienceGained;
    
    // Check for level up
    const newLevel = this.calculateLevel(profile.experience);
    if (newLevel > profile.level) {
      await this.handleLevelUp(agentId, profile.level, newLevel);
      profile.level = newLevel;
    }
    
    // Update streaks
    await this.updateStreaks(agentId, 'deal_completed');
    
    // Check achievements
    await this.checkAchievements(agentId);
    
    // Award badges
    await this.checkBadgeEligibility(agentId);
    
    // Update profile
    this.agentProfiles.set(agentId, profile);
    
    // Queue leaderboard update
    await queueManager.addSystemTask('update_leaderboards', { agentId });
  }

  // Get leaderboard for specific period and category
  async getLeaderboard(period: string, category: string): Promise<Leaderboard> {
    const key = `${period}_${category}`;
    
    if (!this.leaderboards.has(key)) {
      await this.generateLeaderboard(period as any, category as any);
    }
    
    return this.leaderboards.get(key)!;
  }

  // Create or join a team
  async createTeam(teamName: string, leaderId: string): Promise<Team> {
    const team: Team = {
      id: `team_${Date.now()}`,
      name: teamName,
      members: [leaderId],
      leader: leaderId,
      totalPoints: 0,
      averageRating: 0,
      teamBadges: [],
      challenges: [],
    };
    
    this.teams.set(team.id, team);
    
    // Award team creation badge
    await this.awardBadge(leaderId, 'team_leader');
    
    return team;
  }

  // Join existing team
  async joinTeam(teamId: string, agentId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    
    if (team.members.includes(agentId)) {
      throw new Error('Agent already in team');
    }
    
    team.members.push(agentId);
    this.teams.set(teamId, team);
    
    // Award team player badge
    await this.awardBadge(agentId, 'team_player');
    
    // Notify team members
    await notificationService.sendNotification({
      userId: team.leader,
      type: 'team_member_joined',
      title: 'New Team Member',
      message: `${agentId} has joined your team`,
      data: { teamId, agentId },
    });
  }

  // Create new challenge
  async createChallenge(challenge: Omit<Challenge, 'id' | 'currentProgress' | 'participants'>): Promise<Challenge> {
    const newChallenge: Challenge = {
      ...challenge,
      id: `challenge_${Date.now()}`,
      currentProgress: 0,
      participants: [],
    };
    
    this.challenges.set(newChallenge.id, newChallenge);
    
    // Notify eligible agents
    await this.notifyEligibleAgents(newChallenge);
    
    return newChallenge;
  }

  // Join challenge
  async joinChallenge(challengeId: string, agentId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    if (challenge.participants.includes(agentId)) {
      throw new Error('Agent already participating');
    }
    
    challenge.participants.push(agentId);
    this.challenges.set(challengeId, challenge);
    
    // Send welcome notification
    await notificationService.sendNotification({
      userId: agentId,
      type: 'challenge_joined',
      title: 'Challenge Joined',
      message: `You've joined the ${challenge.name} challenge`,
      data: { challengeId },
    });
  }

  // Get agent achievements
  async getAchievements(agentId: string): Promise<Achievement[]> {
    const profile = await this.getAgentProfile(agentId);
    return profile.achievements;
  }

  // Get available rewards
  async getAvailableRewards(agentId: string): Promise<Reward[]> {
    const profile = await this.getAgentProfile(agentId);
    const rewards: Reward[] = [];
    
    // Level-based rewards
    rewards.push({
      type: 'commission_boost',
      value: profile.level * 0.5,
      description: `${profile.level * 0.5}% commission boost for Level ${profile.level}`,
    });
    
    // Streak rewards
    const activeStreaks = profile.streaks.filter(s => s.active);
    activeStreaks.forEach(streak => {
      if (streak.currentStreak >= 7) {
        rewards.push({
          type: 'priority_listing',
          value: 1,
          description: `Priority listing for ${streak.currentStreak}-day streak`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    });
    
    return rewards;
  }

  // Redeem reward
  async redeemReward(agentId: string, rewardId: string): Promise<void> {
    // Implementation for reward redemption
    await queueManager.addSystemTask('process_reward_redemption', {
      agentId,
      rewardId,
      timestamp: new Date().toISOString(),
    });
  }

  // Get gamification analytics
  async getGamificationAnalytics(period: string = '30d'): Promise<any> {
    return {
      totalActiveAgents: 1247,
      averageLevel: 12.4,
      totalBadgesAwarded: 5623,
      totalChallengesCompleted: 342,
      engagementMetrics: {
        dailyActiveUsers: 892,
        averageSessionTime: 45.2,
        streakParticipation: 78.3,
        teamParticipation: 34.7,
      },
      topPerformers: [
        { agentId: 'agent_1', name: 'Rajesh Kumar', level: 25, totalEarnings: 125000 },
        { agentId: 'agent_2', name: 'Priya Sharma', level: 23, totalEarnings: 118000 },
        { agentId: 'agent_3', name: 'Amit Patel', level: 21, totalEarnings: 112000 },
      ],
      challengeStats: {
        totalActive: 12,
        totalParticipants: 1847,
        completionRate: 67.3,
      },
    };
  }

  // Private helper methods
  private async createAgentProfile(agentId: string): Promise<void> {
    const agent = await storage.getAgentById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    const profile: AgentProfile = {
      agentId,
      level: 1,
      experience: 0,
      totalEarnings: 0,
      rank: 0,
      badges: [],
      streaks: this.initializeStreaks(),
      achievements: this.initializeAchievements(),
      statistics: {
        totalDeals: 0,
        totalRevenue: 0,
        averageRating: 0,
        clientRetentionRate: 0,
        responseTime: 0,
        conversionRate: 0,
        monthlyGrowth: 0,
      },
    };
    
    this.agentProfiles.set(agentId, profile);
  }

  private calculateExperiencePoints(transaction: any): number {
    let points = 100; // Base points
    
    // Bonus for transaction size
    if (transaction.amount > 1000000) points += 50;
    if (transaction.amount > 5000000) points += 100;
    
    // Bonus for client satisfaction
    if (transaction.rating >= 4.5) points += 25;
    if (transaction.rating >= 4.8) points += 50;
    
    // Bonus for quick response
    if (transaction.responseTime < 2) points += 25;
    
    return points;
  }

  private calculateLevel(experience: number): number {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  private async handleLevelUp(agentId: string, oldLevel: number, newLevel: number): Promise<void> {
    // Send congratulations notification
    await notificationService.sendNotification({
      userId: agentId,
      type: 'level_up',
      title: 'Level Up!',
      message: `Congratulations! You've reached Level ${newLevel}`,
      data: { oldLevel, newLevel },
    });
    
    // Award level-up badge
    await this.awardBadge(agentId, `level_${newLevel}`);
    
    // Unlock new features or rewards
    await this.unlockLevelRewards(agentId, newLevel);
  }

  private async updateStreaks(agentId: string, action: string): Promise<void> {
    const profile = await this.getAgentProfile(agentId);
    const today = new Date().toISOString().split('T')[0];
    
    profile.streaks.forEach(streak => {
      if (streak.type === 'daily_login' && action === 'login') {
        const lastUpdate = streak.lastUpdateDate;
        if (lastUpdate !== today) {
          if (this.isConsecutiveDay(lastUpdate, today)) {
            streak.currentStreak += 1;
            streak.bestStreak = Math.max(streak.bestStreak, streak.currentStreak);
          } else {
            streak.currentStreak = 1;
          }
          streak.lastUpdateDate = today;
          streak.active = true;
        }
      }
    });
  }

  private async checkAchievements(agentId: string): Promise<void> {
    const profile = await this.getAgentProfile(agentId);
    
    profile.achievements.forEach(achievement => {
      if (achievement.completed) return;
      
      // Check different achievement types
      switch (achievement.id) {
        case 'first_deal':
          if (profile.statistics.totalDeals >= 1) {
            this.completeAchievement(agentId, achievement);
          }
          break;
        case 'deal_maker':
          if (profile.statistics.totalDeals >= 10) {
            this.completeAchievement(agentId, achievement);
          }
          break;
        case 'high_earner':
          if (profile.totalEarnings >= 100000) {
            this.completeAchievement(agentId, achievement);
          }
          break;
        case 'client_champion':
          if (profile.statistics.averageRating >= 4.8) {
            this.completeAchievement(agentId, achievement);
          }
          break;
      }
    });
  }

  private async completeAchievement(agentId: string, achievement: Achievement): Promise<void> {
    achievement.completed = true;
    achievement.completedAt = new Date().toISOString();
    
    // Award points and rewards
    const profile = await this.getAgentProfile(agentId);
    profile.experience += achievement.points;
    
    // Send notification
    await notificationService.sendNotification({
      userId: agentId,
      type: 'achievement_unlocked',
      title: 'Achievement Unlocked!',
      message: `You've completed: ${achievement.name}`,
      data: { achievement },
    });
  }

  private async checkBadgeEligibility(agentId: string): Promise<void> {
    const profile = await this.getAgentProfile(agentId);
    
    // Check for various badge conditions
    if (profile.statistics.totalDeals >= 50 && !this.hasBadge(profile, 'deal_master')) {
      await this.awardBadge(agentId, 'deal_master');
    }
    
    if (profile.statistics.averageRating >= 4.9 && !this.hasBadge(profile, 'excellence_award')) {
      await this.awardBadge(agentId, 'excellence_award');
    }
    
    if (profile.totalEarnings >= 500000 && !this.hasBadge(profile, 'top_earner')) {
      await this.awardBadge(agentId, 'top_earner');
    }
  }

  private async awardBadge(agentId: string, badgeId: string): Promise<void> {
    const profile = await this.getAgentProfile(agentId);
    const badgeData = this.getBadgeData(badgeId);
    
    if (badgeData && !this.hasBadge(profile, badgeId)) {
      profile.badges.push({
        ...badgeData,
        earnedAt: new Date().toISOString(),
      });
      
      // Send notification
      await notificationService.sendNotification({
        userId: agentId,
        type: 'badge_awarded',
        title: 'Badge Earned!',
        message: `You've earned the ${badgeData.name} badge`,
        data: { badge: badgeData },
      });
    }
  }

  private async generateLeaderboard(period: Leaderboard['period'], category: Leaderboard['category']): Promise<void> {
    const agents = Array.from(this.agentProfiles.values());
    
    // Sort agents based on category
    agents.sort((a, b) => {
      switch (category) {
        case 'earnings':
          return b.totalEarnings - a.totalEarnings;
        case 'deals':
          return b.statistics.totalDeals - a.statistics.totalDeals;
        case 'rating':
          return b.statistics.averageRating - a.statistics.averageRating;
        case 'growth':
          return b.statistics.monthlyGrowth - a.statistics.monthlyGrowth;
        default:
          return 0;
      }
    });
    
    // Create leaderboard entries
    const entries: LeaderboardEntry[] = agents.slice(0, 50).map((agent, index) => ({
      agentId: agent.agentId,
      agentName: `Agent ${agent.agentId}`, // In production, get actual name
      score: this.getScoreForCategory(agent, category),
      rank: index + 1,
      change: 0, // Calculate from previous period
      level: agent.level,
      badge: agent.badges[0]?.name,
    }));
    
    const leaderboard: Leaderboard = {
      period,
      category,
      entries,
      lastUpdated: new Date().toISOString(),
    };
    
    this.leaderboards.set(`${period}_${category}`, leaderboard);
  }

  private initializeStreaks(): Streak[] {
    return [
      {
        type: 'daily_login',
        currentStreak: 0,
        bestStreak: 0,
        lastUpdateDate: '',
        active: false,
      },
      {
        type: 'weekly_deals',
        currentStreak: 0,
        bestStreak: 0,
        lastUpdateDate: '',
        active: false,
      },
      {
        type: 'monthly_target',
        currentStreak: 0,
        bestStreak: 0,
        lastUpdateDate: '',
        active: false,
      },
    ];
  }

  private initializeAchievements(): Achievement[] {
    return [
      {
        id: 'first_deal',
        name: 'First Deal',
        description: 'Complete your first transaction',
        points: 100,
        progress: 0,
        maxProgress: 1,
        completed: false,
      },
      {
        id: 'deal_maker',
        name: 'Deal Maker',
        description: 'Complete 10 transactions',
        points: 500,
        progress: 0,
        maxProgress: 10,
        completed: false,
      },
      {
        id: 'high_earner',
        name: 'High Earner',
        description: 'Earn ₹1,00,000 in commissions',
        points: 1000,
        progress: 0,
        maxProgress: 100000,
        completed: false,
      },
    ];
  }

  private initializeGamificationSystem(): void {
    // Initialize system with default data
    console.log('Agent gamification system initialized');
  }

  private hasBadge(profile: AgentProfile, badgeId: string): boolean {
    return profile.badges.some(badge => badge.id === badgeId);
  }

  private getBadgeData(badgeId: string): Badge | null {
    const badges = {
      deal_master: {
        id: 'deal_master',
        name: 'Deal Master',
        description: 'Completed 50+ deals',
        icon: 'trophy',
        rarity: 'epic' as const,
        category: 'sales' as const,
      },
      excellence_award: {
        id: 'excellence_award',
        name: 'Excellence Award',
        description: 'Maintained 4.9+ rating',
        icon: 'star',
        rarity: 'legendary' as const,
        category: 'performance' as const,
      },
      top_earner: {
        id: 'top_earner',
        name: 'Top Earner',
        description: 'Earned ₹5,00,000+',
        icon: 'money',
        rarity: 'epic' as const,
        category: 'sales' as const,
      },
    };
    
    return badges[badgeId] || null;
  }

  private getScoreForCategory(agent: AgentProfile, category: string): number {
    switch (category) {
      case 'earnings':
        return agent.totalEarnings;
      case 'deals':
        return agent.statistics.totalDeals;
      case 'rating':
        return agent.statistics.averageRating;
      case 'growth':
        return agent.statistics.monthlyGrowth;
      default:
        return 0;
    }
  }

  private isConsecutiveDay(lastDate: string, currentDate: string): boolean {
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    const diffTime = Math.abs(current.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  private async unlockLevelRewards(agentId: string, level: number): Promise<void> {
    // Unlock level-specific rewards
    const rewards = this.getLevelRewards(level);
    for (const reward of rewards) {
      await this.grantReward(agentId, reward);
    }
  }

  private getLevelRewards(level: number): Reward[] {
    return [
      {
        type: 'commission_boost',
        value: level * 0.5,
        description: `${level * 0.5}% commission boost`,
      },
    ];
  }

  private async grantReward(agentId: string, reward: Reward): Promise<void> {
    // Grant reward to agent
    console.log(`Granting reward to ${agentId}:`, reward);
  }

  private async notifyEligibleAgents(challenge: Challenge): Promise<void> {
    // Notify agents about new challenge
    console.log(`Notifying agents about challenge: ${challenge.name}`);
  }
}

export const agentGamificationService = new AgentGamificationService();
export { AgentProfile, Badge, Streak, Achievement, Leaderboard, Challenge, Team, Reward };