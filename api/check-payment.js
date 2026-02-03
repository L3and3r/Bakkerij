// api/check-payment.js
// Check Lightning payment status via Redis (instant!)

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentHash } = req.body;

    if (!paymentHash) {
      return res.status(400).json({ error: 'Payment hash is verplicht' });
    }

    console.log('🔍 Checking payment status for:', paymentHash);

    // Check Redis for payment status
    const status = await kv.get(`payment:${paymentHash}`);

    console.log(`📊 Redis status for ${paymentHash}:`, status);

    if (status === 'paid') {
      console.log('✅ Payment confirmed via Redis!');
      return res.status(200).json({ 
        paid: true,
        message: 'Betaling ontvangen!'
      });
    }

    // Still pending
    console.log('⏳ Payment still pending');
    return res.status(200).json({ 
      paid: false,
      message: 'Wachten op betaling...'
    });

  } catch (error) {
    console.error('❌ Redis error:', error);
    return res.status(200).json({ 
      paid: false,
      error: error.message
    });
  }
}
