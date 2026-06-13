import { format as formatDateFns, parseISO } from 'date-fns'

/**
 * Format a money amount with the currency code (e.g. "USD 1,234.50").
 * We use the ISO code rather than the symbol because the PDF is rendered with
 * the built-in Helvetica font, which has no glyph for several currency symbols
 * (₹ ฿ ₫ ₩ ₱). Using the code keeps the on-screen preview and the exported PDF
 * identical for every supported currency.
 */
export function formatCurrency(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
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
