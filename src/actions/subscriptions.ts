import { subscription_frequency } from "../constants/frequency";
import { addDaysToDate, addMonthsToDate } from "../utils/dateUtils";

export function getNextSubscriptionDate(startDate: string, frequency: typeof subscription_frequency[number]): string {
  switch (frequency) {
    case "Weekly":
      return addDaysToDate(startDate, 7);
    case "Every 2 weeks":
      return addDaysToDate(startDate, 14);
    case "Every 4 weeks":
      return addDaysToDate(startDate, 28);
    case "Monthly":
      return addMonthsToDate(startDate, 1);
    case "Quarterly":
      return addMonthsToDate(startDate, 3);
    case "Every 6 months":
      return addMonthsToDate(startDate, 6);
    case "Yearly":
      return addMonthsToDate(startDate, 12);
    default:
      throw new Error("Invalid frequency");
  }
}
