import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// invoice
import { GET as getInvoices } from './api/invoices/route';
import { GET as getInvoiceById } from './api/invoices/[id]/route';
import { GET as getInvoiceView } from './api/invoices/[id]/view/route';
import { POST as saveInvoice } from './api/invoices/save/route';
import { POST as sendInvoiceEmail } from './api/invoices/[id]/send/route';
import { GET as generateInvoicePDF } from './api/invoices/[id]/generate-pdf/route';
import { GET as getInvoicePayments } from './api/invoices/[id]/payments/route';
import { POST as markInvoicePaid } from './api/invoices/[id]/mark-paid/route';
import { PATCH as updateInvoiceStatus } from './api/invoices/[id]/status/route';

// reports
import { GET as getInvoicesReport } from './api/reports/invoices/route';
import { GET as getPaymentsReport } from './api/reports/payments/route';
import { POST as exportPayments } from './api/reports/export/payments/route';
import { POST as exportInvoices } from './api/reports/export/invoices/route';
import { POST as exportClients } from './api/reports/export/clients/route';

// clients
import { GET as getClients } from './api/clients/route';
import { POST as createClient } from './api/clients/route';
import { GET as getClientById } from './api/clients/[id]/route';
import { GET as getClientsList } from './api/clients/list/route';
import { PUT as updateClient } from './api/clients/[id]/route';
import { GET as getClientStatus } from './api/clients/[id]/status/route';
import { PATCH as patchClientStatus } from './api/clients/[id]/status/route';

// subscriptions
import { GET as getSubscriptions } from './api/subscriptions/route';
import { POST as saveSubscription } from './api/subscriptions/save/route';
import { GET as getSubscriptionById } from './api/subscriptions/[id]/route';
import { GET as getSubscriptionEdit } from './api/subscriptions/[id]/edit/route';
import { PUT as updateSubscriptionStatus } from './api/subscriptions/[id]/update-status/route';
import { POST as updatePreferences } from './api/update-preferences/route';
import { GET as getSubscriptionStatus } from './api/subscriptions/[id]/status/route';
import { PATCH as patchSubscriptionStatus } from './api/subscriptions/[id]/status/route';


// sales pages
import { POST as saveSalesPage } from './api/sales-pages/save/route';
import { GET as getSalesPages } from './api/sales-pages/route';
import { GET as getSalesPageById } from './api/sales-pages/[id]/route';
import { GET as getSalesPageOrders } from './api/sales-pages/[id]/orders/route';
import { POST as updateSalesPageStatus } from './api/sales-pages/[id]/route';
import { POST as createSalesPagePayment } from './api/sales-pages/create-payment/route';
import { GET as getSalesPageStatus } from './api/sales-pages/[id]/status/route';
import { PATCH as patchSalesPageStatus } from './api/sales-pages/[id]/status/route';

// settings
import { GET as getSettings } from './api/settings/[id]/route';
import { PUT as updateSettings } from './api/settings/[id]/route';

// Auth routes
import { POST as login } from './api/auth/login/route';
import { POST as signup } from './api/auth/signup/route';
import { POST as sendVerification } from './api/auth/send-verification/route';
import { POST as verifyEmail } from './api/auth/verify-email/route';
import { POST as forgotPassword } from './api/auth/forgot-password/route';
import { POST as resetPassword } from './api/auth/reset-password/route';

// User routes
import { GET as findUserByEmail } from './api/users/find-by-email/route';
import { GET as findUserById } from './api/users/find-by-id/route';
import { POST as addUser } from './api/users/add/route';
import { GET as isVerified } from './api/users/verify/route';
import { GET as getAccessCheck } from './api/users/access-check/route';
import { GET as getBillingStatus } from './api/users/billing-status/route';
import { GET as getUserById } from './api/users/[id]/route';

// Stripe routes
import { POST as createStripePayment } from './api/stripe/create-payment/route';
import { POST as connectStripe } from './api/stripe/connect/route';
import { POST as getStripeStatus } from './api/stripe/status/route';
import { POST as handleStripeWebhook } from './api/stripe/webhook/route';
import { POST as getStripeDashboardLink } from './api/stripe/dashboard-link/route';


// Paddle routes
import { POST as paddleCheckout } from './api/paddle/checkout/route';
import { POST as handlePaddleWebhook } from './api/paddle/webhook/route';

// help
import { POST as sendSupportMessage } from './api/help/route';

