// api/check-payment.js
// Check Lightning payment via AlbyHub API (INSTANT!)

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentHash, paymentRequest } = req.body;

    if (!paymentHash && !paymentRequest) {
      return res.status(400).json({ error: 'Payment hash or request is verplicht' });
    }

    console.log('🔍 Checking payment for:', paymentHash || 'invoice');

    // Check Redis cache - try both methods
    let cachedStatus = null;
    
    if (paymentHash) {
      cachedStatus = await kv.get(`payment:${paymentHash}`);
    }
    
    if (!cachedStatus && paymentRequest) {
      cachedStatus = await kv.get(`invoice:${paymentRequest}`);
    }
    
    if (cachedStatus === 'paid') {
      console.log('✅ Found in Redis cache - PAID!');
      return res.status(200).json({ 
        paid: true,
        message: 'Betaling ontvangen!'
      });
    }

    // Check via AlbyHub API
    const ALBYHUB_TOKEN = process.env.ALBYHUB_API_TOKEN;
    
    if (!ALBYHUB_TOKEN) {
      console.log('⚠️ No AlbyHub API token configured');
      return res.status(200).json({ paid: false });
    }

    try {
      // Get list of invoices from AlbyHub
      const response = await fetch('https://api.getalby.com/invoices', {
        headers: {
          'Authorization': `Bearer ${ALBYHUB_TOKEN}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📋 Retrieved ${data.length || 0} invoices from AlbyHub`);
        
        // Find our invoice by payment hash
        const invoice = data.find(inv => 
          inv.payment_hash === paymentHash ||
          inv.r_hash === paymentHash ||
          inv.hash === paymentHash
        );

        if (invoice) {
          const isPaid = invoice.settled === true || invoice.state === 'SETTLED';
          console.log(`💰 Invoice found - Settled: ${isPaid}`);
          
          if (isPaid) {
            // Cache it in Redis for next checks
            await kv.set(`payment:${paymentHash}`, 'paid', { ex: 86400 });
            console.log('✅ PAYMENT CONFIRMED - cached in Redis');
            
            return res.status(200).json({ 
              paid: true,
              message: 'Betaling ontvangen!'
            });
          }
        } else {
          console.log('⏳ Invoice not found yet or still pending');
        }
      } else {
        console.log('⚠️ AlbyHub API returned:', response.status);
      }
    } catch (apiError) {
      console.log('⚠️ API error:', apiError.message);
    }

    // Not paid yet
    return res.status(200).json({ 
      paid: false,
      message: 'Wachten op betaling...'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(200).json({ 
      paid: false,
      error: error.message
    });
  }
}
