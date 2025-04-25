import { Currency } from "../constants/options";
import { InvoicePrototype } from "./invoice";

export type SubscriptionStatus = 'Active' | 'Paused' | 'Deleted';

export type SubscriptionFrequency = 'Weekly' | 'Every 2 weeks' | 'Every 4 weeks' | 'Monthly' | 'Quarterly' | 'Every 6 months' | 'Yearly'

export interface Subscription {
  subscriptionid?: string
  start_date: string
  days_to_pay?: number
  enable_reminders: boolean
  reminder_days_before?: number
  frequency: SubscriptionFrequency
  end_date?: string
  status: SubscriptionStatus
  invoicePrototype: InvoicePrototype
  next_invoice?: string
}

export interface SubscriptionToDisplay {
  subscriptionid: string
  status: SubscriptionStatus
  currency: Currency
  total: number
  client_name: string
  next_invoice: string
  frequency: SubscriptionFrequency
}