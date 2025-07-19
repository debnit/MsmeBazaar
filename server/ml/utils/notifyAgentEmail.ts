import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function notifyAgentEmail(agent: Agent, transaction: EscrowTransaction) {
  const msg = {
    to: agent.email,
    from: 'noreply@msmebazaar.in',
    subject: 'Commission Earned - MSMEBazaar',
    text: `Hi ${agent.name},\n\nYou’ve earned ₹${transaction.amount} for your referral on MSMEBazaar. Escrow ID: ${transaction.escrowId}.\n\nThanks,\nTeam MSMEBazaar`,
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email sent to agent');
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
