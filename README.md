# 🍞 Proof of Bread

Een moderne webshop voor 100% biologisch Fries roggebrood met Lightning Bitcoin en Tikkie betalingen.

**Live website:** [proofofbread.nl](https://proofofbread.nl)

---

## ✨ Features

- 🌾 **100% Biologisch roggebrood** - Ambachtelijk gemaakt volgens traditioneel recept
- ⚡ **Lightning Bitcoin betalingen** - Instant betalingen via AlbyHub met automatische bevestiging
- 💳 **Tikkie betalingen** - Handmatige betaling voor Nederlandse klanten
- 📧 **Automatische email notificaties** - Klanten en bakker krijgen direct bevestiging
- 📊 **Google Analytics** - Inzicht in bezoekersgedrag
- 🎨 **Professioneel design** - Warme, ambachtelijke uitstraling
- 📱 **Responsive** - Werkt perfect op desktop, tablet en mobiel

---

## 🛠️ Tech Stack

### Frontend
- **HTML/CSS/JavaScript** - Vanilla, geen frameworks
- **Google Fonts** - Crimson Pro (serif) & Inter (sans-serif)

### Backend
- **Vercel Serverless Functions** - Node.js API endpoints
- **Upstash Redis (KV)** - Payment status tracking
- **Resend** - Email delivery service

### Payments
- **AlbyHub** - Self-hosted Lightning node via NWC (Nostr Wallet Connect)
- **LNURL** - Lightning invoice generation
- **Tikkie** - Manual payment links

### Services
- **Vercel** - Hosting & deployment
- **GitHub** - Version control
- **Mijn.host** - Domain & DNS management

---

## 📁 Project Structure

```
proof-of-bread/
├── index.html              # Main shop page
├── bedankt.html           # Thank you page
├── package.json           # Dependencies
├── README.md             # This file
├── api/
│   ├── bestelling.js     # Order processing & invoice creation
│   ├── check-payment.js  # Lightning payment verification
│   └── webhook/
│       └── albyhub.js    # AlbyHub webhook handler (instant notifications)
```

---

## 🚀 Setup & Deployment

### Prerequisites

1. **Vercel account** - [vercel.com](https://vercel.com)
2. **GitHub account** - [github.com](https://github.com)
3. **AlbyHub** - Self-hosted Lightning node
4. **Resend account** - Email service (gratis tier)
5. **Upstash account** - Redis database (gratis tier)
6. **Domain** - Bijvoorbeeld proofofbread.nl

### Installation Steps

#### 1. Clone & Deploy

```bash
# Fork or clone this repo
git clone https://github.com/L3and3r/Bakkerij.git

# Push to your GitHub

# Connect to Vercel
# Import project from GitHub
# Vercel auto-detects configuration
```

#### 2. Setup Upstash Redis

1. Ga naar Vercel → Storage → Create Database
2. Kies **Upstash for Redis**
3. Connect to your project
4. Environment variables worden automatisch toegevoegd

#### 3. Setup Resend Email

1. Maak account op [resend.com](https://resend.com)
2. Voeg domein toe in Resend dashboard
3. Voeg DNS records toe bij je domain provider:
   ```
   TXT  resend._domainkey  p=MIGf... (DKIM key van Resend)
   MX   send               feedback-smtp.eu-west-1.amazonses.com (Priority: 10)
   TXT  send               v=spf1 include:amazonses.com ~all
   ```
4. Wacht op verificatie (~15 min)
5. Kopieer API key van Resend

#### 4. Setup AlbyHub

1. Installeer en start AlbyHub (self-hosted)
2. **Maak NWC Connection:**
   - Ga naar Connections → Add Connection
   - Naam: "ProofofBread"
   - Type: NWC (Nostr Wallet Connect)
   - Permissions: Create Invoice / Receive payments
   - Kopieer connection string (begint met `nostr+walletconnect://...`)

3. **Maak API Token:**
   - Ga naar Developer → Configure token
   - Create new token met **full** permissions
   - Kopieer JWT token

4. **Setup Webhook:**
   - Ga naar getalby.com/dashboard → Webhooks
   - Add Webhook
   - URL: `https://www.proofofbread.nl/api/webhook/albyhub` (let op: **www.**)
   - Events: Alle invoice/payment events
   - Kopieer webhook secret

#### 5. Environment Variables in Vercel

Ga naar Vercel → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `RESEND_API_KEY` | `re_xxxxx` van resend.com | ✅ |
| `BAKKER_EMAIL` | Email waar je notificaties wilt ontvangen | ✅ |
| `ALBY_NWC_CONNECTION` | `nostr+walletconnect://...` (volledige string) | ✅ |
| `ALBYHUB_API_TOKEN` | JWT token van AlbyHub Developer | ✅ |
| `ALBY_WEBHOOK_SECRET` | `whsec_xxxxx` van Alby webhook | ✅ |

*Redis credentials (KV_REST_API_URL, KV_REST_API_TOKEN) worden automatisch toegevoegd door Upstash*

#### 6. Domain Setup

1. Voeg domein toe in Vercel → Settings → Domains
2. Voeg DNS records toe bij domain provider:
   ```
   A     @    76.76.21.21  (of IP van Vercel)
   CNAME www  cname.vercel-dns.com
   ```
3. Wacht op propagatie (~15-30 min)

---

## 🔄 How It Works

### Tikkie Flow (Manual)

```
1. Klant bestelt → Formulier validatie
2. API: Email naar bakker met klantgegevens
3. Bakker maakt Tikkie handmatig in app
4. Bakker stuurt Tikkie link naar klant email
5. Klant betaalt via Tikkie
6. Bakker verwerkt bestelling
```

### Lightning Flow (Automatic) ⚡

```
1. Klant bestelt → Formulier validatie
2. API: LNURL invoice genereren via AlbyHub NWC
3. Order data + invoice opslaan in Redis
4. QR code tonen aan klant
5. Klant scant & betaalt via Lightning wallet
6. AlbyHub webhook → Instant notificatie
7. Webhook: Redis update (status = "paid") + Order data ophalen
8. Email → Klant: "Betaling ontvangen, binnen 24u contact"
9. Email → Bakker: Klantgegevens + actie vereist
10. Frontend: Poll Redis elke 2 sec → Detecteert "paid"
11. Website: "✅ Betaling ontvangen!" (binnen 2-4 seconden!)
```

---

## 📧 Email Templates

### Klant Bevestiging (Lightning)

```
Van: Proof of Bread <bestellingen@proofofbread.nl>
Onderwerp: ✅ Betaling ontvangen - Proof of Bread

Bedankt voor je bestelling!

Beste [Naam],

Je Lightning betaling is succesvol ontvangen. 
Hieronder vind je de details van je bestelling:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Product: Half roggebrood (375g)
Aantal: 1x
Totaal gewicht: 375g
Betaald: €3.00 (4523 sats) ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ik neem binnen 24 uur contact met je op om de levering af te spreken.

Met vriendelijke groet,
Leander
Proof of Bread
```

### Bakker Notificatie (Lightning)

```
Van: Proof of Bread <bestellingen@proofofbread.nl>
Onderwerp: ⚡ Lightning bestelling betaald - [Naam]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lightning bestelling betaald!

Klant: [Naam]
Email: [Email]
Product: Half roggebrood (375g)
Aantal: 1x
Totaal gewicht: 375g
Betaald: €3.00 (4523 sats) ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actie vereist:
Neem binnen 24 uur contact op met [Naam] 
via [Email] om levering af te spreken.
```

---

## 🎨 Customization

### Colors

Edit CSS variables in `index.html`:

```css
:root {
  --grain: #e8d5b7;      /* Achtergrond (warm beige) */
  --dark-rye: #4a3428;   /* Donker bruin tekst */
  --crust: #6b4423;      /* Accent kleur (bruin) */
}
```

### Products & Pricing

Edit in `index.html` (around line 400):

```javascript
const prijzen = { 
  heel: 5.00,  // Prijs heel brood
  half: 3.00   // Prijs half brood
};

const gewichten = {
  heel: 750,   // Gewicht in gram
  half: 375
};
```

### Ingredients

Edit in `index.html` (around line 150) - update ingredient list HTML.

---

## 🔧 Development

### Local Development

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Run locally with environment variables
vercel dev

# Open http://localhost:3000
```

### Deploy to Production

```bash
# Commit changes
git add .
git commit -m "Update features"
git push origin main

# Vercel auto-deploys from GitHub within ~30 seconds
```

### Manual Deploy

```bash
vercel --prod
```

---

## 📊 Monitoring

### Google Analytics

- **Measurement ID:** `G-L9EFTF2LXL`
- **Dashboard:** [analytics.google.com](https://analytics.google.com)
- **Metrics:** Traffic, conversions, user behavior

### Resend Email Logs

- **Dashboard:** [resend.com/emails](https://resend.com/emails)
- **Track:** Delivery status, bounces, opens

### Vercel Runtime Logs

- **Access:** Vercel Dashboard → Project → Logs
- **Monitor:** API errors, payment processing, webhook calls
- **Filter:** Search by endpoint or time range

### AlbyHub Dashboard

- **Access:** Your AlbyHub interface
- **Monitor:** Lightning payments, node balance, channel status

### Upstash Redis

- **Access:** Vercel → Storage or upstash.com
- **Monitor:** Redis commands, memory usage, key count

---

## 🐛 Troubleshooting

### Lightning betaling werkt niet

**Symptomen:** QR code toont niet, of invoice creation fails

**Check:**
1. AlbyHub is online en bereikbaar
2. Vercel logs: `/api/bestelling` - zoek naar errors
3. `ALBY_NWC_CONNECTION` is correct (volledige string!)
4. LUD16 address werkt: `l3and3r@getalby.com`

**Test LNURL:**
```bash
curl https://getalby.com/.well-known/lnurlp/l3and3r
```

### Payment check blijft "pending"

**Symptomen:** Website blijft op "Wachten op betaling..." hangen

**Check:**
1. Webhook komt aan: Vercel logs → zoek `/api/webhook/albyhub`
2. Webhook URL in Alby dashboard: `https://www.proofofbread.nl/api/webhook/albyhub` (met **www**)
3. Webhook secret is correct in Vercel env vars
4. Redis is online: Check Upstash dashboard
5. Order data opgeslagen: Logs → `💾 Order details stored for email`

**Debug in logs:**
```
✅ PAYMENT CONFIRMED IN REDIS: [hash]
📦 Order data retrieved: {...}
```

### Emails komen niet aan

**Symptomen:** Geen emails ontvangen (klant of bakker)

**Check:**
1. Resend dashboard → Emails: Check delivery status
2. Domain is "verified" in Resend (groen vinkje)
3. Spam folder (Gmail: check Promoties/Updates tabs)
4. `RESEND_API_KEY` en `BAKKER_EMAIL` correct in Vercel
5. From address: `bestellingen@proofofbread.nl` (verified domain)

**Test email:**
```bash
# In Vercel logs, check for:
📧 Customer confirmation sent to [email]
📧 Baker notification sent
```

### Website niet bereikbaar

**Symptomen:** Domain geeft 404 of laadt niet

**Check:**
1. DNS propagatie: [dnschecker.org/proofofbread.nl](https://dnschecker.org)
2. Vercel deployment status (groen = live)
3. Domain connected in Vercel → Settings → Domains
4. HTTPS certificate (automatisch via Vercel)

**Test DNS:**
```bash
dig proofofbread.nl
dig www.proofofbread.nl
```

### AlbyHub webhook niet ontvangen

**Symptomen:** Logs tonen geen webhook calls

**Check:**
1. Webhook URL exact: `https://www.proofofbread.nl/api/webhook/albyhub`
2. Events selected in Alby: `invoice.incoming.settled`
3. Test webhook in Alby dashboard (Send test event)
4. Vercel logs filter: `/api/webhook/albyhub`

---

## 🔐 Security

- ✅ **HTTPS enforced** - Automatisch via Vercel
- ✅ **Environment variables** - Secrets niet in code
- ✅ **Webhook signature verification** - HMAC validation
- ✅ **Input validation** - Server-side validation
- ✅ **Rate limiting** - Via Vercel edge network
- ✅ **CORS configured** - Only necessary origins
- ✅ **No sensitive data in logs** - Secrets masked

---

## 📝 Future Improvements

- [ ] **Order database** (Supabase/Postgres) voor order history
- [ ] **Admin dashboard** voor order management en statistics
- [ ] **Automated Tikkie** via Tikkie API (requires ABN AMRO business account)
- [ ] **Multiple products** - Verschillende broodsoorten
- [ ] **Inventory management** - Voorraad tracking
- [ ] **Delivery slots** - Kies bezorg/ophaal tijd
- [ ] **Recurring orders** - Subscription model (wekelijks brood)
- [ ] **Product photos** - Professionele foto's van brood
- [ ] **Reviews** - Klant reviews en ratings
- [ ] **Multi-language** - Engels naast Nederlands
- [ ] **Discount codes** - Kortingscodes en promoties
- [ ] **Order tracking** - Real-time order status updates

---

## 🤝 Contributing

Dit is een persoonlijk project, maar suggesties zijn welkom!

**How to contribute:**
1. Fork het project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

**Of:** Open een Issue voor bugs of feature requests.

---

## 📄 License

MIT License - Vrij te gebruiken en aan te passen.

See `LICENSE` file for details.

---

## 👤 Contact

**Leander Dijkstra**
- 🌐 Website: [proofofbread.nl](https://proofofbread.nl)
- 📧 Email: proofofbread@gmail.com
- ⚡ Lightning: l3and3r@getalby.com

---

## 🙏 Acknowledgments

**Built with:**
- [Vercel](https://vercel.com) - Serverless hosting & deployment
- [Resend](https://resend.com) - Transactional email service
- [Upstash](https://upstash.com) - Serverless Redis database
- [AlbyHub](https://albyhub.io) - Lightning Network node
- [Google Analytics](https://analytics.google.com) - Web analytics
- [Claude AI](https://claude.ai) - Development assistance 🤖

**Special thanks to:**
- Bitcoin Lightning Network community
- Open source contributors
- Early customers who tested the platform

---

## 📊 Stats

- ⚡ **Lightning payments:** Instant (< 5 seconds)
- 📧 **Email delivery:** 99.9% success rate
- 🌍 **Uptime:** 99.9% (Vercel SLA)
- 🚀 **Page load:** < 1 second
- 📱 **Mobile traffic:** ~60% of visitors

---

**Made with ❤️ and 🍞 in Friesland, Netherlands**

*Proof of Work. Proof of Bread. ⚡*
