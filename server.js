import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  
)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const PORT = process.env.PORT || 3000
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY) 
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: false
}))

//stripe checkout session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { totalPrice, price, name, customAmount } = req.body;
    const total = parseFloat(totalPrice || price);

    if (!total || total <= 0) {
      return res.status(400).json({ error: 'Invalid total price' });
    }

    const charged = parseFloat(customAmount) || total;

    if (charged > total) {
      return res.status(400).json({ error: 'Amount cannot exceed listing price' });
    }

    const remaining = total - charged;
    const amountInCents = Math.round(charged * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'zar',
          product_data: {
            name: charged === total
              ? `${name || 'Product'} – Full Payment`
              : `${name || 'Product'} – Partial Payment`,
            description: charged === total
              ? `Full payment of R${total.toFixed(2)}`
              : `Paying R${charged.toFixed(2)} of R${total.toFixed(2)} | Remaining: R${remaining.toFixed(2)}`
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      //success_url: `${FRONTEND_URL}/success`,
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/cancel`,
      metadata: {
        full_price: total.toFixed(2),
        amount_paid: charged.toFixed(2),
        remaining_balance: remaining.toFixed(2),
        order_id:          req.body.order_id || '',
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



app.get('/checkout-session', cors(), async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ metadata: session.metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})


app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).send('Server Error')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})