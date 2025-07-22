import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Gift, Zap, X } from "lucide-react";

interface RewardNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  reward: {
    type: 'achievement' | 'points' | 'coins' | 'badge' | 'level';
    title: string;
    description: string;
    value?: number;
    special?: boolean;
  };
  onClaim?: () => void;
}

export function RewardNotification({ 
  isVisible, 
  onClose, 
  reward, 
  onClaim 
}: RewardNotificationProps) {
  const getIcon = () => {
    switch (reward.type) {
      case 'achievement':
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 'points':
        return <Star className="w-8 h-8 text-blue-500" />;
      case 'coins':
        return <Gift className="w-8 h-8 text-green-500" />;
      case 'badge':
        return <Badge className="w-8 h-8 text-purple-500" />;
      case 'level':
        return <Zap className="w-8 h-8 text-orange-500" />;
      default:
        return <Gift className="w-8 h-8 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    if (reward.special) return 'bg-gradient-to-r from-purple-600 to-pink-600';
    
    switch (reward.type) {
      case 'achievement':
        return 'bg-gradient-to-r from-yellow-500 to-orange-600';
      case 'points':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'coins':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'badge':
        return 'bg-gradient-to-r from-purple-500 to-purple-600';
      case 'level':
        return 'bg-gradient-to-r from-orange-500 to-red-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative max-w-md w-full"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`text-white ${getBackgroundColor()}`}>
              <CardContent className="p-6 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-white hover:bg-white/20"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
                
                <motion.div
                  className="mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {getIcon()}
                </motion.div>
                
                <motion.h3
                  className="text-xl font-bold mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  {reward.title}
                </motion.h3>
                
                <motion.p
                  className="text-sm opacity-90 mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  {reward.description}
                </motion.p>
                
                {reward.value && (
                  <motion.div
                    className="mb-4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.8 }}
                  >
                    <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                      +{reward.value} {reward.type === 'points' ? 'Points' : 'Coins'}
                    </Badge>
                  </motion.div>
                )}
                
                <motion.div
                  className="flex gap-2 justify-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 1 }}
                >
                  {onClaim && (
                    <Button
                      onClick={onClaim}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                      variant="outline"
                    >
                      Claim
                    </Button>
                  )}
                  <Button
                    onClick={onClose}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                    variant="outline"
                  >
                    Close
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
            
            {/* Celebration particles */}
            {reward.special && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    initial={{
                      x: '50%',
                      y: '50%',
                      scale: 0,
                    }}
                    animate={{
                      x: `${50 + (Math.random() - 0.5) * 200}%`,
                      y: `${50 + (Math.random() - 0.5) * 200}%`,
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}