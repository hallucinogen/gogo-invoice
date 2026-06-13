# Gogo Invoice

A simple, **offline-first invoice generator** that runs entirely in your browser.
No backend, no sign-up, no tracking — your data never leaves your device.

**▶ Live app: https://hallucinogen.github.io/gogo-invoice/**

Inspired by [react-invoice-generator](https://github.com/tuanpham-dev/react-invoice-generator),
rebuilt from scratch with multi-company support, an invoice history you can revisit
and copy from, and JSON backup/restore.

---

## Features

- ✍️ **Fill it in place (WYSIWYG)** — the app opens directly on a ready-to-fill
  invoice. Click anything on the page — company name, logo, address, line items,
  dates, tax, notes — and edit it inline. What you see is exactly what the PDF prints.
- 🏢 **Multiple companies / headers** — starts with a default **"Personal"** company so
  there's zero setup. Add more sender profiles (logo, address, tax ID, bank details,
  default currency and their own invoice-number series) and switch per invoice. Only
  the company name is required — everything else is optional.
- 🧾 **Full invoices** — line items, percentage **or** fixed discount, configurable
  tax (label + rate), shipping, notes and terms, plus draft / sent / paid status.
- 🔢 **Auto invoice numbering** per company with a custom prefix and zero-padding —
  always overridable per invoice.
- 💱 **Per-invoice currency** — defaults to USD, switch any invoice to one of 24+
  currencies with correct symbols and formatting.
- 🕘 **History** — every invoice is saved locally, searchable and filterable by
  company. Re-open, edit, or **duplicate** an old one to start a new invoice in seconds.
- 📄 **PDF export** — download a clean, print-ready A4 PDF generated entirely in the
  browser (via `@react-pdf/renderer`).
- 💾 **Backup & restore** — export all your data to a single JSON file and import it
  on another browser or computer.
- 🌙 **Dark mode** — light / dark / follow-system.
- 📦 **Offline-first PWA** — installable, works with no internet connection after the
  first load.

## Privacy & how data is stored

There is **no server**. All companies and invoices are stored in your browser's
`localStorage` on the device you're using. That means:

- Your data is private to that browser profile.
- Clearing your browser data will erase your invoices — use **Backup → Export** to
  keep a copy.
- To move between devices/browsers, **Export** a backup on one and **Import** it on
  the other.

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [`@react-pdf/renderer`](https://react-pdf.org/) for client-side PDF generation
  (lazy-loaded, so it doesn't bloat the initial load)
- [Zod](https://zod.dev/) for validating stored and imported data
- [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) for offline support
- Hand-written CSS (no UI framework), with light/dark theming via CSS variables

## Running locally

Requires Node 18+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev        # start the dev server
pnpm build      # type-check + production build into dist/
pnpm preview    # preview the production build
pnpm verify     # headless smoke test (totals math, zod round-trip, PDF render)
```

## Deployment

Pushing to `main` triggers a GitHub Actions workflow
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) that builds the app
and deploys `dist/` to GitHub Pages.

> If you fork this under a different repo name, update `base` in
> [`vite.config.ts`](vite.config.ts) (and the `start_url`/`scope` in the PWA manifest)
> to match `/<your-repo-name>/`, then enable Pages → "GitHub Actions" in repo settings.

## Project structure

```
src/
  lib/        calculations, currency/date formatting, factories, ids
  store/      localStorage persistence (validated, resilient) + React store
  pdf/        the @react-pdf/renderer document + lazy download helper
  components/ layout, inline-editable fields, theme toggle, icons
  pages/      Editor (the WYSIWYG invoice), History, Companies, Backup
```

## License

[MIT](LICENSE) © 2026 hallucinogen
