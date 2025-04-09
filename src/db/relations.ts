import { relations } from "drizzle-orm/relations";
import { users, clients, subscriptions, invoices, logs } from "./schema";

export const clientsRelations = relations(clients, ({one, many}) => ({
	user: one(users, {
		fields: [clients.userid],
		references: [users.userid]
	}),
	subscriptions: many(subscriptions),
	invoices: many(invoices),
}));

export const usersRelations = relations(users, ({many}) => ({
	clients: many(clients),
	subscriptions: many(subscriptions),
	invoices: many(invoices),
	logs: many(logs),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	client: one(clients, {
		fields: [subscriptions.clientid],
		references: [clients.clientid]
	}),
	user: one(users, {
		fields: [subscriptions.userid],
		references: [users.userid]
	}),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	client: one(clients, {
		fields: [invoices.clientid],
		references: [clients.clientid]
	}),
	user: one(users, {
		fields: [invoices.userid],
		references: [users.userid]
	}),
}));

export const logsRelations = relations(logs, ({one}) => ({
	user: one(users, {
		fields: [logs.userid],
		references: [users.userid]
	}),
}));