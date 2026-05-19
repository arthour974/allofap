import { clsx, type ClassValue } from "clsx"
import { format, isValid } from "date-fns"
import { fr } from "date-fns/locale"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formate une date API sans planter si la valeur est absente ou invalide. */
export function formatDate(
  value: string | Date | number | null | undefined,
  pattern: string,
): string {
  if (value == null || value === "") return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (!isValid(date)) return "—"
  return format(date, pattern, { locale: fr })
}
