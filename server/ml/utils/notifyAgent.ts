import axios from 'axios';

export async function notifyAgent(agentId: number, transaction: EscrowTransaction) {
  const agent = await getAgentDetails(agentId); // implement this using your DB

  const message = `🎉 Commission Alert!\n\nYou’ve earned ₹${transaction.amount} for referring a successful MSME deal (ID: ${transaction.escrowId}).\n\n- Team MSMEBazaar`;

  // MSG91 template ID (pre-approved), use your template and sender
  const payload = {
    template_id: "YOUR_MSG91_TEMPLATE_ID",
    sender: "MSMEBAZ",
    short_url: 1,
    recipient: `91${agent.mobile}`,  // or full international number
    variables_values: message,
  };

  try {
    await axios.post('https://control.msg91.com/api/v5/whatsapp/send', payload, {
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY || '', // keep in .env
        'Content-Type': 'application/json',
      }
    });
    console.log(`✅ WhatsApp sent to agent ${agent.name}`);
  } catch (err) {
    console.error('❌ Failed to send WhatsApp:', err);
  }
}
