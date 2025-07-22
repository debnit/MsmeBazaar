import { motion } from "framer-motion";
import { Star, Trophy } from "lucide-react";

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
  const progress = Math.min((currentXP / requiredXP) * 100, 100);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold">Level {level}</span>
          <span className="text-sm text-gray-600">{levelName}</span>
        </div>
        <div className="text-sm text-gray-600">
          {currentXP} / {requiredXP} XP
        </div>
      </div>
      
      <div className="relative w-full bg-gray-200 rounded-full h-3">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          {showAnimation && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
      
      {progress >= 100 && (
        <motion.div
          className="flex items-center justify-center space-x-2 text-green-600"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <Star className="w-5 h-5" />
          <span className="font-semibold">Level Up Available!</span>
        </motion.div>
      )}
    </div>
  );
}