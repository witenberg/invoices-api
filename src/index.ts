import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import routes
import { GET as getInvoices } from './api/invoices/route';
import { GET as getInvoiceById } from './api/invoices/[id]/route';
import { GET as getInvoiceView } from './api/invoices/[id]/view/route';

import { GET as getClients } from './api/clients/route';
import { POST as createClient } from './api/clients/route';
import { GET as getClientById } from './api/clients/[id]/route';

import { GET as getSubscriptions } from './api/subscriptions/route';
import { POST as saveSubscription } from './api/subscriptions/save/route';
import { GET as getSubscriptionById } from './api/subscriptions/[id]/route';
import { GET as getSubscriptionEdit } from './api/subscriptions/[id]/edit/route';
import { PUT as updateSubscriptionStatus } from './api/subscriptions/[id]/update-status/route';
import { POST as updatePreferences } from './api/update-preferences/route';

import { GET as getSettings } from './api/settings/[id]/route';
import { PUT as updateSettings } from './api/settings/[id]/route';

// Auth routes
import { POST as login } from './api/auth/login/route';
import { POST as signup } from './api/auth/signup/route';

// User routes
import { GET as findUserByEmail } from './api/users/find-by-email/route';
import { POST as addUser } from './api/users/add/route';
import { GET as isVerified } from './api/users/verify/route';
import { GET as getTrialStatus } from './api/users/trial-status/route';

// Stripe routes
import { POST as createStripePayment } from './api/stripe/create-payment/route';
import { POST as connectStripe } from './api/stripe/connect/route';
import { POST as getStripeStatus } from './api/stripe/status/route';
import { POST as handleStripeWebhook } from './api/stripe/webhook/route';

// Paddle routes
import { POST as paddleCheckout } from './api/paddle/checkout/route';
import { POST as handlePaddleWebhook } from './api/paddle/webhook/route';

const app = new Hono();

// Middleware
app.use('*', logger());

// Special CORS configuration for Stripe webhook endpoint
app.use('/api/stripe/webhook', cors({
	origin: '*',
	allowMethods: ['POST', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Stripe-Signature'],
	maxAge: 600,
}));

// Default CORS configuration for other endpoints
app.use('*', cors({
	origin: ['http://localhost:3000', 'https://dev.invoices-apg.pages.dev/'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	exposeHeaders: ['Content-Length', 'X-Requested-With'],
	maxAge: 600,
	credentials: true,
}));

// Mount routes
app.get('/api/invoices', getInvoices);
app.get('/api/invoices/:id', getInvoiceById);
app.get('/api/invoices/:id/view', getInvoiceView);
app.get('/api/clients', getClients);
app.post('/api/clients', createClient);
app.get('/api/clients/:id', getClientById);
app.get('/api/subscriptions', getSubscriptions);
app.post('/api/subscriptions/save', saveSubscription);
app.get('/api/subscriptions/:id', getSubscriptionById);
app.get('/api/subscriptions/:id/edit', getSubscriptionEdit);
app.post('/api/subscriptions/:id/update-status', updateSubscriptionStatus);
app.get('/api/settings/:id', getSettings);
app.put('/api/settings/:id', updateSettings);
app.post('/api/update-preferences', updatePreferences);

// Stripe routes
app.post('/api/stripe/create-payment', createStripePayment);
app.post('/api/stripe/connect', connectStripe);
app.post('/api/stripe/status', getStripeStatus);
app.post('/api/stripe/webhook', handleStripeWebhook);

// Auth routes
app.post('/api/auth/login', login);
app.post('/api/auth/signup', signup);

// User routes
app.get('/api/users/find-by-email', findUserByEmail);
app.post('/api/users/add', addUser);
app.get('/api/users/verify', isVerified);
app.get('/api/users/trial-status', getTrialStatus);

// Paddle routes
app.post('/api/paddle/checkout', paddleCheckout);
app.post('/api/paddle/webhook', handlePaddleWebhook);

// Error handling
app.onError((err, c) => {
	console.error(`${err}`);
	return c.json({
		error: 'Internal Server Error',
		message: err.message,
	}, 500);
});

export default app;
