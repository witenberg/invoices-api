import type { InvoiceItem } from "./invoiceItem";
import { Subscription } from "./subscription";

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Refunded' | 'Deleted';

export interface InvoiceOptions {
  currency: string
  language: string
  date?: string
  notes?: string
  discount?: number
  isDiscountAmount?: boolean
  salestax?: {
    name: string
    rate: number
  }
  secondtax?: {
    name: string
    rate: number
  }
  acceptcreditcards: boolean
  acceptpaypal: boolean
}

export interface Invoice {
  invoiceid?: string
  userid: string
  clientid: string
  status: InvoiceStatus
  options: InvoiceOptions
  items: InvoiceItem[]
  subscriptionid?: string
}

export interface InvoiceToDisplay {
  invoiceid: string
  userid: string
  clientid: string
  status: InvoiceStatus
  currency: string
  total: number
  client_name: string
  date: string
}

export interface InvoiceToEdit {
  invoiceid: string
  userid: string
  clientid: string
  status: InvoiceStatus
  currency: string
  language: string
  date: string
  notes?: string
  discount?: number
  salestaxname?: string
  salestax?: number
  secondtaxname?: string
  secondtax?: number
  acceptcreditcards: boolean
  acceptpaypal: boolean
  client: {
    name: string,
    email: string,
    address?: string,
  },
  products: InvoiceItem[]
}

export interface InvoiceSubscription {
  invoice: InvoiceToEdit
  subscription: Subscription
}

export interface InvoicePrototype {
  userid: string
  clientid: string
  currency: string
  language: string
  notes?: string
  discount?: number
  salestaxname?: string
  salestax?: number
  secondtaxname?: string
  secondtax?: number
  acceptcreditcards: boolean
  acceptpaypal: boolean
  client: {
    name: string,
    email: string,
    address?: string,
  }
  products: InvoiceItem[]
  subscriptionid?: string
}

export interface InvoiceToPDF {
  invoiceid: string;
  date: string;
  currency: string;
  products: { name: string; amount: string; quantity: number }[];
  username: string;
  client_name: string;
}