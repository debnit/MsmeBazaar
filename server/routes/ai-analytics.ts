/**
 * AI & Analytics API Routes
 */

import { Router } from 'express';
import { vectorSearch } from '../ai/vector-search';
import { smartAssistant } from '../ai/smart-assistant';
import { metabaseIntegration } from '../integrations/metabase';
import { retoolIntegration } from '../integrations/retool';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Vector Search Routes
router.post('/vector-search/semantic-search', authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await vectorSearch.semanticSearch(query, limit);

    res.json({
      results,
      totalResults: results.length,
      query,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Failed to perform semantic search' });
  }
});

router.post('/vector-search/find-matches/:buyerId', authenticateToken, async (req, res) => {
  try {
    const buyerId = parseInt(req.params.buyerId);
    const { limit = 20 } = req.body;

    if (isNaN(buyerId)) {
      return res.status(400).json({ error: 'Invalid buyer ID' });
    }

    const matches = await vectorSearch.generateSemanticMatches(buyerId, limit);

    res.json({
      matches,
      buyerId,
      totalMatches: matches.length,
    });
  } catch (error) {
    console.error('Find matches error:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

router.post('/vector-search/index-msme/:msmeId', authenticateToken, async (req, res) => {
  try {
    const msmeId = parseInt(req.params.msmeId);

    if (isNaN(msmeId)) {
      return res.status(400).json({ error: 'Invalid MSME ID' });
    }

    await vectorSearch.indexMSMEListing(msmeId);

    res.json({
      success: true,
      message: 'MSME listing indexed successfully',
      msmeId,
    });
  } catch (error) {
    console.error('Index MSME error:', error);
    res.status(500).json({ error: 'Failed to index MSME listing' });
  }
});

router.post('/vector-search/index-buyer/:buyerId', authenticateToken, async (req, res) => {
  try {
    const buyerId = parseInt(req.params.buyerId);

    if (isNaN(buyerId)) {
      return res.status(400).json({ error: 'Invalid buyer ID' });
    }

    await vectorSearch.indexBuyerProfile(buyerId);

    res.json({
      success: true,
      message: 'Buyer profile indexed successfully',
      buyerId,
    });
  } catch (error) {
    console.error('Index buyer error:', error);
    res.status(500).json({ error: 'Failed to index buyer profile' });
  }
});

router.get('/vector-search/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await vectorSearch.getIndexStats();
    const isHealthy = await vectorSearch.isHealthy();

    res.json({
      ...stats,
      isHealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Vector search stats error:', error);
    res.status(500).json({ error: 'Failed to get vector search stats' });
  }
});

// Smart Assistant Routes
router.post('/smart-assistant/query', authenticateToken, async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!query || !sessionId) {
      return res.status(400).json({ error: 'Query and session ID are required' });
    }

    const conversationHistory = await smartAssistant.getConversationHistory(
      userId,
      sessionId,
      10,
    );

    const response = await smartAssistant.processQuery(query, {
      userId,
      userRole,
      sessionId,
      conversationHistory,
    });

    res.json(response);
  } catch (error) {
    console.error('Smart assistant query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

router.get('/smart-assistant/history/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const history = await smartAssistant.getConversationHistory(
      userId,
      sessionId,
      parseInt(limit as string) || 10,
    );

    res.json({
      history,
      sessionId,
      totalMessages: history.length,
    });
  } catch (error) {
    console.error('Smart assistant history error:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

router.delete('/smart-assistant/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    smartAssistant.clearConversationMemory(sessionId);

    res.json({
      success: true,
      message: 'Conversation memory cleared',
      sessionId,
    });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Failed to clear conversation memory' });
  }
});

router.get('/smart-assistant/analytics', authenticateToken, async (req, res) => {
  try {
    const analytics = await smartAssistant.getAnalytics();

    res.json(analytics);
  } catch (error) {
    console.error('Smart assistant analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Metabase Integration Routes
router.get('/metabase/nbfc-analytics/:nbfcId', authenticateToken, async (req, res) => {
  try {
    const nbfcId = parseInt(req.params.nbfcId);

    if (isNaN(nbfcId)) {
      return res.status(400).json({ error: 'Invalid NBFC ID' });
    }

    const analytics = await metabaseIntegration.getNBFCAnalytics(nbfcId);

    res.json(analytics);
  } catch (error) {
    console.error('NBFC analytics error:', error);
    res.status(500).json({ error: 'Failed to get NBFC analytics' });
  }
});

router.get('/metabase/agent-analytics/:agentId', authenticateToken, async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId);

    if (isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    const analytics = await metabaseIntegration.getAgentAnalytics(agentId);

    res.json(analytics);
  } catch (error) {
    console.error('Agent analytics error:', error);
    res.status(500).json({ error: 'Failed to get agent analytics' });
  }
});

router.get('/metabase/admin-analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const analytics = await metabaseIntegration.getAdminAnalytics();

    res.json(analytics);
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to get admin analytics' });
  }
});

router.get('/metabase/dashboard-config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const config = await metabaseIntegration.getUserDashboardConfig(userId, userRole);

    res.json(config);
  } catch (error) {
    console.error('Dashboard config error:', error);
    res.status(500).json({ error: 'Failed to get dashboard config' });
  }
});

router.post('/metabase/custom-dashboard', authenticateToken, async (req, res) => {
  try {
    const { name, description, questions } = req.body;

    if (!name || !description || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Name, description, and questions are required' });
    }

    const dashboard = await metabaseIntegration.createCustomDashboard(
      name,
      description,
      questions,
    );

    res.json(dashboard);
  } catch (error) {
    console.error('Create custom dashboard error:', error);
    res.status(500).json({ error: 'Failed to create custom dashboard' });
  }
});

router.get('/metabase/health', authenticateToken, async (req, res) => {
  try {
    const isHealthy = await metabaseIntegration.isHealthy();
    const systemStatus = await metabaseIntegration.getSystemStatus();

    res.json({
      isHealthy,
      ...systemStatus,
    });
  } catch (error) {
    console.error('Metabase health check error:', error);
    res.status(500).json({ error: 'Failed to check Metabase health' });
  }
});

// Retool Integration Routes
router.get('/retool/tools', authenticateToken, async (req, res) => {
  try {
    const tools = await retoolIntegration.getAvailableTools();

    res.json({
      tools,
      totalTools: tools.length,
    });
  } catch (error) {
    console.error('Get tools error:', error);
    res.status(500).json({ error: 'Failed to get available tools' });
  }
});

router.get('/retool/user-management-data', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const data = await retoolIntegration.getUserManagementData();

    res.json(data);
  } catch (error) {
    console.error('User management data error:', error);
    res.status(500).json({ error: 'Failed to get user management data' });
  }
});

