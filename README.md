# Proof of Bread 🍞⚡

Een simpele, elegante webshop voor **100% biologisch Fries roggebrood** met ondersteuning voor Tikkie en Lightning Bitcoin betalingen.

> *"Proof of Bread"* - Een kwinkslag naar Bitcoin's Proof of Work, maar dan met echt ambachtelijk werk.

## 🍞 Features

- **100% Biologisch roggebrood** - Puur en eerlijk
- **Twee producten**: Heel roggebrood (750g, €5) en half roggebrood (375g, €3)
- **Tikkie betalingen** - Handmatig, simpel, geen KVK nodig
- **Lightning Bitcoin betalingen** ⚡ - Voor de early adopters
- **Responsief design** - Werkt op alle apparaten
- **Email notificaties** - Jij krijgt een email bij elke bestelling
- **Klaar voor uitbreiding** - Gemakkelijk meer producten toe te voegen

## 📁 Bestandsstructuur

```
/
├── index.html                    # Frontend (hoofdpagina)
├── bedankt.html                  # Bedankpagina
├── api/
│   ├── bestelling.js            # Verwerk nieuwe bestellingen
│   ├── check-payment.js         # Check Lightning payment status
│   └── webhook/
│       └── lightning.js         # Lightning webhook
├── images/                       # Productfoto's (nog toe te voegen)
│   ├── heel-roggebrood.jpg
│   └── roggebrood-plakjes.jpg
├── package.json
├── vercel.json
└── README.md                     # Deze file
```

## 🚀 Deployment op Vercel

### 1. Vercel project aanmaken

