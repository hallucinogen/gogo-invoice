import type { DiscountType, Invoice } from '../types'

export interface Totals {
  subtotal: number
  discountAmount: number
  taxableBase: number
  taxAmount: number
  shipping: number
  total: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

export function lineTotal(item: { quantity: number; unitPrice: number }): number {
  return round2((item.quantity || 0) * (item.unitPrice || 0))
}

type TotalsInput = Pick<
  Invoice,
  'items' | 'discountType' | 'discountValue' | 'taxRate' | 'shipping'
>

export function computeTotals(inv: TotalsInput): Totals {
  // Sum the already-rounded per-line totals so the printed line amounts always
  // add up to the subtotal shown on the invoice.
  const subtotal = round2(inv.items.reduce((sum, it) => sum + lineTotal(it), 0))

  const discountAmount = round2(
    discountFor(subtotal, inv.discountType, inv.discountValue),
  )
  // Let the base follow the subtotal (no floor) so a credit-style negative
  // subtotal stays internally consistent rather than showing total = 0.
  const taxableBase = round2(subtotal - discountAmount)
  const taxAmount = round2(taxableBase * (clamp(inv.taxRate || 0, 0, 100000) / 100))
  const shipping = round2(Math.max(inv.shipping || 0, 0))
  const total = round2(taxableBase + taxAmount + shipping)

  return { subtotal, discountAmount, taxableBase, taxAmount, shipping, total }
}

function discountFor(subtotal: number, type: DiscountType, value: number): number {
  if (type === 'percent') {
    return subtotal * (clamp(value || 0, 0, 100) / 100)
  }
  // Fixed amount: never below zero, never more than the subtotal.
  return clamp(value || 0, 0, subtotal)
}
