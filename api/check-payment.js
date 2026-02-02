// api/check-payment.js  
// Check Lightning payment via Alby API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentHash } = req.body;

    if (!paymentHash) {
      return res.status(400).json({ error: 'Payment hash is verplicht' });
    }

    console.log('🔍 Checking payment for hash:', paymentHash);

    // Get NWC connection to extract auth
    const NWC_CONNECTION = process.env.ALBY_NWC_CONNECTION;
    
    if (!NWC_CONNECTION) {
      return res.status(500).json({ error: 'AlbyHub niet geconfigureerd', paid: false });
    }

    // Parse connection
    const connectionUrl = new URL(NWC_CONNECTION);
    const secret = connectionUrl.searchParams.get('secret');
    const lud16 = connectionUrl.searchParams.get('lud16');
    
    if (!secret || !lud16) {
      console.log('❌ Invalid NWC connection');
      return res.status(500).json({ error: 'Invalid configuration', paid: false });
    }

    // Try to check via Alby's API using the secret as bearer token
    try {
      const checkUrl = `https://api.getalby.com/invoices/incoming`;
      
      const response = await fetch(checkUrl, {
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const invoices = await response.json();
        console.log(`✅ Retrieved ${invoices.length} invoices`);
        
        // Find our invoice by payment_hash
        const ourInvoice = invoices.find(inv => 
          inv.payment_hash === paymentHash || 
          inv.r_hash === paymentHash
        );
        
        if (ourInvoice) {
          const isPaid = ourInvoice.settled === true || ourInvoice.state === 'SETTLED';
          console.log(`📋 Invoice found - Paid: ${isPaid}`);
          
          return res.status(200).json({ 
            paid: isPaid,
            amount: ourInvoice.amount
          });
        } else {
          console.log('⚠️ Invoice not found in list yet');
        }
      } else {
        console.log('⚠️ API response not OK:', response.status);
      }
    } catch (apiError) {
      console.log('⚠️ API check failed:', apiError.message);
    }

    // Fallback: not paid yet
    return res.status(200).json({ 
      paid: false,
      message: 'Wachten op betaling...'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(200).json({ 
      paid: false,
      error: error.message
    });
  }
}
