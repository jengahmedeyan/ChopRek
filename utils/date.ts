import { format as formatDateFns } from "date-fns";
import { FirestoreDate } from "@/lib/types";

/**
 * Converts a FirestoreDate into a Date or a formatted string.
 * @param date FirestoreDate (Date | { toDate: () => Date } | string | number)
 * @param format Optional format string (e.g., 'yyyy-MM-dd')
 * @returns Date or formatted string
 */
export function normalizeDate(date: FirestoreDate, format?: string): Date | string {
  if (!date) throw new Error("Invalid date input");

  let d: Date;

  if (typeof date === "string" || typeof date === "number") {
    d = new Date(date);
  } else if ("toDate" in date && typeof date.toDate === "function") {
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else {
    throw new Error("Unknown FirestoreDate format");
  }

  return format ? formatDateFns(d, format) : d;
}
