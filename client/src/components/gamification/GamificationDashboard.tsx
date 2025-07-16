import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocalization } from "@/hooks/useLocalization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "./ProgressBar";
import { AchievementBadge } from "./AchievementBadge";
import { RewardNotification } from "./RewardNotification";
import { SpinWheel } from "./SpinWheel";
import { DailyTasks } from "./DailyTasks";
import { Leaderboard } from "./Leaderboard";
import { 
  Trophy, 
  Gift, 
  Target, 
  Users, 
  Sparkles, 
  Crown,
  Star,
  TrendingUp,
  Calendar,
  Zap,
  Award
} from "lucide-react";

interface UserProgress {
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

interface GamificationDashboardProps {
  userProgress: UserProgress;
  onUpdateProgress: (progress: Partial<UserProgress>) => void;
}

export function GamificationDashboard({ 
  userProgress, 
  onUpdateProgress 
}: GamificationDashboardProps) {
  const { t } = useLocalization();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const [dailyRewards, setDailyRewards] = useState({
    canClaimDaily: true,
    canSpin: true,
    nextSpinTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  // Mock achievements data
  const achievements = [
    { type: 'welcome', earned: true, progress: 100 },
    { type: 'profile', earned: userProgress.badges.includes('profile'), progress: 80 },
    { type: 'listing', earned: userProgress.badges.includes('listing'), progress: 60 },
    { type: 'deal', earned: userProgress.badges.includes('deal'), progress: 40 },
    { type: 'mentor', earned: userProgress.badges.includes('mentor'), progress: 20 },
    { type: 'verified', earned: userProgress.badges.includes('verified'), progress: 100 },
    { type: 'streak', earned: userProgress.streak >= 7, progress: (userProgress.streak / 7) * 100 },
    { type: 'referral', earned: false, progress: 30 },
    { type: 'innovation', earned: false, progress: 10 },
    { type: 'collaboration', earned: false, progress: 50 },
    { type: 'feedback', earned: false, progress: 70 },
    { type: 'network', earned: false, progress: 25 }
  ];

  // Quick actions for engagement
  const quickActions = [
    {
      id: 'daily-tasks',
      title: t('gamification.daily.task'),
      description: 'Complete daily challenges',
      icon: <Target className="w-5 h-5" />,
      color: 'bg-blue-500',
      reward: '50+ points',
      action: () => setActiveModal('tasks')
    },
    {
      id: 'spin-wheel',
      title: t('gamification.spin.wheel'),
      description: 'Try your luck!',
      icon: <Gift className="w-5 h-5" />,
      color: 'bg-purple-500',
      reward: 'Mystery prizes',
      action: () => setActiveModal('spin'),
      disabled: !dailyRewards.canSpin
    },
    {
      id: 'leaderboard',
      title: t('gamification.leaderboard.title'),
      description: 'See your ranking',
      icon: <Trophy className="w-5 h-5" />,
      color: 'bg-yellow-500',
      reward: 'Weekly prizes',
      action: () => setActiveModal('leaderboard')
    },
    {
      id: 'treasure-hunt',
      title: t('gamification.treasure.hunt'),
      description: 'Find hidden rewards',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'bg-green-500',
      reward: 'Exclusive items',
      action: () => showNotification({
        type: 'achievement',
        title: t('gamification.treasure.hunt'),
        description: 'Feature coming soon!',
        special: true
      })
    }
  ];

  const showNotification = (reward: any) => {
    setNotification(reward);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleTaskComplete = (taskId: string, reward: number) => {
    onUpdateProgress({
      totalPoints: userProgress.totalPoints + reward,
      currentXP: userProgress.currentXP + reward,
      completedTasks: userProgress.completedTasks + 1
    });
    
    showNotification({
      type: 'points',
      title: t('gamification.mission.complete'),
      description: `You earned ${reward} points!`,
      value: reward
    });
  };

  const handleSpinWin = (reward: any) => {
    let pointsToAdd = 0;
    
    if (reward.type === 'points') {
      pointsToAdd = reward.value;
    } else if (reward.type === 'coins') {
      pointsToAdd = reward.value / 2; // Convert coins to points
    }
    
    onUpdateProgress({
      totalPoints: userProgress.totalPoints + pointsToAdd,
      currentXP: userProgress.currentXP + pointsToAdd
    });
    
    setDailyRewards(prev => ({ ...prev, canSpin: false }));
    showNotification(reward);
    setActiveModal(null);
  };

  const handleBadgeClick = (type: string) => {
    const achievement = achievements.find(a => a.type === type);
    if (achievement?.earned) {
      showNotification({
        type: 'achievement',
        title: t(`gamification.badges.${type}`) || 'Achievement Unlocked!',
        description: 'Congratulations on your achievement!',
        special: true
      });
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Level</p>
                <p className="text-2xl font-bold">{userProgress.level}</p>
              </div>
              <Crown className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Points</p>
                <p className="text-2xl font-bold">{userProgress.totalPoints.toLocaleString()}</p>
              </div>
              <Star className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Rank</p>
                <p className="text-2xl font-bold">#{userProgress.rank}</p>
              </div>
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Streak</p>
                <p className="text-2xl font-bold">{userProgress.streak} days</p>
              </div>
              <Zap className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>{t('gamification.progress.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressBar
            currentXP={userProgress.currentXP}
            requiredXP={userProgress.requiredXP}
            level={userProgress.level}
            levelName={t('gamification.level.beginner')}
            showAnimation={userProgress.currentXP >= userProgress.requiredXP}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <motion.div
                key={action.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={action.disabled ? undefined : action.action}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 rounded-full ${action.color} text-white`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{action.title}</h3>
                        <p className="text-xs text-gray-600">{action.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {action.reward}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="w-5 h-5" />
            <span>{t('gamification.achievements.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {achievements.map((achievement) => (
              <AchievementBadge
                key={achievement.type}
                type={achievement.type as any}
                earned={achievement.earned}
                progress={achievement.progress}
                showAnimation={achievement.earned}
                onClick={() => handleBadgeClick(achievement.type)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Challenge */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{t('gamification.challenge.weekly')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Complete 10 Business Transactions</h3>
              <p className="text-sm opacity-90 mb-3">
                Help fellow MSMEs by completing successful business deals this week.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">3 / 10 completed</span>
                </div>
                <Badge className="bg-white/20 text-white">
                  +500 bonus points
                </Badge>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <DailyTasks
        isVisible={activeModal === 'tasks'}
        onClose={() => setActiveModal(null)}
        onTaskComplete={handleTaskComplete}
      />
      
      <SpinWheel
        isVisible={activeModal === 'spin'}
        onClose={() => setActiveModal(null)}
        onWin={handleSpinWin}
        canSpin={dailyRewards.canSpin}
        nextSpinTime={dailyRewards.nextSpinTime}
      />
      
      <Leaderboard
        isVisible={activeModal === 'leaderboard'}
        onClose={() => setActiveModal(null)}
        currentUser={{
          id: 'current-user',
          rank: userProgress.rank,
          points: userProgress.totalPoints
        }}
      />

      {/* Notifications */}
      {notification && (
        <RewardNotification
          isVisible={true}
          onClose={() => setNotification(null)}
          reward={notification}
          onClaim={() => setNotification(null)}
        />
      )}
    </div>
  );
}