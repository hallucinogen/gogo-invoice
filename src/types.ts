import { z } from 'zod'

/** Default currency when none is chosen (per-invoice overridable). */
export const CURRENCY_DEFAULT = 'USD'

/** Bump when the persisted shape changes in a breaking way. */
export const APP_DATA_VERSION = 1

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().default(''),
  quantity: z.number().default(1),
  unitPrice: z.number().default(0),
})
export type LineItem = z.infer<typeof lineItemSchema>

/**
 * The subset of a company that is frozen onto an invoice when it is saved, so
 * historical invoices keep their original header even if the company profile
 * is later edited or deleted.
 */
export const companySnapshotSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  address: z.string().default(''),
  website: z.string().default(''),
  taxId: z.string().default(''),
  bankDetails: z.string().default(''),
  logo: z.string().optional(),
})
export type CompanySnapshot = z.infer<typeof companySnapshotSchema>

/** A reusable sender profile — the "header" for a set of invoices. */
export const companySchema = companySnapshotSchema.extend({
  id: z.string(),
  invoicePrefix: z.string().default('INV-'),
  nextNumber: z.number().default(1),
  numberPadding: z.number().default(4),
  defaultCurrency: z.string().default(CURRENCY_DEFAULT),
  defaultTaxRate: z.number().default(0),
  defaultTaxLabel: z.string().default('Tax'),
  defaultNotes: z.string().default(''),
  defaultTerms: z.string().default(''),
})
export type Company = z.infer<typeof companySchema>

export const clientSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  address: z.string().default(''),
})
export type Client = z.infer<typeof clientSchema>

export const discountTypeSchema = z.enum(['percent', 'fixed'])
export type DiscountType = z.infer<typeof discountTypeSchema>

export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid'])
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

export const invoiceSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  company: companySnapshotSchema,
  number: z.string().default(''),
  status: invoiceStatusSchema.default('draft'),
  currency: z.string().default(CURRENCY_DEFAULT),
  issueDate: z.string(),
  dueDate: z.string(),
  client: clientSchema,
  items: z.array(lineItemSchema).default([]),
  taxRate: z.number().default(0),
  taxLabel: z.string().default('Tax'),
  discountType: discountTypeSchema.default('percent'),
  discountValue: z.number().default(0),
  shipping: z.number().default(0),
  notes: z.string().default(''),
  terms: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Invoice = z.infer<typeof invoiceSchema>

export const themeSchema = z.enum(['light', 'dark', 'system'])
export type Theme = z.infer<typeof themeSchema>

export const settingsSchema = z.object({
  theme: themeSchema.default('system'),
})
export type Settings = z.infer<typeof settingsSchema>

export const appDataSchema = z.object({
  version: z.number().default(APP_DATA_VERSION),
  companies: z.array(companySchema).default([]),
  invoices: z.array(invoiceSchema).default([]),
  settings: settingsSchema.default({ theme: 'system' }),
})
export type AppData = z.infer<typeof appDataSchema>
