import { APP_DATA_VERSION, appDataSchema, type AppData } from '../types'

export const STORAGE_KEY = 'gogo-invoice:v1'

export function defaultData(): AppData {
  return {
    version: APP_DATA_VERSION,
    companies: [],
    invoices: [],
    settings: { theme: 'system' },
  }
}

/** Load and validate persisted data, falling back to an empty workspace. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    const parsed = appDataSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
    console.warn('Stored data failed validation; starting fresh.', parsed.error)
    return defaultData()
  } catch (err) {
    console.warn('Could not read stored data; starting fresh.', err)
    return defaultData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    // Most likely the storage quota was exceeded (e.g. large logos).
    console.error('Could not save data — local storage may be full.', err)
  }
}

/** Validate an imported backup file. Throws if the shape is invalid. */
export function parseBackup(json: string): AppData {
  return appDataSchema.parse(JSON.parse(json))
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ ...data, version: APP_DATA_VERSION }, null, 2)
}
