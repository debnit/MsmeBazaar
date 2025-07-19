import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Trophy, 
  Star, 
  Target, 
  TrendingUp, 
  Award, 
  Users, 
  Zap,
  Gift,
  Crown,
  Medal,
  Flame,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, queryKeys } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
import { useToastHelpers } from '@/lib/toast';

interface UserStats {
  user_id: string;
  total_points: number;
  level: int;
  badges: string[];
  achievements: string[];
  rank?: number;
  next_level_points: number;
  progress_percentage: number;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_points: number;
  level: number;
  badges_count: number;
  rank: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  points_required: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_reward: number;
}

export const GamificationDashboard: React.FC = () => {
  const { user } = useAuth();
  const { success } = useToastHelpers();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'badges' | 'achievements' | 'leaderboard'>('overview');
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.user(user?.id || ''),
    queryFn: () => api.gamification.getUserStats(user?.id || ''),
    enabled: !!user?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.gamification.getLeaderboard(),
  });

  // Fetch badges
  const { data: badges } = useQuery({
    queryKey: ['badges'],
    queryFn: () => api.gamification.getBadges(),
  });

  // Fetch achievements
  const { data: achievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.gamification.getAchievements(),
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'achievements', label: 'Achievements', icon: Target },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const getLevelColor = (level: number) => {
    if (level >= 15) return 'from-purple-500 to-pink-500';
    if (level >= 10) return 'from-yellow-400 to-orange-500';
    if (level >= 5) return 'from-blue-500 to-cyan-500';
    return 'from-green-400 to-blue-500';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-purple-500 to-pink-500';
      case 'epic': return 'from-yellow-400 to-orange-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      case 'uncommon': return 'from-green-400 to-teal-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const StatsCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'relative p-6 rounded-xl bg-gradient-to-br shadow-soft border border-border/50',
        'hover:shadow-medium transition-all duration-300',
        color
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white/80 mb-1">{title}</h3>
          <motion.p 
            className="text-3xl font-bold text-white"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-sm text-white/60 mt-1">{subtitle}</p>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
          className="p-3 bg-white/20 rounded-full backdrop-blur-sm"
        >
          <Icon className="h-6 w-6 text-white" />
        </motion.div>
      </div>
    </motion.div>
  );

  const ProgressBar = ({ progress, className }: { progress: number; className?: string }) => (
    <div className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}>
      <motion.div
        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );

  const BadgeCard = ({ badge, earned }: { badge: Badge; earned: boolean }) => (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative p-4 rounded-lg border transition-all duration-300',
        earned 
          ? 'bg-gradient-to-br shadow-medium border-primary/20' + ' ' + getRarityColor(badge.rarity)
          : 'bg-muted/50 border-muted hover:border-border grayscale'
      )}
    >
      <div className="text-center">
        <motion.div
          animate={earned ? { rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-4xl mb-2"
        >
          {badge.icon}
        </motion.div>
        <h3 className={cn(
          'font-semibold mb-1',
          earned ? 'text-white' : 'text-muted-foreground'
        )}>
          {badge.name}
        </h3>
        <p className={cn(
          'text-xs',
          earned ? 'text-white/80' : 'text-muted-foreground'
        )}>
          {badge.description}
        </p>
        <div className="mt-2 flex items-center justify-center gap-1">
          <Star className="h-3 w-3 text-yellow-400" />
          <span className={cn(
            'text-xs font-medium',
            earned ? 'text-white' : 'text-muted-foreground'
          )}>
            {badge.points_required} pts
          </span>
        </div>
      </div>
      {earned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1"
        >
          <Trophy className="h-3 w-3" />
        </motion.div>
      )}
    </motion.div>
  );

  const AchievementCard = ({ achievement, earned }: { achievement: Achievement; earned: boolean }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'p-4 rounded-lg border flex items-center gap-4 transition-all duration-300',
        earned 
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20'
          : 'bg-muted/50 border-muted'
      )}
    >
      <motion.div
        animate={earned ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
        className={cn(
          'text-3xl p-2 rounded-full',
          earned ? 'bg-green-500/20' : 'bg-muted'
        )}
      >
        {achievement.icon}
      </motion.div>
      <div className="flex-1">
        <h3 className={cn(
          'font-semibold',
          earned ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {achievement.name}
        </h3>
        <p className="text-sm text-muted-foreground">{achievement.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="text-xs font-medium">{achievement.points_reward} points</span>
          </div>
        </div>
      </div>
      {earned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-green-500"
        >
          <Trophy className="h-5 w-5" />
        </motion.div>
      )}
    </motion.div>
  );

  const LeaderboardRow = ({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg transition-all duration-300',
        isCurrentUser && 'bg-primary/10 border border-primary/20'
      )}
    >
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full font-bold',
        entry.rank <= 3 
          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
          : 'bg-muted text-muted-foreground'
      )}>
        {entry.rank <= 3 ? (
          <Crown className="h-4 w-4" />
        ) : (
          entry.rank
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            'font-semibold',
            isCurrentUser && 'text-primary'
          )}>
            {entry.username}
          </h3>
          {isCurrentUser && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
              You
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Level {entry.level}</span>
          <span>{entry.badges_count} badges</span>
        </div>
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="font-bold">{entry.total_points.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Flame className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="heading-lg mb-2">🎮 Gamification Hub</h1>
        <p className="text-muted-foreground">
          Level up your MSME journey with rewards, badges, and achievements!
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          title="Current Level"
          value={userStats?.level || 0}
          icon={Star}
          color={getLevelColor(userStats?.level || 0)}
          subtitle={`${userStats?.total_points || 0} total points`}
        />
        <StatsCard
          title="Global Rank"
          value={userStats?.rank ? `#${userStats.rank}` : 'Unranked'}
          icon={Trophy}
          color="from-purple-500 to-pink-500"
        />
        <StatsCard
          title="Badges Earned"
          value={userStats?.badges?.length || 0}
          icon={Award}
          color="from-blue-500 to-cyan-500"
        />
        <StatsCard
          title="Achievements"
          value={userStats?.achievements?.length || 0}
          icon={Target}
          color="from-green-400 to-teal-500"
        />
      </motion.div>

      {/* Level Progress */}
      <motion.div 
        variants={itemVariants}
        className="card-base p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Level Progress</h2>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Flame className="h-5 w-5 text-orange-500" />
          </motion.div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Level {userStats?.level || 0}
            </span>
            <span className="text-sm text-muted-foreground">
              {userStats?.next_level_points || 0} points to next level
            </span>
          </div>
          
          <ProgressBar progress={userStats?.progress_percentage || 0} />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {userStats?.total_points || 0} points
            </span>
            <span className="text-primary font-medium">
              {(userStats?.progress_percentage || 0).toFixed(1)}% complete
            </span>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all duration-200',
                  selectedTab === tab.id
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="card-base p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {/* Activity items would go here */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-green-500/20 rounded-full">
                      <Trophy className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">MSME Registered</p>
                      <p className="text-xs text-muted-foreground">+200 points</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card-base p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg flex items-center justify-between"
                  >
                    <span>Complete Profile</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>+75</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'badges' && (
            <div className="card-base p-6">
              <h3 className="text-lg font-semibold mb-6">Badge Collection</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges?.badges?.map((badge: Badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    earned={userStats?.badges?.includes(badge.id) || false}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'achievements' && (
            <div className="card-base p-6">
              <h3 className="text-lg font-semibold mb-6">Achievements</h3>
              <div className="space-y-4">
                {achievements?.achievements?.map((achievement: Achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    earned={userStats?.achievements?.includes(achievement.id) || false}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'leaderboard' && (
            <div className="card-base p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Global Leaderboard
              </h3>
              <div className="space-y-2">
                {leaderboard?.leaderboard?.map((entry: LeaderboardEntry) => (
                  <LeaderboardRow
                    key={entry.user_id}
                    entry={entry}
                    isCurrentUser={entry.user_id === user?.id}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};