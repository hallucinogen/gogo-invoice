import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

const BASE_URL = import.meta.env.BASE_URL

export default function Layout({ children }: { children: ReactNode }) {
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
              Invoices
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
      <main className="main">{children}</main>
      <footer className="footer">
        Gogo Invoice · your data stays on this device ·{' '}
        <a
          href="https://github.com/hallucinogen/gogo-invoice"
          target="_blank"
          rel="noreferrer noopener"
        >
          Open source on GitHub
        </a>
      </footer>
    </div>
  )
}