// processing
import { POST as processInvoices } from './api/process-invoices/route';
import { POST as processSubscriptions } from './api/process-subscriptions/route';
import { POST as processReminders } from './api/process-reminders/route'

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
	origin: ['http://localhost:3000', 'https://dev.invoices-apg.pages.dev'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
	allowHeaders: ['Content-Type', 'Authorization'],
	exposeHeaders: ['Content-Length', 'X-Requested-With'],
	maxAge: 600,
	credentials: true,
}));

// Mount routes
app.get('/api/invoices', getInvoices);
app.get('/api/invoices/:id', getInvoiceById);
app.get('/api/invoices/:id/view', getInvoiceView);
app.post('/api/invoices/save', saveInvoice);
app.post('/api/invoices/:id/send', sendInvoiceEmail);
app.get('/api/invoices/:id/generate-pdf', generateInvoicePDF);
app.get('/api/invoices/:id/payments', getInvoicePayments);
app.post('/api/invoices/:id/mark-paid', markInvoicePaid);
app.patch('/api/invoices/:id/status', updateInvoiceStatus);

// Reports routes
app.get('/api/reports/invoices', getInvoicesReport);
app.get('/api/reports/payments', getPaymentsReport);
app.post('/api/reports/export/invoices', exportInvoices);
app.post('/api/reports/export/payments', exportPayments);
app.post('/api/reports/export/clients', exportClients);

// clients
app.get('/api/clients', getClients);
app.post('/api/clients', createClient);
app.get('/api/clients/list', getClientsList);
app.get('/api/clients/:id', getClientById);
app.put('/api/clients/:id', updateClient);
app.get('/api/clients/:id/status', getClientStatus);
app.patch('/api/clients/:id/status', patchClientStatus);

// subscriptions
app.get('/api/subscriptions', getSubscriptions);
app.post('/api/subscriptions/save', saveSubscription);
app.get('/api/subscriptions/:id', getSubscriptionById);
app.get('/api/subscriptions/:id/edit', getSubscriptionEdit);
app.put('/api/subscriptions/:id/update-status', updateSubscriptionStatus);
app.get('/api/subscriptions/:id/status', getSubscriptionStatus);
app.patch('/api/subscriptions/:id/status', patchSubscriptionStatus);

// sales pages
app.post('/api/sales-pages/save', saveSalesPage);
app.get('/api/sales-pages', getSalesPages);
app.post('/api/sales-pages/create-payment', createSalesPagePayment);
app.get('/api/sales-pages/:id/orders', getSalesPageOrders);
app.get('/api/sales-pages/:id', getSalesPageById);
app.post('/api/sales-pages/:id', updateSalesPageStatus);
app.get('/api/sales-pages/:id/status', getSalesPageStatus);
app.patch('/api/sales-pages/:id/status', patchSalesPageStatus);

// settings
app.get('/api/settings/:id', getSettings);
app.put('/api/settings/:id', updateSettings);
app.post('/api/update-preferences', updatePreferences);

// Stripe routes
app.post('/api/stripe/create-payment', createStripePayment);
app.post('/api/stripe/connect', connectStripe);
app.post('/api/stripe/status', getStripeStatus);
app.post('/api/stripe/webhook', handleStripeWebhook);
app.post('/api/stripe/dashboard-link', getStripeDashboardLink);

// Auth routes
app.post('/api/auth/login', login);
app.post('/api/auth/signup', signup);
app.post('/api/auth/send-verification', sendVerification);
app.post('/api/auth/verify-email', verifyEmail);
app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/reset-password', resetPassword);

// User routes
app.get('/api/users/find-by-email', findUserByEmail);
app.post('/api/users/add', addUser);
app.get('/api/users/verify', isVerified);
app.get('/api/users/find-by-id', findUserById);
app.get('/api/users/access-check', getAccessCheck);
app.get('/api/users/billing-status', getBillingStatus);
app.get('/api/users/:id', getUserById);

// Paddle routes
app.post('/api/paddle/checkout', paddleCheckout);
app.post('/api/paddle/webhook', handlePaddleWebhook);

// Help routes
app.post('/api/help', sendSupportMessage);

// processing routes
app.post('/api/process-invoices', processInvoices);
app.post('/api/process-subscriptions', processSubscriptions);
app.post('/api/process-reminders', processReminders);

// Error handling
app.onError((err, c) => {
	console.error(`${err}`);
	return c.json({
		error: 'Internal Server Error',
		message: err.message,
	}, 500);
});

export default app;
