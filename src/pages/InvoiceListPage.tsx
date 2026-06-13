import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { computeTotals } from '../lib/calc'
import { formatCurrency, formatDate } from '../lib/format'
import { downloadInvoicePdf } from '../pdf/download'
import {
  CopyIcon,
  DownloadIcon,
  EditIcon,
  FileIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons'
import type { Invoice, InvoiceStatus } from '../types'

const STATUS_ORDER: InvoiceStatus[] = ['draft', 'sent', 'paid']

export default function InvoiceListPage() {
  const { invoices, companies, deleteInvoice, saveInvoice } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [notice, setNotice] = useState('')

  const cycleStatus = (inv: Invoice) => {
    const next =
      STATUS_ORDER[(STATUS_ORDER.indexOf(inv.status) + 1) % STATUS_ORDER.length]
    saveInvoice({ ...inv, status: next, updatedAt: new Date().toISOString() })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices
      .filter((inv) => companyFilter === 'all' || inv.companyId === companyFilter)
      .filter((inv) => {
        if (!q) return true
        return (
          inv.number.toLowerCase().includes(q) ||
          inv.client.name.toLowerCase().includes(q) ||
          inv.company.name.toLowerCase().includes(q)
        )
      })
      .slice()
      .sort((a, b) =>
        a.issueDate < b.issueDate ? 1 : a.issueDate > b.issueDate ? -1 : 0,
      )
  }, [invoices, query, companyFilter])

  const onDelete = (inv: Invoice) => {
    if (window.confirm(`Delete invoice ${inv.number}? This cannot be undone.`)) {
      deleteInvoice(inv.id)
    }
  }

  const onDownload = (inv: Invoice) => {
    setNotice('Preparing PDF…')
    downloadInvoicePdf(inv)
      .then(() => setNotice(''))
      .catch(() => setNotice('Could not generate PDF.'))
  }

  return (
    <div>
      <div className="page-head">
        <h1>History</h1>
        <span className="nav-spacer" />
        {notice ? <span className="tag">{notice}</span> : null}
        <Link to="/" className="btn btn--primary">
          <PlusIcon className="btn-icon" /> New invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="empty">
          <FileIcon className="empty-icon" />
          <h2>No saved invoices yet</h2>
          <p>
            Fill in an invoice and hit Save — it shows up here so you can revisit or copy
            it.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link to="/" className="btn btn--primary">
              <PlusIcon className="btn-icon" /> Create an invoice
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="filters">
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <SearchIcon
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-faint)',
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Search number, client or company…"
                aria-label="Search invoices"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {companies.length > 1 ? (
              <select
                className="select"
                aria-label="Filter by company"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="all">All companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || 'Untitled company'}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <p className="muted">No invoices match your search.</p>
          ) : (
            <div className="list">
              {filtered.map((inv) => {
                const total = computeTotals(inv).total
                return (
                  <div className="invoice-row" key={inv.id}>
                    <button
                      type="button"
                      className={`badge badge--${inv.status} badge-button`}
                      title="Click to change status (Draft → Sent → Paid)"
                      aria-label={`Status: ${inv.status}. Click to change.`}
                      onClick={() => cycleStatus(inv)}
                    >
                      {inv.status}
                    </button>
                    <div className="invoice-row__meta">
                      <Link to={`/invoice/${inv.id}`} className="invoice-row__num">
                        {inv.number || 'No number'}
                      </Link>
                      <div className="invoice-row__client">
                        {inv.client.name || 'No client'}
                      </div>
                      <div className="invoice-row__company">{inv.company.name}</div>
                    </div>
                    <div className="invoice-row__money">
                      <div className="invoice-row__total">
                        {formatCurrency(total, inv.currency)}
                      </div>
                      <div className="invoice-row__date">{formatDate(inv.issueDate)}</div>
                    </div>
                    <div className="invoice-row__actions">
                      <button
                        className="btn btn--ghost btn--sm"
                        title="Edit"
                        aria-label={`Edit ${inv.number}`}
                        onClick={() => navigate(`/invoice/${inv.id}`)}
                      >
                        <EditIcon className="btn-icon" />
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        title="Duplicate as new invoice"
                        aria-label={`Duplicate ${inv.number}`}
                        onClick={() => navigate(`/invoice/new?from=${inv.id}`)}
                      >
                        <CopyIcon className="btn-icon" />
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        title="Download PDF"
                        aria-label={`Download PDF for ${inv.number}`}
                        onClick={() => onDownload(inv)}
                      >
                        <DownloadIcon className="btn-icon" />
                      </button>
                      <button
                        className="btn btn--danger btn--sm"
                        title="Delete"
                        aria-label={`Delete ${inv.number}`}
                        onClick={() => onDelete(inv)}
                      >
                        <TrashIcon className="btn-icon" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
