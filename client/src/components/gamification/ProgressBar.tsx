import { Progress } from "@/components/ui/progress";
import { useLocalization } from "@/hooks/useLocalization";
import { Trophy, Star, Zap, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface ProgressBarProps {
  currentXP: number;
  requiredXP: number;
  level: number;
  levelName: string;
  showAnimation?: boolean;
}

export function ProgressBar({ 
  currentXP, 
  requiredXP, 
  level, 
  levelName, 
  showAnimation = false 
}: ProgressBarProps) {
  const { t } = useLocalization();
  const progress = (currentXP / requiredXP) * 100;
  
  const getLevelIcon = (level: number) => {
    if (level >= 10) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (level >= 7) return <Trophy className="w-5 h-5 text-purple-500" />;
    if (level >= 4) return <Star className="w-5 h-5 text-blue-500" />;
    return <Zap className="w-5 h-5 text-green-500" />;
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return "from-yellow-400 to-yellow-600";
    if (level >= 7) return "from-purple-400 to-purple-600";
    if (level >= 4) return "from-blue-400 to-blue-600";
    return "from-green-400 to-green-600";
  };

  return (
    <motion.div 
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getLevelIcon(level)}
          <span className="font-semibold text-gray-800">
            {t('gamification.level.beginner')} {level}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {currentXP} / {requiredXP} XP
        </div>
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={progress} 
          className="h-3"
          style={{
            background: `linear-gradient(to right, ${getLevelColor(level)})`
          }}
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>{levelName}</span>
          <span>{t('gamification.next.level')}</span>
        </div>
      </div>
      
      {showAnimation && progress >= 100 && (
        <motion.div
          className="mt-2 text-center text-green-600 font-semibold"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          🎉 {t('gamification.level.up')}
        </motion.div>
      )}
    </motion.div>
  );
}