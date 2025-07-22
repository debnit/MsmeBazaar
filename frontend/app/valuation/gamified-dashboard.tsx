import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Trophy, 
  Star, 
  Target, 
  TrendingUp, 
  Zap, 
  Crown, 
  Medal, 
  Gift,
  Flame,
  DollarSign,
  Building,
  Users,
  BarChart3,
  Calendar,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  RefreshCw,
  Share2,
  Download,
  Eye,
  Heart,
  MessageCircle,
  Bookmark
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart,
  Cell,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line
} from "recharts"

import type { ValuationResult } from "./types"

// Gamification Data
const ACHIEVEMENT_LEVELS = [
  { level: 1, title: "Startup Explorer", minXP: 0, color: "#10b981", icon: Building },
  { level: 2, title: "Business Builder", minXP: 500, color: "#3b82f6", icon: TrendingUp },
  { level: 3, title: "Growth Champion", minXP: 1500, color: "#f59e0b", icon: Target },
  { level: 4, title: "Market Leader", minXP: 3000, color: "#8b5cf6", icon: Crown },
  { level: 5, title: "Valuation Master", minXP: 5000, color: "#ef4444", icon: Trophy }
]

const ACHIEVEMENTS = [
  { id: "first_valuation", title: "First Steps", description: "Complete your first valuation", icon: CheckCircle, xp: 100 },
  { id: "streak_3", title: "Consistency", description: "3 day streak", icon: Flame, xp: 150 },
  { id: "high_confidence", title: "Confident", description: "Get 90%+ confidence score", icon: Star, xp: 200 },
  { id: "share_report", title: "Networker", description: "Share a valuation report", icon: Share2, xp: 75 },
  { id: "premium_features", title: "Power User", description: "Use 5 premium features", icon: Zap, xp: 250 }
]

const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981", 
  accent: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6"
}

interface GamifiedDashboardProps {
  result?: ValuationResult
  userProgress: {
    level: number
    currentXP: number
    totalXP: number
    streak: number
    completedValuations: number
    achievements: string[]
    rank: number
    totalUsers: number
  }
}

