import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalization } from "@/hooks/useLocalization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  Star, 
  Trophy, 
  Gift, 
  Target,
  Calendar,
  User,
  MessageSquare,
  Eye,
  Heart,
  Search,
  Plus,
  Share2
} from "lucide-react";

interface DailyTasksProps {
  isVisible: boolean;
  onClose: () => void;
  onTaskComplete: (taskId: string, reward: any) => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  completed: boolean;
  reward: {
    type: 'points' | 'coins' | 'badge' | 'special';
    value: number;
    label: string;
  };
  color: string;
  category: 'engagement' | 'social' | 'business' | 'learning';
}

export function DailyTasks({ isVisible, onClose, onTaskComplete }: DailyTasksProps) {
  const { t } = useLocalization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalTasks] = useState(8);

  useEffect(() => {
    // Initialize daily tasks
    const dailyTasks: Task[] = [
      {
        id: 'profile_update',
        title: 'Complete Profile',
        description: 'Update your business profile information',
        icon: <User className="w-4 h-4" />,
        progress: 1,
        maxProgress: 1,
        completed: false,
        reward: { type: 'points', value: 50, label: '50 Points' },
        color: 'bg-blue-500',
        category: 'engagement'
      },
      {
        id: 'view_listings',
        title: 'Browse Listings',
        description: 'View 5 business listings',
        icon: <Eye className="w-4 h-4" />,
        progress: 2,
        maxProgress: 5,
        completed: false,
        reward: { type: 'points', value: 25, label: '25 Points' },
        color: 'bg-green-500',
        category: 'engagement'
      },
      {
        id: 'send_message',
        title: 'Network & Connect',
        description: 'Send 2 messages to potential partners',
        icon: <MessageSquare className="w-4 h-4" />,
        progress: 0,
        maxProgress: 2,
        completed: false,
        reward: { type: 'points', value: 75, label: '75 Points' },
        color: 'bg-purple-500',
        category: 'social'
      },
      {
        id: 'search_business',
        title: 'Smart Search',
        description: 'Use advanced search filters',
        icon: <Search className="w-4 h-4" />,
        progress: 0,
        maxProgress: 1,
        completed: false,
        reward: { type: 'coins', value: 20, label: '20 Coins' },
        color: 'bg-orange-500',
        category: 'business'
      },
      {
        id: 'express_interest',
        title: 'Show Interest',
        description: 'Express interest in a business',
        icon: <Heart className="w-4 h-4" />,
        progress: 0,
        maxProgress: 1,
        completed: false,
        reward: { type: 'points', value: 100, label: '100 Points' },
        color: 'bg-red-500',
        category: 'business'
      },
      {
        id: 'share_listing',
        title: 'Share & Promote',
        description: 'Share a listing with your network',
        icon: <Share2 className="w-4 h-4" />,
        progress: 0,
        maxProgress: 1,
        completed: false,
        reward: { type: 'points', value: 30, label: '30 Points' },
        color: 'bg-teal-500',
        category: 'social'
      },
      {
        id: 'create_listing',
        title: 'List Your Business',
        description: 'Create a new business listing',
        icon: <Plus className="w-4 h-4" />,
        progress: 0,
        maxProgress: 1,
        completed: false,
        reward: { type: 'badge', value: 1, label: 'Entrepreneur Badge' },
        color: 'bg-indigo-500',
        category: 'business'
      },
      {
        id: 'daily_checkin',
        title: 'Daily Check-in',
        description: 'Complete your daily check-in',
        icon: <Calendar className="w-4 h-4" />,
        progress: 0,
        maxProgress: 1,
        completed: false,
        reward: { type: 'points', value: 20, label: '20 Points + Streak' },
        color: 'bg-yellow-500',
        category: 'engagement'
      }
    ];

    // Simulate some progress
    const tasksWithProgress = dailyTasks.map(task => {
      const random = Math.random();
      if (random < 0.3) {
        // 30% chance task is completed
        return { ...task, completed: true, progress: task.maxProgress };
      } else if (random < 0.6) {
        // 30% chance task has some progress
        const progress = Math.floor(Math.random() * task.maxProgress);
        return { ...task, progress: Math.min(progress, task.maxProgress - 1) };
      }
      return task;
    });

    setTasks(tasksWithProgress);
    setCompletedToday(tasksWithProgress.filter(t => t.completed).length);
  }, []);

  const handleTaskClick = (task: Task) => {
    if (task.completed) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        const newProgress = Math.min(t.progress + 1, t.maxProgress);
        const isCompleted = newProgress >= t.maxProgress;
        
        if (isCompleted && !t.completed) {
          // Task just completed
          onTaskComplete(t.id, t.reward);
          setCompletedToday(prev => prev + 1);
        }
        
        return {
          ...t,
          progress: newProgress,
          completed: isCompleted
        };
      }
      return t;
    });

    setTasks(updatedTasks);
  };

  const getTasksByCategory = (category: string) => {
    return tasks.filter(task => task.category === category);
  };

  const categories = [
    { id: 'engagement', name: 'Daily Engagement', icon: <Target className="w-5 h-5" /> },
    { id: 'social', name: 'Social & Networking', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'business', name: 'Business Actions', icon: <Trophy className="w-5 h-5" /> },
    { id: 'learning', name: 'Learning & Growth', icon: <Star className="w-5 h-5" /> }
  ];

  const progressPercentage = (completedToday / totalTasks) * 100;

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
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="relative">
              <div className="absolute top-4 right-4">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  ×
                </Button>
              </div>
              
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Calendar className="w-8 h-8 text-blue-600" />
                <span>{t('gamification.daily.task')}</span>
              </CardTitle>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Today's Progress: {completedToday}/{totalTasks} tasks completed
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {Math.round(progressPercentage)}% Complete
                  </Badge>
                </div>
                
                <div className="w-full">
                  <Progress value={progressPercentage} className="h-3" />
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>Resets in: 18h 42m</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Gift className="w-4 h-4 text-purple-500" />
                    <span>Bonus reward at 100%</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {categories.map((category) => {
                const categoryTasks = getTasksByCategory(category.id);
                if (categoryTasks.length === 0) return null;
                
                return (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="text-indigo-600">
                        {category.icon}
                      </div>
                      <h3 className="font-semibold text-gray-800">{category.name}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card 
                            className={`cursor-pointer transition-all duration-200 ${
                              task.completed 
                                ? 'bg-green-50 border-green-200' 
                                : 'hover:shadow-md border-gray-200'
                            }`}
                            onClick={() => handleTaskClick(task)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-full ${task.color} text-white flex-shrink-0`}>
                                  {task.completed ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    task.icon
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-semibold text-sm text-gray-800">
                                      {task.title}
                                    </h4>
                                    <Badge 
                                      variant={task.completed ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {task.reward.label}
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-xs text-gray-600 mb-2">
                                    {task.description}
                                  </p>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full ${task.color} transition-all duration-300`}
                                          style={{ 
                                            width: `${(task.progress / task.maxProgress) * 100}%` 
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {task.progress}/{task.maxProgress}
                                      </span>
                                    </div>
                                    
                                    {task.completed && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-green-600"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </motion.div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Bonus Reward Section */}
              {completedToday === totalTasks && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6 text-center"
                >
                  <Trophy className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-xl font-bold mb-2">Perfect Day!</h3>
                  <p className="text-purple-100 mb-4">
                    You've completed all daily tasks! Claim your bonus reward.
                  </p>
                  <Button 
                    className="bg-white text-purple-600 hover:bg-purple-50"
                    onClick={() => onTaskComplete('daily_bonus', { 
                      type: 'special', 
                      value: 200, 
                      label: 'Daily Completion Bonus' 
                    })}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Claim 200 Bonus Points
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}