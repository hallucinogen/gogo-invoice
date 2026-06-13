import type { Invoice } from '../types'

export function invoiceFileName(invoice: Invoice): string {
  return (invoice.number || 'invoice').replace(/[^\w.-]+/g, '_') + '.pdf'
}

/** Render the invoice to a PDF Blob (renderer loaded lazily). */
export async function renderInvoicePdfBlob(invoice: Invoice): Promise<Blob> {
  const [{ pdf }, { InvoiceDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./InvoicePDF'),
  ])
  return pdf(<InvoiceDocument invoice={invoice} />).toBlob()
}

/**
 * Render the invoice to a base64 string (no data: prefix). Lets an agent driving
 * the page capture the PDF bytes and write/send the file itself.
 */
export async function renderInvoicePdfBase64(invoice: Invoice): Promise<string> {
  const blob = await renderInvoicePdfBlob(invoice)
  const buf = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Build the invoice PDF in the browser and trigger a download. The heavy PDF
 * renderer and file-saver are imported dynamically so they stay out of the
 * initial app bundle and only load when a PDF is actually requested. Rejects
 * (and logs) if rendering fails, so callers can show an error.
 */
export async function downloadInvoicePdf(invoice: Invoice): Promise<void> {
  try {
    const [blob, fileSaver] = await Promise.all([
      renderInvoicePdfBlob(invoice),
      import('file-saver'),
    ])
    fileSaver.saveAs(blob, invoiceFileName(invoice))
  } catch (err) {
    console.error('PDF generation failed', err)
    throw err
  }
}
