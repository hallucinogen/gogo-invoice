import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { Field } from '../components/Field'
import { InvoicePreview } from '../preview/InvoicePreview'
import { downloadInvoicePdf } from '../pdf/download'
import { computeTotals, lineTotal } from '../lib/calc'
import { formatCurrency } from '../lib/format'
import {
  createInvoiceForCompany,
  duplicateInvoice,
  emptyLineItem,
  snapshotOf,
  suggestedNumber,
} from '../lib/factory'
import { CURRENCIES } from '../lib/currencies'
import {
  ArrowLeftIcon,
  CopyIcon,
  DownloadIcon,
  PlusIcon,
  SaveIcon,
  TrashIcon,
} from '../components/icons'
import type { Invoice, InvoiceStatus, LineItem } from '../types'

type Mode = 'new' | 'edit' | 'missing'

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const fromId = sp.get('from')
  const preselectCompany = sp.get('company')
  const navigate = useNavigate()

  const {
    companies,
    getInvoice,
    getCompany,
    saveInvoice,
    deleteInvoice,
    bumpCompanyNumber,
  } = useStore()

  const [draft, setDraft] = useState<Invoice | null>(null)
  const [mode, setMode] = useState<Mode>('new')
  const isNewRef = useRef(true)
  const [toast, setToast] = useState('')

  // Build the working draft from the route. Intentionally only re-runs when the
  // route identifiers change — not when the store mutates — so saving (which
  // bumps a company's counter) does not clobber in-progress edits.
  useEffect(() => {
    if (id && id !== 'new') {
      const existing = getInvoice(id)
      if (existing) {
        setDraft(structuredCloneSafe(existing))
        setMode('edit')
        isNewRef.current = false
      } else {
        setDraft(null)
        setMode('missing')
      }
      return
    }
    if (fromId) {
      const src = getInvoice(fromId)
      if (src) {
        setDraft(duplicateInvoice(src, getCompany(src.companyId)))
        setMode('new')
        isNewRef.current = true
        return
      }
    }
    const company = (preselectCompany && getCompany(preselectCompany)) || companies[0]
    if (company) {
      setDraft(createInvoiceForCompany(company))
      setMode('new')
      isNewRef.current = true
    } else {
      setDraft(null)
      setMode('new')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fromId, preselectCompany])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // --- mutators ---
  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  const setClient = (key: keyof Invoice['client'], value: string) =>
    setDraft((d) => (d ? { ...d, client: { ...d.client, [key]: value } } : d))

  const changeCompany = (companyId: string) => {
    const c = getCompany(companyId)
    if (!c) return
    setDraft((d) => {
      if (!d) return d
      if (isNewRef.current) {
        return {
          ...d,
          companyId: c.id,
          company: snapshotOf(c),
          currency: c.defaultCurrency || d.currency,
          number: suggestedNumber(c),
          taxRate: c.defaultTaxRate,
          taxLabel: c.defaultTaxLabel || 'Tax',
          notes: d.notes || c.defaultNotes,
          terms: d.terms || c.defaultTerms,
        }
      }
      return { ...d, companyId: c.id, company: snapshotOf(c) }
    })
  }

  const updateItem = (itemId: string, patch: Partial<LineItem>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            items: d.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
          }
        : d,
    )
  const addItem = () =>
    setDraft((d) => (d ? { ...d, items: [...d.items, emptyLineItem()] } : d))
  const removeItem = (itemId: string) =>
    setDraft((d) => (d ? { ...d, items: d.items.filter((it) => it.id !== itemId) } : d))

  const save = (opts?: { download?: boolean }) => {
    if (!draft) return
    const toSave: Invoice = { ...draft, updatedAt: new Date().toISOString() }
    saveInvoice(toSave)
    if (isNewRef.current) {
      bumpCompanyNumber(toSave.companyId)
      isNewRef.current = false
    }
    setDraft(toSave)
    setMode('edit')
    if (opts?.download) void downloadInvoicePdf(toSave)
    setToast(opts?.download ? 'Saved · downloading PDF…' : 'Saved')
    if (id !== toSave.id) navigate(`/invoice/${toSave.id}`, { replace: true })
  }

  const onDelete = () => {
    if (!draft) return
    if (window.confirm(`Delete invoice ${draft.number}? This cannot be undone.`)) {
      deleteInvoice(draft.id)
      navigate('/')
    }
  }

  // --- empty / error states ---
  if (mode === 'missing') {
    return (
      <div className="empty">
        <h2>Invoice not found</h2>
        <p>It may have been deleted.</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/" className="btn btn--primary">
            Back to invoices
          </Link>
        </div>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="empty">
        <h2>Add a company first</h2>
        <p>An invoice needs a sender. Create a company, then come back.</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/companies" className="btn btn--primary">
            <PlusIcon className="btn-icon" /> Add a company
          </Link>
        </div>
      </div>
    )
  }

  const totals = computeTotals(draft)
  const money = (n: number) => formatCurrency(n, draft.currency)

  return (
    <div>
      <div className="page-head">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>
          <ArrowLeftIcon className="btn-icon" /> Invoices
        </button>
        <h1 style={{ fontSize: '1.3rem' }}>
          {mode === 'new' ? 'New invoice' : `Edit ${draft.number}`}
        </h1>
        <span className="nav-spacer" />
        {toast ? <span className="tag">{toast}</span> : null}
      </div>

      <div className="editor">
        <div className="editor__form">
          {/* Invoice meta */}
          <div className="card">
            <div className="card__title">Invoice</div>
            <div className="grid-2">
              <Field label="Company (header)">
                <select
                  className="select"
                  value={draft.companyId}
                  onChange={(e) => changeCompany(e.target.value)}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || 'Untitled company'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="select"
                  value={draft.status}
                  onChange={(e) => set('status', e.target.value as InvoiceStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                </select>
              </Field>
              <Field label="Invoice number">
                <input
                  className="input"
                  value={draft.number}
                  onChange={(e) => set('number', e.target.value)}
                />
              </Field>
              <Field label="Currency">
                <select
                  className="select"
                  value={draft.currency}
                  onChange={(e) => set('currency', e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Issue date">
                <input
                  className="input"
                  type="date"
                  value={draft.issueDate}
                  onChange={(e) => set('issueDate', e.target.value)}
                />
              </Field>
              <Field label="Due date">
                <input
                  className="input"
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Bill to */}
          <div className="card">
            <div className="card__title">Bill to</div>
            <div className="grid-2">
              <Field label="Client name">
                <input
                  className="input"
                  value={draft.client.name}
                  placeholder="Client or company name"
                  onChange={(e) => setClient('name', e.target.value)}
                />
              </Field>
              <Field label="Client email">
                <input
                  className="input"
                  type="email"
                  value={draft.client.email}
                  onChange={(e) => setClient('email', e.target.value)}
                />
              </Field>
              <Field label="Client phone">
                <input
                  className="input"
                  value={draft.client.phone}
                  onChange={(e) => setClient('phone', e.target.value)}
                />
              </Field>
              <Field label="Client address">
                <textarea
                  className="textarea"
                  value={draft.client.address}
                  onChange={(e) => setClient('address', e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <div className="card__title">Items</div>
            <div className="items-table">
              <div className="items-row items-row--head">
                <span>Description</span>
                <span style={{ textAlign: 'right' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Unit price</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
                <span />
              </div>
              {draft.items.map((it) => (
                <div className="items-row" key={it.id}>
                  <input
                    className="input"
                    value={it.description}
                    placeholder="Item or service"
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                  />
                  <input
                    className="input num-input"
                    type="number"
                    min={0}
                    step="any"
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(it.id, { quantity: clampNum(e.target.value) })
                    }
                  />
                  <input
                    className="input num-input"
                    type="number"
                    min={0}
                    step="any"
                    value={it.unitPrice}
                    onChange={(e) =>
                      updateItem(it.id, { unitPrice: clampNum(e.target.value) })
                    }
                  />
                  <span className="amount">{money(lineTotal(it))}</span>
                  <button
                    className="btn btn--danger btn--sm"
                    title="Remove item"
                    aria-label="Remove item"
                    onClick={() => removeItem(it.id)}
                  >
                    <TrashIcon className="btn-icon" />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn--sm" style={{ marginTop: 6 }} onClick={addItem}>
              <PlusIcon className="btn-icon" /> Add item
            </button>
          </div>

          {/* Adjustments + totals */}
          <div className="card">
            <div className="card__title">Summary</div>
            <div className="grid-3">
              <Field label="Discount type">
                <select
                  className="select"
                  value={draft.discountType}
                  onChange={(e) =>
                    set('discountType', e.target.value as Invoice['discountType'])
                  }
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </Field>
              <Field label="Discount value">
                <input
                  className="input num-input"
                  type="number"
                  min={0}
                  step="any"
                  value={draft.discountValue}
                  onChange={(e) => set('discountValue', clampNum(e.target.value))}
                />
              </Field>
              <Field label="Shipping">
                <input
                  className="input num-input"
                  type="number"
                  min={0}
                  step="any"
                  value={draft.shipping}
                  onChange={(e) => set('shipping', clampNum(e.target.value))}
                />
              </Field>
              <Field label="Tax label">
                <input
                  className="input"
                  value={draft.taxLabel}
                  onChange={(e) => set('taxLabel', e.target.value)}
                />
              </Field>
              <Field label="Tax rate (%)">
                <input
                  className="input num-input"
                  type="number"
                  min={0}
                  step="any"
                  value={draft.taxRate}
                  onChange={(e) => set('taxRate', clampNum(e.target.value))}
                />
              </Field>
            </div>

            <div className="divider" />
            <div className="totals-line">
              <span className="muted">Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 ? (
              <div className="totals-line">
                <span className="muted">Discount</span>
                <span>−{money(totals.discountAmount)}</span>
              </div>
            ) : null}
            {totals.taxAmount > 0 ? (
              <div className="totals-line">
                <span className="muted">
                  {draft.taxLabel || 'Tax'} ({draft.taxRate}%)
                </span>
                <span>{money(totals.taxAmount)}</span>
              </div>
            ) : null}
            {totals.shipping > 0 ? (
              <div className="totals-line">
                <span className="muted">Shipping</span>
                <span>{money(totals.shipping)}</span>
              </div>
            ) : null}
            <div className="totals-line totals-line--grand">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="card__title">Notes &amp; terms</div>
            <Field label="Notes">
              <textarea
                className="textarea"
                value={draft.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
            <Field label="Terms">
              <textarea
                className="textarea"
                value={draft.terms}
                onChange={(e) => set('terms', e.target.value)}
              />
            </Field>
          </div>

          <div className="sticky-actions">
            <button className="btn btn--primary" onClick={() => save()}>
              <SaveIcon className="btn-icon" /> Save
            </button>
            <button className="btn" onClick={() => save({ download: true })}>
              <DownloadIcon className="btn-icon" /> Save &amp; download PDF
            </button>
            {mode === 'edit' ? (
              <>
                <button
                  className="btn btn--ghost"
                  onClick={() => navigate(`/invoice/new?from=${draft.id}`)}
                >
                  <CopyIcon className="btn-icon" /> Duplicate
                </button>
                <span className="nav-spacer" />
                <button className="btn btn--danger" onClick={onDelete}>
                  <TrashIcon className="btn-icon" /> Delete
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="editor__preview">
          <div className="preview-shell">
            <div className="preview-scale">
              <InvoicePreview invoice={draft} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function clampNum(value: string): number {
  const n = parseFloat(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** structuredClone with a JSON fallback for older runtimes. */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
