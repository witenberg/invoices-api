import { Currency } from "../constants/options";
import { InvoicePrototype } from "./invoice";

export type SubscriptionStatus = 'Active' | 'Paused' | 'Deleted';

export type SubscriptionFrequency = 'Weekly' | 'Every 2 weeks' | 'Every 4 weeks' | 'Monthly' | 'Quarterly' | 'Every 6 months' | 'Yearly'

export interface Subscription {
  subscriptionid?: number
  start_date: string
  frequency: SubscriptionFrequency
  end_date?: string
  status: SubscriptionStatus
  invoicePrototype: InvoicePrototype
  next_invoice?: string
}

export interface SubscriptionToDisplay {
  subscriptionid: number
  status: SubscriptionStatus
  currency: Currency
  total: number
  client_name: string
  next_invoice: string
  frequency: SubscriptionFrequency
}