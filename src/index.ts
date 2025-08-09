import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { ExecutionContext } from 'hono/dist/types';

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
import { POST as trackInvoiceOpening } from './api/invoices/[id]/track/route';

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
import { PUT as updateUser } from './api/users/[id]/route';

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

// 2FA routes
import generate2FAApp from './api/2fa/generate/route';
import verify2FAApp from './api/2fa/verify/route';
import enable2FAApp from './api/2fa/enable/route';
import disable2FAApp from './api/2fa/disable/route';
import status2FAApp from './api/2fa/status/route';

// Blog routes
import { GET as getBlogPosts } from './api/blog/route';
import { GET as getBlogPostBySlug } from './api/blog/[slug]/route';

const app = new Hono<{ Bindings: Env }>();

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
app.post('/api/invoices/:id/track', trackInvoiceOpening);

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
app.put('/api/users/:id', updateUser);

// Paddle routes
app.post('/api/paddle/checkout', paddleCheckout);
app.post('/api/paddle/webhook', handlePaddleWebhook);

// 2FA routes
app.route('/api/2fa/generate', generate2FAApp);
app.route('/api/2fa/verify', verify2FAApp);
app.route('/api/2fa/enable', enable2FAApp);
app.route('/api/2fa/disable', disable2FAApp);
app.route('/api/2fa/status', status2FAApp);

// Help routes
app.post('/api/help', sendSupportMessage);

// processing routes
app.post('/api/process-invoices', processInvoices);
app.post('/api/process-subscriptions', processSubscriptions);
app.post('/api/process-reminders', processReminders);

// Blog routes
app.get('/api/blog', getBlogPosts);
app.get('/api/blog/:slug', getBlogPostBySlug);

// Handler for CRON triggers
app.get('/api/cron/:jobName', async (c) => {
  const jobName = c.req.param('jobName');
  
  try {
    let result;
    
    switch (jobName) {
      case 'process-invoices':
        result = await processInvoices(c);
        break;
      case 'process-reminders':
        result = await processReminders(c);
        break;
      case 'process-subscriptions':
        result = await processSubscriptions(c);
        break;
      default:
        return c.json({ error: `Unknown job name: ${jobName}` }, 400);
    }
    
    return result;
  } catch (error) {
    console.error(`Error running cron job ${jobName}:`, error);
    return c.json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Error handling
app.onError((err, c) => {
	console.error(`${err}`);
	return c.json({
		error: 'Internal Server Error',
		message: err.message,
	}, 500);
});

export default {
  fetch: app.fetch,
  // Define scheduled functions to match the cron triggers from wrangler.toml
  scheduled: async (event: { cron: string }, env: Env, ctx: ExecutionContext) => {
    const scheduler = app.fetch;
    const url = new URL(process.env.API_URL!);
    
    // Determine which endpoint to call based on cron schedule
    switch (event.cron) {
      case "0 5 * * *":
        // Process reminders at 5:00 UTC
        url.pathname = '/api/cron/process-reminders';
        break;
      case "0 6 * * *":
        // Process overdue invoices at 6:00 UTC
        url.pathname = '/api/cron/process-invoices';
        
        // Also process subscriptions (since both are scheduled at 6:00 UTC)
        const subscriptionUrl = new URL(process.env.API_URL!);
        subscriptionUrl.pathname = '/api/cron/process-subscriptions';
        const subscriptionRequest = new Request(subscriptionUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        try {
          const subscriptionResponse = await scheduler(subscriptionRequest, env, ctx);
          const subscriptionResult = await subscriptionResponse.json();
          console.log(`CRON subscriptions ${event.cron} executed:`, subscriptionResult);
        } catch (error) {
          console.error(`CRON subscriptions ${event.cron} failed:`, error);
        }
        break;
      case "0 7 * * *":
        // Placeholder for the scheduled invoices task at 7:00 UTC
        // TODO: Implement this functionality
        console.log("Scheduled invoices task not yet implemented");
        return;
      default:
        console.log(`Unknown cron schedule: ${event.cron}`);
        return;
    }
    
    // Create a request for the cron endpoint
    const request = new Request(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    try {
      // Execute the request against our app
      const response = await scheduler(request, env, ctx);
      const result = await response.json();
      console.log(`CRON ${event.cron} executed:`, result);
    } catch (error) {
      console.error(`CRON ${event.cron} failed:`, error);
    }
  }
};
