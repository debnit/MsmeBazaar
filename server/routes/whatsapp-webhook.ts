/**
 * WhatsApp Webhook Routes
 * Handles incoming WhatsApp messages and webhook verification
 */

import { Router } from 'express';
import { whatsappService } from '../integrations/whatsapp-business';

const router = Router();

/**
 * Webhook verification (required by Meta)
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  } else {
    res.status(400).send('Bad Request');
  }
});

/**
 * Handle incoming webhook messages
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      await whatsappService.handleWebhook(body);
      res.status(200).send('OK');
    } else {
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Send manual WhatsApp message (for testing)
 */
router.post('/send-message', async (req, res) => {
  try {
    const { phoneNumber, message, type = 'text' } = req.body;
    
    const whatsappMessage = {
      to: phoneNumber,
      type,
      text: { body: message }
    };
    
    const result = await whatsappService.sendMessage(whatsappMessage);
    res.json(result);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * Start onboarding flow
 */
router.post('/start-onboarding', async (req, res) => {
  try {
    const { phoneNumber, userRole } = req.body;
    
    await whatsappService.startOnboardingFlow(phoneNumber, userRole);
    res.json({ success: true });
  } catch (error) {
    console.error('Onboarding flow error:', error);
    res.status(500).json({ success: false, error: 'Failed to start onboarding' });
  }
});

/**
 * Send retention campaign
 */
router.post('/retention-campaign', async (req, res) => {
  try {
    const { userId } = req.body;
    
    await whatsappService.startRetentionCampaign(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Retention campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to start retention campaign' });
  }
});

/**
 * Get WhatsApp templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await whatsappService.getTemplates();
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to get templates' });
  }
});

export default router;