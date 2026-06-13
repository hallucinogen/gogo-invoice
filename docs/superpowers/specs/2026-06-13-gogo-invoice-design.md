# Gogo Invoice — Design

_Date: 2026-06-13_

## Purpose

A simple, offline-first invoice generator in the spirit of
[react-invoice-generator](https://github.com/tuanpham-dev/react-invoice-generator),
extended with the features the user asked for:

- Data stored **locally**, no backend.
- **Exportable** (JSON backup) and offline-first.
- Supports **multiple companies** (each a distinct invoice header).
- An **invoice history** that can be revisited and **copied** to make new invoices.

Hosted on GitHub Pages at `hallucinogen.github.io/gogo-invoice/`, open-source (MIT).

## Decisions (from brainstorming)

| Topic | Decision |
| --- | --- |
| Repo name | `gogo-invoice` (personal account `hallucinogen`) |
| Currency | Per-invoice picker, **default USD**, overridable |
| Logo upload | Yes — per company, base64 in localStorage |
| Dark mode | Yes — light / dark / system |
| Duplicate from history | Yes |
| Auto invoice numbering | Yes, per company, **overridable** |

## Architecture

- **Vite + React + TypeScript**, fully static SPA. `HashRouter` so deep links work on
  GitHub Pages with no server config.
- **Persistence:** a single `localStorage` key holding `{ version, companies, invoices,
  settings }`, validated with **Zod** on load and on import (falls back to an empty
  workspace on corruption).
- **State:** one React context + `useReducer` store; persisted via an effect on every
  change. Theme applied to `<html data-theme>`.
- **PDF:** `@react-pdf/renderer` `Document` component, **lazy-loaded** on download so the
  ~1.3 MB renderer stays out of the initial bundle. Built-in Helvetica → no network font
  fetch (keeps it offline).
- **Offline:** `vite-plugin-pwa` (autoUpdate) precaches the app shell; installable.

## Data model

- **Company** — sender profile: name, contact, address, logo, taxId, bankDetails, plus
  invoice defaults (prefix, nextNumber, padding, currency, tax label/rate, notes, terms).
- **Invoice** — `companyId` + a frozen **company snapshot** (so history is stable if the
  company is later edited/deleted), number, status, currency, dates, client, line items,
  discount (percent|fixed), tax, shipping, notes, terms, timestamps.

## Components / pages

- **Invoices (history)** — searchable/filterable list; edit, duplicate, download PDF, delete.
- **Editor** — form + live preview; save (auto-bumps the company counter on first save),
  save & download PDF, duplicate, delete.
- **Companies** — CRUD for headers, logo upload, numbering & defaults.
- **Backup** — export/import JSON, storage stats, clear-all.

## Calculations

`subtotal = Σ qty·price` → `discount` (percent clamped 0–100, fixed clamped 0–subtotal)
→ `taxableBase` → `tax = base·rate%` → `total = base + tax + shipping`. All rounded to 2dp.

## Out of scope (YAGNI)

Accounts/auth, cloud sync, multi-user, payment processing, email sending, recurring
invoices, multi-language. Could be added later; not needed for the core ask.

## Testing

`pnpm verify` runs a headless harness asserting totals math, fixed-discount clamping,
duplication, Zod backup round-trip + partial-fill, and a real PDF render (`%PDF-` header).
`pnpm build` type-checks the whole app.
