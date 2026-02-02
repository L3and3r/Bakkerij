// api/check-payment.js
// Check Lightning payment status

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

    // Voor AlbyHub/LNURL moeten we wachten op de betaling
    // Omdat we geen directe API hebben, retourneren we altijd "niet betaald"
    // totdat de klant de pagina refresht of een langere tijd is verstreken
    
    // De frontend checked elke 5 seconden
    // We geven "not paid" terug zodat hij blijft checken
    // In de praktijk zie jij de betaling in AlbyHub
    
    console.log('⏳ Payment not yet confirmed (checking...)');
    
    return res.status(200).json({ 
      paid: false,
      message: 'Wachten op betaling...'
    });

  } catch (error) {
    console.error('❌ Error checking payment:', error);
    return res.status(200).json({ 
      paid: false,
      error: error.message
    });
  }
}
