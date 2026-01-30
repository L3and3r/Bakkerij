import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { naam, email, product, aantal, betaling } = req.body;

  // Prijsberekening
  const prijzen = { heel: 8.5, half: 5 };
  const bedrag = prijzen[product] * parseInt(aantal);

  if (betaling === 'ideal') {
    // Mollie betaling
    const response = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.MOLLIE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: { currency: 'EUR', value: bedrag.toFixed(2) },
        description: `${aantal} x ${product} roggebrood`,
        redirectUrl: 'https://jouw-frontend.github.io/bedankt.html',
        webhookUrl: 'https://jouw-vercel-backend.vercel.app/api/mollie-webhook',
        method: 'ideal',
        metadata: { naam, email, product, aantal }
      })
    });

    const data = await response.json();
    return res.status(200).json({ url: data._links.checkout.href });
  }

  if (betaling === 'lightning') {
    // AlbyHub Lightning invoice
    const response = await fetch('https://api.getalby.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.ALBY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: bedrag,
        currency: 'eur',
        description: `${aantal} x ${product} roggebrood`,
        metadata: { naam, email, product, aantal },
        callback_url: 'https://jouw-vercel-backend.vercel.app/api/alby-webhook'
      })
    });

    const data = await response.json();
    return res.status(200).json({ invoice: data.data });
  }

  return res.status(400).json({ error: 'Ongeldige betaalmethode' });
}

