import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { EditableArea, EditableNumber, EditableText } from '../components/Editable'
import { downloadInvoicePdf } from '../pdf/download'
import { computeTotals, lineTotal } from '../lib/calc'
import { formatCurrency } from '../lib/format'
import {
  createCompany,
  createInvoiceForCompany,
  duplicateInvoice,
  emptyLineItem,
  snapshotOf,
  suggestedNumber,
} from '../lib/factory'
import { CURRENCIES } from '../lib/currencies'
import {
  CopyIcon,
  DownloadIcon,
  PlusIcon,
  SaveIcon,
  TrashIcon,
} from '../components/icons'
import type { Company, Invoice, InvoiceStatus, LineItem } from '../types'

type Mode = 'new' | 'edit' | 'missing'
const NEW_COMPANY = '__new__'
const MAX_LOGO_BYTES = 1024 * 1024
const OK_LOGO_TYPES = ['image/png', 'image/jpeg']

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const fromId = sp.get('from')
  const navigate = useNavigate()

  const {
    companies,
    getInvoice,
    getCompany,
    addCompany,
    updateCompany,
    saveInvoice,
    deleteInvoice,
    bumpCompanyNumber,
  } = useStore()

  const [draft, setDraft] = useState<Invoice | null>(null)
  const [mode, setMode] = useState<Mode>('new')
  const isNewRef = useRef(true)
  const [toast, setToast] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [showShipping, setShowShipping] = useState(false)
  const [logoError, setLogoError] = useState('')

  // Build the working draft from the route. Only re-runs on route change.
  useEffect(() => {
    let next: Invoice | null = null
    let m: Mode = 'new'
    if (id && id !== 'new') {
      const existing = getInvoice(id)
      if (existing) {
        next = structuredCloneSafe(existing)
        m = 'edit'
        isNewRef.current = false
      } else {
        m = 'missing'
      }
    } else if (fromId && getInvoice(fromId)) {
      const src = getInvoice(fromId)!
      next = duplicateInvoice(src, getCompany(src.companyId))
      isNewRef.current = true
    } else {
      // Fresh invoice. Guarantee a company exists (default "Personal").
      let company: Company | undefined = companies[0]
      if (!company) {
        company = createCompany({ name: 'Personal' })
        addCompany(company)
      }
      next = createInvoiceForCompany(company)
      isNewRef.current = true
    }
    setDraft(next)
    setMode(m)
    if (next) {
      setShowDiscount(next.discountValue > 0)
      setShowShipping(next.shipping > 0)
    }
    setLogoError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fromId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // ---- mutators ----
  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))
  const setClient = (key: keyof Invoice['client'], value: string) =>
    setDraft((d) => (d ? { ...d, client: { ...d.client, [key]: value } } : d))

  // Edit the header on the invoice (live snapshot)…
  const setCompanyField = (key: keyof Invoice['company'], value: string | undefined) =>
    setDraft((d) => (d ? { ...d, company: { ...d.company, [key]: value } } : d))
  // …and remember it on the company profile so the next invoice is pre-filled.
  const commitCompanyField = (key: keyof Company, value: string | undefined) => {
    if (!draft) return
    const profile = getCompany(draft.companyId)
    if (profile) updateCompany({ ...profile, [key]: value })
  }

  const changeCompany = (companyId: string) => {
    if (companyId === NEW_COMPANY) {
      const c = createCompany({ name: 'New company' })
      addCompany(c)
      applyCompany(c)
      return
    }
    const c = getCompany(companyId)
    if (c) applyCompany(c)
  }
  const applyCompany = (c: Company) => {
    setDraft((d) => {
      if (!d) return d
      const base = { ...d, companyId: c.id, company: snapshotOf(c) }
      if (isNewRef.current) {
        return {
          ...base,
          currency: c.defaultCurrency || d.currency,
          number: suggestedNumber(c),
          taxRate: c.defaultTaxRate,
          taxLabel: c.defaultTaxLabel || 'Tax',
          notes: d.notes || c.defaultNotes,
          terms: d.terms || c.defaultTerms,
        }
      }
      return base
    })
  }

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!OK_LOGO_TYPES.includes(file.type)) {
      setLogoError('Please choose a PNG or JPG image.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('That image is over 1 MB. Please pick a smaller one.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setLogoError('')
      setCompanyField('logo', url)
      commitCompanyField('logo', url)
    }
    reader.onerror = () => setLogoError('Could not read that file.')
    reader.readAsDataURL(file)
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
    if (opts?.download) {
      setToast('Saved · preparing PDF…')
      downloadInvoicePdf(toSave)
        .then(() => setToast('Saved · PDF downloaded'))
        .catch(() => setToast('Saved · could not generate PDF'))
    } else {
      setToast('Saved')
    }
    if (id !== toSave.id) navigate(`/invoice/${toSave.id}`, { replace: true })
  }

  const download = () => {
    if (!draft) return
    setToast('Preparing PDF…')
    downloadInvoicePdf(draft)
      .then(() => setToast('PDF downloaded'))
      .catch(() => setToast('Could not generate PDF'))
  }

  const onDelete = () => {
    if (!draft) return
    if (window.confirm(`Delete invoice ${draft.number}? This cannot be undone.`)) {
      deleteInvoice(draft.id)
      navigate('/history')
    }
  }

  if (mode === 'missing') {
    return (
      <div className="empty">
        <h2>Invoice not found</h2>
        <p>It may have been deleted.</p>
        <div style={{ marginTop: 16 }}>
          <Link to="/history" className="btn btn--primary">
            Back to history
          </Link>
        </div>
      </div>
    )
  }
  if (!draft) return null

  const totals = computeTotals(draft)
  const money = (n: number) => formatCurrency(n, draft.currency)
  const c = draft.company

  return (
    <div className="editor-page">
      <div className="doc-toolbar">
        <label className="doc-toolbar__field">
          <span>Company</span>
          <select
            className="select"
            value={draft.companyId}
            onChange={(e) => changeCompany(e.target.value)}
            aria-label="Company for this invoice"
          >
            {companies.map((co) => (
              <option key={co.id} value={co.id}>
                {co.name || 'Untitled company'}
              </option>
            ))}
            <option value={NEW_COMPANY}>+ New company…</option>
          </select>
        </label>
        <label className="doc-toolbar__field">
          <span>Currency</span>
          <select
            className="select"
            value={draft.currency}
            onChange={(e) => set('currency', e.target.value)}
            aria-label="Currency"
          >
            {CURRENCIES.map((cur) => (
              <option key={cur.code} value={cur.code}>
                {cur.code} — {cur.name}
              </option>
            ))}
          </select>
        </label>
        <label className="doc-toolbar__field">
          <span>Status</span>
          <select
            className="select"
            value={draft.status}
            onChange={(e) => set('status', e.target.value as InvoiceStatus)}
            aria-label="Status"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </select>
        </label>

        <span className="nav-spacer" />
        {toast ? <span className="tag">{toast}</span> : null}
        <button className="btn btn--primary" onClick={() => save()}>
          <SaveIcon className="btn-icon" /> Save
        </button>
        <button className="btn" onClick={download} title="Download PDF">
          <DownloadIcon className="btn-icon" /> PDF
        </button>
        {mode === 'edit' ? (
          <>
            <button
              className="btn btn--ghost"
              title="Duplicate as a new invoice"
              onClick={() => navigate(`/invoice/new?from=${draft.id}`)}
            >
              <CopyIcon className="btn-icon" />
            </button>
            <button className="btn btn--danger" title="Delete invoice" onClick={onDelete}>
              <TrashIcon className="btn-icon" />
            </button>
          </>
        ) : null}
      </div>

      <div className="paper paper--edit">
        {/* Header */}
        <div className="paper__top">
          <div className="paper__brand">
            <label className={`logo-slot ${c.logo ? 'logo-slot--has' : ''}`}>
              {c.logo ? (
                <img src={c.logo} alt="Company logo" />
              ) : (
                <span className="logo-slot__hint">+ Your logo</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only-input"
                onChange={onLogo}
                aria-label="Upload company logo"
              />
            </label>
            {c.logo ? (
              <button
                type="button"
                className="logo-remove"
                onClick={() => {
                  setCompanyField('logo', undefined)
                  commitCompanyField('logo', undefined)
                }}
              >
                Remove logo
              </button>
            ) : null}
            {logoError ? <div className="danger-text logo-err">{logoError}</div> : null}

            <EditableText
              className="paper__company-name"
              value={c.name}
              placeholder="Your Company"
              ariaLabel="Company name"
              onChange={(v) => setCompanyField('name', v)}
              onCommit={(v) => commitCompanyField('name', v)}
            />
            <EditableArea
              className="paper__muted paper__sender"
              value={c.address}
              placeholder={'Your address\nEmail · phone · tax ID'}
              ariaLabel="Your address and contact details"
              onChange={(v) => setCompanyField('address', v)}
              onCommit={(v) => commitCompanyField('address', v)}
            />
          </div>

          <div className="paper__title">
            <h1>INVOICE</h1>
            <div className="paper__meta-grid">
              <span className="label">Invoice #</span>
              <EditableText
                className="paper__meta-val"
                value={draft.number}
                placeholder="INV-0001"
                ariaLabel="Invoice number"
                onChange={(v) => set('number', v)}
              />
              <span className="label">Issued</span>
              <input
                type="date"
                className="paper__date"
                value={draft.issueDate}
                aria-label="Issue date"
                onChange={(e) => set('issueDate', e.target.value)}
              />
              <span className="label">Due</span>
              <input
                type="date"
                className="paper__date"
                value={draft.dueDate}
                aria-label="Due date"
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className="paper__parties">
          <div className="paper__party">
            <h3>Bill To</h3>
            <EditableText
              className="paper__client-name"
              value={draft.client.name}
              placeholder="Client name"
              ariaLabel="Client name"
              onChange={(v) => setClient('name', v)}
            />
            <EditableArea
              className="paper__muted"
              value={draft.client.address}
              placeholder={'Client address\nEmail · phone'}
              ariaLabel="Client address and contact"
              onChange={(v) => setClient('address', v)}
            />
          </div>
        </div>

        {/* Items */}
        <div className="paper__items">
          <div className="paper__items-head">
            <span>Description</span>
            <span className="r">Qty</span>
            <span className="r">Rate</span>
            <span className="r">Amount</span>
            <span />
          </div>
          {draft.items.map((it) => (
            <div className="paper__items-row" key={it.id}>
              <EditableText
                value={it.description}
                placeholder="Item description"
                ariaLabel="Item description"
                onChange={(v) => updateItem(it.id, { description: v })}
              />
              <EditableNumber
                className="r"
                value={it.quantity}
                ariaLabel="Quantity"
                onChange={(n) => updateItem(it.id, { quantity: n })}
              />
              <EditableNumber
                className="r"
                value={it.unitPrice}
                ariaLabel="Unit price"
                onChange={(n) => updateItem(it.id, { unitPrice: n })}
              />
              <span className="r amount">{money(lineTotal(it))}</span>
              <button
                type="button"
                className="row-remove"
                title="Remove item"
                aria-label="Remove item"
                onClick={() => removeItem(it.id)}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="add-item" onClick={addItem}>
            <PlusIcon className="btn-icon" /> Add item
          </button>
        </div>

        {/* Totals */}
        <div className="paper__totals">
          <div className="paper__totals-box">
            <div className="paper__totals-line">
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>

            {showDiscount ? (
              <div className="paper__totals-line adj">
                <span className="adj-label">
                  <select
                    className="mini-select"
                    value={draft.discountType}
                    aria-label="Discount type"
                    onChange={(e) =>
                      set('discountType', e.target.value as Invoice['discountType'])
                    }
                  >
                    <option value="percent">Discount %</option>
                    <option value="fixed">Discount (fixed)</option>
                  </select>
                  <EditableNumber
                    className="adj-input"
                    value={draft.discountValue}
                    ariaLabel="Discount value"
                    onChange={(n) => set('discountValue', n)}
                  />
                </span>
                <span>−{money(totals.discountAmount)}</span>
              </div>
            ) : null}

            <div className="paper__totals-line adj">
              <span className="adj-label">
                <EditableText
                  className="adj-tax-label"
                  value={draft.taxLabel}
                  placeholder="Tax"
                  ariaLabel="Tax label"
                  onChange={(v) => set('taxLabel', v)}
                />
                <EditableNumber
                  className="adj-input"
                  value={draft.taxRate}
                  ariaLabel="Tax rate percent"
                  onChange={(n) => set('taxRate', n)}
                />
                <span className="adj-suffix">%</span>
              </span>
              <span>{money(totals.taxAmount)}</span>
            </div>

            {showShipping ? (
              <div className="paper__totals-line adj">
                <span className="adj-label">Shipping</span>
                <EditableNumber
                  className="adj-input"
                  value={draft.shipping}
                  ariaLabel="Shipping amount"
                  onChange={(n) => set('shipping', n)}
                />
              </div>
            ) : null}

            <div className="paper__totals-line grand">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>

            <div className="totals-adders">
              {!showDiscount ? (
                <button type="button" onClick={() => setShowDiscount(true)}>
                  + Discount
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscount(false)
                    set('discountValue', 0)
                  }}
                >
                  − Discount
                </button>
              )}
              {!showShipping ? (
                <button type="button" onClick={() => setShowShipping(true)}>
                  + Shipping
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowShipping(false)
                    set('shipping', 0)
                  }}
                >
                  − Shipping
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="paper__notes">
          <div className="block">
            <h3>Notes</h3>
            <EditableArea
              className="paper__muted"
              value={draft.notes}
              placeholder="Notes to the client (optional)"
              ariaLabel="Notes"
              onChange={(v) => set('notes', v)}
            />
          </div>
          <div className="block">
            <h3>Terms</h3>
            <EditableArea
              className="paper__muted"
              value={draft.terms}
              placeholder="Payment terms (optional)"
              ariaLabel="Terms"
              onChange={(v) => set('terms', v)}
            />
          </div>
          <div className="block">
            <h3>Payment details</h3>
            <EditableArea
              className="paper__muted"
              value={c.bankDetails}
              placeholder="Bank / payment details (optional)"
              ariaLabel="Payment details"
              onChange={(v) => setCompanyField('bankDetails', v)}
              onCommit={(v) => commitCompanyField('bankDetails', v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/** structuredClone with a JSON fallback for older runtimes. */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
