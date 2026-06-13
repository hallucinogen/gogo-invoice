import { computeTotals, lineTotal } from '../lib/calc'
import { formatCurrency, formatDate } from '../lib/format'
import type { Invoice } from '../types'

/** An on-screen rendering of the invoice that mirrors the exported PDF. */
export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const totals = computeTotals(invoice)
  const c = invoice.company
  const money = (n: number) => formatCurrency(n, invoice.currency)

  const companyLines = [
    c.address,
    c.email,
    c.phone,
    c.website,
    c.taxId && `Tax ID: ${c.taxId}`,
  ]
    .filter(Boolean)
    .join('\n')

  const clientLines = [invoice.client.address, invoice.client.email, invoice.client.phone]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="paper">
      <div className="paper__top">
        <div className="paper__brand">
          {c.logo ? <img className="paper__logo" src={c.logo} alt="" /> : null}
          <div className="paper__company-name">{c.name || 'Your Company'}</div>
          {companyLines ? <div className="paper__muted">{companyLines}</div> : null}
        </div>
        <div className="paper__title">
          <h1>INVOICE</h1>
          <div className="paper__meta-row">
            <span className="label">Invoice #</span>
            <span className="val">{invoice.number || '—'}</span>
          </div>
          <div className="paper__meta-row">
            <span className="label">Issued</span>
            <span className="val">{formatDate(invoice.issueDate) || '—'}</span>
          </div>
          <div className="paper__meta-row">
            <span className="label">Due</span>
            <span className="val">{formatDate(invoice.dueDate) || '—'}</span>
          </div>
          <div className="paper__meta-row">
            <span className="label">Status</span>
            <span className="val" style={{ textTransform: 'capitalize' }}>
              {invoice.status}
            </span>
          </div>
        </div>
      </div>

      <div className="paper__parties">
        <div className="paper__party">
          <h3>Bill To</h3>
          <div className="name">{invoice.client.name || '—'}</div>
          {clientLines ? <div className="paper__muted">{clientLines}</div> : null}
        </div>
      </div>

      <table className="paper__table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="r">Qty</th>
            <th className="r">Unit Price</th>
            <th className="r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.length === 0 ? (
            <tr>
              <td colSpan={4} className="paper__muted">
                No items yet.
              </td>
            </tr>
          ) : (
            invoice.items.map((it) => (
              <tr key={it.id}>
                <td>{it.description || '—'}</td>
                <td className="r">{it.quantity}</td>
                <td className="r">{money(it.unitPrice)}</td>
                <td className="r">{money(lineTotal(it))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="paper__totals">
        <div className="paper__totals-box">
          <div className="paper__totals-line">
            <span>Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 ? (
            <div className="paper__totals-line">
              <span>
                Discount
                {invoice.discountType === 'percent' ? ` (${invoice.discountValue}%)` : ''}
              </span>
              <span>−{money(totals.discountAmount)}</span>
            </div>
          ) : null}
          {totals.taxAmount > 0 ? (
            <div className="paper__totals-line">
              <span>
                {invoice.taxLabel || 'Tax'} ({invoice.taxRate}%)
              </span>
              <span>{money(totals.taxAmount)}</span>
            </div>
          ) : null}
          {totals.shipping > 0 ? (
            <div className="paper__totals-line">
              <span>Shipping</span>
              <span>{money(totals.shipping)}</span>
            </div>
          ) : null}
          <div className="paper__totals-line grand">
            <span>Total</span>
            <span>{money(totals.total)}</span>
          </div>
        </div>
      </div>

      {invoice.notes || invoice.terms || c.bankDetails ? (
        <div className="paper__notes">
          {invoice.notes ? (
            <div className="block">
              <h3>Notes</h3>
              <p>{invoice.notes}</p>
            </div>
          ) : null}
          {invoice.terms ? (
            <div className="block">
              <h3>Terms</h3>
              <p>{invoice.terms}</p>
            </div>
          ) : null}
          {c.bankDetails ? (
            <div className="block">
              <h3>Payment Details</h3>
              <p>{c.bankDetails}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
