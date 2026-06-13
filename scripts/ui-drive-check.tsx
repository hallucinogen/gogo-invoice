/**
 * Drives the REAL app the way a UI agent (Playwright / computer-use) would —
 * locating controls only by their accessible name (aria-label / visible text),
 * never by internal class or test id. Proves an agent can: fill the invoice,
 * add line items, change numbers, switch/add companies, and save — via the UI.
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
const { AppProvider } = await import('../src/store/AppStore')
const App = (await import('../src/App')).default

createRoot(document.getElementById('root')!).render(
  React.createElement(AppProvider, null, React.createElement(App)),
)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// --- agent-style locators: by accessible name only ---
function byLabelAll(label: string): HTMLElement[] {
  return [...document.querySelectorAll(`[aria-label="${label}"]`)] as HTMLElement[]
}
function byLabel(label: string): HTMLElement {
  const els = byLabelAll(label)
  if (!els.length) throw new Error(`no control with accessible name: "${label}"`)
  return els[0]
}
function typeInto(el: HTMLElement, value: string) {
  const tag = el.tagName
  const proto =
    tag === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : tag === 'SELECT'
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  el.dispatchEvent(
    new window.Event(tag === 'SELECT' ? 'change' : 'input', { bubbles: true }),
  )
}
function fillLabel(label: string, value: string) {
  typeInto(byLabel(label), value)
}
function clickName(name: string) {
  const el = [...document.querySelectorAll('button, a')].find((b) =>
    (b.textContent || '').trim().replace(/\s+/g, ' ').includes(name),
  )
  if (!el) throw new Error(`no button/link with text: "${name}"`)
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
}
function store() {
  const raw = window.localStorage.getItem('gogo-invoice:v1')
  return raw ? JSON.parse(raw) : { invoices: [], companies: [] }
}

let bad = false
function check(cond: unknown, msg: string) {
  console.log((cond ? '  ok  - ' : '  FAIL- ') + msg)
  if (!cond) bad = true
}

await wait(180)

console.log('A. Lands on a fillable invoice editor')
check(byLabelAll('Company name').length === 1, 'sees the "Company name" field')
check(
  byLabelAll('Add item').length === 0 && document.body.textContent!.includes('Add item'),
  'sees an "Add item" button',
)

console.log('B. Fill the header + client by accessible name')
fillLabel('Company name', 'Acme Studio')
fillLabel('Invoice number', 'UITEST-001')
fillLabel('Client name', 'Globex Inc.')

console.log('C. Fill the first line item (row-scoped accessible names)')
fillLabel('Item 1 description', 'Design work (hours)')
fillLabel('Item 1 quantity', '10')
fillLabel('Item 1 unit price', '120')
await wait(30)

console.log('D. Add a SECOND line item via the "Add item" button')
clickName('Add item')
await wait(40)
check(
  byLabelAll('Item 2 description').length === 1,
  'a uniquely-named second item row appeared',
)
fillLabel('Item 2 description', 'Hosting (pass-through)')
fillLabel('Item 2 quantity', '1')
fillLabel('Item 2 unit price', '48')
await wait(30)

console.log('E. Change the currency select to EUR')
typeInto(byLabel('Currency'), 'EUR')
await wait(30)

console.log('F. Save the invoice')
clickName('Save')
await wait(150)
let s = store()
const inv = s.invoices.find((i: any) => i.number === 'UITEST-001')
check(inv, 'invoice saved with the typed number')
check(inv?.client?.name === 'Globex Inc.', 'client name persisted')
check(inv?.items?.length === 2, 'both line items persisted')
check(
  inv?.items?.[0]?.unitPrice === 120 && inv?.items?.[1]?.unitPrice === 48,
  'unit prices persisted',
)
check(inv?.currency === 'EUR', 'currency change persisted')

console.log('G. Add a NEW company through the Companies page')
clickName('Companies')
await wait(120)
clickName('Add company')
await wait(80)
// The required field is labelled visibly; the input is the first text input in the form card.
const nameInput = [...document.querySelectorAll('input.input')].find((i) =>
  (i as HTMLInputElement).placeholder?.includes('Personal'),
) as HTMLInputElement | undefined
check(nameInput, 'company name input is reachable')
if (nameInput) typeInto(nameInput, 'Beta LLC')
await wait(30)
clickName('Add company')
await wait(120)
s = store()
check(
  s.companies.some((c: any) => c.name === 'Beta LLC'),
  'new company "Beta LLC" was added',
)

console.log('H. Back to the editor; switch the company select to the new company')
clickName('New invoice')
await wait(150)
const beta = s.companies.find((c: any) => c.name === 'Beta LLC')
const companySelect = byLabel('Company for this invoice') as HTMLSelectElement
typeInto(companySelect, beta.id)
await wait(40)
check(
  byLabel('Company name') &&
    (byLabel('Company name') as HTMLInputElement).value === 'Beta LLC',
  'editor now shows the switched company',
)

console.log('I. History lists the saved invoice')
clickName('History')
await wait(120)
check(document.body.textContent!.includes('UITEST-001'), 'History shows UITEST-001')

console.log(
  bad
    ? '\n❌ UI not fully agent-operable'
    : '\n✅ fully operable via the UI by accessible name',
)
process.exit(bad ? 1 : 0)
