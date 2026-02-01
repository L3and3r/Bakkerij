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

    if (!['tikkie', 'lightning'].includes(betaling)) {
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
    if (betaling === 'tikkie') {
      console.log('🍞 Tikkie bestelling - start email verzenden');
      
      // Stuur email naar bakker met bestelgegevens
      try {
        await sendOrderNotification(bestelling);
        console.log('✅ Email verzonden!');
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
        // Ga toch door, zodat klant een bevestiging krijgt
      }
      
      return res.status(200).json({ 
        success: true,
        message: 'Bestelling ontvangen! Je ontvangt binnen enkele minuten een Tikkie-link per email.',
        orderId: bestelling.id
      });
    } 
    
    if (betaling === 'lightning') {
      // Lightning betaling via LNbits
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

// Stuur email notificatie naar bakker
async function sendOrderNotification(bestelling) {
  // OPTIE 1: Gebruik Resend (gratis tier, simpel)
  // Je hebt alleen een API key nodig van resend.com
  
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const BAKKER_EMAIL = process.env.BAKKER_EMAIL || 'jouw-email@example.com';
  
  console.log('📧 Email functie gestart');
  console.log('📧 RESEND_API_KEY aanwezig:', !!RESEND_API_KEY);
  console.log('📧 BAKKER_EMAIL:', BAKKER_EMAIL);
  
  if (!RESEND_API_KEY) {
    console.log('⚠️ Resend API key niet geconfigureerd - email niet verstuurd');
    console.log('Bestelling details:', bestelling);
    return;
  }

  const productNaam = bestelling.product === 'heel' ? 'Heel roggebrood (750g)' : 'Half roggebrood (375g)';
  
  console.log('📧 Start Resend API call...');
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Proof of Bread <onboarding@resend.dev>',
        to: [BAKKER_EMAIL],
        subject: `🍞 Nieuwe bestelling #${bestelling.id}`,
        html: `
          <h2>Nieuwe bestelling ontvangen!</h2>
          <p><strong>Bestelnummer:</strong> ${bestelling.id}</p>
          <hr>
          <p><strong>Klant:</strong> ${bestelling.naam}</p>
          <p><strong>Email:</strong> ${bestelling.email}</p>
          <p><strong>Product:</strong> ${productNaam}</p>
          <p><strong>Aantal:</strong> ${bestelling.aantal}x</p>
          <p><strong>Totaal gewicht:</strong> ${bestelling.gewicht}g</p>
          <p><strong>Totaal bedrag:</strong> €${bestelling.prijs.toFixed(2)}</p>
          <p><strong>Betaalmethode:</strong> Tikkie</p>
          <hr>
          <p><strong>📱 Actie vereist:</strong></p>
          <ol>
            <li>Maak een Tikkie aan voor €${bestelling.prijs.toFixed(2)}</li>
            <li>Stuur de Tikkie link naar ${bestelling.email}</li>
            <li>Vermeld bestelnummer ${bestelling.id} in het bericht</li>
          </ol>
        `
      })
    });

    console.log('📧 Resend response status:', response.status);
    
    const responseText = await response.text();
    console.log('📧 Resend response:', responseText);

    if (!response.ok) {
      console.error('❌ Email verzenden mislukt:', responseText);
      throw new Error(`Resend error: ${responseText}`);
    } else {
      console.log('✅ Order notificatie verzonden naar', BAKKER_EMAIL);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
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
