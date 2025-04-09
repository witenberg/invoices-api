import { InvoiceItem } from "../types/invoiceItem";

export const validateItems = (items: InvoiceItem[]): boolean => {
    if (items.length === 0) return false;

    let hasValidItem = false;

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];

      if ((item.name && item.amount === null) || (!item.name && item.amount !== null))
        return false;

      if (!item.name && item.amount === null) {
        if (items.length === 1) return false;
        items.splice(i, 1);
      } else {
        hasValidItem = true;
      }
    }

    return hasValidItem;
  };