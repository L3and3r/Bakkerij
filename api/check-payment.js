// api/check-payment.js
// Vercel serverless function voor het checken van Lightning betalingsstatus via AlbyHub

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentHash } = req.body;

    if (!paymentHash) {
      return res.status(400).json({ error: 'Payment hash is verplicht' });
    }

    const NWC_CONNECTION_STRING = process.env.ALBY_NWC_CONNECTION;

    if (!NWC_CONNECTION_STRING) {
      return res.status(500).json({ error: 'AlbyHub niet geconfigureerd' });
    }

    // Parse connection for secret
    const url = new URL(NWC_CONNECTION_STRING);
    const secret = url.searchParams.get('secret');

    // Check payment status via Alby API
    const response = await fetch(`https://api.getalby.com/invoices/${paymentHash}`, {
      headers: {
        'Authorization': `Bearer ${secret}`
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Betaling niet gevonden', paid: false });
    }

    const payment = await response.json();

    // Check of betaling is voldaan
    const isPaid = payment.settled === true || payment.state === 'SETTLED';

    if (isPaid) {
      console.log('Lightning betaling ontvangen via AlbyHub:', paymentHash);
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
