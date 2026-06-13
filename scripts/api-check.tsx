/**
 * Proves the automation API an agent would use after just opening the page:
 * window.gogoInvoice.createInvoice(...) → persisted invoice.
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})
const { window } = dom
const g = globalThis as Record<string, unknown>
g.window = window
g.document = window.document
g.HTMLElement = window.HTMLElement
g.localStorage = window.localStorage
g.Node = window.Node
g.getComputedStyle = window.getComputedStyle
window.matchMedia =
  window.matchMedia ||
  (((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia)

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { AppProvider } = await import('../src/store/AppStore')

createRoot(document.getElementById('root')!).render(
  React.createElement(
    MemoryRouter,
    { initialEntries: ['/'] },
    React.createElement(AppProvider, null, React.createElement('div', null, 'ready')),
  ),
)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
await wait(120)

const api = (window as unknown as { gogoInvoice?: any }).gogoInvoice
let bad = false
const check = (c: unknown, m: string) => {
  console.log((c ? '  ok  - ' : '  FAIL- ') + m)
  if (!c) bad = true
}

check(api, 'window.gogoInvoice exists after opening the page')
check(
  typeof api?.help === 'function' && api.help().includes('createInvoice'),
  'help() works',
)

console.log('\nAgent calls createInvoice(...) like it would in the console:')
const created = api.createInvoice({
  company: 'Coaching Co',
  number: 'API-001',
  client: { name: 'Acme Inc.', country: 'United States' },
  items: [
    { description: 'Coaching session', quantity: 4, unitPrice: 250 },
    { description: 'Cloud hosting (pass-through)', quantity: 1, unitPrice: 48 },
  ],
})
await wait(120)

const data = JSON.parse(window.localStorage.getItem('gogo-invoice:v1') || '{}')
const saved = data.invoices?.find((i: any) => i.number === 'API-001')
console.log(
  'persisted:',
  saved
    ? `${saved.number} / ${saved.client?.name} / ${saved.items?.length} items`
    : 'NONE',
)

check(created?.number === 'API-001', 'createInvoice returned the invoice')
check(saved, 'invoice is persisted to localStorage (shows up in History)')
check(saved?.client?.name === 'Acme Inc.', 'client persisted')
check(saved?.items?.length === 2, 'both line items persisted')
check(
  api.listInvoices().some((i: any) => i.number === 'API-001'),
  'listInvoices() sees it',
)

console.log('\nAgent grabs the PDF bytes for the invoice it just made:')
const pdf = await api.getPdfBase64('API-001')
check(
  pdf.filename === 'API-001.pdf',
  `getPdfBase64 returns the right file (${pdf.filename})`,
)
check(atob(pdf.base64.slice(0, 8)).startsWith('%PDF'), 'base64 decodes to a real PDF')

console.log(
  bad ? '\n❌ API check failed' : '\n✅ agent API works by just opening the page',
)
process.exit(bad ? 1 : 0)