1. Ga naar [vercel.com](https://vercel.com) en maak een account
2. Klik op "Add New" → "Project"
3. Klik op "Browse" en selecteer je project map
4. Klik op "Deploy"

### 2. Environment Variables instellen

In je Vercel project dashboard, ga naar **Settings** → **Environment Variables** en voeg toe:

#### Voor Email notificaties (Resend - AANBEVOLEN):
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
BAKKER_EMAIL=jouw-email@gmail.com
```

Verkrijg je API key via:
1. Maak account op [resend.com](https://resend.com) (gratis tier beschikbaar!)
2. Ga naar API Keys
3. Maak een nieuwe API key
4. Kopieer de key

**Belangrijk**: Vercel stuurt je een email naar `BAKKER_EMAIL` bij elke bestelling met de bestelgegevens en instructie om een Tikkie te maken.

#### Voor LNbits (Lightning - OPTIONEEL):
```
LNBITS_URL=https://legend.lnbits.com
LNBITS_API_KEY=xxxxxxxxxxxxx
```

Verkrijg je API key via:
1. Ga naar [legend.lnbits.com](https://legend.lnbits.com) (of host je eigen LNbits)
2. Maak een nieuwe wallet
3. Kopieer de "Invoice/read key"

### 3. Productfoto's toevoegen

1. Maak een map `public/images/` in je project
2. Voeg twee foto's toe:
   - `heel-roggebrood.jpg` - Foto van een heel roggebrood
   - `roggebrood-plakjes.jpg` - Foto van roggebrood in plakjes
3. Update de HTML (verwijder de placeholder divs):

```html
<!-- Vervang dit: -->
<div class="product-image-placeholder">Heel<br>Roggebrood</div>

<!-- Door dit: -->
<img src="/images/heel-roggebrood.jpg" alt="Heel Fries roggebrood">
```

## 💰 Hoe werken de betalingen?

### Tikkie (Aanbevolen voor vrienden/familie)
1. Klant vult bestelformulier in en kiest "Tikkie"
2. **Jij** ontvangt een email met:
   - Naam en email van klant
   - Bestelling details
   - Totaalbedrag
3. **Jij** maakt handmatig een Tikkie aan voor dat bedrag
4. **Jij** stuurt de Tikkie link naar de klant
5. Klant betaalt via Tikkie
6. Klaar!

**Voordelen:**
- ✅ Geen KVK nodig
- ✅ Geen transactiekosten
- ✅ Iedereen kent Tikkie
- ✅ Direct in je eigen bankrekening

### Lightning Bitcoin ⚡ (Voor tech-savvy klanten)
1. Klant vult bestelformulier in en kiest "Lightning Bitcoin"
2. QR code verschijnt automatisch
3. Klant scant met Lightning wallet
4. Betaling binnen seconden bevestigd
5. Klaar!

**Voordelen:**
- ✅ Geen KVK nodig
- ✅ Bijna geen transactiekosten
- ✅ Direct in je Lightning wallet
- ✅ Internationale betalingen mogelijk

## 🔧 Lokaal testen

### Vercel CLI installeren
```bash
npm i -g vercel
```

### Development server starten
```bash
vercel dev
```

Dit start een lokale server op `http://localhost:3000`

### Environment variables lokaal
Maak een `.env` file in de root:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
BAKKER_EMAIL=jouw-email@gmail.com
LNBITS_URL=https://legend.lnbits.com
LNBITS_API_KEY=xxxxxxxxxxxxx
```

**Let op**: Voeg `.env` toe aan je `.gitignore`!

## 📧 Email setup (Resend)

Resend is de simpelste manier om emails te versturen:

1. Ga naar [resend.com](https://resend.com)
2. Maak gratis account (100 emails/dag gratis)
3. Verifieer je domain (of gebruik hun test domain)
4. Kopieer API key
5. Voeg toe als `RESEND_API_KEY` in Vercel

Bij elke Tikkie-bestelling krijg je een email met:
- Klantgegevens
- Bestelling details
- Instructies om Tikkie te maken

## 🎨 Producten toevoegen

Om meer producten toe te voegen:

1. **Update de prijzen en gewichten** in `index.html`:
```javascript
const PRIJZEN = {
  'heel': 5.00,
  'half': 3.00,
  'volkoren': 6.00  // Nieuw product
};

const GEWICHTEN = {
  'heel': 750,
  'half': 375,
  'volkoren': 800  // Nieuw product
};
```

2. **Voeg optie toe aan het formulier**:
```html
<option value="volkoren" data-prijs="6.00" data-gewicht="800">
  Volkoren brood (800g) - €6,00
</option>
```

3. **Voeg product card toe** in de products section

4. **Update validatie** in `api/bestelling.js`:
```javascript
if (!['heel', 'half', 'volkoren'].includes(product)) {
  return res.status(400).json({ error: 'Ongeldig product' });
}
```

## 🧪 Testen

### Tikkie testen
1. Vul het formulier in met je eigen email
2. Controleer of je de notificatie email ontvangt
3. Maak een test Tikkie
4. Stuur naar jezelf
5. Test de flow

### Lightning testen
1. Installeer een Lightning wallet (bijv. Phoenix, Wallet of Satoshi)
2. Gebruik kleine bedragen voor test
3. Scan de QR code en betaal
4. De status wordt automatisch binnen 5 seconden bijgewerkt

## 🔒 Security checklist

- [x] Gebruik environment variables voor alle API keys
- [x] Valideer alle input server-side
- [x] Check bedragen server-side
- [x] HTTPS (Vercel doet dit automatisch)
- [ ] Test betalingen met echte kleine bedragen
- [ ] Bewaar klantgegevens veilig

## 🐛 Troubleshooting

### "Resend API key niet geconfigureerd"
- Check of je `RESEND_API_KEY` hebt toegevoegd in Vercel Environment Variables
- Herstart je deployment na het toevoegen van variables

### "LNbits niet geconfigureerd"
- Check of je `LNBITS_URL` en `LNBITS_API_KEY` hebt toegevoegd
- Zorg dat de URL geen trailing slash heeft

### Ik ontvang geen email notificaties
- Check je spam folder
- Verifieer je domain in Resend (of gebruik hun test domain)
- Check de Vercel logs voor errors

### Lightning payment wordt niet gedetecteerd
- Check of de webhook URL correct is ingesteld
- Test de webhook met kleine bedragen
- Check de console logs in Vercel

## 📞 Support

Voor vragen over:
- **Resend**: [resend.com/docs](https://resend.com/docs)
- **LNbits**: [docs.lnbits.org](https://docs.lnbits.org)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)

## 🚀 Volgende stappen

1. ✅ Deploy naar Vercel
2. ✅ Voeg Resend API key toe voor email notificaties
3. ⬜ Voeg LNbits credentials toe (optioneel)
4. ⬜ Upload productfoto's
5. ⬜ Test Tikkie flow met jezelf
6. ⬜ Test Lightning met kleine bedragen
7. ⬜ Deel met vrienden en familie!

## 💡 Tips voor uitbreiding

Later kun je toevoegen:
- Database voor order tracking (Vercel KV, Supabase)
- Automatische bevestigingsmails naar klanten
- Voorraad tracking
- Bezorgopties
- Meer producten
- Order geschiedenis voor klanten

Maar begin simpel! Deze setup werkt perfect voor kleine verkoop aan vrienden en familie.

---

**Proof of Bread** - Bewijs van werk, één brood tegelijk 🍞⚡

Succes met je bakkerij!
