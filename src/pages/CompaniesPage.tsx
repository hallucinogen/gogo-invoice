import { useState, type ChangeEvent } from 'react'
import { useStore } from '../store/AppStore'
import { Field } from '../components/Field'
import { EditableNumber } from '../components/Editable'
import { BuildingIcon, PlusIcon, TrashIcon, EditIcon } from '../components/icons'
import { CURRENCIES } from '../lib/currencies'
import { createCompany, suggestedNumber } from '../lib/factory'
import type { Company } from '../types'

const MAX_LOGO_BYTES = 1024 * 1024
const OK_LOGO_TYPES = ['image/png', 'image/jpeg']

export default function CompaniesPage() {
  const { companies, addCompany, updateCompany, deleteCompany, invoices } = useStore()
  const [draft, setDraft] = useState<Company | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [logoError, setLogoError] = useState('')

  const startNew = () => {
    setDraft(createCompany())
    setIsNew(true)
    setLogoError('')
  }
  const startEdit = (c: Company) => {
    setDraft({ ...c })
    setIsNew(false)
    setLogoError('')
  }
  const cancel = () => {
    setDraft(null)
    setLogoError('')
  }

  const set = <K extends keyof Company>(key: K, value: Company[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

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
      setLogoError('')
      set('logo', String(reader.result))
    }
    reader.onerror = () => setLogoError('Could not read that file.')
    reader.readAsDataURL(file)
  }

  const save = () => {
    if (!draft) return
    const cleaned: Company = { ...draft, name: draft.name.trim() }
    if (isNew) addCompany(cleaned)
    else updateCompany(cleaned)
    setDraft(null)
  }

  const remove = (c: Company) => {
    const count = invoices.filter((i) => i.companyId === c.id).length
    const msg = count
      ? `Delete "${c.name || 'this company'}"? Its ${count} saved invoice(s) keep their copy of the header and are not affected.`
      : `Delete "${c.name || 'this company'}"?`
    if (window.confirm(msg)) deleteCompany(c.id)
  }

  return (
    <div>
      <div className="page-head">
        <h1>Companies</h1>
        <span className="nav-spacer" />
        {!draft && (
          <button className="btn btn--primary" onClick={startNew}>
            <PlusIcon className="btn-icon" /> Add company
          </button>
        )}
      </div>

      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        A company is a reusable invoice header. Only the <strong>name</strong> is required
        — everything else is optional. You can also edit these details directly on the
        invoice.
      </p>

      {draft && (
        <div className="card">
          <div className="card__title">{isNew ? 'New company' : 'Edit company'}</div>

          <Field label="Company name (required)">
            <input
              className="input"
              value={draft.name}
              autoFocus
              placeholder="e.g. Personal, Acme Studio Ltd."
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>

          <Field
            label="Address & contact"
            hint="Free text — shows under your name on the invoice."
          >
            <textarea
              className="textarea"
              value={draft.address}
              placeholder={'123 Market Street\nSan Francisco, CA\nbilling@acme.com'}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>

          <div className="grid-2">
            <Field label="Logo (optional)" hint="PNG or JPG, up to 1 MB.">
              <div className="logo-uploader">
                {draft.logo ? <img src={draft.logo} alt="Logo preview" /> : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label className="btn btn--sm">
                    {draft.logo ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only-input"
                      onChange={onLogo}
                      aria-label="Upload logo"
                    />
                  </label>
                  {draft.logo ? (
                    <button
                      className="btn btn--sm btn--danger"
                      onClick={() => set('logo', undefined)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>
            <Field
              label="Payment details (optional)"
              hint="Bank / transfer info for the footer."
            >
              <textarea
                className="textarea"
                value={draft.bankDetails}
                placeholder={'Bank: Example Bank\nAccount: 1234567890'}
                onChange={(e) => set('bankDetails', e.target.value)}
              />
            </Field>
          </div>
          {logoError ? <p className="danger-text">{logoError}</p> : null}

          <details className="advanced">
            <summary>Advanced — numbering &amp; defaults</summary>
            <div className="grid-3" style={{ marginTop: 14 }}>
              <Field label="Number prefix" hint={`e.g. ${suggestedNumber(draft)}`}>
                <input
                  className="input"
                  value={draft.invoicePrefix}
                  onChange={(e) => set('invoicePrefix', e.target.value)}
                />
              </Field>
              <Field label="Next number">
                <EditableNumber
                  baseClass="input"
                  integer
                  value={draft.nextNumber}
                  ariaLabel="Next number"
                  onChange={(n) => set('nextNumber', n)}
                />
              </Field>
              <Field label="Digits" hint="Zero-padding">
                <EditableNumber
                  baseClass="input"
                  integer
                  max={10}
                  value={draft.numberPadding}
                  ariaLabel="Number of digits"
                  onChange={(n) => set('numberPadding', n)}
                />
              </Field>
              <Field label="Default currency">
                <select
                  className="select"
                  value={draft.defaultCurrency}
                  onChange={(e) => set('defaultCurrency', e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tax label">
                <input
                  className="input"
                  value={draft.defaultTaxLabel}
                  placeholder="Tax / VAT / PPN"
                  onChange={(e) => set('defaultTaxLabel', e.target.value)}
                />
              </Field>
              <Field label="Default tax %">
                <EditableNumber
                  baseClass="input"
                  value={draft.defaultTaxRate}
                  ariaLabel="Default tax percent"
                  onChange={(n) => set('defaultTaxRate', n)}
                />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Default notes">
                <textarea
                  className="textarea"
                  value={draft.defaultNotes}
                  placeholder="Thank you for your business!"
                  onChange={(e) => set('defaultNotes', e.target.value)}
                />
              </Field>
              <Field label="Default terms">
                <textarea
                  className="textarea"
                  value={draft.defaultTerms}
                  placeholder="Payment due within 14 days."
                  onChange={(e) => set('defaultTerms', e.target.value)}
                />
              </Field>
            </div>
          </details>

          <div className="toolbar" style={{ marginTop: 16 }}>
            <button
              className="btn btn--primary"
              onClick={save}
              disabled={!draft.name.trim()}
            >
              {isNew ? 'Add company' : 'Save changes'}
            </button>
            <button className="btn btn--ghost" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!draft && companies.length === 0 ? (
        <div className="empty">
          <BuildingIcon className="empty-icon" />
          <h2>No companies yet</h2>
          <p>
            Add your first company to start invoicing. You can add as many as you like.
          </p>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn--primary" onClick={startNew}>
              <PlusIcon className="btn-icon" /> Add company
            </button>
          </div>
        </div>
      ) : null}

      {!draft && companies.length > 0 ? (
        <div className="list">
          {companies.map((c) => {
            const count = invoices.filter((i) => i.companyId === c.id).length
            return (
              <div className="invoice-row" key={c.id}>
                {c.logo ? (
                  <img
                    src={c.logo}
                    alt=""
                    style={{
                      width: 44,
                      height: 44,
                      objectFit: 'contain',
                      borderRadius: 8,
                      background: '#fff',
                      border: '1px solid var(--border)',
                      padding: 3,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 8,
                      background: 'var(--primary-soft)',
                      color: 'var(--primary)',
                    }}
                  >
                    <BuildingIcon />
                  </span>
                )}
                <div className="invoice-row__meta">
                  <div className="invoice-row__num">{c.name || 'Untitled company'}</div>
                  <div className="invoice-row__client">
                    Next: {suggestedNumber(c)} · {c.defaultCurrency}
                  </div>
                  <div className="invoice-row__company">
                    {count} invoice{count === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="invoice-row__actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    title="Edit"
                    aria-label={`Edit ${c.name || 'company'}`}
                    onClick={() => startEdit(c)}
                  >
                    <EditIcon className="btn-icon" />
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    title="Delete"
                    aria-label={`Delete ${c.name || 'company'}`}
                    onClick={() => remove(c)}
                  >
                    <TrashIcon className="btn-icon" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
