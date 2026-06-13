import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppData, Company, Invoice, Theme } from '../types'
import { defaultData, loadData, parseBackup, saveData } from './persistence'
import { createCompany, createInvoiceForCompany } from '../lib/factory'
import { uid } from '../lib/id'

type Action =
  | { type: 'ADD_COMPANY'; company: Company }
  | { type: 'UPDATE_COMPANY'; company: Company }
  | { type: 'DELETE_COMPANY'; id: string }
  | { type: 'SAVE_INVOICE'; invoice: Invoice }
  | { type: 'DELETE_INVOICE'; id: string }
  | { type: 'BUMP_NUMBER'; companyId: string }
  | { type: 'SET_THEME'; theme: Theme }
  | { type: 'REPLACE_DATA'; data: AppData }
  | { type: 'CLEAR_ALL' }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'ADD_COMPANY':
      return { ...state, companies: [...state.companies, action.company] }
    case 'UPDATE_COMPANY':
      return {
        ...state,
        companies: state.companies.map((c) =>
          c.id === action.company.id ? action.company : c,
        ),
      }
    case 'DELETE_COMPANY':
      return { ...state, companies: state.companies.filter((c) => c.id !== action.id) }
    case 'SAVE_INVOICE': {
      const exists = state.invoices.some((i) => i.id === action.invoice.id)
      const invoices = exists
        ? state.invoices.map((i) => (i.id === action.invoice.id ? action.invoice : i))
        : [action.invoice, ...state.invoices]
      return { ...state, invoices }
    }
    case 'DELETE_INVOICE':
      return { ...state, invoices: state.invoices.filter((i) => i.id !== action.id) }
    case 'BUMP_NUMBER':
      return {
        ...state,
        companies: state.companies.map((c) =>
          c.id === action.companyId ? { ...c, nextNumber: c.nextNumber + 1 } : c,
        ),
      }
    case 'SET_THEME':
      return { ...state, settings: { ...state.settings, theme: action.theme } }
    case 'REPLACE_DATA':
      return action.data
    case 'CLEAR_ALL':
      return defaultData()
    default:
      return state
  }
}

export interface Store {
  data: AppData
  companies: Company[]
  invoices: Invoice[]
  theme: Theme
  saveError: boolean
  getCompany: (id: string) => Company | undefined
  getInvoice: (id: string) => Invoice | undefined
  addCompany: (company: Company) => void
  updateCompany: (company: Company) => void
  deleteCompany: (id: string) => void
  saveInvoice: (invoice: Invoice) => void
  deleteInvoice: (id: string) => void
  bumpCompanyNumber: (companyId: string) => void
  setTheme: (theme: Theme) => void
  replaceData: (data: AppData) => void
  clearAll: () => void
}

