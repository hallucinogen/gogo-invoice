/**
 * Faithful integration test of the save flow: rename company (blur-commit),
 * apply a template, edit fields, Save, then navigate to a new invoice — watching
 * exactly what lands in localStorage at each step.
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
const { MemoryRouter, Routes, Route, Link } = await import('react-router-dom')
const { AppProvider } = await import('../src/store/AppStore')
const Editor = (await import('../src/pages/InvoiceEditorPage')).default

const h = React.createElement
createRoot(document.getElementById('root')!).render(
  h(
    MemoryRouter,
    { initialEntries: ['/'] },
    h(
      AppProvider,
      null,
      h(Link, { to: '/', 'aria-label': 'nav-new' } as Record<string, unknown>, 'New'),
      h(
        Routes,
        null,
        h(Route, { path: '/', element: h(Editor) }),
        h(Route, { path: '/invoice/:id', element: h(Editor) }),
        h(Route, { path: '/history', element: h('div') }),
      ),
    ),
  ),
)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const q = (label: string) =>
  document.querySelector(`[aria-label="${label}"]`) as HTMLElement | null

function setValue(label: string, value: string) {
  const el = q(label) as HTMLInputElement | HTMLTextAreaElement | null
  if (!el) throw new Error(`field not found: ${label}`)
  const proto =
    el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
}
function blur(label: string) {
  q(label)?.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true }))
}
function selectValue(label: string, value: string) {
  const el = q(label) as HTMLSelectElement | null
  if (!el) throw new Error(`select not found: ${label}`)
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!.call(
    el,
    value,
  )
  el.dispatchEvent(new window.Event('change', { bubbles: true }))
}
function clickText(starts: string) {
  const b = [...document.querySelectorAll('button')].find((x) =>
    (x.textContent || '').trim().startsWith(starts),
  )
  if (!b) throw new Error(`button not found: ${starts}`)
  b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
}
function store() {
  const raw = window.localStorage.getItem('gogo-invoice:v1')
  return raw ? JSON.parse(raw) : { invoices: [], companies: [] }
}
function dump(tag: string) {
  const d = store()
  console.log(
    `[${tag}] invoices=${d.invoices.length}`,
    d.invoices.map(
      (i: any) =>
        `${i.number}/${i.client?.name || '—'}/${i.items?.[0]?.unitPrice ?? '—'}`,
    ),
  )
}

await wait(160)

console.log('1) rename company (inline + blur)')
setValue('Company name', 'Gogo Coaching Service')
blur('Company name')
await wait(40)

console.log('2) apply Coaching template via toolbar')
selectValue('Start from a line-item template', 'coach-hourly')
await wait(40)

console.log('3) edit number + client + price')
setValue('Invoice number', 'INTV-FAS-002')
setValue('Client name', 'Braid Research, Inc.')
const priceEl = q('Unit price') as HTMLInputElement | null
if (priceEl) setValue('Unit price', '250')
await wait(40)
dump('before-save')

console.log('4) click Save')
clickText('Save')
await wait(220)
dump('after-save')
console.log(
  '   editor number now:',
  (q('Invoice number') as HTMLInputElement)?.value ?? '(no editor field)',
)

console.log('5) click "New invoice"')
;(q('nav-new') as HTMLElement)?.dispatchEvent(
  new window.MouseEvent('click', { bubbles: true }),
)
await wait(160)
dump('after-new')
console.log(
  '   editor number now:',
  (q('Invoice number') as HTMLInputElement)?.value ?? '(none)',
)

const d = store()
let bad = false
const check = (c: unknown, m: string) => {
  console.log((c ? '  ok  - ' : '  FAIL- ') + m)
  if (!c) bad = true
}
const saved = d.invoices.find((i: any) => i.number === 'INTV-FAS-002')
check(saved, 'the edited invoice INTV-FAS-002 is in the store')
check(saved?.client?.name === 'Braid Research, Inc.', 'client persisted')
check(saved?.items?.length >= 1, 'template items persisted')
check(
  !d.invoices.some((i: any) => i.number === 'INV-0001'),
  'no stray blank INV-0001 was saved',
)
console.log(bad ? '\n❌ SAVE BUG REPRODUCED' : '\n✅ save flow OK')
process.exit(bad ? 1 : 0)
