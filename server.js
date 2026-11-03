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
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function orderIdFromStripeSession(session) {
  const md = session.metadata || {}
  const id = (md.order_id || md.orderId || session.client_reference_id || '').trim()
  return id || null
}

async function retrievePaidCheckoutSession(sessionId, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid') return session
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
  return stripe.checkout.sessions.retrieve(sessionId)
}

const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST'],
}));
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

    const orderId = String(req.body.order_id || '').trim()
    if (!orderId) {
      return res.status(400).json({ error: 'Missing order_id' })
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
      client_reference_id: orderId,
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/cancel`,
      metadata: {
        full_price: total.toFixed(2),
        amount_paid: charged.toFixed(2),
        remaining_balance: remaining.toFixed(2),
        order_id: orderId,
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

async function completePaymentForOrder(orderId) {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, listing_id, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    throw new Error('Order not found');
  }

  const listingId = order.listing_id;
  const alreadyPaid = ['paid', 'booked', 'completed'].includes(order.status);

  if (!alreadyPaid) {
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        buyer_status: 'awaiting_confirmation',
        seller_status: 'awaiting_booking',
      })
      .eq('id', orderId);

    if (orderError) {
      throw new Error(orderError.message || 'Failed to update order status');
    }
  }

  if (!listingId) {
    throw new Error('Listing ID not found in order');
  }

  const { error: listingError } = await supabase.rpc('mark_listing_sold', {
    p_listing_id: listingId,
  });

  if (listingError) {
    throw new Error(listingError.message || 'Failed to mark listing as sold');
  }

  const { error: listingTypeError } = await supabase
    .from('listings')
    .update({ listing_type: 'sale' })
    .eq('id', listingId);

  if (listingTypeError) {
    throw new Error(listingTypeError.message || 'Failed to update listing type');
  }

  return { order_id: orderId, listing_id: listingId, already_paid: alreadyPaid };
}

// Mark order as paid and listing as sold (service role — idempotent)
app.post('/mark-payment-complete', cors(), async (req, res) => {
  try {
    let orderId = req.body?.order_id;

    if (req.body?.session_id) {
      const session = await retrievePaidCheckoutSession(req.body.session_id);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ error: 'Payment not completed' });
      }

      orderId = orderIdFromStripeSession(session);
      if (!orderId) {
        console.error('Stripe session missing order_id:', {
          session_id: req.body.session_id,
          metadata: session.metadata,
          client_reference_id: session.client_reference_id,
        });
        return res.status(400).json({
          error:
            'Missing order_id on this checkout session. Complete payment again from the listing page.',
        });
      }
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Missing session_id or order_id' });
    }

    console.log(`Processing payment completion for order: ${orderId}`);

    const result = await completePaymentForOrder(orderId);

    res.json({
      success: true,
      message: 'Order marked as paid and listing marked as sold',
      ...result,
      order_updated: true,
      listing_updated: true,
    });
  } catch (err) {
    console.error('mark-payment-complete error:', err);
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