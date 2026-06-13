import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import InvoiceListPage from './pages/InvoiceListPage'
import InvoiceEditorPage from './pages/InvoiceEditorPage'
import CompaniesPage from './pages/CompaniesPage'
import DataPage from './pages/DataPage'

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<InvoiceListPage />} />
          <Route path="/invoice/new" element={<InvoiceEditorPage />} />
          <Route path="/invoice/:id" element={<InvoiceEditorPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
