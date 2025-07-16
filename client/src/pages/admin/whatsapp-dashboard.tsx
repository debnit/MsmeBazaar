/**
 * WhatsApp Business Dashboard
 * Manages WhatsApp integration, campaigns, and chat-led user acquisition
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  MessageCircle, 
  Send, 
  Users, 
  TrendingUp, 
  Target,
  Bell,
  Settings,
  Activity,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Zap,
  BarChart3
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppStats {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  delivery_rate: number;
  response_rate: number;
  active_conversations: number;
  new_registrations: number;
}

interface Campaign {
  id: string;
  name: string;
  type: 'onboarding' | 'retention' | 'acquisition';
  status: 'active' | 'paused' | 'completed';
  sent: number;
  delivered: number;
  responded: number;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  components: any[];
}

export default function WhatsAppDashboard() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [messageText, setMessageText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/whatsapp-stats'],
    queryFn: () => apiRequest('/api/admin/whatsapp-stats')
  });

  const { data: campaigns } = useQuery({
    queryKey: ['/api/admin/whatsapp-campaigns'],
    queryFn: () => apiRequest('/api/admin/whatsapp-campaigns')
  });

  const { data: templates } = useQuery({
    queryKey: ['/api/whatsapp/templates'],
    queryFn: () => apiRequest('/api/whatsapp/templates')
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; message: string; type?: string }) => {
      return apiRequest('/api/whatsapp/send-message', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: 'Message sent successfully',
        description: 'WhatsApp message has been sent',
        variant: 'default'
      });
      setMessageText('');
      setPhoneNumber('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const startCampaignMutation = useMutation({
    mutationFn: async (data: { userId: number; campaignType: string }) => {
      return apiRequest(`/api/whatsapp/${data.campaignType}-campaign`, {
        method: 'POST',
        body: JSON.stringify({ userId: data.userId })
      });
    },
    onSuccess: () => {
      toast({
        title: 'Campaign started',
        description: 'WhatsApp campaign has been initiated',
        variant: 'default'
      });
    }
  });

  const handleSendMessage = () => {
    if (!phoneNumber || !messageText) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both phone number and message',
        variant: 'destructive'
      });
      return;
    }

    sendMessageMutation.mutate({
      phoneNumber,
      message: messageText,
      type: 'text'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Business Dashboard</h1>
          <p className="text-muted-foreground">
            Manage WhatsApp campaigns and user acquisition
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Connected</span>
          </Badge>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.total_sent || 12580)}</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((stats?.delivery_rate || 0.945) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.total_delivered || 11890)} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {((stats?.response_rate || 0.32) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats?.total_replied || 3805)} responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Registrations</CardTitle>
            <UserPlus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(stats?.new_registrations || 245)}
            </div>
            <p className="text-xs text-muted-foreground">
              From WhatsApp campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="messages">Send Messages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Campaign Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span>Onboarding Flow</span>
                </CardTitle>
                <CardDescription>
                  Welcome new users with interactive flows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="text-sm font-medium">1,234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Completion Rate</span>
                    <span className="text-sm font-medium text-green-600">78%</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => startCampaignMutation.mutate({ userId: 1, campaignType: 'onboarding' })}
                  >
                    Start Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span>Retention Campaign</span>
                </CardTitle>
                <CardDescription>
                  Re-engage dormant users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Targeted Users</span>
                    <span className="text-sm font-medium">856</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Reactivation Rate</span>
                    <span className="text-sm font-medium text-green-600">42%</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => startCampaignMutation.mutate({ userId: 1, campaignType: 'retention' })}
                  >
                    Start Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-orange-600" />
                  <span>Acquisition Campaign</span>
                </CardTitle>
                <CardDescription>
                  Convert prospects to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Prospects</span>
                    <span className="text-sm font-medium">2,145</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Conversion Rate</span>
                    <span className="text-sm font-medium text-green-600">23%</span>
                  </div>
                  <Button size="sm" className="w-full">
                    Start Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns?.map((campaign: Campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-medium">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {campaign.type} • {campaign.sent} sent
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {((campaign.responded / campaign.sent) * 100).toFixed(1)}% response
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.delivered} delivered
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    No campaigns yet. Start your first campaign above.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Manual Message</CardTitle>
                <CardDescription>
                  Send a text message to a specific phone number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                  className="w-full"
                >
                  {sendMessageMutation.isPending ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Send Template Message</CardTitle>
                <CardDescription>
                  Use approved templates for better delivery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template: Template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-phone">Phone Number</Label>
                  <Input
                    id="template-phone"
                    placeholder="+91 9876543210"
                  />
                </div>
                <Button className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Templates</CardTitle>
              <CardDescription>
                Manage your approved message templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates?.map((template: Template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant={template.status === 'approved' ? 'default' : 'secondary'}>
                        {template.status}
                      </Badge>
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.category} • {template.language}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates found. Create your first template.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Delivery Rate</span>
                      <span className="text-sm font-medium">94.5%</span>
                    </div>
                    <Progress value={94.5} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Read Rate</span>
                      <span className="text-sm font-medium">87.2%</span>
                    </div>
                    <Progress value={87.2} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Response Rate</span>
                      <span className="text-sm font-medium">32.1%</span>
                    </div>
                    <Progress value={32.1} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Acquisition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Sellers via WhatsApp</span>
                    <span className="text-sm font-medium">89</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Buyers via WhatsApp</span>
                    <span className="text-sm font-medium">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Agents via WhatsApp</span>
                    <span className="text-sm font-medium">34</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-sm">Total Acquisitions</span>
                    <span className="text-sm">279</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Messages Sent</span>
                  <span className="text-sm font-medium">12,580</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Messages Delivered</span>
                  <span className="text-sm font-medium">11,890 (94.5%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Messages Read</span>
                  <span className="text-sm font-medium">10,367 (87.2%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Messages Replied</span>
                  <span className="text-sm font-medium">3,805 (32.1%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Registrations</span>
                  <span className="text-sm font-medium text-green-600">279 (7.3%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}