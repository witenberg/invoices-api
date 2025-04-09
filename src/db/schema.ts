import { pgTable, foreignKey, serial, integer, varchar, text, check, numeric, boolean, date, jsonb, timestamp, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const invoicesInvoiceidSeq = pgSequence("invoices_invoiceid_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const users = pgTable("users", {
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
	subscriptionStatus: varchar("subscription_status", { length: 20 }).default('trial'),
	subscriptionEndDate: timestamp("subscription_end_date"),
	paddleSubscriptionId: varchar("paddle_subscription_id", { length: 255 }),
}, (table) => [
	check("password_required", sql`(((login_method)::text = 'credentials'::text) AND (password IS NOT NULL)) OR (((login_method)::text = 'google'::text) AND (password IS NULL))`),
	check("users_login_method_check", sql`(login_method)::text = ANY (ARRAY[('credentials'::character varying)::text, ('google'::character varying)::text])`),
]);

export const clients = pgTable("clients", {
	clientid: serial().notNull(),
	userid: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	address: text(),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [users.userid],
			name: "clients_userid_fkey"
		}).onDelete("cascade"),
]);

export const subscriptions = pgTable("subscriptions", {
	subscriptionid: serial().notNull(),
	userid: integer().notNull(),
	clientid: integer().notNull(),
	currency: varchar({ length: 10 }).notNull(),
	language: varchar({ length: 10 }).notNull(),
	notes: text(),
	discount: numeric({ precision: 10, scale:  2 }),
	salestax: numeric({ precision: 10, scale:  2 }),
	secondtax: numeric({ precision: 10, scale:  2 }),
	acceptcreditcards: boolean().default(false).notNull(),
	acceptpaypal: boolean().default(false).notNull(),
	startDate: date("start_date").notNull(),
	frequency: varchar({ length: 20 }).notNull(),
	endDate: date("end_date"),
	status: varchar({ length: 20 }).notNull(),
	nextInvoice: date("next_invoice"),
	products: jsonb().default([]).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clientid],
			foreignColumns: [clients.clientid],
			name: "fk_clients"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userid],
			foreignColumns: [users.userid],
			name: "fk_users"
		}).onDelete("cascade"),
	check("subscriptions_frequency_check", sql`(frequency)::text = ANY (ARRAY[('Weekly'::character varying)::text, ('Every 2 weeks'::character varying)::text, ('Every 4 weeks'::character varying)::text, ('Monthly'::character varying)::text, ('Quarterly'::character varying)::text, ('Every 6 months'::character varying)::text, ('Yearly'::character varying)::text])`),
	check("subscriptions_status_check", sql`(status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Paused'::character varying)::text, ('Deleted'::character varying)::text])`),
]);

export const invoices = pgTable("invoices", {
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
	secondtax: numeric({ precision: 10, scale:  2 }),
	acceptcreditcards: boolean().default(false),
	acceptpaypal: boolean().default(false),
	subscriptionid: integer(),
	products: jsonb().default([]).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clientid],
			foreignColumns: [clients.clientid],
			name: "invoices_clientid_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userid],
			foreignColumns: [users.userid],
			name: "invoices_userid_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subscriptionid],
			foreignColumns: [subscriptions.subscriptionid],
			name: "invoices_subscriptionid_fkey"
		}).onDelete("set null"),
	check("invoices_language_check", sql`(language)::text = ANY (ARRAY[('Polski'::character varying)::text, ('English'::character varying)::text, ('Deutsch'::character varying)::text, ('Français'::character varying)::text])`),
	check("invoices_status_check", sql`(status)::text = ANY (ARRAY[('Draft'::character varying)::text, ('Sent'::character varying)::text, ('Paid'::character varying)::text, ('Refunded'::character varying)::text, ('Deleted'::character varying)::text])`),
]);

export const logs = pgTable("logs", {
	logid: serial().notNull(),
	userid: integer().notNull(),
	action: text().notNull(),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userid],
			foreignColumns: [users.userid],
			name: "logs_userid_fkey"
		}).onDelete("cascade"),
]);
