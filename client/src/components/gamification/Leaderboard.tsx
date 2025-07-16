import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalization } from "@/hooks/useLocalization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, 
  Trophy, 
  Star, 
  Medal, 
  TrendingUp, 
  Users,
  Calendar,
  MapPin,
  Sparkles,
  Target
} from "lucide-react";

interface LeaderboardProps {
  isVisible: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    rank: number;
    points: number;
  };
}

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  rank: number;
  points: number;
  level: number;
  badges: string[];
  location: string;
  streak: number;
  businessType: string;
  change: number; // Position change from last week
}

export function Leaderboard({ isVisible, onClose, currentUser }: LeaderboardProps) {
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState("global");
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      // Simulate loading leaderboard data
      setTimeout(() => {
        const mockUsers: LeaderboardUser[] = [
          {
            id: '1',
            name: 'Rajesh Kumar',
            avatar: '/api/placeholder/40/40',
            rank: 1,
            points: 12450,
            level: 8,
            badges: ['verified', 'deal', 'mentor'],
            location: 'Bhubaneswar, Odisha',
            streak: 28,
            businessType: 'Manufacturing',
            change: 2
          },
          {
            id: '2',
            name: 'Priya Sharma',
            avatar: '/api/placeholder/40/40',
            rank: 2,
            points: 11200,
            level: 7,
            badges: ['verified', 'network', 'innovation'],
            location: 'Cuttack, Odisha',
            streak: 21,
            businessType: 'Tech Services',
            change: -1
          },
          {
            id: '3',
            name: 'Amit Patel',
            avatar: '/api/placeholder/40/40',
            rank: 3,
            points: 10800,
            level: 6,
            badges: ['deal', 'streak', 'referral'],
            location: 'Rourkela, Odisha',
            streak: 14,
            businessType: 'Trading',
            change: 1
          },
          {
            id: '4',
            name: 'Sneha Mishra',
            avatar: '/api/placeholder/40/40',
            rank: 4,
            points: 9600,
            level: 6,
            badges: ['verified', 'collaboration'],
            location: 'Balasore, Odisha',
            streak: 12,
            businessType: 'Retail',
            change: 3
          },
          {
            id: '5',
            name: 'Vikram Singh',
            avatar: '/api/placeholder/40/40',
            rank: 5,
            points: 8900,
            level: 5,
            badges: ['deal', 'feedback'],
            location: 'Sambalpur, Odisha',
            streak: 9,
            businessType: 'Agriculture',
            change: -2
          },
          {
            id: currentUser.id,
            name: 'You',
            avatar: '/api/placeholder/40/40',
            rank: currentUser.rank,
            points: currentUser.points,
            level: 3,
            badges: ['welcome', 'profile'],
            location: 'Khordha, Odisha',
            streak: 5,
            businessType: 'Services',
            change: 5
          }
        ];

        // Add more users to fill the leaderboard
        const additionalUsers = Array.from({ length: 100 }, (_, i) => ({
          id: `user-${i + 10}`,
          name: `User ${i + 10}`,
          avatar: '/api/placeholder/40/40',
          rank: i + 10,
          points: Math.max(1000, 8000 - (i * 100)),
          level: Math.max(1, 5 - Math.floor(i / 20)),
          badges: ['welcome'],
          location: 'Odisha',
          streak: Math.floor(Math.random() * 20),
          businessType: 'Business',
          change: Math.floor(Math.random() * 11) - 5
        }));

        setUsers([...mockUsers, ...additionalUsers].sort((a, b) => b.points - a.points));
        setLoading(false);
      }, 1000);
    }
  }, [isVisible, currentUser]);

  const getTopUsers = () => users.slice(0, 10);
  const getCurrentUserRank = () => users.find(u => u.id === currentUser.id);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600";
    return "bg-gradient-to-r from-blue-400 to-blue-600";
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingUp className="w-3 h-3 mr-1" />
          <span className="text-xs">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600">
          <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
          <span className="text-xs">{change}</span>
        </div>
      );
    }
    return <span className="text-xs text-gray-400">-</span>;
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
          className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="relative">
              <div className="absolute top-4 right-4">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  ×
                </Button>
              </div>
              
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Trophy className="w-8 h-8 text-purple-600" />
                <span>{t('gamification.leaderboard.title')}</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="global">
                    <Users className="w-4 h-4 mr-2" />
                    Global
                  </TabsTrigger>
                  <TabsTrigger value="local">
                    <MapPin className="w-4 h-4 mr-2" />
                    Odisha
                  </TabsTrigger>
                  <TabsTrigger value="weekly">
                    <Calendar className="w-4 h-4 mr-2" />
                    This Week
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        </motion.div>
                        <p className="text-gray-600">Loading leaderboard...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Top 3 Podium */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        {getTopUsers().slice(0, 3).map((user, index) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className={`text-center text-white ${getRankBadge(user.rank)}`}>
                              <CardContent className="p-4">
                                <div className="flex flex-col items-center space-y-2">
                                  <div className="text-2xl">
                                    {getRankIcon(user.rank)}
                                  </div>
                                  <Avatar className="w-12 h-12 ring-2 ring-white">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-bold text-sm">{user.name}</p>
                                    <p className="text-xs opacity-90">{user.points.toLocaleString()} pts</p>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-3 h-3" />
                                    <span className="text-xs">Level {user.level}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>

                      {/* Full Leaderboard */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                          <Target className="w-5 h-5" />
                          <span>Top Performers</span>
                        </h3>
                        
                        {getTopUsers().map((user, index) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className={`transition-all duration-200 hover:shadow-md ${
                              user.id === currentUser.id ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                            }`}>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <div className="text-lg font-bold">
                                      {getRankIcon(user.rank)}
                                    </div>
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={user.avatar} alt={user.name} />
                                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-sm text-gray-800">
                                          {user.name}
                                          {user.id === currentUser.id && (
                                            <Badge className="ml-2 bg-purple-100 text-purple-800">
                                              You
                                            </Badge>
                                          )}
                                        </p>
                                        <p className="text-xs text-gray-600 flex items-center space-x-2">
                                          <MapPin className="w-3 h-3" />
                                          <span>{user.location}</span>
                                          <span>•</span>
                                          <span>{user.businessType}</span>
                                        </p>
                                      </div>
                                      
                                      <div className="text-right">
                                        <p className="font-bold text-sm">
                                          {user.points.toLocaleString()} pts
                                        </p>
                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                          <div className="flex items-center space-x-1">
                                            <Star className="w-3 h-3" />
                                            <span>L{user.level}</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Target className="w-3 h-3" />
                                            <span>{user.streak}d</span>
                                          </div>
                                          {getChangeIndicator(user.change)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>

                      {/* Current User Position (if not in top 10) */}
                      {currentUser.rank > 10 && (
                        <div className="mt-6 pt-4 border-t">
                          <h4 className="font-semibold text-gray-800 mb-2">Your Position</h4>
                          {getCurrentUserRank() && (
                            <Card className="ring-2 ring-purple-500 bg-purple-50">
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <div className="text-lg font-bold">
                                      #{getCurrentUserRank()?.rank}
                                    </div>
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={getCurrentUserRank()?.avatar} />
                                      <AvatarFallback>You</AvatarFallback>
                                    </Avatar>
                                  </div>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-sm text-gray-800">
                                          {getCurrentUserRank()?.name}
                                          <Badge className="ml-2 bg-purple-100 text-purple-800">
                                            You
                                          </Badge>
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {getCurrentUserRank()?.location}
                                        </p>
                                      </div>
                                      
                                      <div className="text-right">
                                        <p className="font-bold text-sm">
                                          {getCurrentUserRank()?.points.toLocaleString()} pts
                                        </p>
                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                          <span>Level {getCurrentUserRank()?.level}</span>
                                          {getChangeIndicator(getCurrentUserRank()?.change || 0)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>

              {/* Achievement Tips */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Climb the Leaderboard!</span>
                </h4>
                <ul className="text-sm space-y-1 opacity-90">
                  <li>• Complete daily tasks for consistent points</li>
                  <li>• Help other MSMEs to earn collaboration bonuses</li>
                  <li>• Share success stories for community recognition</li>
                  <li>• Maintain login streaks for bonus multipliers</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}