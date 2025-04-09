-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SEQUENCE "public"."invoices_invoiceid_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "clients" (
	"clientid" serial NOT NULL,
	"userid" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"subscriptionid" serial NOT NULL,
	"userid" integer NOT NULL,
	"clientid" integer NOT NULL,
	"currency" varchar(10) NOT NULL,
	"language" varchar(10) NOT NULL,
	"notes" text,
	"discount" numeric(10, 2),
	"salestax" numeric(10, 2),
	"secondtax" numeric(10, 2),
	"acceptcreditcards" boolean DEFAULT false NOT NULL,
	"acceptpaypal" boolean DEFAULT false NOT NULL,
	"start_date" date NOT NULL,
	"frequency" varchar(20) NOT NULL,
	"end_date" date,
	"status" varchar(20) NOT NULL,
	"next_invoice" date,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "subscriptions_frequency_check" CHECK ((frequency)::text = ANY (ARRAY[('Weekly'::character varying)::text, ('Every 2 weeks'::character varying)::text, ('Every 4 weeks'::character varying)::text, ('Monthly'::character varying)::text, ('Quarterly'::character varying)::text, ('Every 6 months'::character varying)::text, ('Yearly'::character varying)::text])),
	CONSTRAINT "subscriptions_status_check" CHECK ((status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Paused'::character varying)::text, ('Deleted'::character varying)::text]))
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"invoiceid" integer DEFAULT nextval('invoices_invoiceid_seq'::regclass) NOT NULL,
	"userid" integer NOT NULL,
	"clientid" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"language" varchar(20) NOT NULL,
	"date" date DEFAULT CURRENT_DATE NOT NULL,
	"notes" text,
	"discount" numeric(10, 2) DEFAULT '0.00',
	"salestax" numeric(10, 2),
	"secondtax" numeric(10, 2),
	"acceptcreditcards" boolean DEFAULT false,
	"acceptpaypal" boolean DEFAULT false,
	"subscriptionid" integer,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "invoices_language_check" CHECK ((language)::text = ANY (ARRAY[('Polski'::character varying)::text, ('English'::character varying)::text, ('Deutsch'::character varying)::text, ('Français'::character varying)::text])),
	CONSTRAINT "invoices_status_check" CHECK ((status)::text = ANY (ARRAY[('Draft'::character varying)::text, ('Sent'::character varying)::text, ('Paid'::character varying)::text, ('Refunded'::character varying)::text, ('Deleted'::character varying)::text]))
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"logid" serial NOT NULL,
	"userid" integer NOT NULL,
	"action" text NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "users" (
	"userid" serial NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"login_method" varchar(20) NOT NULL,
	"isverified" boolean DEFAULT false NOT NULL,
	"default_currency" varchar(10),
	"default_language" varchar(10),
	"sales_tax_name" varchar(255),
	"sales_tax_rate" numeric(4, 2),
	"second_tax_name" varchar(255),
	"second_tax_rate" numeric(4, 2),
	"address" varchar(255),
	"invoice_notes" varchar(255),
	"paddle_connected" boolean DEFAULT false,
	"stripe_accountid" text,
	"stripe_connected" boolean DEFAULT false,
	CONSTRAINT "password_required" CHECK ((((login_method)::text = 'credentials'::text) AND (password IS NOT NULL)) OR (((login_method)::text = 'google'::text) AND (password IS NULL))),
	CONSTRAINT "users_login_method_check" CHECK ((login_method)::text = ANY (ARRAY[('credentials'::character varying)::text, ('google'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "fk_clients" FOREIGN KEY ("clientid") REFERENCES "public"."clients"("clientid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "fk_users" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientid_fkey" FOREIGN KEY ("clientid") REFERENCES "public"."clients"("clientid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."users"("userid") ON DELETE cascade ON UPDATE no action;
*/