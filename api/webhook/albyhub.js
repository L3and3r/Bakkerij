// api/webhook/albyhub.js
// AlbyHub webhook - marks payments as paid in Redis (INSTANT!)

import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature (optional but recommended)
    const WEBHOOK_SECRET = process.env.ALBY_WEBHOOK_SECRET;
    
    if (WEBHOOK_SECRET) {
      const signature = req.headers['x-alby-signature'] || req.headers['x-webhook-signature'];
      
      if (signature) {
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', WEBHOOK_SECRET)
          .update(body)
          .digest('hex');
        
        if (signature !== expectedSignature) {
          console.log('⚠️ Invalid webhook signature');
          return res.status(401).send('Invalid signature');
        }
      }
    }

    const webhook = req.body;
    
    console.log('⚡ AlbyHub webhook received!');
    console.log('📦 Full webhook body:', JSON.stringify(webhook, null, 2));

    // Extract payment info from webhook
    // Alby sends different formats, check common fields
    const paymentHash = webhook.payment_hash || 
                        webhook.r_hash ||
                        webhook.hash ||
                        webhook.payment_preimage;
    
    console.log('🔑 Extracted payment_hash:', paymentHash);
    console.log('🔑 Available keys in webhook:', Object.keys(webhook));
    
    const settled = webhook.settled === true || 
                    webhook.state === 'SETTLED' ||
                    webhook.status === 'settled' ||
                    webhook.type === 'invoice.incoming.settled';

    if (!paymentHash) {
      console.log('⚠️ No payment hash in webhook - available fields:', Object.keys(webhook));
      return res.status(200).send('OK');
    }

    console.log(`📋 Payment hash: ${paymentHash}, Settled: ${settled}`);

    if (settled) {
      // INSTANT UPDATE - mark as paid in Redis!
      await kv.set(`payment:${paymentHash}`, 'paid', { ex: 86400 }); // keep for 24h
      console.log(`✅ PAYMENT CONFIRMED IN REDIS: ${paymentHash}`);
      console.log(`💰 Amount: ${webhook.amount || 'unknown'} sats`);
    }

    // Always return 200 OK so Alby doesn't retry
    return res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent retries
    return res.status(200).send('OK');
  }
}