const StoreContext = createContext<Store | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData)
  const [saveError, setSaveError] = useState(false)
  const isInitialLoad = useRef(true)
  const dataRef = useRef(data)
  dataRef.current = data

  // Expose a small, stable automation API so agents (e.g. Claude Code via the
  // browser) can read and create invoices without driving the UI by hand.
  useEffect(() => {
    const api = {
      version: 1,
      help() {
        return [
          'window.gogoInvoice — automation API',
          'getData() · listCompanies() · listInvoices()',
          'createInvoice({ company, client, items:[{description,quantity,unitPrice}], number?, currency?, taxRate?, notes?, terms?, status? }) → saved invoice',
          'addCompany({ name, address?, country?, bankDetails?, ... }) → company',
          'importData(jsonOrObject) · exportData()',
        ].join('\n')
      },
      getData: () => dataRef.current,
      listCompanies: () => dataRef.current.companies,
      listInvoices: () => dataRef.current.invoices,
      addCompany(input: Partial<Company> = {}) {
        const company = createCompany(input)
        dispatch({ type: 'ADD_COMPANY', company })
        return company
      },
      createInvoice(input: Record<string, unknown> = {}) {
        const d = dataRef.current
        const companyId = typeof input.companyId === 'string' ? input.companyId : ''
        const companyName = typeof input.company === 'string' ? input.company : ''
        let company: Company | undefined =
          (companyId ? d.companies.find((c) => c.id === companyId) : undefined) ||
          (companyName
            ? d.companies.find((c) => c.name.toLowerCase() === companyName.toLowerCase())
            : undefined) ||
          d.companies[0]
        if (!company) {
          company = createCompany({ name: companyName || 'Personal' })
          dispatch({ type: 'ADD_COMPANY', company })
        }
        const base = createInvoiceForCompany(company)
        const itemsIn = Array.isArray(input.items) ? input.items : null
        const invoice: Invoice = {
          ...base,
          number: (input.number as string) ?? base.number,
          currency: (input.currency as string) ?? base.currency,
          status: (input.status as Invoice['status']) ?? base.status,
          issueDate: (input.issueDate as string) ?? base.issueDate,
          dueDate: (input.dueDate as string) ?? base.dueDate,
          client: { ...base.client, ...((input.client as object) || {}) },
          items: itemsIn
            ? itemsIn.map((it: Record<string, unknown>) => ({
                id: uid(),
                description: String(it.description ?? ''),
                quantity: Number(it.quantity ?? 1) || 0,
                unitPrice: Number(it.unitPrice ?? 0) || 0,
              }))
            : base.items,
          taxRate: Number(input.taxRate ?? base.taxRate) || 0,
          taxLabel: (input.taxLabel as string) ?? base.taxLabel,
          discountType:
            (input.discountType as Invoice['discountType']) ?? base.discountType,
          discountValue: Number(input.discountValue ?? base.discountValue) || 0,
          shipping: Number(input.shipping ?? base.shipping) || 0,
          notes: (input.notes as string) ?? base.notes,
          terms: (input.terms as string) ?? base.terms,
        }
        dispatch({ type: 'SAVE_INVOICE', invoice })
        return invoice
      },
      saveInvoice(invoice: Invoice) {
        dispatch({ type: 'SAVE_INVOICE', invoice })
        return invoice
      },
      importData(input: string | AppData) {
        const json = typeof input === 'string' ? input : JSON.stringify(input)
        const { data: next, dropped } = parseBackup(json)
        dispatch({ type: 'REPLACE_DATA', data: next })
        return { imported: true, dropped }
      },
      exportData: () => dataRef.current,
    }
    ;(window as unknown as { gogoInvoice: typeof api }).gogoInvoice = api
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on change — but skip the first run, which would just echo the data
  // we just loaded back to storage (twice under StrictMode).
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    setSaveError(!saveData(data))
  }, [data])

  // Apply the theme to <html data-theme="...">, tracking the OS setting when on "system".
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const mode = data.settings.theme
      const dark = mode === 'dark' || (mode === 'system' && mq.matches)
      root.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    if (data.settings.theme === 'system') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [data.settings.theme])

  const getCompany = useCallback(
    (id: string) => data.companies.find((c) => c.id === id),
    [data.companies],
  )
  const getInvoice = useCallback(
    (id: string) => data.invoices.find((i) => i.id === id),
    [data.invoices],
  )

  const value = useMemo<Store>(
    () => ({
      data,
      companies: data.companies,
      invoices: data.invoices,
      theme: data.settings.theme,
      saveError,
      getCompany,
      getInvoice,
      addCompany: (company) => dispatch({ type: 'ADD_COMPANY', company }),
      updateCompany: (company) => dispatch({ type: 'UPDATE_COMPANY', company }),
      deleteCompany: (id) => dispatch({ type: 'DELETE_COMPANY', id }),
      saveInvoice: (invoice) => dispatch({ type: 'SAVE_INVOICE', invoice }),
      deleteInvoice: (id) => dispatch({ type: 'DELETE_INVOICE', id }),
      bumpCompanyNumber: (companyId) => dispatch({ type: 'BUMP_NUMBER', companyId }),
      setTheme: (theme) => dispatch({ type: 'SET_THEME', theme }),
      replaceData: (next) => dispatch({ type: 'REPLACE_DATA', data: next }),
      clearAll: () => dispatch({ type: 'CLEAR_ALL' }),
    }),
    [data, saveError, getCompany, getInvoice],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within an AppProvider')
  return ctx
}
