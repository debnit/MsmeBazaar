// Gamification system types

export interface UserProgress {
  level: number;
  currentXP: number;
  requiredXP: number;
  totalPoints: number;
  streak: number;
  rank: number;
  badges: string[];
  completedTasks: number;
  totalTasks: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'business' | 'social' | 'financial' | 'milestone';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'badge' | 'points' | 'discount' | 'feature_unlock';
  value: number;
  cost: number;
  available: boolean;
  claimed: boolean;
  expiresAt?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  level: number;
  totalPoints: number;
  rank: number;
  change: number; // Position change from last period
}

export interface GamificationStats {
  userProgress: UserProgress;
  achievements: Achievement[];
  availableRewards: Reward[];
  leaderboard: LeaderboardEntry[];
}

export interface ProgressUpdateRequest {
  action: string;
  points?: number;
  metadata?: Record<string, any>;
}

export interface GamificationContextType {
  userProgress: UserProgress | null;
  achievements: Achievement[];
  rewards: Reward[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  updateProgress: (request: ProgressUpdateRequest) => Promise<void>;
  claimReward: (rewardId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}