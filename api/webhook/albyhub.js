// api/webhook/albyhub.js
// AlbyHub webhook - marks payments as paid in Redis (INSTANT!)

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhook = req.body;
    
    console.log('⚡ AlbyHub webhook received:', JSON.stringify(webhook, null, 2));

    // Extract payment info from webhook
    // AlbyHub sends different formats, check common fields
    const paymentHash = webhook.payment_hash || 
                        webhook.payment_preimage || 
                        webhook.r_hash ||
                        webhook.hash;
    
    const settled = webhook.settled === true || 
                    webhook.state === 'SETTLED' ||
                    webhook.status === 'settled';

    if (!paymentHash) {
      console.log('⚠️ No payment hash in webhook');
      return res.status(200).send('OK');
    }

    console.log(`📋 Payment hash: ${paymentHash}, Settled: ${settled}`);

    if (settled) {
      // INSTANT UPDATE - mark as paid in Redis!
      await kv.set(`payment:${paymentHash}`, 'paid', { ex: 86400 }); // keep for 24h
      console.log(`✅ PAYMENT CONFIRMED IN REDIS: ${paymentHash}`);
      console.log(`💰 Amount: ${webhook.amount || 'unknown'} sats`);
      
      // Here you could also:
      // - Send confirmation email
      // - Update order database
      // - Trigger other workflows
    }

    // Always return 200 OK so AlbyHub doesn't retry
    return res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent retries
    return res.status(200).send('OK');
  }
}
