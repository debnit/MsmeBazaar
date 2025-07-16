import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalization } from "@/hooks/useLocalization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  Clock, 
  Star, 
  Crown, 
  Trophy,
  Zap,
  Diamond,
  Sparkles,
  Timer,
  PlayCircle
} from "lucide-react";

interface SpinWheelProps {
  isVisible: boolean;
  onClose: () => void;
  onWin: (reward: any) => void;
  canSpin: boolean;
  nextSpinTime?: Date;
}

interface WheelSegment {
  id: string;
  label: string;
  value: number;
  type: 'points' | 'coins' | 'badge' | 'special';
  color: string;
  icon: React.ReactNode;
  probability: number;
}

export function SpinWheel({ 
  isVisible, 
  onClose, 
  onWin, 
  canSpin,
  nextSpinTime 
}: SpinWheelProps) {
  const { t } = useLocalization();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const wheelSegments: WheelSegment[] = [
    {
      id: '1',
      label: '50 Points',
      value: 50,
      type: 'points',
      color: 'bg-blue-500',
      icon: <Star className="w-4 h-4" />,
      probability: 0.3
    },
    {
      id: '2',
      label: '100 Coins',
      value: 100,
      type: 'coins',
      color: 'bg-yellow-500',
      icon: <Crown className="w-4 h-4" />,
      probability: 0.25
    },
    {
      id: '3',
      label: '25 Points',
      value: 25,
      type: 'points',
      color: 'bg-green-500',
      icon: <Zap className="w-4 h-4" />,
      probability: 0.35
    },
    {
      id: '4',
      label: 'Premium Badge',
      value: 1,
      type: 'badge',
      color: 'bg-purple-500',
      icon: <Diamond className="w-4 h-4" />,
      probability: 0.05
    },
    {
      id: '5',
      label: '200 Points',
      value: 200,
      type: 'points',
      color: 'bg-orange-500',
      icon: <Trophy className="w-4 h-4" />,
      probability: 0.03
    },
    {
      id: '6',
      label: 'Mystery Box',
      value: 0,
      type: 'special',
      color: 'bg-pink-500',
      icon: <Sparkles className="w-4 h-4" />,
      probability: 0.02
    }
  ];

  const handleSpin = () => {
    if (!canSpin || isSpinning) return;
    
    setIsSpinning(true);
    
    // Generate random result based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedSegment = wheelSegments[0];
    
    for (const segment of wheelSegments) {
      cumulativeProbability += segment.probability;
      if (random <= cumulativeProbability) {
        selectedSegment = segment;
        break;
      }
    }
    
    // Calculate rotation to land on selected segment
    const segmentAngle = 360 / wheelSegments.length;
    const targetIndex = wheelSegments.findIndex(s => s.id === selectedSegment.id);
    const targetAngle = (targetIndex * segmentAngle) + (segmentAngle / 2);
    const spins = 5; // Number of full rotations
    const finalRotation = (spins * 360) + (360 - targetAngle);
    
    setRotation(prev => prev + finalRotation);
    
    // Show result after animation
    setTimeout(() => {
      setIsSpinning(false);
      setResult(selectedSegment);
      onWin(selectedSegment);
    }, 3000);
  };

  const formatTimeRemaining = (nextSpin?: Date) => {
    if (!nextSpin) return '';
    
    const now = new Date();
    const diff = nextSpin.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader className="text-center relative">
              <div className="absolute top-4 right-4">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  ×
                </Button>
              </div>
              
              <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
                <Gift className="w-8 h-8 text-purple-600" />
                <span>{t('gamification.spin.wheel')}</span>
              </CardTitle>
              
              <div className="text-center mt-4">
                {canSpin ? (
                  <Badge className="bg-green-100 text-green-800">
                    Ready to spin!
                  </Badge>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Timer className="w-4 h-4 text-orange-500" />
                    <Badge className="bg-orange-100 text-orange-800">
                      Next spin in {formatTimeRemaining(nextSpinTime)}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Wheel */}
              <div className="relative flex justify-center">
                <div className="relative">
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-red-500"></div>
                  </div>
                  
                  {/* Wheel */}
                  <motion.div
                    ref={wheelRef}
                    className="w-80 h-80 rounded-full relative overflow-hidden shadow-2xl"
                    style={{
                      background: `conic-gradient(${wheelSegments.map((segment, index) => {
                        const start = (index * 360) / wheelSegments.length;
                        const end = ((index + 1) * 360) / wheelSegments.length;
                        const color = segment.color.replace('bg-', '').replace('-500', '');
                        return `var(--${color}-500) ${start}deg ${end}deg`;
                      }).join(', ')})`
                    }}
                    animate={{ rotate: rotation }}
                    transition={{
                      duration: isSpinning ? 3 : 0,
                      ease: isSpinning ? "easeOut" : "linear"
                    }}
                  >
                    {wheelSegments.map((segment, index) => {
                      const angle = (360 / wheelSegments.length) * index;
                      const midAngle = angle + (360 / wheelSegments.length) / 2;
                      
                      return (
                        <div
                          key={segment.id}
                          className="absolute top-1/2 left-1/2 origin-bottom text-white text-xs font-bold"
                          style={{
                            transform: `translate(-50%, -50%) rotate(${midAngle}deg) translateY(-100px)`,
                            width: '80px',
                            textAlign: 'center'
                          }}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            {segment.icon}
                            <span className="text-xs">{segment.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </div>
              </div>

              {/* Spin Button */}
              <div className="text-center">
                <Button
                  onClick={handleSpin}
                  disabled={!canSpin || isSpinning}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-6 text-lg font-bold"
                  size="lg"
                >
                  {isSpinning ? (
                    <>
                      <motion.div
                        className="mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      Spinning...
                    </>
                  ) : canSpin ? (
                    <>
                      <PlayCircle className="w-5 h-5 mr-2" />
                      {t('gamification.spin.wheel')}
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 mr-2" />
                      Come back later
                    </>
                  )}
                </Button>
              </div>

              {/* Rules */}
              <div className="bg-white/50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Spin once every 24 hours</li>
                  <li>• Win points, coins, badges, or special rewards</li>
                  <li>• Higher value rewards are rarer</li>
                  <li>• Complete daily tasks for bonus spins</li>
                </ul>
              </div>

              {/* Result Modal */}
              {result && (
                <motion.div
                  className="fixed inset-0 z-60 flex items-center justify-center bg-black/70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="bg-white rounded-xl p-6 max-w-sm mx-4 text-center"
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                  >
                    <motion.div
                      className="text-6xl mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      🎉
                    </motion.div>
                    
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {t('gamification.congratulations')}
                    </h3>
                    
                    <div className="flex items-center justify-center space-x-2 mb-4">
                      <div className={`p-2 rounded-full ${result.color} text-white`}>
                        {result.icon}
                      </div>
                      <span className="text-lg font-semibold">{result.label}</span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      {result.type === 'points' && `You earned ${result.value} points!`}
                      {result.type === 'coins' && `You earned ${result.value} MSMECoins!`}
                      {result.type === 'badge' && 'You unlocked a premium badge!'}
                      {result.type === 'special' && 'You won a mystery reward!'}
                    </p>
                    
                    <Button 
                      onClick={() => {
                        setResult(null);
                        onClose();
                      }}
                      className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700"
                    >
                      Claim Reward
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}