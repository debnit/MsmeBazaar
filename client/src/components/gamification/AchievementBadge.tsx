import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/hooks/useLocalization";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Star, 
  Shield, 
  Crown, 
  Award, 
  Gem, 
  Target, 
  Zap,
  Heart,
  Medal,
  Sparkles,
  Gift
} from "lucide-react";

interface AchievementBadgeProps {
  type: 'welcome' | 'profile' | 'listing' | 'deal' | 'mentor' | 'verified' | 'streak' | 'referral' | 'innovation' | 'collaboration' | 'feedback' | 'network';
  earned: boolean;
  progress?: number;
  showAnimation?: boolean;
  onClick?: () => void;
}

export function AchievementBadge({ 
  type, 
  earned, 
  progress = 0, 
  showAnimation = false,
  onClick 
}: AchievementBadgeProps) {
  const { t } = useLocalization();

  const getBadgeConfig = (type: string) => {
    const configs = {
      welcome: {
        icon: <Gift className="w-4 h-4" />,
        color: "bg-blue-500",
        textKey: 'gamification.badges.firstLogin'
      },
      profile: {
        icon: <Star className="w-4 h-4" />,
        color: "bg-green-500",
        textKey: 'gamification.badges.profileComplete'
      },
      listing: {
        icon: <Target className="w-4 h-4" />,
        color: "bg-purple-500",
        textKey: 'gamification.badges.firstListing'
      },
      deal: {
        icon: <Trophy className="w-4 h-4" />,
        color: "bg-yellow-500",
        textKey: 'gamification.badges.dealMaker'
      },
      mentor: {
        icon: <Crown className="w-4 h-4" />,
        color: "bg-orange-500",
        textKey: 'gamification.mentor.badge'
      },
      verified: {
        icon: <Shield className="w-4 h-4" />,
        color: "bg-indigo-500",
        textKey: 'gamification.verified.business'
      },
      streak: {
        icon: <Zap className="w-4 h-4" />,
        color: "bg-red-500",
        textKey: 'gamification.streak.login'
      },
      referral: {
        icon: <Heart className="w-4 h-4" />,
        color: "bg-pink-500",
        textKey: 'gamification.referral.bonus'
      },
      innovation: {
        icon: <Sparkles className="w-4 h-4" />,
        color: "bg-cyan-500",
        textKey: 'gamification.innovation.award'
      },
      collaboration: {
        icon: <Medal className="w-4 h-4" />,
        color: "bg-teal-500",
        textKey: 'gamification.collaboration.bonus'
      },
      feedback: {
        icon: <Award className="w-4 h-4" />,
        color: "bg-emerald-500",
        textKey: 'gamification.feedback.champion'
      },
      network: {
        icon: <Gem className="w-4 h-4" />,
        color: "bg-violet-500",
        textKey: 'gamification.network.builder'
      }
    };
    
    return configs[type] || configs.welcome;
  };

  const config = getBadgeConfig(type);

  return (
    <motion.div
      className={`relative cursor-pointer group ${onClick ? 'hover:scale-105' : ''}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Badge Container */}
      <div className={`
        relative p-3 rounded-full 
        ${earned ? config.color : 'bg-gray-300'} 
        ${earned ? 'shadow-lg' : 'shadow-sm'}
        transition-all duration-300
      `}>
        {/* Badge Icon */}
        <div className={`
          ${earned ? 'text-white' : 'text-gray-500'}
          transition-colors duration-300
        `}>
          {config.icon}
        </div>
        
        {/* Progress Ring for Partially Earned Badges */}
        {!earned && progress > 0 && (
          <div className="absolute inset-0 rounded-full">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${progress * 0.88} 88`}
                className="text-blue-500"
              />
            </svg>
          </div>
        )}
        
        {/* Earned Badge Shine Effect */}
        {earned && showAnimation && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white opacity-30"
            initial={{ scale: 0 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
      </div>
      
      {/* Badge Name Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
        {t(config.textKey)}
      </div>
      
      {/* Earned Badge Celebration */}
      {earned && showAnimation && (
        <motion.div
          className="absolute -top-2 -right-2 text-yellow-500"
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          ✨
        </motion.div>
      )}
    </motion.div>
  );
}