// api/bestelling.js - SIMPLIFIED VERSION
// Vercel serverless function voor het afhandelen van bestellingen

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Alleen POST requests toestaan
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { naam, email, product, aantal, prijs, gewicht, betaling, voorkeursdatum, opmerkingen } = req.body;

    // Validatie
    if (!naam || !email || !product || !aantal || !betaling) {
      return res.status(400).json({ error: 'Ontbrekende vereiste velden' });
    }

    if (aantal < 1) {
      return res.status(400).json({ error: 'Aantal moet minimaal 1 zijn' });
    }
    
    // Check max based on product
    if (product === 'heel' && aantal > 2) {
      return res.status(400).json({ error: 'Maximaal 2 hele broden per bestelling' });
    }
    
    if (product === 'half' && aantal > 4) {
      return res.status(400).json({ error: 'Maximaal 4 halve broden per bestelling' });
    }

    if (!['heel', 'half'].includes(product)) {
      return res.status(400).json({ error: 'Ongeldig product' });
    }

    if (!['Betaalverzoek', 'lightning'].includes(betaling)) {
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
      voorkeursdatum: voorkeursdatum || null,
      opmerkingen: opmerkingen || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    console.log('Nieuwe bestelling:', bestelling);

    // Handel betaling af op basis van gekozen methode
    if (betaling === 'Betaalverzoek') {
      console.log('🍞 Betaalverzoek bestelling - start email verzenden');
      
      try {
        await sendOrderNotification(bestelling);
        console.log('✅ Email verzonden!');
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
      }
      
      return res.status(200).json({ 
        success: true,
        message: 'Bestelling ontvangen! Je ontvangt binnen enkele minuten een betaalverzoek per email.',
        orderId: bestelling.id
      });
    } 
    
    if (betaling === 'lightning') {
      console.log('⚡ Lightning bestelling - maak invoice');
      
      try {
        const invoice = await createLightningInvoice(bestelling);
        
        // ALWAYS store by payment_request (most reliable)
        if (invoice.payment_request) {
          await kv.set(`invoice:${invoice.payment_request}`, 'pending', { ex: 3600 });
          
          // ALSO store order details for email later
          await kv.set(`order:${invoice.payment_request}`, JSON.stringify({
            naam: bestelling.naam,
            email: bestelling.email,
            product: bestelling.product,
            aantal: bestelling.aantal,
            prijs: bestelling.prijs,
            gewicht: bestelling.gewicht,
            voorkeursdatum: bestelling.voorkeursdatum,
            opmerkingen: bestelling.opmerkingen
          }), { ex: 86400 }); // Keep for 24h
          
          console.log('💾 Invoice stored in Redis:', invoice.payment_request.substring(0, 50) + '...');
          console.log('💾 Order details stored for email');
        }
        
        // Also store by payment_hash if available (from LNURL response)
        if (invoice.payment_hash && invoice.payment_hash !== 'unknown') {
          await kv.set(`payment:${invoice.payment_hash}`, 'pending', { ex: 3600 });
          console.log('💾 Payment hash stored in Redis:', invoice.payment_hash);
        }
        
        return res.status(200).json({ invoice });
      } catch (lightningError) {
        console.error('❌ Lightning error:', lightningError);
        return res.status(500).json({ 
          error: 'Kon geen Lightning invoice aanmaken: ' + lightningError.message 
        });
      }
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
    // 1. Stuur notificatie naar bakker
    const bakkerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Proof of Bread <contact@proofofbread.nl>',
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
          <p><strong>Betaalmethode:</strong> Betaalverzoek</p>
          ${bestelling.voorkeursdatum ? `<p><strong>Voorkeursdatum levering:</strong> ${new Date(bestelling.voorkeursdatum).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          ${bestelling.opmerkingen ? `<p><strong>Opmerkingen klant:</strong><br>${bestelling.opmerkingen.replace(/\n/g, '<br>')}</p>` : ''}
          <hr>
          <p><strong>📱 Actie vereist:</strong></p>
          <ol>
            <li>Maak een betaalverzoek aan voor €${bestelling.prijs.toFixed(2)}</li>
            <li>Stuur de betaallink naar ${bestelling.email}</li>
            <li>Vermeld bestelnummer ${bestelling.id} in het bericht</li>
          </ol>
        `
      })
    });

    console.log('📧 Bakker email response status:', bakkerResponse.status);
    
    const bakkerResponseText = await bakkerResponse.text();
    console.log('📧 Bakker email response:', bakkerResponseText);

    if (!bakkerResponse.ok) {
      console.error('❌ Bakker email verzenden mislukt:', bakkerResponseText);
      throw new Error(`Resend error: ${bakkerResponseText}`);
    } else {
      console.log('✅ Bakker notificatie verzonden naar', BAKKER_EMAIL);
    }

    // 2. Stuur bevestiging naar klant
    const klantResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Proof of Bread <contact@proofofbread.nl>',
        to: [bestelling.email],
        reply_to: [BAKKER_EMAIL],
        subject: `✓ Bestelling bevestigd - #${bestelling.id}`,
        html: `
          <h2>Bedankt voor je bestelling!</h2>
          <p>Hoi ${bestelling.naam},</p>
          <p>Je bestelling is goed ontvangen. Je ontvangt binnen 24 uur een betaalverzoek per email.</p>
          
          <hr>
          <h3>Bestelling details</h3>
          <p><strong>Bestelnummer:</strong> ${bestelling.id}</p>
          <p><strong>Product:</strong> ${productNaam}</p>
          <p><strong>Aantal:</strong> ${bestelling.aantal}x</p>
          <p><strong>Totaal gewicht:</strong> ${bestelling.gewicht}g</p>
          <p><strong>Totaal bedrag:</strong> €${bestelling.prijs.toFixed(2)}</p>
          ${bestelling.voorkeursdatum ? `<p><strong>Voorkeursdatum levering:</strong> ${new Date(bestelling.voorkeursdatum).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          ${bestelling.opmerkingen ? `<p><strong>Jouw opmerking:</strong><br>${bestelling.opmerkingen.replace(/\n/g, '<br>')}</p>` : ''}
          
          <hr>
          <p><strong>Wat nu?</strong></p>
          <ol>
            <li>Je ontvangt binnen 24 uur een betaalverzoek op dit emailadres</li>
            <li>Betaal het bedrag via de link in die email</li>
            <li>Na ontvangst van de betaling ga ik aan de slag met je bestelling</li>
          </ol>
          
          <p>Heb je vragen? Antwoord gerust op deze email!</p>
          
          <p>Met vriendelijke groet,<br>
          Leander<br>
          Proof of Bread</p>
        `
      })
    });

    console.log('📧 Klant email response status:', klantResponse.status);
    
    const klantResponseText = await klantResponse.text();
    console.log('📧 Klant email response:', klantResponseText);

    if (!klantResponse.ok) {
      console.error('❌ Klant email verzenden mislukt:', klantResponseText);
      // Don't throw - bakker email already sent
    } else {
      console.log('✅ Klant bevestiging verzonden naar', bestelling.email);
    }

  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// Lightning invoice aanmaken via AlbyHub
async function createLightningInvoice(bestelling) {
  const NWC_CONNECTION = process.env.ALBY_NWC_CONNECTION;
  
  console.log('⚡ Lightning invoice functie gestart');
  console.log('⚡ NWC_CONNECTION aanwezig:', !!NWC_CONNECTION);
  
  if (!NWC_CONNECTION) {
    throw new Error('AlbyHub NWC connection niet geconfigureerd');
  }

  // Converteer EUR naar satoshis
  const satsAmount = await convertEurToSats(bestelling.prijs);
  console.log(`⚡ ${bestelling.prijs} EUR = ${satsAmount} sats`);

  // Voor AlbyHub gebruiken we de Alby Wallet API met de LUD16 address
  // Haal LUD16 uit connection string
  const connectionUrl = new URL(NWC_CONNECTION);
  const lud16 = connectionUrl.searchParams.get('lud16');
  
  console.log('⚡ LUD16 address:', lud16);
  
  if (!lud16) {
    throw new Error('Geen LUD16 address in connection string');
  }

  // Gebruik LNURL om invoice te maken
  try {
    // Split LUD16 (username@domain)
    const [username, domain] = lud16.split('@');
    
    // Haal LNURL endpoint op
    const lnurlResponse = await fetch(`https://${domain}/.well-known/lnurlp/${username}`);
    
    if (!lnurlResponse.ok) {
      throw new Error('LNURL endpoint niet bereikbaar');
    }
    
    const lnurlData = await lnurlResponse.json();
    console.log('⚡ LNURL data ontvangen');
    
    // Maak invoice via callback
    const callbackUrl = new URL(lnurlData.callback);
    callbackUrl.searchParams.set('amount', satsAmount * 1000); // millisats
    
    const invoiceResponse = await fetch(callbackUrl.toString());
    
    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('⚡ Invoice creation failed:', errorText);
      throw new Error('Kon geen invoice maken');
    }
    
    const invoiceData = await invoiceResponse.json();
    console.log('⚡ Invoice aangemaakt!');
    
    if (invoiceData.pr) {
      // Return invoice with the payment_request
      // Don't try to extract hash - just return what we have
      return {
        payment_request: invoiceData.pr,
        payment_hash: invoiceData.payment_hash || null
      };
    }
    
    throw new Error('Geen payment request in response');
    
  } catch (error) {
    console.error('⚡ AlbyHub Lightning error:', error);
    throw new Error(`Lightning fout: ${error.message}`);
  }
}

// Helper: Converteer EUR naar satoshis
async function convertEurToSats(eurAmount) {
  try {
    const response = await fetch('https://blockchain.info/ticker');
    const rates = await response.json();
    const btcPerEur = 1 / rates.EUR.last;
    const sats = Math.round(eurAmount * btcPerEur * 100000000);
    return sats;
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    // Fallback: assume 1 BTC = 50000 EUR
    const sats = Math.round((eurAmount / 50000) * 100000000);
    return sats;
  }
}
