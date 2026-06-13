import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useStore } from '../store/AppStore'
import { ThemeToggle } from './ThemeToggle'

const BASE_URL = import.meta.env.BASE_URL

export default function Layout({ children }: { children: ReactNode }) {
  const { saveError } = useStore()
  return (
    <div className="app">
      <header className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="brand">
            <img src={`${BASE_URL}icon.svg`} alt="" />
            <span>Gogo Invoice</span>
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/" end className="nav-link">
              New invoice
            </NavLink>
            <NavLink to="/history" className="nav-link">
              History
            </NavLink>
            <NavLink to="/companies" className="nav-link">
              Companies
            </NavLink>
            <NavLink to="/data" className="nav-link">
              Backup
            </NavLink>
          </nav>
          <span className="nav-spacer" />
          <ThemeToggle />
        </div>
      </header>

      {saveError ? (
        <div className="save-error" role="alert">
          Couldn't save your changes — browser storage may be full. Export a backup, then
          remove a large logo or some old invoices.
        </div>
      ) : null}

      <main className="main">{children}</main>

      <footer className="footer">
        Gogo Invoice · your data stays on this device ·{' '}
        <a
          href="https://github.com/hallucinogen/gogo-invoice"
          target="_blank"
          rel="noreferrer noopener"
        >
          Open source on GitHub
        </a>{' '}
        ·{' '}
        <a href={`${BASE_URL}llms.txt`} target="_blank" rel="noreferrer noopener">
          Automation / agent API
        </a>
      </footer>
    </div>
  )
}
