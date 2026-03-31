import express from 'express';
import Stripe from 'stripe';
import supabase from '../utils/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  monthly: { priceId: process.env.STRIPE_MONTHLY_PRICE_ID, amount: 2999 },
  yearly: { priceId: process.env.STRIPE_YEARLY_PRICE_ID, amount: 29999 },
};

// POST /api/subscriptions/create-checkout — create Stripe checkout session
router.post('/create-checkout', authenticate, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan. Choose monthly or yearly.' });

    // Upsert Stripe customer
    let stripeCustomerId;
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id, email, full_name')
      .eq('id', req.user.id)
      .single();

    if (user.stripe_customer_id) {
      stripeCustomerId = user.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { userId: req.user.id },
      });
      stripeCustomerId = customer.id;
      await supabase.from('users').update({ stripe_customer_id: stripeCustomerId }).eq('id', req.user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?subscription=cancelled`,
      metadata: { userId: req.user.id, plan },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/portal — Stripe customer portal for management
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ portalUrl: session.url });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscriptions/status — current user subscription
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ subscription: data || null });
  } catch (err) {
    next(err);
  }
});

export default router;
