import { pgSchema, serial, varchar, boolean, numeric, text, timestamp, foreignKey, integer, date, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const app = pgSchema("app");


export const usersInApp = app.table("users", {
	userid: serial().notNull(),
	username: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }),
	loginMethod: varchar("login_method", { length: 20 }).notNull(),
	isverified: boolean().default(false).notNull(),
	defaultCurrency: varchar("default_currency", { length: 10 }),
	defaultLanguage: varchar("default_language", { length: 10 }),
	salesTaxName: varchar("sales_tax_name", { length: 255 }),
	salesTaxRate: numeric("sales_tax_rate", { precision: 4, scale:  2 }),
	secondTaxName: varchar("second_tax_name", { length: 255 }),
	secondTaxRate: numeric("second_tax_rate", { precision: 4, scale:  2 }),
	address: varchar({ length: 255 }),
	invoiceNotes: varchar("invoice_notes", { length: 255 }),
	paddleConnected: boolean("paddle_connected").default(false),
	stripeAccountid: text("stripe_accountid"),
	stripeConnected: boolean("stripe_connected").default(false),
	trialEndDate: timestamp("trial_end_date"),
	isTrialActive: boolean("is_trial_active").default(true).notNull(),
	paddleSubscriptionId: varchar("paddle_subscription_id", { length: 255 }),
	isSubscriptionActive: boolean("is_subscription_active").default(false),
	subscriptionEndDate: timestamp("subscription_end_date"),
});

export const clientsInApp = app.table("clients", {
	clientid: serial().notNull(),
	userid: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	address: text(),
	status: varchar({ length: 20 }).default('No card'),
	currency: varchar({ length: 10 }).default('USD'),
	language: varchar({ length: 15 }).default('English'),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "clients_userid_fkey"
		}).onDelete("cascade"),
]);

export const logsInApp = app.table("logs", {
	logid: serial().notNull(),
	userid: integer().notNull(),
	action: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "logs_userid_fkey"
		}).onDelete("cascade"),
]);

export const subscriptionsInApp = app.table("subscriptions", {
	subscriptionid: serial().notNull(),
	userid: integer().notNull(),
	clientid: integer().notNull(),
	currency: varchar({ length: 10 }).notNull(),
	language: varchar({ length: 10 }).notNull(),
	notes: text(),
	discount: numeric({ precision: 10, scale:  2 }),
	salestax: numeric({ precision: 10, scale:  2 }),
	salestaxname: varchar({ length: 255 }),
	secondtax: numeric({ precision: 10, scale:  2 }),
	secondtaxname: varchar({ length: 255 }),
	acceptcreditcards: boolean().default(false).notNull(),
	acceptpaypal: boolean().default(false).notNull(),
	startDate: date("start_date").notNull(),
	frequency: varchar({ length: 20 }).notNull(),
	endDate: date("end_date"),
	status: varchar({ length: 20 }).notNull(),
	nextInvoice: date("next_invoice"),
	products: jsonb().default([]).notNull(),
	total: numeric({ precision: 10, scale: 2 }),
}, (table) => [
	foreignKey({
			columns: [table.clientid],
			foreignColumns: [clientsInApp.clientid],
			name: "fk_clients"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "fk_users"
		}).onDelete("cascade"),
]);

export const invoicesInApp = app.table("invoices", {
	invoiceid: integer().default(sql`nextval('invoices_invoiceid_seq'::regclass)`).notNull(),
	userid: integer().notNull(),
	clientid: integer().notNull(),
	status: varchar({ length: 50 }).notNull(),
	currency: varchar({ length: 10 }).notNull(),
	language: varchar({ length: 20 }).notNull(),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	notes: text(),
	discount: numeric({ precision: 10, scale:  2 }).default('0.00'),
	salestax: numeric({ precision: 10, scale:  2 }),
	salestaxname: varchar({ length: 255 }),
	secondtax: numeric({ precision: 10, scale:  2 }),
	secondtaxname: varchar({ length: 255 }),
	acceptcreditcards: boolean().default(false),
	acceptpaypal: boolean().default(false),
	subscriptionid: integer(),
	products: jsonb().default([]).notNull(),
	total: numeric({ precision: 10, scale: 2 }),
}, (table) => [
	foreignKey({
			columns: [table.clientid],
			foreignColumns: [clientsInApp.clientid],
			name: "invoices_clientid_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "invoices_userid_fkey"
		}).onDelete("cascade"),
]);

export const emailVerificationTokensInApp = app.table("email_verification_tokens", {
	tokenid: serial().notNull(),
	userid: integer().notNull(),
	token: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "email_verification_tokens_userid_fkey"
		}).onDelete("cascade"),
]);

export const salesPagesInApp = app.table("sales_pages", {
	id: serial().notNull(),
	userid: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	price: numeric({ precision: 10, scale: 2 }).notNull(),
	currency: varchar({ length: 3 }).notNull(),
	language: varchar({ length: 15 }).default('English'),
	frequency: varchar({ length: 50 }).default('One-time payment').notNull(),
	image_url: varchar({ length: 255 }),
	notes: text(),
	accept_credit_cards: boolean().default(false).notNull(),
	accept_paypal: boolean().default(false).notNull(),
	discount: numeric({ precision: 5, scale: 2 }),
	sales_tax_name: varchar({ length: 100 }),
	sales_tax_rate: numeric({ precision: 5, scale: 2 }),
	second_tax_name: varchar({ length: 100 }),
	second_tax_rate: numeric({ precision: 5, scale: 2 }),
	status: varchar({ length: 15 }).default('Draft'),
	created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
		columns: [table.userid],
		foreignColumns: [usersInApp.userid],
		name: "sales_pages_userid_fkey"
	}).onDelete("cascade"),
]);


// Export original names for backward compatibility
export const users = usersInApp;
export const clients = clientsInApp;
export const logs = logsInApp;
export const subscriptions = subscriptionsInApp;
export const invoices = invoicesInApp;
export const emailVerificationTokens = emailVerificationTokensInApp;
export const salesPages = salesPagesInApp;
