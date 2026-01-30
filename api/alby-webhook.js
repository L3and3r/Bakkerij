export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const event = req.body;

  // Controleer of betaling voltooid is
  if (event.status && event.status === 'PAID') {
    const { naam, email, product, aantal } = event.metadata || {};

    // Hier kun je bijvoorbeeld:
    // - Een database update doen
    // - Een e-mail sturen naar de klant
    // Voor nu loggen we gewoon:
    console.log(`Betaling ontvangen: ${aantal} x ${product} voor ${naam} (${email})`);
  }

  // Vercel webhook moet 200 teruggeven
  res.status(200).json({ received: true });
}

