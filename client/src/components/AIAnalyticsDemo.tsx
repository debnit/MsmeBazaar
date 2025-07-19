import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '../hooks/use-toast';
import { 
  Brain, 
  Search, 
  TrendingUp, 
  Settings, 
  MessageSquare,
  BarChart3,
  Users,
  Building2,
  Target,
  Sparkles,
  Zap,
  Database,
  Activity,
  FileText
} from 'lucide-react';



interface AssistantResponse {
  message: string;
  suggestions: string[];
  actions: Array<{
    type: 'navigation' | 'search' | 'contact' | 'document';
    label: string;
    action: string;
    data?: any;
  }>;
  confidence: number;
  sources: Array<{
    type: 'knowledge_base' | 'listing' | 'user_data';
    title: string;
    snippet: string;
    url?: string;
  }>;
}

export default function AIAnalyticsDemo() {
  const [activeTab, setActiveTab] = useState('vector-search');
  const [searchQuery, setSearchQuery] = useState('');
  const [assistantQuery, setAssistantQuery] = useState('');
  const [sessionId] = useState(`session_${Date.now()}`);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [vectorStats, setVectorStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadVectorStats();
    loadMetabaseDashboard();
    loadRetoolTools();
  }, []);

  const loadVectorStats = async () => {
    try {
      const response = await fetch('/api/ai-analytics/vector-search/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const stats = await response.json();
        setVectorStats(stats);
      }
    } catch (error) {
      console.error('Failed to load vector stats:', error);
    }
  };

  const loadMetabaseDashboard = async () => {
    try {
      const response = await fetch('/api/ai-analytics/metabase/dashboard-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const config = await response.json();
        setDashboardUrl(config.dashboardUrl);
      }
    } catch (error) {
      console.error('Failed to load dashboard config:', error);
    }
  };

  const loadRetoolTools = async () => {
    try {
      const response = await fetch('/api/ai-analytics/retool/tools', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTools(data.tools);
      }
    } catch (error) {
      console.error('Failed to load Retool tools:', error);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/ai-analytics/vector-search/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
        toast({
          title: "Search Complete",
          description: `Found ${data.results.length} semantic matches`,
        });
      } else {
        toast({
          title: "Search Failed",
          description: "Unable to perform semantic search",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      toast({
        title: "Search Error",
        description: "An error occurred during search",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantQuery = async () => {
    if (!assistantQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/ai-analytics/smart-assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          query: assistantQuery,
          sessionId: sessionId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAssistantResponse(data);
        toast({
          title: "Assistant Response",
          description: `Response received with ${data.confidence}% confidence`,
        });
      } else {
        toast({
          title: "Assistant Error",
          description: "Unable to get assistant response",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Assistant query error:', error);
      toast({
        title: "Assistant Error",
        description: "An error occurred while processing your query",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };



  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI & Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Advanced AI-powered tools for MSMESquare platform</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Sparkles className="w-3 h-3 mr-1" />
            VC-Grade AI
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Zap className="w-3 h-3 mr-1" />
            Production Ready
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vector-search" className="flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Vector Search
          </TabsTrigger>
          <TabsTrigger value="smart-assistant" className="flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            Smart Assistant
          </TabsTrigger>
          <TabsTrigger value="metabase" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Metabase Analytics
          </TabsTrigger>
          <TabsTrigger value="retool" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Retool Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vector-search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Semantic Matchmaking
              </CardTitle>
              <CardDescription>
                AI-powered semantic search using Pinecone vector embeddings for intelligent business matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Total Vectors</p>
                      <p className="text-2xl font-bold">{vectorStats.totalVectors?.toLocaleString() || '0'}</p>
                    </div>
                    <Database className="w-8 h-8 text-blue-500" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Dimension</p>
                      <p className="text-2xl font-bold">{vectorStats.dimension || '1536'}</p>
                    </div>
                    <Activity className="w-8 h-8 text-green-500" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Index Fullness</p>
                      <p className="text-2xl font-bold">{((vectorStats.indexFullness || 0) * 100).toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </Card>
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Search for businesses semantically (e.g., 'profitable textile business in Maharashtra')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSemanticSearch()}
                />
                <Button onClick={handleSemanticSearch} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Search Results</h4>
                  {searchResults.map((result, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium">{result.metadata.company_name}</h5>
                          <p className="text-sm text-gray-600">{result.metadata.industry}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {result.metadata.location} • ₹{result.metadata.asking_price?.toLocaleString()} • 
                            {result.metadata.employee_count} employees
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${getConfidenceColor(result.similarity_score)} mr-1`} />
                            <span className="text-sm font-medium">{(result.similarity_score * 100).toFixed(1)}%</span>
                          </div>
                          <Button variant="outline" size="sm">View Details</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smart-assistant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                AI-Powered Smart Assistant
              </CardTitle>
              <CardDescription>
                LangChain + LlamaIndex powered assistant with MSMESquare knowledge base for agents and buyers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Ask me about MSME valuations, financing, or marketplace processes..."
                  value={assistantQuery}
                  onChange={(e) => setAssistantQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAssistantQuery()}
                />
                <Button onClick={handleAssistantQuery} disabled={loading}>
                  {loading ? 'Processing...' : 'Ask'}
                </Button>
              </div>

              {assistantResponse && (
                <div className="space-y-4">
                  <Card className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold">Assistant Response</h4>
                      <Badge variant="secondary">
                        {(assistantResponse.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <p className="text-gray-700 mb-4">{assistantResponse.message}</p>
                    
                    {assistantResponse.suggestions.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-sm mb-2">Suggestions:</h5>
                        <div className="flex flex-wrap gap-2">
                          {assistantResponse.suggestions.map((suggestion, index) => (
                            <Badge key={index} variant="outline" className="cursor-pointer hover:bg-gray-100">
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {assistantResponse.actions.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-sm mb-2">Actions:</h5>
                        <div className="flex flex-wrap gap-2">
                          {assistantResponse.actions.map((action, index) => (
                            <Button key={index} variant="outline" size="sm">
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {assistantResponse.sources.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Sources:</h5>
                        <div className="space-y-2">
                          {assistantResponse.sources.map((source, index) => (
                            <div key={index} className="flex items-start space-x-2 text-sm">
                              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <p className="font-medium">{source.title}</p>
                                <p className="text-gray-600">{source.snippet}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metabase" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Embedded Analytics Dashboard
              </CardTitle>
              <CardDescription>
                Metabase-powered analytics for NBFCs, agents, and administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Your Analytics Dashboard</h4>
                    <Button variant="outline" onClick={() => window.open(dashboardUrl, '_blank')}>
                      Open in New Tab
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={dashboardUrl}
                      width="100%"
                      height="600"
                      frameBorder="0"
                      allowFullScreen
                      className="bg-white"
                    />
                  </div>
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="font-semibold mb-2">Analytics Dashboard Loading</h3>
                  <p className="text-gray-600">Your personalized analytics dashboard is being prepared...</p>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retool" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Internal Admin Tools
              </CardTitle>
              <CardDescription>
                Retool-powered admin interfaces for operations, compliance, and management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTools.map((tool, index) => (
                  <Card key={index} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{tool.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                        <div className="flex items-center mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {tool.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {tool.category === 'admin' && <Users className="w-4 h-4 text-blue-500" />}
                        {tool.category === 'operations' && <Building2 className="w-4 h-4 text-green-500" />}
                        {tool.category === 'analytics' && <TrendingUp className="w-4 h-4 text-purple-500" />}
                        {tool.category === 'compliance' && <FileText className="w-4 h-4 text-orange-500" />}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => window.open(tool.url, '_blank')}
                    >
                      Open Tool
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}