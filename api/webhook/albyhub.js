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
      // Mark as paid using BOTH payment_hash AND payment_request
      await kv.set(`payment:${paymentHash}`, 'paid', { ex: 86400 });
      
      // Also mark by payment_request if available
      if (webhook.payment_request) {
        await kv.set(`invoice:${webhook.payment_request}`, 'paid', { ex: 86400 });
        console.log(`✅ PAYMENT CONFIRMED - marked by invoice`);
      }
      
      console.log(`✅ PAYMENT CONFIRMED IN REDIS: ${paymentHash}`);
      console.log(`💰 Amount: ${webhook.amount || 'unknown'} sats`);
      
      // Send notification emails
      try {
        await sendLightningPaymentEmails(webhook);
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
        // Don't fail webhook if email fails
      }
    }

    // Always return 200 OK so Alby doesn't retry
    return res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to prevent retries
    return res.status(200).send('OK');
  }
}

// Send emails when Lightning payment is confirmed
async function sendLightningPaymentEmails(webhook) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const BAKKER_EMAIL = process.env.BAKKER_EMAIL;
  
  if (!RESEND_API_KEY) {
    console.log('⚠️ No Resend API key - skipping emails');
    return;
  }

  const amountSats = webhook.amount || webhook.value;
  const amountEur = (webhook.fiat_in_cents / 100).toFixed(2);
  const paymentRequest = webhook.payment_request;
  
  console.log('📧 Preparing to send emails...');
  console.log('📧 Payment request:', paymentRequest ? paymentRequest.substring(0, 50) + '...' : 'MISSING');
  
  // Retrieve order details from Redis
  let orderData = null;
  if (paymentRequest) {
    try {
      console.log('📦 Attempting to retrieve order data from Redis...');
      const orderJson = await kv.get(`order:${paymentRequest}`);
      console.log('📦 Raw order data from Redis:', orderJson);
      
      if (orderJson) {
        // Check if it's already an object or a string
        if (typeof orderJson === 'string') {
          orderData = JSON.parse(orderJson);
        } else {
          orderData = orderJson; // Already an object
        }
        console.log('📦 Order data retrieved:', orderData);
      } else {
        console.log('📦 No order data in Redis for this payment_request');
      }
    } catch (err) {
      console.log('⚠️ Could not retrieve order data:', err.message);
    }
  } else {
    console.log('⚠️ No payment_request in webhook');
  }
  
  if (!orderData) {
    console.log('⚠️ No order data found - sending basic notification only');
    // Send basic baker notification without customer details
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Proof of Bread <bestellingen@proofofbread.nl>',
        to: [BAKKER_EMAIL],
        subject: `⚡ Lightning betaling ontvangen - €${amountEur}`,
        html: `
          <h2>⚡ Lightning betaling ontvangen!</h2>
          <p><strong>Bedrag:</strong> ${amountSats} sats (€${amountEur})</p>
          <p><strong>Status:</strong> Betaald ✅</p>
          <p><em>Klantgegevens niet beschikbaar - check AlbyHub voor details.</em></p>
        `
      })
    });
    return;
  }
  
  const productNaam = orderData.product === 'heel' ? 'Heel roggebrood (750g)' : 'Half roggebrood (375g)';
  
  // Email to customer
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Proof of Bread <bestellingen@proofofbread.nl>',
        to: [orderData.email],
        subject: '✅ Betaling ontvangen - Proof of Bread',
        html: `
          <h2>Bedankt voor je bestelling!</h2>
          <p>Beste ${orderData.naam},</p>
          <p>Je Lightning betaling is succesvol ontvangen. Hieronder vind je de details van je bestelling:</p>
          <hr>
          <p><strong>Product:</strong> ${productNaam}</p>
          <p><strong>Aantal:</strong> ${orderData.aantal}x</p>
          <p><strong>Totaal gewicht:</strong> ${orderData.gewicht}g</p>
          <p><strong>Betaald:</strong> €${orderData.prijs.toFixed(2)} (${amountSats} sats) ⚡</p>
          ${orderData.voorkeursdatum ? `<p><strong>Jouw voorkeursdatum:</strong> ${new Date(orderData.voorkeursdatum).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          ${orderData.opmerkingen ? `<p><strong>Je opmerkingen:</strong><br>${orderData.opmerkingen.replace(/\n/g, '<br>')}</p>` : ''}
          <hr>
          <p>Ik neem <strong>binnen 24 uur</strong> contact met je op om de levering af te spreken.</p>
          <p>Met vriendelijke groet,<br>
          Leander<br>
          Proof of Bread</p>
        `
      })
    });
    
    console.log('📧 Customer confirmation sent to', orderData.email);
  } catch (error) {
    console.error('❌ Failed to send customer email:', error);
  }
  
  // Email to baker
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Proof of Bread <bestellingen@proofofbread.nl>',
        to: [BAKKER_EMAIL],
        subject: `⚡ Lightning bestelling betaald - ${orderData.naam}`,
        html: `
          <h2>⚡ Lightning bestelling betaald!</h2>
          <p><strong>Klant:</strong> ${orderData.naam}</p>
          <p><strong>Email:</strong> ${orderData.email}</p>
          <p><strong>Product:</strong> ${productNaam}</p>
          <p><strong>Aantal:</strong> ${orderData.aantal}x</p>
          <p><strong>Totaal gewicht:</strong> ${orderData.gewicht}g</p>
          <p><strong>Betaald:</strong> €${orderData.prijs.toFixed(2)} (${amountSats} sats) ⚡</p>
          ${orderData.voorkeursdatum ? `<p><strong>Voorkeursdatum levering:</strong> ${new Date(orderData.voorkeursdatum).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          ${orderData.opmerkingen ? `<p><strong>Opmerkingen klant:</strong><br>${orderData.opmerkingen.replace(/\n/g, '<br>')}</p>` : ''}
          <hr>
          <p><strong>Actie vereist:</strong></p>
          <p>Neem binnen 24 uur contact op met ${orderData.naam} via ${orderData.email} om levering af te spreken.</p>
        `
      })
    });
    
    console.log('📧 Baker notification sent');
  } catch (error) {
    console.error('❌ Failed to send baker email:', error);
  }
}
