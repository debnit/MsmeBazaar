import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalization } from "@/hooks/useLocalization";
import { Button } from "@/components/ui/button";
import { X, Gift, Trophy, Star, Coins, Zap, Crown, Heart, Award } from "lucide-react";

interface RewardNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  reward: {
    type: 'points' | 'badge' | 'level' | 'coins' | 'unlock' | 'bonus' | 'achievement' | 'milestone';
    title: string;
    description: string;
    value?: number;
    icon?: string;
    special?: boolean;
  };
  onClaim?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function RewardNotification({
  isVisible,
  onClose,
  reward,
  onClaim,
  autoClose = true,
  duration = 5000
}: RewardNotificationProps) {
  const { t } = useLocalization();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isVisible && autoClose) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - (100 / (duration / 100));
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isVisible, autoClose, duration, onClose]);

  const getRewardIcon = (type: string) => {
    const icons = {
      points: <Star className="w-8 h-8 text-yellow-500" />,
      badge: <Award className="w-8 h-8 text-purple-500" />,
      level: <Trophy className="w-8 h-8 text-blue-500" />,
      coins: <Coins className="w-8 h-8 text-yellow-600" />,
      unlock: <Zap className="w-8 h-8 text-green-500" />,
      bonus: <Gift className="w-8 h-8 text-red-500" />,
      achievement: <Crown className="w-8 h-8 text-indigo-500" />,
      milestone: <Heart className="w-8 h-8 text-pink-500" />
    };
    return icons[type] || icons.points;
  };

  const getRewardColor = (type: string) => {
    const colors = {
      points: "from-yellow-400 to-yellow-600",
      badge: "from-purple-400 to-purple-600", 
      level: "from-blue-400 to-blue-600",
      coins: "from-yellow-500 to-yellow-700",
      unlock: "from-green-400 to-green-600",
      bonus: "from-red-400 to-red-600",
      achievement: "from-indigo-400 to-indigo-600",
      milestone: "from-pink-400 to-pink-600"
    };
    return colors[type] || colors.points;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className={`
            relative overflow-hidden rounded-lg shadow-2xl 
            bg-gradient-to-br ${getRewardColor(reward.type)}
            text-white p-6 border border-white/20
            ${reward.special ? 'ring-2 ring-yellow-400 ring-opacity-75' : ''}
          `}>
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-2 right-2 text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Progress Bar */}
            {autoClose && (
              <div className="absolute top-0 left-0 h-1 bg-white/30 w-full">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: "100%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            )}

            {/* Reward Content */}
            <div className="flex items-start space-x-4">
              {/* Icon */}
              <motion.div
                className="flex-shrink-0 p-3 bg-white/20 rounded-full"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {getRewardIcon(reward.type)}
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <motion.h3
                  className="font-bold text-lg mb-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  {reward.title}
                </motion.h3>
                
                <motion.p
                  className="text-white/90 text-sm mb-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  {reward.description}
                </motion.p>

                {/* Value Display */}
                {reward.value && (
                  <motion.div
                    className="flex items-center space-x-2 mb-3"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                  >
                    <span className="text-2xl font-bold">+{reward.value}</span>
                    <span className="text-sm opacity-90">
                      {reward.type === 'points' && t('gamification.points.earned')}
                      {reward.type === 'coins' && t('gamification.reward.coins')}
                    </span>
                  </motion.div>
                )}

                {/* Action Button */}
                {onClaim && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                  >
                    <Button
                      onClick={onClaim}
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      {t('gamification.instant.reward')}
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Special Effects */}
            {reward.special && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Sparkles */}
                <motion.div
                  className="absolute top-2 right-8 text-yellow-300"
                  animate={{ 
                    rotate: [0, 360], 
                    scale: [1, 1.2, 1] 
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  ✨
                </motion.div>
                <motion.div
                  className="absolute bottom-4 left-4 text-yellow-300"
                  animate={{ 
                    rotate: [360, 0], 
                    scale: [1, 1.3, 1] 
                  }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  ⭐
                </motion.div>
              </div>
            )}

            {/* Shine Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ 
                duration: 1.5, 
                delay: 0.5,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}