// api/webhook/lightning.js
// Webhook voor Lightning betalingen (LNbits)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payment = req.body;

    console.log('Lightning webhook ontvangen:', payment);

    // LNbits stuurt payment details in de webhook
    const { payment_hash, paid, amount } = payment;

    if (!payment_hash) {
      return res.status(400).send('Missing payment hash');
    }

    if (paid) {
      // HIER: Zoek bestelling op basis van payment_hash
      // const order = await findOrderByPaymentHash(payment_hash);
      
      // HIER: Update bestelling status
      // await updateOrderStatus(order.id, 'paid');
      
      // HIER: Stuur bevestigingsmail
      // await sendConfirmationEmail(order);
      
      console.log(`Lightning betaling ontvangen: ${payment_hash}, ${amount} sats`);
    }

    // Bevestig ontvangst aan LNbits
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Error in Lightning webhook:', error);
    return res.status(500).send('Internal error');
  }
}
