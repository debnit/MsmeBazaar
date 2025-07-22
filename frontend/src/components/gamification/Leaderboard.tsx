import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  TrendingUp, 
  Users, 
  Calendar,
  X
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

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  rank: number;
  points: number;
  level: number;
  badge: string;
  isCurrentUser?: boolean;
}

export function Leaderboard({ 
  isVisible, 
  onClose, 
  currentUser 
}: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState("weekly");

  // Mock leaderboard data
  const weeklyLeaderboard: LeaderboardEntry[] = [
    { id: '1', name: 'Rajesh Kumar', rank: 1, points: 4500, level: 8, badge: 'verified', avatar: '/api/placeholder/40/40' },
    { id: '2', name: 'Priya Sharma', rank: 2, points: 4200, level: 7, badge: 'mentor', avatar: '/api/placeholder/40/40' },
    { id: '3', name: 'Amit Patel', rank: 3, points: 3800, level: 6, badge: 'deal', avatar: '/api/placeholder/40/40' },
    { id: '4', name: 'Sneha Singh', rank: 4, points: 3500, level: 6, badge: 'listing', avatar: '/api/placeholder/40/40' },
    { id: '5', name: 'Vikram Gupta', rank: 5, points: 3200, level: 5, badge: 'profile', avatar: '/api/placeholder/40/40' },
    { id: '6', name: 'Meera Nair', rank: 6, points: 3000, level: 5, badge: 'welcome', avatar: '/api/placeholder/40/40' },
    { id: '7', name: 'Arjun Reddy', rank: 7, points: 2800, level: 4, badge: 'streak', avatar: '/api/placeholder/40/40' },
    { id: '8', name: 'Kavya Joshi', rank: 8, points: 2600, level: 4, badge: 'referral', avatar: '/api/placeholder/40/40' },
    { id: '9', name: 'Rohit Mehta', rank: 9, points: 2400, level: 3, badge: 'collaboration', avatar: '/api/placeholder/40/40' },
    { id: '10', name: 'Pooja Agarwal', rank: 10, points: 2200, level: 3, badge: 'feedback', avatar: '/api/placeholder/40/40' },
  ];

  const allTimeLeaderboard: LeaderboardEntry[] = [
    { id: '1', name: 'Rajesh Kumar', rank: 1, points: 15000, level: 15, badge: 'verified', avatar: '/api/placeholder/40/40' },
    { id: '2', name: 'Amit Patel', rank: 2, points: 14200, level: 14, badge: 'mentor', avatar: '/api/placeholder/40/40' },
    { id: '3', name: 'Priya Sharma', rank: 3, points: 13800, level: 13, badge: 'deal', avatar: '/api/placeholder/40/40' },
    { id: '4', name: 'Vikram Gupta', rank: 4, points: 12500, level: 12, badge: 'listing', avatar: '/api/placeholder/40/40' },
    { id: '5', name: 'Sneha Singh', rank: 5, points: 11200, level: 11, badge: 'profile', avatar: '/api/placeholder/40/40' },
    { id: '6', name: 'Meera Nair', rank: 6, points: 10800, level: 10, badge: 'welcome', avatar: '/api/placeholder/40/40' },
    { id: '7', name: 'Arjun Reddy', rank: 7, points: 9600, level: 9, badge: 'streak', avatar: '/api/placeholder/40/40' },
    { id: '8', name: 'Kavya Joshi', rank: 8, points: 8400, level: 8, badge: 'referral', avatar: '/api/placeholder/40/40' },
    { id: '9', name: 'Rohit Mehta', rank: 9, points: 7200, level: 7, badge: 'collaboration', avatar: '/api/placeholder/40/40' },
    { id: '10', name: 'Pooja Agarwal', rank: 10, points: 6800, level: 6, badge: 'feedback', avatar: '/api/placeholder/40/40' },
  ];

  // Add current user to appropriate position if not in top 10
  const addCurrentUserToLeaderboard = (leaderboard: LeaderboardEntry[]) => {
    const currentUserEntry: LeaderboardEntry = {
      id: currentUser.id,
      name: 'You',
      rank: currentUser.rank,
      points: currentUser.points,
      level: Math.floor(currentUser.points / 500) + 1,
      badge: 'profile',
      isCurrentUser: true
    };

    if (currentUser.rank <= 10) {
      return leaderboard.map(entry => 
        entry.rank === currentUser.rank ? currentUserEntry : entry
      );
    } else {
      return [...leaderboard, currentUserEntry];
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getBadgeColor = (badge: string) => {
    const colors = {
      verified: 'bg-green-500',
      mentor: 'bg-blue-500',
      deal: 'bg-purple-500',
      listing: 'bg-orange-500',
      profile: 'bg-cyan-500',
      welcome: 'bg-yellow-500',
      streak: 'bg-red-500',
      referral: 'bg-pink-500',
      collaboration: 'bg-indigo-500',
      feedback: 'bg-violet-500',
    };
    return colors[badge as keyof typeof colors] || 'bg-gray-500';
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => (
    <motion.div
      key={entry.id}
      className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-200 ${
        entry.isCurrentUser 
          ? 'bg-blue-50 border-2 border-blue-200' 
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className="flex items-center justify-center w-12 h-12">
        {getRankIcon(entry.rank)}
      </div>
      
      <Avatar className="w-10 h-10">
        <AvatarImage src={entry.avatar} alt={entry.name} />
        <AvatarFallback>{entry.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h3 className={`font-semibold ${entry.isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
            {entry.name}
          </h3>
          <Badge 
            className={`${getBadgeColor(entry.badge)} text-white text-xs`}
            variant="secondary"
          >
            Level {entry.level}
          </Badge>
        </div>
        <div className="flex items-center space-x-4 mt-1">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600">{entry.points.toLocaleString()} points</span>
          </div>
        </div>
      </div>
      
      {entry.rank <= 3 && (
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-semibold text-yellow-600">
            {entry.rank === 1 ? 'Champion' : entry.rank === 2 ? 'Runner-up' : 'Third Place'}
          </span>
        </div>
      )}
    </motion.div>
  );

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
            className="relative max-w-2xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span>Leaderboard</span>
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
              
              <CardContent>
                <Tabs defaultValue="weekly" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="weekly" className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Weekly</span>
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Monthly</span>
                    </TabsTrigger>
                    <TabsTrigger value="all-time" className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>All Time</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="weekly" className="mt-6">
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {addCurrentUserToLeaderboard(weeklyLeaderboard).map((entry, index) => 
                        renderLeaderboardEntry(entry, index)
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="monthly" className="mt-6">
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {addCurrentUserToLeaderboard(weeklyLeaderboard).map((entry, index) => 
                        renderLeaderboardEntry(entry, index)
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="all-time" className="mt-6">
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {addCurrentUserToLeaderboard(allTimeLeaderboard).map((entry, index) => 
                        renderLeaderboardEntry(entry, index)
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                
                {/* Rewards Info */}
                <div className="mt-6 p-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">Weekly Rewards</h3>
                      <p className="text-sm opacity-90">
                        Top performers get exclusive rewards every week!
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Trophy className="w-5 h-5" />
                        <span className="font-bold">Premium Benefits</span>
                      </div>
                      <p className="text-xs opacity-75">
                        For top 10 users
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}