// api/bestelling.js
// Vercel serverless function voor het afhandelen van bestellingen

export default async function handler(req, res) {
  // Alleen POST requests toestaan
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { naam, email, product, aantal, prijs, gewicht, betaling } = req.body;

    // Validatie
    if (!naam || !email || !product || !aantal || !betaling) {
      return res.status(400).json({ error: 'Ontbrekende vereiste velden' });
    }

    if (aantal < 1 || aantal > 20) {
      return res.status(400).json({ error: 'Aantal moet tussen 1 en 20 zijn' });
    }

    if (!['heel', 'half'].includes(product)) {
      return res.status(400).json({ error: 'Ongeldig product' });
    }

    if (!['ideal', 'lightning'].includes(betaling)) {
      return res.status(400).json({ error: 'Ongeldige betaalmethode' });
    }

    // Bereken totaal (veiligheidscheck)
    const prijzen = { heel: 5.00, half: 3.00 };
    const verwachtTotaal = prijzen[product] * aantal;
    
    if (Math.abs(prijs - verwachtTotaal) > 0.01) {
      return res.status(400).json({ error: 'Prijs komt niet overeen' });
    }

    // Maak een bestelling object
    const bestelling = {
      id: generateOrderId(),
      naam,
      email,
      product,
      aantal,
      prijs,
      gewicht,
      betaling,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    console.log('Nieuwe bestelling:', bestelling);

    // HIER: Bewaar bestelling in database (bijv. Vercel KV, Supabase, etc.)
    // await saveOrder(bestelling);

    // Handel betaling af op basis van gekozen methode
    if (betaling === 'ideal') {
      // iDEAL betaling via Mollie, Stripe, of andere provider
      const paymentUrl = await createIdealPayment(bestelling);
      return res.status(200).json({ url: paymentUrl });
    } 
    
    if (betaling === 'lightning') {
      // Lightning betaling via BTCPay Server, LNbits, of andere provider
      const invoice = await createLightningInvoice(bestelling);
      return res.status(200).json({ invoice });
    }

    return res.status(400).json({ error: 'Ongeldige betaalmethode' });

  } catch (error) {
    console.error('Error in bestelling API:', error);
    return res.status(500).json({ 
      error: 'Er is een fout opgetreden bij het verwerken van je bestelling' 
    });
  }
}

// Helper: Genereer uniek order ID
function generateOrderId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${randomStr}`.toUpperCase();
}

// iDEAL betaling aanmaken
async function createIdealPayment(bestelling) {
  // VOORBEELD met Mollie API
  // Je hebt een Mollie API key nodig (test of live)
  
  const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY;
  
  if (!MOLLIE_API_KEY) {
    throw new Error('Mollie API key niet geconfigureerd');
  }

  const response = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLLIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: {
        currency: 'EUR',
        value: bestelling.prijs.toFixed(2)
      },
      description: `Roggebrood bestelling #${bestelling.id}`,
      redirectUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/bedankt?order=${bestelling.id}`,
      webhookUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/webhook/mollie`,
      metadata: {
        orderId: bestelling.id,
        email: bestelling.email
      },
      method: 'ideal'
    })
  });

  const payment = await response.json();
  
  if (!response.ok) {
    console.error('Mollie error:', payment);
    throw new Error('Kon geen iDEAL betaling aanmaken');
  }

  // HIER: Update bestelling met payment ID
  // await updateOrder(bestelling.id, { molliePaymentId: payment.id });

  return payment._links.checkout.href;
}

// Lightning invoice aanmaken
async function createLightningInvoice(bestelling) {
  // VOORBEELD met LNbits API
  // Je hebt een LNbits instance en API key nodig
  
  const LNBITS_URL = process.env.LNBITS_URL; // bijv. https://legend.lnbits.com
  const LNBITS_API_KEY = process.env.LNBITS_API_KEY;
  
  if (!LNBITS_URL || !LNBITS_API_KEY) {
    throw new Error('LNbits niet geconfigureerd');
  }

  // Converteer EUR naar satoshis (je hebt een exchange rate API nodig)
  const satsAmount = await convertEurToSats(bestelling.prijs);

  const response = await fetch(`${LNBITS_URL}/api/v1/payments`, {
    method: 'POST',
    headers: {
      'X-Api-Key': LNBITS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      out: false,
      amount: satsAmount,
      memo: `Roggebrood bestelling #${bestelling.id}`,
      webhook: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/webhook/lightning`
    })
  });

  const invoice = await response.json();
  
  if (!response.ok) {
    console.error('LNbits error:', invoice);
    throw new Error('Kon geen Lightning invoice aanmaken');
  }

  // HIER: Bewaar payment hash in database
  // await updateOrder(bestelling.id, { 
  //   lightningPaymentHash: invoice.payment_hash,
  //   lightningPaymentRequest: invoice.payment_request 
  // });

  return invoice;
}

// Helper: Converteer EUR naar satoshis
async function convertEurToSats(eurAmount) {
  // Gebruik een Bitcoin exchange rate API
  const response = await fetch('https://blockchain.info/ticker');
  const rates = await response.json();
  const btcPerEur = 1 / rates.EUR.last;
  const sats = Math.round(eurAmount * btcPerEur * 100000000); // 1 BTC = 100M sats
  return sats;
}
