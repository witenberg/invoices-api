import { loadStripe } from '@stripe/stripe-js';

export const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const stripePromise = loadStripe(
  process.env.STRIPE_PUBLISHABLE_KEY!
); 