import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { AppData, Company, Invoice, Theme } from '../types'
import { defaultData, loadData, saveData } from './persistence'

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

  // Persist on every change.
  useEffect(() => {
    saveData(data)
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
    [data, getCompany, getInvoice],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within an AppProvider')
  return ctx
}
