import { relations } from "drizzle-orm/relations";
import { usersInApp, clientsInApp, logsInApp, subscriptionsInApp, invoicesInApp, emailVerificationTokensInApp, salesPagesInApp } from "./schema";

export const clientsInAppRelations = relations(clientsInApp, ({one, many}) => ({
	usersInApp: one(usersInApp, {
		fields: [clientsInApp.userid],
		references: [usersInApp.userid]
	}),
	subscriptionsInApps: many(subscriptionsInApp),
	invoicesInApps: many(invoicesInApp),
}));

export const usersInAppRelations = relations(usersInApp, ({many}) => ({
	clientsInApps: many(clientsInApp),
	logsInApps: many(logsInApp),
	subscriptionsInApps: many(subscriptionsInApp),
	invoicesInApps: many(invoicesInApp),
	emailVerificationTokens: many(emailVerificationTokensInApp),
	salesPagesInApps: many(salesPagesInApp),
}));

export const logsInAppRelations = relations(logsInApp, ({one}) => ({
	usersInApp: one(usersInApp, {
		fields: [logsInApp.userid],
		references: [usersInApp.userid]
	}),
}));

export const subscriptionsInAppRelations = relations(subscriptionsInApp, ({one}) => ({
	clientsInApp: one(clientsInApp, {
		fields: [subscriptionsInApp.clientid],
		references: [clientsInApp.clientid]
	}),
	usersInApp: one(usersInApp, {
		fields: [subscriptionsInApp.userid],
		references: [usersInApp.userid]
	}),
}));

export const invoicesInAppRelations = relations(invoicesInApp, ({one}) => ({
	clientsInApp: one(clientsInApp, {
		fields: [invoicesInApp.clientid],
		references: [clientsInApp.clientid]
	}),
	usersInApp: one(usersInApp, {
		fields: [invoicesInApp.userid],
		references: [usersInApp.userid]
	}),
}));

export const emailVerificationTokensInAppRelations = relations(emailVerificationTokensInApp, ({one}) => ({
	usersInApp: one(usersInApp, {
		fields: [emailVerificationTokensInApp.userid],
		references: [usersInApp.userid]
	}),
}));

export const salesPagesInAppRelations = relations(salesPagesInApp, ({one, many}) => ({
	usersInApp: one(usersInApp, {
		fields: [salesPagesInApp.userid],
		references: [usersInApp.userid]
	}),
}));

// Export original names for backward compatibility
export const clientsRelations = clientsInAppRelations;
export const usersRelations = usersInAppRelations;
export const logsRelations = logsInAppRelations;
export const subscriptionsRelations = subscriptionsInAppRelations;
export const invoicesRelations = invoicesInAppRelations;
export const emailVerificationTokensRelations = emailVerificationTokensInAppRelations;
export const salesPagesRelations = salesPagesInAppRelations;