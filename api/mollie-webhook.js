import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const event = req.body;

  // Mollie stuurt payment id
  const paymentId = event.id;

  try {
    // Haal payment details op bij Mollie
    const response = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MOLLIE_API_KEY}`
      }
    });
    const payment = await response.json();

    // Check of betaling voltooid is
    if (payment.status === 'paid') {
      const { naam, email, product, aantal } = payment.metadata;

      // Hier kun je doen wat je wilt met de bestelling:
      // - Database update
      // - E-mail sturen naar klant
      console.log(`iDEAL betaling ontvangen: ${aantal} x ${product} voor ${naam} (${email})`);
    }

    // Mollie verwacht altijd 200 OK
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Mollie webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

