import type { Invoice } from '../types'

/**
 * Build the invoice PDF in the browser and trigger a download. The heavy PDF
 * renderer and file-saver are imported dynamically so they stay out of the
 * initial app bundle and only load when a PDF is actually requested. Rejects
 * (and logs) if rendering fails, so callers can show an error.
 */
export async function downloadInvoicePdf(invoice: Invoice): Promise<void> {
  try {
    const [{ pdf }, fileSaver, { InvoiceDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('file-saver'),
      import('./InvoicePDF'),
    ])
    const blob = await pdf(<InvoiceDocument invoice={invoice} />).toBlob()
    const safeName = (invoice.number || 'invoice').replace(/[^\w.-]+/g, '_')
    fileSaver.saveAs(blob, `${safeName}.pdf`)
  } catch (err) {
    console.error('PDF generation failed', err)
    throw err
  }
}
