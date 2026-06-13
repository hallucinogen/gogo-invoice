/**
 * Headless smoke test: exercises the real app modules (calc, factory, zod
 * persistence, and the @react-pdf renderer) outside the browser. Run via
 * esbuild + node. Not shipped in the app bundle.
 */
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoiceDocument } from '../src/pdf/InvoicePDF'
import { computeTotals } from '../src/lib/calc'
import {
  createCompany,
  createInvoiceForCompany,
  duplicateInvoice,
  suggestedNumber,
} from '../src/lib/factory'
import { appDataSchema } from '../src/types'
import { parseBackup, serializeBackup, defaultData } from '../src/store/persistence'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok -', msg)
}

async function main() {
  console.log('1. company + numbering')
  const company = createCompany({
    name: 'Acme Studio Ltd.',
    email: 'billing@acme.com',
    address: '123 Market Street\nSan Francisco, CA',
    invoicePrefix: 'ACME-',
    nextNumber: 7,
    numberPadding: 4,
    defaultCurrency: 'USD',
    defaultTaxRate: 10,
    bankDetails: 'Bank: Example\nAcct: 123',
  })
  assert(suggestedNumber(company) === 'ACME-0007', 'suggested number zero-pads')

  console.log('2. invoice + totals math')
  const inv = createInvoiceForCompany(company)
  inv.client.name = 'Globex Inc.'
  inv.items = [
    { id: 'a', description: 'Design', quantity: 2, unitPrice: 500 },
    { id: 'b', description: 'Dev', quantity: 10, unitPrice: 80 },
  ]
  inv.discountType = 'percent'
  inv.discountValue = 10
  inv.taxRate = 10
  inv.shipping = 25
  const t = computeTotals(inv)
  // subtotal = 1000 + 800 = 1800; -10% = 1620; +10% tax = 162; +25 shipping
  assert(t.subtotal === 1800, `subtotal 1800 (got ${t.subtotal})`)
  assert(t.discountAmount === 180, `discount 180 (got ${t.discountAmount})`)
  assert(t.taxAmount === 162, `tax 162 (got ${t.taxAmount})`)
  assert(t.total === 1807, `total 1807 (got ${t.total})`)

  console.log('3. fixed discount cannot exceed subtotal')
  const t2 = computeTotals({
    items: [{ id: 'x', description: '', quantity: 1, unitPrice: 100 }],
    discountType: 'fixed',
    discountValue: 999,
    taxRate: 0,
    shipping: 0,
  })
  assert(
    t2.discountAmount === 100 && t2.total === 0,
    'fixed discount clamped to subtotal',
  )

  console.log('4. duplicate invoice → new id, draft, fresh number')
  const dup = duplicateInvoice(inv, company)
  assert(dup.id !== inv.id, 'new id')
  assert(dup.status === 'draft', 'reset to draft')
  assert(dup.items[0].id !== inv.items[0].id, 'item ids regenerated')

  console.log('5. zod backup round-trip')
  const data = defaultData()
  data.companies = [company]
  data.invoices = [inv, dup]
  const json = serializeBackup(data)
  const restored = parseBackup(json)
  assert(restored.companies.length === 1, 'company restored')
  assert(restored.invoices.length === 2, 'invoices restored')
  assert(appDataSchema.safeParse(restored).success, 'restored data validates')

  console.log('6. zod rejects garbage / fills partials')
  const partial = appDataSchema.safeParse({ companies: [], invoices: [] })
  assert(partial.success, 'partial data fills defaults')
  assert(
    partial.success && partial.data.settings.theme === 'system',
    'theme default applied',
  )

  console.log('7. render PDF (the risky bit)')
  const buf = await renderToBuffer(<InvoiceDocument invoice={inv} />)
  const header = buf.subarray(0, 5).toString('latin1')
  assert(header === '%PDF-', `valid PDF header (got "${header}")`)
  assert(buf.length > 2000, `non-trivial PDF size (${buf.length} bytes)`)

  console.log('\nALL CHECKS PASSED ✅  (pdf: ' + buf.length + ' bytes)')
}

main().catch((e) => {
  console.error('\n❌', e)
  process.exit(1)
})
