import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const PORT = process.env.PORT || 3000
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

app.use(cors())
app.use(express.json())

// Stripe checkout route
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { price, name } = req.body;
    
    // Parse price as a number and validate
    let amount = parseFloat(price) || 20;
    
    // Stripe requires amount in cents, max R999,999.99 = 99999999 cents
    const amountInCents = Math.round(amount * 100);
    
    if (amountInCents > 99999999) {
      return res.status(400).json({ error: 'Amount exceeds maximum limit of R999,999.99' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'zar',
          product_data: { name: name || 'Product' },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Stripe Error:', err.message);
    res.status(500).json({ error: err.message });
  }
})

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: false
}))

// SPA fallback: serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).send('Server Error')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})