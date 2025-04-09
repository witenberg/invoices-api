import { subscription_frequency } from "../constants/frequency";

export function getNextSubscriptionDate(startDate: string, frequency: typeof subscription_frequency[number]): string {
  const date = new Date(startDate);

  switch (frequency) {
    case "Weekly":
      return addDaysToDate(date, 7);
    case "Every 2 weeks":
      return addDaysToDate(date, 14);
    case "Every 4 weeks":
      return addDaysToDate(date, 28);
    case "Monthly":
      return addMonthsToDate(date, 1);
    case "Quarterly":
      return addMonthsToDate(date, 3);
    case "Every 6 months":
      return addMonthsToDate(date, 6);
    case "Yearly":
      return addMonthsToDate(date, 12);
    default:
      throw new Error("Invalid frequency");
  }
}

// Helper functions to replace date-fns functionality
function addDaysToDate(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}

function addMonthsToDate(date: Date, months: number): string {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toISOString().split("T")[0];
}
