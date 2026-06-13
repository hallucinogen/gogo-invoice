import { format as formatDateFns, parseISO } from 'date-fns'

/** Format a money amount with the currency symbol and locale grouping. */
export function formatCurrency(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

/** A human-friendly date, e.g. "Jun 13, 2026". Falls back to the raw value. */
export function formatDate(value: string): string {
  if (!value) return ''
  try {
    return formatDateFns(parseISO(value), 'PP')
  } catch {
    return value
  }
}

/** Parse a possibly-messy numeric input into a finite number (or 0). */
export function toNumber(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}
