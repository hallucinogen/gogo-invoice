import { useState, type ChangeEvent } from 'react'
import { useStore } from '../store/AppStore'
import { Field } from '../components/Field'
import { BuildingIcon, PlusIcon, TrashIcon, EditIcon } from '../components/icons'
import { CURRENCIES } from '../lib/currencies'
import { createCompany, suggestedNumber } from '../lib/factory'
import type { Company } from '../types'

const MAX_LOGO_BYTES = 1024 * 1024 // 1 MB — keeps localStorage healthy.

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
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file (PNG or JPG works best).')
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
        Each company is a reusable invoice header — sender details, logo, default currency
        and its own invoice-number series. Pick one per invoice.
      </p>

      {draft && (
        <div className="card">
          <div className="card__title">{isNew ? 'New company' : 'Edit company'}</div>

          <div className="grid-2">
            <Field label="Company name">
              <input
                className="input"
                value={draft.name}
                autoFocus
                placeholder="Acme Studio Ltd."
                onChange={(e) => set('name', e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={draft.email}
                placeholder="billing@acme.com"
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                value={draft.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </Field>
            <Field label="Website">
              <input
                className="input"
                value={draft.website}
                placeholder="acme.com"
                onChange={(e) => set('website', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Address">
            <textarea
              className="textarea"
              value={draft.address}
              placeholder={'123 Market Street\nSan Francisco, CA 94103'}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>

          <div className="grid-2">
            <Field label="Tax ID / VAT / NPWP">
              <input
                className="input"
                value={draft.taxId}
                onChange={(e) => set('taxId', e.target.value)}
              />
            </Field>
            <Field label="Logo" hint="PNG or JPG, up to 1 MB. Stored on your device.">
              <div className="logo-uploader">
                {draft.logo ? <img src={draft.logo} alt="Logo preview" /> : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label className="btn btn--sm">
                    {draft.logo ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/*" hidden onChange={onLogo} />
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
          </div>
          {logoError ? <p className="danger-text">{logoError}</p> : null}

          <Field label="Payment / bank details" hint="Shown in the invoice footer.">
            <textarea
              className="textarea"
              value={draft.bankDetails}
              placeholder={'Bank: Example Bank\nAccount: 1234567890\nSWIFT: EXMPL123'}
              onChange={(e) => set('bankDetails', e.target.value)}
            />
          </Field>

          <div className="divider" />
          <div className="card__title">Invoice defaults</div>

          <div className="grid-3">
            <Field label="Number prefix" hint={`e.g. ${suggestedNumber(draft)}`}>
              <input
                className="input"
                value={draft.invoicePrefix}
                onChange={(e) => set('invoicePrefix', e.target.value)}
              />
            </Field>
            <Field label="Next number">
              <input
                className="input"
                type="number"
                min={0}
                value={draft.nextNumber}
                onChange={(e) =>
                  set('nextNumber', Math.max(0, parseInt(e.target.value) || 0))
                }
              />
            </Field>
            <Field label="Digits" hint="Zero-padding">
              <input
                className="input"
                type="number"
                min={0}
                max={10}
                value={draft.numberPadding}
                onChange={(e) =>
                  set(
                    'numberPadding',
                    Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                  )
                }
              />
            </Field>
          </div>

          <div className="grid-3">
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
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={draft.defaultTaxRate}
                onChange={(e) =>
                  set('defaultTaxRate', Math.max(0, parseFloat(e.target.value) || 0))
                }
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

          <div className="toolbar" style={{ marginTop: 10 }}>
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
                    {c.email || 'No email'} · Next: {suggestedNumber(c)} ·{' '}
                    {c.defaultCurrency}
                  </div>
                  <div className="invoice-row__company">
                    {count} invoice{count === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="invoice-row__actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    title="Edit"
                    onClick={() => startEdit(c)}
                  >
                    <EditIcon className="btn-icon" />
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    title="Delete"
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
