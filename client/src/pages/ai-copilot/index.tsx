import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Settings, History, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: CopilotAction[];
  quickReplies?: string[];
  businessInsights?: BusinessInsight[];
}

interface CopilotAction {
  type: 'navigate' | 'filter' | 'schedule' | 'contact' | 'generate_report';
  label: string;
  payload: Record<string, any>;
}

interface BusinessInsight {
  type: 'market_trend' | 'pricing' | 'opportunity' | 'risk';
  title: string;
  description: string;
  confidence: number;
}

export default function AICopilot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/ai-copilot/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
        
        // Add welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: getWelcomeMessage(),
          timestamp: new Date().toISOString(),
          quickReplies: [
            "What's trending in my industry?",
            "Show me my performance metrics",
            "Help me find potential clients",
            "What are my recent opportunities?"
          ]
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to AI assistant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || !sessionId) return;

    const userMessage: CopilotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-copilot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: CopilotMessage = {
          id: Date.now().toString() + '_assistant',
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          suggestedActions: data.suggestedActions || [],
          quickReplies: data.quickReplies || [],
          businessInsights: data.businessInsights || [],
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Message Failed",
        description: "Unable to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: CopilotAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.payload.route) {
          window.location.href = action.payload.route;
        }
        break;
      case 'filter':
        // Handle filter action
        console.log('Filter action:', action.payload);
        break;
      case 'schedule':
        // Handle schedule action
        console.log('Schedule action:', action.payload);
        break;
      case 'contact':
        // Handle contact action
        console.log('Contact action:', action.payload);
        break;
      case 'generate_report':
        // Handle report generation
        console.log('Generate report:', action.payload);
        break;
    }
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getWelcomeMessage = () => {
    const messages = {
      agent: "Hello! I'm your AI assistant. I can help you with client management, deal suggestions, market insights, and commission tracking. What would you like to know?",
      buyer: "Welcome! I'm here to help you find the perfect business opportunity. I can provide recommendations, valuation insights, and financing guidance. How can I assist you today?",
      seller: "Hi there! I can help you optimize your business listing, understand market trends, and connect with potential buyers. What would you like to explore?",
      nbfc: "Greetings! I can assist with loan application reviews, risk assessments, and portfolio management. What information do you need?",
    };

    return messages[user?.userType as keyof typeof messages] || messages.buyer;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'market_trend':
        return <TrendingUp className="w-4 h-4" />;
      case 'pricing':
        return <TrendingUp className="w-4 h-4" />;
      case 'opportunity':
        return <MessageSquare className="w-4 h-4" />;
      case 'risk':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'market_trend':
        return 'bg-blue-100 text-blue-800';
      case 'pricing':
        return 'bg-green-100 text-green-800';
      case 'opportunity':
        return 'bg-purple-100 text-purple-800';
      case 'risk':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="h-[calc(100vh-200px)] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            AI Copilot
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50">
              Online
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === 'assistant' && (
                        <Bot className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Business Insights */}
                        {message.businessInsights && message.businessInsights.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm font-medium">Business Insights:</div>
                            {message.businessInsights.map((insight, index) => (
                              <div
                                key={index}
                                className={`p-2 rounded text-sm ${getInsightColor(insight.type)}`}
                              >
                                <div className="flex items-center gap-2">
                                  {getInsightIcon(insight.type)}
                                  <span className="font-medium">{insight.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(insight.confidence * 100)}%
                                  </Badge>
                                </div>
                                <div className="mt-1">{insight.description}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Suggested Actions */}
                        {message.suggestedActions && message.suggestedActions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm font-medium">Suggested Actions:</div>
                            <div className="flex flex-wrap gap-2">
                              {message.suggestedActions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActionClick(action)}
                                  className="text-xs"
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Quick Replies */}
                        {message.quickReplies && message.quickReplies.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm font-medium">Quick Replies:</div>
                            <div className="flex flex-wrap gap-2">
                              {message.quickReplies.map((reply, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuickReply(reply)}
                                  className="text-xs"
                                >
                                  {reply}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs opacity-70 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Ask me anything about your business..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center">
              AI-powered assistance for your business needs
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}