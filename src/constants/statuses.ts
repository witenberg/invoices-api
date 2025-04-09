export const invoice_statuses: string[] = [
    "Draft",
    "Sent",
    "Paid",
    "Refunded",
    "Deleted",
  ] as const;

export const subscription_statuses: string[] = [
    'Active', 
    'Paused', 
    'Deleted'
] as const;

export const settings_statuses: string[] = [
  "invoices", "payments", "email", "account", "security", "billing"
]