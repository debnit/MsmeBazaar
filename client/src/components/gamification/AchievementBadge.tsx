import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  User,
  FileText,
  Handshake,
  Users,
  Shield,
  Zap,
  Share2,
  Lightbulb,
  Heart,
  MessageCircle,
  Network,
} from 'lucide-react';

interface AchievementBadgeProps {
  type: 'welcome' | 'profile' | 'listing' | 'deal' | 'mentor' | 'verified' | 'streak' | 'referral' | 'innovation' | 'collaboration' | 'feedback' | 'network';
  earned: boolean;
  progress: number;
  showAnimation?: boolean;
  onClick?: () => void;
}

const badgeConfig = {
  welcome: { icon: Trophy, color: 'bg-yellow-500', name: 'Welcome' },
  profile: { icon: User, color: 'bg-blue-500', name: 'Profile Master' },
  listing: { icon: FileText, color: 'bg-green-500', name: 'First Listing' },
  deal: { icon: Handshake, color: 'bg-purple-500', name: 'Deal Maker' },
  mentor: { icon: Users, color: 'bg-indigo-500', name: 'Mentor' },
  verified: { icon: Shield, color: 'bg-emerald-500', name: 'Verified' },
  streak: { icon: Zap, color: 'bg-orange-500', name: 'Streak Master' },
  referral: { icon: Share2, color: 'bg-pink-500', name: 'Referral Pro' },
  innovation: { icon: Lightbulb, color: 'bg-cyan-500', name: 'Innovator' },
  collaboration: { icon: Heart, color: 'bg-red-500', name: 'Collaborator' },
  feedback: { icon: MessageCircle, color: 'bg-violet-500', name: 'Feedback Hero' },
  network: { icon: Network, color: 'bg-teal-500', name: 'Networker' },
};

export function AchievementBadge({
  type,
  earned,
  progress,
  showAnimation = false,
  onClick,
}: AchievementBadgeProps) {
  const config = badgeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      className={`relative cursor-pointer transition-all duration-200 ${
        earned ? 'hover:scale-110' : 'hover:scale-105'
      }`}
      onClick={onClick}
      whileHover={{ scale: earned ? 1.1 : 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={`
        w-16 h-16 rounded-full flex items-center justify-center relative
        ${earned ? config.color : 'bg-gray-300'}
        ${earned ? 'text-white' : 'text-gray-500'}
        ${earned ? 'shadow-lg' : 'shadow-sm'}
      `}>
        <Icon className="w-8 h-8" />

        {/* Progress ring for unearned badges */}
        {!earned && progress > 0 && (
          <svg className="absolute inset-0 w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="opacity-20"
            />
            <circle
              cx="32"
              cy="32"
              r="30"
              stroke={config.color.replace('bg-', 'stroke-')}
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${(progress / 100) * 188.5} 188.5`}
              className="opacity-80"
            />
          </svg>
        )}

        {/* Earned badge glow effect */}
        {earned && showAnimation && (
          <motion.div
            className="absolute inset-0 rounded-full bg-white/30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Badge name */}
      <div className="text-center mt-2">
        <p className="text-xs font-medium text-gray-700 truncate">
          {config.name}
        </p>
        {!earned && (
          <p className="text-xs text-gray-500">
            {Math.round(progress)}%
          </p>
        )}
      </div>

      {/* New badge indicator */}
      {earned && showAnimation && (
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-2 h-2 bg-white rounded-full" />
        </motion.div>
      )}
    </motion.div>
  );
}
