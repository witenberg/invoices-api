import { pgSchema, varchar, boolean, numeric, text, timestamp, foreignKey, jsonb, uuid, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const app = pgSchema("app");


export const usersInApp = app.table("users", {
	userid: uuid().defaultRandom().notNull().primaryKey(),
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
	unpaidMessage: varchar("unpaid_message", { length: 255 }),
	paidMessage: varchar("paid_message", { length: 255 }),
	paddleConnected: boolean("paddle_connected").default(false),
	stripeAccountid: text("stripe_accountid"),
	stripeConnected: boolean("stripe_connected").default(false),
	trialEndDate: timestamp("trial_end_date", { withTimezone: true }),
	isTrialActive: boolean("is_trial_active").default(true).notNull(),
	paddleSubscriptionId: varchar("paddle_subscription_id", { length: 255 }),
	isSubscriptionActive: boolean("is_subscription_active").default(false),
	subscriptionEndDate: timestamp("subscription_end_date", { withTimezone: true }),
	isTwoFactorEnabled: boolean("is_two_factor_enabled").default(false).notNull(),
	twoFactorSecret: text("two_factor_secret"),
});

export const clientsInApp = app.table("clients", {
	clientid: uuid().defaultRandom().notNull().primaryKey(),
	userid: uuid().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	address: text(),
	status: varchar({ length: 20 }).default('No card'),
	currency: varchar({ length: 10 }).default('USD'),
	language: varchar({ length: 15 }).default('English'),
	isDeleted: boolean("is_deleted").default(false),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "clients_userid_fkey"
		}).onDelete("cascade"),
]);

export const logsInApp = app.table("logs", {
	logid: uuid().defaultRandom().notNull().primaryKey(),
	userid: uuid().notNull(),
	action: text().notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "logs_userid_fkey"
		}).onDelete("cascade"),
]);

export const subscriptionsInApp = app.table("subscriptions", {
	subscriptionid: uuid().defaultRandom().notNull().primaryKey(),
	userid: uuid().notNull(),
	clientid: uuid().notNull(),
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
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	daysToPay: integer("days_to_pay"),
	frequency: varchar({ length: 20 }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true }),
	status: varchar({ length: 20 }).notNull(),
	isDeleted: boolean("is_deleted").default(false),
	nextInvoice: timestamp("next_invoice", { withTimezone: true }),
	products: jsonb().default([]).notNull(),
	total: numeric({ precision: 10, scale: 2 }),
	enable_reminders: boolean().default(false),
	reminder_days_before: integer("reminder_days_before"),
	last_reminder_sent: timestamp("last_reminder_sent", { withTimezone: true }),
}, (table) => [
	foreignKey({
			columns: [table.clientid],
			foreignColumns: [clientsInApp.clientid],
			name: "subscriptions_clientid_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "subscriptions_userid_fkey"
		}).onDelete("cascade"),
]);

export const invoicesInApp = app.table("invoices", {
	invoiceid: uuid().defaultRandom().notNull().primaryKey(),
	userid: uuid().notNull(),
	clientid: uuid().notNull(),
	status: varchar({ length: 50 }).notNull(),
	isDeleted: boolean("is_deleted").default(false),
	currency: varchar({ length: 10 }).notNull(),
	language: varchar({ length: 20 }).notNull(),
	date: timestamp("date", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	payment_date: timestamp("payment_date", { withTimezone: true }),
	opened_at: timestamp("opened_at", { withTimezone: true }),
	sent_at: timestamp("sent_at", { withTimezone: true }),
	notes: text(),
	discount: numeric({ precision: 10, scale:  2 }).default('0.00'),
	salestax: numeric({ precision: 10, scale:  2 }),
	salestaxname: varchar({ length: 255 }),
	secondtax: numeric({ precision: 10, scale:  2 }),
	secondtaxname: varchar({ length: 255 }),
	acceptcreditcards: boolean().default(false),
	acceptpaypal: boolean().default(false),
	subscriptionid: uuid(),
	products: jsonb().default([]).notNull(),
	total: numeric({ precision: 10, scale: 2 }),
	enable_reminders: boolean().default(false),
	reminder_days_before: integer("reminder_days_before"),
	last_reminder_sent: timestamp("last_reminder_sent", { withTimezone: true }),
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
	foreignKey({
			columns: [table.subscriptionid],
			foreignColumns: [subscriptionsInApp.subscriptionid],
			name: "invoices_subscriptionid_fkey"
		}).onDelete("set null"),
]);

export const emailVerificationTokensInApp = app.table("email_verification_tokens", {
	tokenid: uuid().defaultRandom().notNull().primaryKey(),
	userid: uuid().notNull(),
	token: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [usersInApp.userid],
			name: "email_verification_tokens_userid_fkey"
		}).onDelete("cascade"),
]);

export const salesPagesInApp = app.table("sales_pages", {
	id: uuid().defaultRandom().notNull().primaryKey(),
	userid: uuid().notNull(),
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
	isDeleted: boolean("is_deleted").default(false),
	created_at: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
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
