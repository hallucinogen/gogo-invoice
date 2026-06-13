import {
  APP_DATA_VERSION,
  companySchema,
  invoiceSchema,
  settingsSchema,
  type AppData,
  type Company,
  type Invoice,
} from '../types'
import { createCompany } from '../lib/factory'

export const STORAGE_KEY = 'gogo-invoice:v1'

/** A fresh workspace always has a ready-to-use "Personal" company. */
export function defaultData(): AppData {
  return {
    version: APP_DATA_VERSION,
    companies: [createCompany({ name: 'Personal' })],
    invoices: [],
    settings: { theme: 'system' },
  }
}

/** A seam for future breaking schema changes. No-op today. */
function migrate(json: unknown): unknown {
  if (!json || typeof json !== 'object') return json
  // const v = (json as { version?: number }).version ?? 0
  // switch (v) { case 1: ...transform... }
  return json
}

/**
 * Validate companies and invoices element-by-element so a single malformed
 * record can never discard the whole workspace. Returns whatever is valid plus
 * a count of dropped records.
 */
function coerce(json: unknown): { data: AppData; dropped: number } {
  if (!json || typeof json !== 'object') {
    return { data: { ...emptyData() }, dropped: 0 }
  }
  const obj = json as Record<string, unknown>
  const companies: Company[] = []
  const invoices: Invoice[] = []
  let dropped = 0

  if (Array.isArray(obj.companies)) {
    for (const c of obj.companies) {
      const r = companySchema.safeParse(c)
      if (r.success) companies.push(r.data)
      else dropped++
    }
  }
  if (Array.isArray(obj.invoices)) {
    for (const i of obj.invoices) {
      const r = invoiceSchema.safeParse(i)
      if (r.success) invoices.push(r.data)
      else dropped++
    }
  }
  const settings = settingsSchema.safeParse(obj.settings)
  const version = typeof obj.version === 'number' ? obj.version : APP_DATA_VERSION

  return {
    data: {
      version,
      companies,
      invoices,
      settings: settings.success ? settings.data : { theme: 'system' },
    },
    dropped,
  }
}

function emptyData(): AppData {
  return {
    version: APP_DATA_VERSION,
    companies: [],
    invoices: [],
    settings: { theme: 'system' },
  }
}

/** Load and validate persisted data, salvaging as much as possible. */
export function loadData(): AppData {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    const { data, dropped } = coerce(migrate(JSON.parse(raw)))
    if (dropped > 0) {
      console.warn(`Skipped ${dropped} invalid record(s) while loading.`)
      preserve(raw)
    }
    // Never strand the user with zero companies.
    if (data.companies.length === 0) {
      data.companies = [createCompany({ name: 'Personal' })]
    }
    return data
  } catch (err) {
    console.warn('Could not read stored data; starting fresh.', err)
    if (raw) preserve(raw)
    return defaultData()
  }
}

/** Stash the original bytes before falling back, so nothing is silently lost. */
function preserve(raw: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:corrupt-${Date.now()}`, raw)
  } catch (err) {
    console.error('Could not preserve a backup of the unreadable data.', err)
  }
}

/** Persist data. Returns false if the write failed (e.g. storage full). */
export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (err) {
    console.error('Could not save data — local storage may be full.', err)
    return false
  }
}

/**
 * Validate an imported backup, salvaging valid records. Throws only when the
 * file is not valid JSON / not an object. Returns the data plus a dropped count.
 */
export function parseBackup(json: string): { data: AppData; dropped: number } {
  const parsed = migrate(JSON.parse(json))
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Not a valid backup file')
  }
  return coerce(parsed)
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ ...data, version: APP_DATA_VERSION }, null, 2)
}
