import { useState, type ChangeEvent } from 'react'
import { useStore } from '../store/AppStore'
import { parseBackup, serializeBackup } from '../store/persistence'
import { DownloadIcon, UploadIcon, TrashIcon, DatabaseIcon } from '../components/icons'

type Msg = { kind: 'ok' | 'err'; text: string } | null

export default function DataPage() {
  const { data, companies, invoices, replaceData, clearAll } = useStore()
  const [msg, setMsg] = useState<Msg>(null)

  const exportBackup = async () => {
    const json = serializeBackup(data)
    const blob = new Blob([json], { type: 'application/json' })
    const date = new Date().toISOString().slice(0, 10)
    const { saveAs } = await import('file-saver')
    saveAs(blob, `gogo-invoice-backup-${date}.json`)
    setMsg({ kind: 'ok', text: 'Backup downloaded.' })
  }

  const importBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const { data: next, dropped } = parseBackup(String(reader.result))
        const droppedNote =
          dropped > 0 ? ` (${dropped} unreadable record(s) skipped)` : ''
        const ok = window.confirm(
          `Restore ${next.companies.length} company(ies) and ${next.invoices.length} invoice(s)${droppedNote}? ` +
            'This replaces everything currently stored on this device.',
        )
        if (ok) {
          replaceData(next)
          setMsg({ kind: 'ok', text: `Backup restored successfully.${droppedNote}` })
        }
      } catch {
        setMsg({ kind: 'err', text: 'That file is not a valid Gogo Invoice backup.' })
      }
    }
    reader.onerror = () => setMsg({ kind: 'err', text: 'Could not read that file.' })
    reader.readAsText(file)
  }

  const wipe = () => {
    if (
      window.confirm(
        'Delete ALL companies and invoices from this device? Export a backup first if you might need them. This cannot be undone.',
      )
    ) {
      clearAll()
      setMsg({ kind: 'ok', text: 'All local data cleared.' })
    }
  }

  const bytes = new Blob([serializeBackup(data)]).size
  const sizeLabel = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`

  return (
    <div>
      <div className="page-head">
        <h1>Backup &amp; data</h1>
      </div>

      <div className="note-banner" style={{ marginBottom: 18 }}>
        Gogo Invoice has no server. Everything lives in this browser's local storage on
        this device. Export a backup regularly — and to move your data to another browser
        or computer, export here and import there.
      </div>

      {msg ? (
        <div
          className={`note-banner ${msg.kind === 'err' ? 'danger-banner' : ''}`}
          style={{ marginBottom: 18 }}
          role="status"
        >
          {msg.text}
        </div>
      ) : null}

      <div className="card">
        <div className="card__title">Stored on this device</div>
        <div className="row" style={{ gap: 28 }}>
          <Stat icon label="Companies" value={companies.length} />
          <Stat label="Invoices" value={invoices.length} />
          <Stat label="Backup size" value={sizeLabel} />
        </div>
      </div>

      <div className="card">
        <div className="card__title">Export</div>
        <p className="muted" style={{ marginTop: -6 }}>
          Download a single JSON file containing every company and invoice. Keep it safe —
          it is your full backup.
        </p>
        <button className="btn btn--primary" onClick={exportBackup}>
          <DownloadIcon className="btn-icon" /> Export backup (.json)
        </button>
      </div>

      <div className="card">
        <div className="card__title">Import / restore</div>
        <p className="muted" style={{ marginTop: -6 }}>
          Load a previously exported backup. This replaces the data currently on this
          device.
        </p>
        <label className="btn">
          <UploadIcon className="btn-icon" /> Choose backup file…
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only-input"
            onChange={importBackup}
          />
        </label>
      </div>

      <div className="card">
        <div className="card__title danger-text">Danger zone</div>
        <p className="muted" style={{ marginTop: -6 }}>
          Permanently remove all companies and invoices from this device.
        </p>
        <button className="btn btn--danger" onClick={wipe}>
          <TrashIcon className="btn-icon" /> Clear all local data
        </button>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string
  icon?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon ? <DatabaseIcon style={{ color: 'var(--primary)' }} /> : null}
      <div>
        <div
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
        <div className="muted" style={{ fontSize: '0.8rem' }}>
          {label}
        </div>
      </div>
    </div>
  )
}
