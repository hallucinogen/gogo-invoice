/**
 * Headless render smoke test: mounts the real WYSIWYG editor in jsdom and
 * asserts it shows a fillable invoice with the default "Personal" company.
 * Catches runtime/render crashes that the type-check can't. Run via tsx.
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
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })) as unknown as typeof window.matchMedia)

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { AppProvider } = await import('../src/store/AppStore')
const InvoiceEditorPage = (await import('../src/pages/InvoiceEditorPage')).default

const root = createRoot(document.getElementById('root')!)
root.render(
  React.createElement(
    MemoryRouter,
    { initialEntries: ['/'] },
    React.createElement(AppProvider, null, React.createElement(InvoiceEditorPage, null)),
  ),
)

await new Promise((r) => setTimeout(r, 150))

const rootEl = document.getElementById('root')!
const html = rootEl.innerHTML
const text = rootEl.textContent || ''

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    console.error(html.slice(0, 1500))
    process.exit(1)
  }
  console.log('  ok -', msg)
}

assert(text.includes('INVOICE'), 'renders the INVOICE heading')
assert(text.includes('Bill To'), 'renders Bill To')
assert(text.includes('Add item'), 'renders Add item')
assert(html.includes('Personal'), 'default "Personal" company present')
assert(html.includes('Your Company'), 'company name field is editable (placeholder)')
const fields = rootEl.querySelectorAll('input, textarea, select')
assert(fields.length >= 10, `has many inline-editable fields (${fields.length})`)

console.log('\nRENDER OK ✅')
process.exit(0)