export function GamifiedDashboard({ result, userProgress }: GamifiedDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [showCelebration, setShowCelebration] = useState(false)
  const [animatedXP, setAnimatedXP] = useState(userProgress.currentXP)

  const currentLevel = ACHIEVEMENT_LEVELS.find(level => 
    userProgress.totalXP >= level.minXP && 
    (ACHIEVEMENT_LEVELS.find(l => l.level === level.level + 1)?.minXP || Infinity) > userProgress.totalXP
  ) || ACHIEVEMENT_LEVELS[0]

  const nextLevel = ACHIEVEMENT_LEVELS.find(level => level.level === currentLevel.level + 1)
  const progressToNext = nextLevel ? 
    ((userProgress.totalXP - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100 : 100

  // Mock performance data
  const performanceData = [
    { month: "Jan", valuations: 2, accuracy: 85, xp: 200 },
    { month: "Feb", valuations: 4, accuracy: 88, xp: 450 },
    { month: "Mar", valuations: 3, accuracy: 92, xp: 380 },
    { month: "Apr", valuations: 6, accuracy: 89, xp: 650 },
    { month: "May", valuations: 5, accuracy: 94, xp: 580 },
    { month: "Jun", valuations: 8, accuracy: 91, xp: 820 }
  ]

  const leaderboardData = [
    { rank: 1, name: "Rajesh Kumar", company: "Kumar Enterprises", xp: 8500, avatar: "/avatars/1.jpg" },
    { rank: 2, name: "Priya Sharma", company: "Sharma Industries", xp: 7200, avatar: "/avatars/2.jpg" },
    { rank: 3, name: "Amit Patel", company: "Patel Manufacturing", xp: 6800, avatar: "/avatars/3.jpg" },
    { rank: userProgress.rank, name: "You", company: "Your Company", xp: userProgress.totalXP, avatar: "/avatars/user.jpg", isCurrentUser: true },
  ]

  useEffect(() => {
    // Animate XP counter
    const interval = setInterval(() => {
      setAnimatedXP(prev => {
        if (prev < userProgress.currentXP) return prev + 10
        return userProgress.currentXP
      })
    }, 50)

    return () => clearInterval(interval)
  }, [userProgress.currentXP])

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <Card className="p-8 text-center max-w-md">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-2">Level Up!</h3>
              <p className="text-muted-foreground mb-4">
                Congratulations! You've reached {currentLevel.title}
              </p>
              <Button onClick={() => setShowCelebration(false)}>
                Awesome!
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Gamification */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-4 border-white/20">
                <AvatarImage src="/avatars/user.jpg" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">Welcome back, John!</h1>
                <div className="flex items-center gap-2 mt-1">
                  <currentLevel.icon className="w-5 h-5" />
                  <span className="text-white/90">{currentLevel.title}</span>
                  <Badge variant="secondary" className="ml-2">
                    #{userProgress.rank} of {userProgress.totalUsers.toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-4xl font-bold">{animatedXP.toLocaleString()}</div>
              <div className="text-white/80">Total XP</div>
              <div className="flex items-center gap-2 mt-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{userProgress.streak} day streak</span>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to {nextLevel?.title || "Max Level"}</span>
              <span>{Math.round(progressToNext)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <motion.div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full"
                style={{ width: `${progressToNext}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Valuations Completed"
          value={userProgress.completedValuations.toString()}
          change={+12}
          icon={Building}
          color="bg-blue-500"
        />
        <StatsCard
          title="Average Confidence"
          value="87%"
          change={+5}
          icon={Target}
          color="bg-green-500"
        />
        <StatsCard
          title="Achievements"
          value={userProgress.achievements.length.toString()}
          change={+2}
          icon={Trophy}
          color="bg-yellow-500"
        />
        <StatsCard
          title="Streak Days"
          value={userProgress.streak.toString()}
          change={+1}
          icon={Flame}
          color="bg-orange-500"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Crown className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="social">
            <Users className="w-4 h-4 mr-2" />
            Community
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="xp" 
                      stroke={CHART_COLORS.primary} 
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ACHIEVEMENTS.slice(0, 3).map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      userProgress.achievements.includes(achievement.id)
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${
                      userProgress.achievements.includes(achievement.id)
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <achievement.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      +{achievement.xp} XP
                    </Badge>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Latest Valuation Result */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Latest Valuation Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      ₹{(result.estimatedValue / 1000000).toFixed(1)}M
                    </div>
                    <p className="text-sm text-muted-foreground">Estimated Value</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {result.confidence}%
                    </div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {(result.estimatedValue / result.inputs.annualRevenue).toFixed(1)}x
                    </div>
                    <p className="text-sm text-muted-foreground">Revenue Multiple</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View Report
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ACHIEVEMENTS.map((achievement) => (
              <motion.div
                key={achievement.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className={`cursor-pointer transition-all ${
                  userProgress.achievements.includes(achievement.id)
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg'
                    : 'hover:shadow-md'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-full ${
                        userProgress.achievements.includes(achievement.id)
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <achievement.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{achievement.title}</h3>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      {userProgress.achievements.includes(achievement.id) && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant={userProgress.achievements.includes(achievement.id) ? "default" : "secondary"}>
                        +{achievement.xp} XP
                      </Badge>
                      {userProgress.achievements.includes(achievement.id) && (
                        <span className="text-sm text-green-600 font-medium">Completed!</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboardData.map((user) => (
                  <motion.div
                    key={user.rank}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      user.isCurrentUser 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      user.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      user.rank === 2 ? 'bg-gray-100 text-gray-700' :
                      user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.rank}
                    </div>
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{user.xp.toLocaleString()} XP</p>
                      {user.rank <= 3 && (
                        <div className="flex items-center gap-1">
                          <Trophy className={`w-4 h-4 ${
                            user.rank === 1 ? 'text-yellow-500' :
                            user.rank === 2 ? 'text-gray-500' :
                            'text-orange-500'
                          }`} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke={CHART_COLORS.secondary} 
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly XP */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly XP Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="xp" 
                      stroke={CHART_COLORS.purple} 
                      fill={CHART_COLORS.purple}
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Community Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Community Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { user: "Rajesh Kumar", action: "completed a valuation", time: "2h ago", likes: 12 },
                  { user: "Priya Sharma", action: "achieved Growth Champion", time: "4h ago", likes: 24 },
                  { user: "Amit Patel", action: "shared a report", time: "6h ago", likes: 8 }
                ].map((update, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{update.user.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{update.user}</span> {update.action}
                      </p>
                      <p className="text-xs text-muted-foreground">{update.time}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Heart className="w-4 h-4" />
                      {update.likes}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Play className="w-4 h-4 mr-2" />
                  Start New Valuation
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Your Progress
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Invite Friends
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Gift className="w-4 h-4 mr-2" />
                  Redeem Rewards
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  change: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}

function StatsCard({ title, value, change, icon: Icon, color }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
              <div className="flex items-center gap-1 mt-2">
                {change > 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.abs(change)}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-full ${color} text-white`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}