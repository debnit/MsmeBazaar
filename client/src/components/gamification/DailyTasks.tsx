import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Target,
  Clock,
  Star,
  X,
  Gift,
  Users,
  FileText,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';

interface DailyTasksProps {
  isVisible: boolean;
  onClose: () => void;
  onTaskComplete: (taskId: string, reward: number) => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
  category: 'social' | 'business' | 'engagement' | 'learning';
  icon: React.ReactNode;
}

export function DailyTasks({
  isVisible,
  onClose,
  onTaskComplete,
}: DailyTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'profile_update',
      title: 'Update Your Profile',
      description: 'Complete your business profile with all required information',
      reward: 50,
      progress: 80,
      maxProgress: 100,
      completed: false,
      category: 'business',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'create_listing',
      title: 'Create New Listing',
      description: 'Post a new MSME listing on the marketplace',
      reward: 100,
      progress: 0,
      maxProgress: 1,
      completed: false,
      category: 'business',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'browse_listings',
      title: 'Browse 5 Listings',
      description: 'Explore and view at least 5 different MSME listings',
      reward: 25,
      progress: 2,
      maxProgress: 5,
      completed: false,
      category: 'engagement',
      icon: <Target className="w-5 h-5" />,
    },
    {
      id: 'send_message',
      title: 'Send 3 Messages',
      description: 'Connect with other users by sending messages',
      reward: 30,
      progress: 1,
      maxProgress: 3,
      completed: false,
      category: 'social',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      id: 'daily_login',
      title: 'Daily Login Streak',
      description: 'Maintain your daily login streak',
      reward: 20,
      progress: 1,
      maxProgress: 1,
      completed: true,
      category: 'engagement',
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      id: 'share_listing',
      title: 'Share a Listing',
      description: 'Share an interesting MSME listing with your network',
      reward: 40,
      progress: 0,
      maxProgress: 1,
      completed: false,
      category: 'social',
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ]);

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) {return;}

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: true, progress: t.maxProgress } : t,
    ));

    onTaskComplete(taskId, task.reward);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
    case 'business': return 'bg-blue-500';
    case 'social': return 'bg-purple-500';
    case 'engagement': return 'bg-green-500';
    case 'learning': return 'bg-orange-500';
    default: return 'bg-gray-500';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
    case 'business': return 'Business';
    case 'social': return 'Social';
    case 'engagement': return 'Engagement';
    case 'learning': return 'Learning';
    default: return 'Other';
    }
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalRewards = tasks.reduce((sum, task) => sum + (task.completed ? task.reward : 0), 0);

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
                    <Target className="w-5 h-5" />
                    <span>Daily Tasks</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress Summary */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="font-semibold">{completedTasks} / {tasks.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-600">Total Rewards</p>
                      <p className="font-semibold">{totalRewards} points</p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        task.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-full ${getCategoryColor(task.category)} text-white`}>
                            {task.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{task.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryName(task.category)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{task.description}</p>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">
                                  Progress: {task.progress} / {task.maxProgress}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <Gift className="w-4 h-4 text-yellow-500" />
                                  <span className="font-semibold text-yellow-600">
                                    +{task.reward} points
                                  </span>
                                </div>
                              </div>
                              <Progress
                                value={(task.progress / task.maxProgress) * 100}
                                className="h-2"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="ml-4">
                          {task.completed ? (
                            <div className="flex items-center space-x-2 text-green-600">
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-semibold">Completed</span>
                            </div>
                          ) : task.progress >= task.maxProgress ? (
                            <Button
                              onClick={() => handleCompleteTask(task.id)}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2 text-gray-400">
                              <Clock className="w-5 h-5" />
                              <span className="text-sm">In Progress</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Daily Bonus */}
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">Daily Bonus</h3>
                      <p className="text-sm opacity-90">
                        Complete all tasks to earn a bonus reward!
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Star className="w-5 h-5" />
                        <span className="font-bold">+200 points</span>
                      </div>
                      <p className="text-xs opacity-75">
                        {completedTasks === tasks.length ? 'Earned!' : `${tasks.length - completedTasks} tasks left`}
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