router.get('/retool/listing-moderation-data', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    const data = await retoolIntegration.getListingModerationData();

    res.json(data);
  } catch (error) {
    console.error('Listing moderation data error:', error);
    res.status(500).json({ error: 'Failed to get listing moderation data' });
  }
});

router.get('/retool/loan-processing-data', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'loan_officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin or loan officer access required' });
    }

    const data = await retoolIntegration.getLoanProcessingData();

    res.json(data);
  } catch (error) {
    console.error('Loan processing data error:', error);
    res.status(500).json({ error: 'Failed to get loan processing data' });
  }
});

router.get('/retool/app-config', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;

    const config = await retoolIntegration.getAppConfigForRole(userRole);

    res.json(config);
  } catch (error) {
    console.error('App config error:', error);
    res.status(500).json({ error: 'Failed to get app config' });
  }
});

router.post('/retool/bulk-update-listings', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    const { listingIds, updates } = req.body;

    if (!Array.isArray(listingIds) || !updates) {
      return res.status(400).json({ error: 'Listing IDs and updates are required' });
    }

    const result = await retoolIntegration.bulkUpdateListings(listingIds, updates);

    res.json(result);
  } catch (error) {
    console.error('Bulk update listings error:', error);
    res.status(500).json({ error: 'Failed to bulk update listings' });
  }
});

router.post('/retool/bulk-update-loan-applications', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'loan_officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin or loan officer access required' });
    }

    const { applicationIds, updates } = req.body;

    if (!Array.isArray(applicationIds) || !updates) {
      return res.status(400).json({ error: 'Application IDs and updates are required' });
    }

    const result = await retoolIntegration.bulkUpdateLoanApplications(applicationIds, updates);

    res.json(result);
  } catch (error) {
    console.error('Bulk update loan applications error:', error);
    res.status(500).json({ error: 'Failed to bulk update loan applications' });
  }
});

router.post('/retool/generate-report', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'analyst'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin or analyst access required' });
    }

    const { reportType, filters } = req.body;

    if (!reportType || !filters) {
      return res.status(400).json({ error: 'Report type and filters are required' });
    }

    const report = await retoolIntegration.generateCustomReport(reportType, filters);

    res.json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/retool/health', authenticateToken, async (req, res) => {
  try {
    const isHealthy = await retoolIntegration.isHealthy();
    const systemStats = await retoolIntegration.getSystemStats();

    res.json({
      isHealthy,
      ...systemStats,
    });
  } catch (error) {
    console.error('Retool health check error:', error);
    res.status(500).json({ error: 'Failed to check Retool health' });
  }
});

// Combined Analytics Overview
router.get('/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get vector search stats
    const vectorStats = await vectorSearch.getIndexStats();

    // Get smart assistant analytics
    const assistantAnalytics = await smartAssistant.getAnalytics();

    // Get health status for all integrations
    const metabaseHealth = await metabaseIntegration.isHealthy();
    const retoolHealth = await retoolIntegration.isHealthy();
    const vectorHealth = await vectorSearch.isHealthy();
    const assistantHealth = smartAssistant.isHealthy();

    // Get user-specific dashboard config
    const dashboardConfig = await metabaseIntegration.getUserDashboardConfig(userId, userRole);

    res.json({
      vectorSearch: {
        ...vectorStats,
        isHealthy: vectorHealth,
      },
      smartAssistant: {
        ...assistantAnalytics,
        isHealthy: assistantHealth,
      },
      integrations: {
        metabase: {
          isHealthy: metabaseHealth,
        },
        retool: {
          isHealthy: retoolHealth,
        },
      },
      dashboardConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get analytics overview' });
  }
});

export default router;
