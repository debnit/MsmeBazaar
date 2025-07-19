import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// WhatsApp webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const { entry } = req.body;

    if (entry && entry.length > 0) {
      for (const item of entry) {
        if (item.changes && item.changes.length > 0) {
          for (const change of item.changes) {
            if (change.value && change.value.messages) {
              for (const message of change.value.messages) {
                console.log('WhatsApp message received:', message);
                // Process message here
              }
            }
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Send WhatsApp message
router.post('/send-message', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { to, message } = req.body;

    // Mock WhatsApp API call
    const result = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    };

    res.json({ success: true, result });
  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get WhatsApp templates
router.get('/templates', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const templates = [
      {
        id: 'onboarding_welcome',
        name: 'Onboarding Welcome',
        category: 'onboarding',
        status: 'APPROVED',
        language: 'en',
        components: [
          {
            type: 'BODY',
            text: 'Welcome to MSMESquare! 🎉\n\nYour account has been created successfully. Start exploring MSME opportunities and connect with verified buyers and sellers.',
          },
        ],
      },
      {
        id: 'retention_nudge',
        name: 'Retention Nudge',
        category: 'retention',
        status: 'APPROVED',
        language: 'en',
        components: [
          {
            type: 'BODY',
            text: 'Hi there! 👋\n\nWe noticed you haven\'t logged into MSMESquare recently. Don\'t miss out on new MSME listings and business opportunities!',
          },
        ],
      },
    ];

    res.json(templates);
  } catch (error) {
    console.error('Get WhatsApp templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

export default router;
