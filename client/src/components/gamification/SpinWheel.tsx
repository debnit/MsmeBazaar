import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, Coins, Clock, X } from "lucide-react";

interface SpinWheelProps {
  isVisible: boolean;
  onClose: () => void;
  onWin: (reward: any) => void;
  canSpin: boolean;
  nextSpinTime: Date;
}

const rewards = [
  { type: 'points', value: 50, color: '#3B82F6', label: '50 Points' },
  { type: 'coins', value: 20, color: '#10B981', label: '20 Coins' },
  { type: 'points', value: 100, color: '#8B5CF6', label: '100 Points' },
  { type: 'coins', value: 5, color: '#F59E0B', label: '5 Coins' },
  { type: 'points', value: 25, color: '#EF4444', label: '25 Points' },
  { type: 'coins', value: 10, color: '#06B6D4', label: '10 Coins' },
  { type: 'points', value: 75, color: '#84CC16', label: '75 Points' },
  { type: 'coins', value: 15, color: '#F97316', label: '15 Coins' },
];

export function SpinWheel({ 
  isVisible, 
  onClose, 
  onWin, 
  canSpin, 
  nextSpinTime 
}: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const spinWheel = () => {
    if (!canSpin || isSpinning) return;
    
    setIsSpinning(true);
    
    // Calculate random rotation (multiple full rotations + random angle)
    const baseRotation = rotation;
    const spins = 5 + Math.random() * 5; // 5-10 full rotations
    const finalAngle = Math.random() * 360;
    const totalRotation = baseRotation + (spins * 360) + finalAngle;
    
    setRotation(totalRotation);
    
    // Determine winning reward based on final angle
    const segmentAngle = 360 / rewards.length;
    const normalizedAngle = (360 - (finalAngle % 360)) % 360;
    const winningIndex = Math.floor(normalizedAngle / segmentAngle);
    const winningReward = rewards[winningIndex];
    
    // Show result after spin animation
    setTimeout(() => {
      setIsSpinning(false);
      onWin(winningReward);
    }, 3000);
  };

  const getTimeUntilNextSpin = () => {
    const now = new Date();
    const timeDiff = nextSpinTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) return "Available now!";
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
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
            className="relative max-w-lg w-full"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Gift className="w-5 h-5" />
                    <span>Spin the Wheel!</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <div className="relative mx-auto mb-6 w-64 h-64">
                  {/* Wheel */}
                  <motion.div
                    ref={wheelRef}
                    className="relative w-full h-full rounded-full border-4 border-gray-300 overflow-hidden"
                    animate={{ rotate: rotation }}
                    transition={{ 
                      duration: isSpinning ? 3 : 0,
                      ease: isSpinning ? "easeOut" : "linear"
                    }}
                  >
                    {rewards.map((reward, index) => {
                      const angle = (360 / rewards.length) * index;
                      const nextAngle = (360 / rewards.length) * (index + 1);
                      
                      return (
                        <div
                          key={index}
                          className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm"
                          style={{
                            background: `conic-gradient(from ${angle}deg, ${reward.color} 0deg, ${reward.color} ${360 / rewards.length}deg, transparent ${360 / rewards.length}deg)`,
                            clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((nextAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((nextAngle - 90) * Math.PI / 180)}%)`
                          }}
                        >
                          <div
                            className="absolute text-center"
                            style={{
                              transform: `rotate(${angle + (360 / rewards.length) / 2}deg)`,
                              transformOrigin: '50% 50%'
                            }}
                          >
                            <div className="flex flex-col items-center">
                              {reward.type === 'points' ? (
                                <Star className="w-4 h-4 mb-1" />
                              ) : (
                                <Coins className="w-4 h-4 mb-1" />
                              )}
                              <span className="text-xs">{reward.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                  
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-gray-800"></div>
                  </div>
                </div>
                
                {canSpin ? (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Spin the wheel to win exciting rewards!
                    </p>
                    <Button
                      onClick={spinWheel}
                      disabled={isSpinning}
                      className="w-full"
                      size="lg"
                    >
                      {isSpinning ? 'Spinning...' : 'Spin Now!'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-gray-500">
                      <Clock className="w-5 h-5" />
                      <span>Next spin available in:</span>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {getTimeUntilNextSpin()}
                    </Badge>
                    <p className="text-sm text-gray-600">
                      Come back later to spin again!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}