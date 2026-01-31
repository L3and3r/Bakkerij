// api/check-payment.js
// Vercel serverless function voor het checken van Lightning betalingsstatus

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentHash } = req.body;

    if (!paymentHash) {
      return res.status(400).json({ error: 'Payment hash is verplicht' });
    }

    const LNBITS_URL = process.env.LNBITS_URL;
    const LNBITS_API_KEY = process.env.LNBITS_API_KEY;

    if (!LNBITS_URL || !LNBITS_API_KEY) {
      return res.status(500).json({ error: 'LNbits niet geconfigureerd' });
    }

    // Check payment status via LNbits
    const response = await fetch(`${LNBITS_URL}/api/v1/payments/${paymentHash}`, {
      headers: {
        'X-Api-Key': LNBITS_API_KEY
      }
    });

    const payment = await response.json();

    if (!response.ok) {
      return res.status(404).json({ error: 'Betaling niet gevonden', paid: false });
    }

    // Check of betaling is voldaan
    const isPaid = payment.paid === true;

    if (isPaid) {
      // HIER: Update bestelling status in database
      // await updateOrderStatus(paymentHash, 'paid');
      // await sendConfirmationEmail(order);
      console.log('Lightning betaling ontvangen:', paymentHash);
    }

    return res.status(200).json({ 
      paid: isPaid,
      amount: payment.amount,
      memo: payment.memo
    });

  } catch (error) {
    console.error('Error checking payment:', error);
    return res.status(500).json({ 
      error: 'Kon betalingsstatus niet controleren',
      paid: false 
    });
  }
}
