import { addDays, format } from 'date-fns'
import { uid } from './id'
import {
  CURRENCY_DEFAULT,
  type Company,
  type CompanySnapshot,
  type Invoice,
  type LineItem,
} from '../types'

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function plusDaysISO(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}

export function createCompany(partial: Partial<Company> = {}): Company {
  return {
    id: uid(),
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    taxId: '',
    bankDetails: '',
    logo: undefined,
    invoicePrefix: 'INV-',
    nextNumber: 1,
    numberPadding: 4,
    defaultCurrency: CURRENCY_DEFAULT,
    defaultTaxRate: 0,
    defaultTaxLabel: 'Tax',
    defaultNotes: '',
    defaultTerms: '',
    ...partial,
  }
}

export function snapshotOf(company: Company): CompanySnapshot {
  return {
    name: company.name,
    email: company.email,
    phone: company.phone,
    address: company.address,
    website: company.website,
    taxId: company.taxId,
    bankDetails: company.bankDetails,
    logo: company.logo,
  }
}

/** The next suggested invoice number for a company (overridable in the editor). */
export function suggestedNumber(company: Company): string {
  const padded = String(Math.max(company.nextNumber, 0)).padStart(
    Math.max(company.numberPadding, 0),
    '0',
  )
  return `${company.invoicePrefix}${padded}`
}

export function emptyLineItem(): LineItem {
  return { id: uid(), description: '', quantity: 1, unitPrice: 0 }
}

export function createInvoiceForCompany(company: Company): Invoice {
  const now = new Date().toISOString()
  return {
    id: uid(),
    companyId: company.id,
    company: snapshotOf(company),
    number: suggestedNumber(company),
    status: 'draft',
    currency: company.defaultCurrency || CURRENCY_DEFAULT,
    issueDate: todayISO(),
    dueDate: plusDaysISO(14),
    client: { name: '', email: '', phone: '', address: '' },
    items: [emptyLineItem()],
    taxRate: company.defaultTaxRate || 0,
    taxLabel: company.defaultTaxLabel || 'Tax',
    discountType: 'percent',
    discountValue: 0,
    shipping: 0,
    notes: company.defaultNotes || '',
    terms: company.defaultTerms || '',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Clone an existing invoice into a fresh draft — new id, today's dates, a new
 * suggested number when the source company still exists, and back to "draft".
 */
export function duplicateInvoice(src: Invoice, company?: Company): Invoice {
  const now = new Date().toISOString()
  return {
    ...src,
    id: uid(),
    number: company ? suggestedNumber(company) : src.number,
    status: 'draft',
    issueDate: todayISO(),
    dueDate: plusDaysISO(14),
    client: { ...src.client },
    company: { ...src.company },
    items: src.items.map((it) => ({ ...it, id: uid() })),
    createdAt: now,
    updatedAt: now,
  }
}
