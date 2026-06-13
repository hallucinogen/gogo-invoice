import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { computeTotals, lineTotal } from '../lib/calc'
import { formatCurrency, formatDate } from '../lib/format'
import type { Invoice } from '../types'

const COLORS = {
  primary: '#4f46e5',
  text: '#1a1d29',
  muted: '#6b7280',
  faint: '#9aa1b0',
  line: '#e3e6ee',
  lineSoft: '#eef0f5',
}

const styles = StyleSheet.create({
  page: {
    paddingVertical: 44,
    paddingHorizontal: 44,
    fontSize: 10,
    color: COLORS.text,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  brand: { width: '58%' },
  logo: { maxWidth: 150, maxHeight: 64, marginBottom: 8, objectFit: 'contain' },
  companyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#111111' },
  muted: { color: COLORS.muted, fontSize: 9.5 },
  titleBox: { width: '40%', alignItems: 'flex-end' },
  title: {
    fontSize: 26,
    letterSpacing: 2,
    color: COLORS.primary,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  metaLabel: { color: COLORS.muted, fontSize: 9.5 },
  metaVal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    minWidth: 90,
    textAlign: 'right',
  },
  parties: { flexDirection: 'row', marginTop: 26, marginBottom: 16 },
  partyHeading: {
    fontSize: 8,
    color: COLORS.faint,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 3,
  },
  partyName: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  table: { marginTop: 6 },
  th: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.line,
    paddingBottom: 6,
  },
  thText: {
    fontSize: 8,
    color: COLORS.muted,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.6,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lineSoft,
    paddingVertical: 7,
  },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 50, textAlign: 'right' },
  colPrice: { width: 90, textAlign: 'right' },
  colAmount: { width: 90, textAlign: 'right' },
  totals: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  totalsBox: { width: 240 },
  totalsLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  grand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#d0d4e0',
    marginTop: 5,
    paddingTop: 8,
  },
  grandText: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: COLORS.primary },
  notes: { flexDirection: 'row', marginTop: 26 },
  notesBlock: { flex: 1, paddingRight: 24 },
  notesText: { color: '#4b5563', fontSize: 9.5 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    textAlign: 'center',
    color: COLORS.faint,
    fontSize: 8,
  },
})

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const totals = computeTotals(invoice)
  const c = invoice.company
  const money = (n: number) => formatCurrency(n, invoice.currency)
  // react-pdf's <Image> only decodes PNG/JPEG; never pass an SVG (or other) data URL.
  const logoOk =
    typeof c.logo === 'string' && /^data:image\/(png|jpe?g);base64,/.test(c.logo)

  const companyLines = [
    c.address,
    c.email,
    c.phone,
    c.website,
    c.taxId ? `Tax ID: ${c.taxId}` : '',
  ].filter(Boolean)

  const clientLines = [
    invoice.client.address,
    invoice.client.email,
    invoice.client.phone,
  ].filter(Boolean)

  return (
    <Document title={`Invoice ${invoice.number}`} author={c.name || 'Gogo Invoice'}>
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.brand}>
            {logoOk ? <Image style={styles.logo} src={c.logo} /> : null}
            <Text style={styles.companyName}>{c.name || 'Your Company'}</Text>
            {companyLines.map((line, i) => (
              <Text key={i} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.title}>INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice #&nbsp;&nbsp;</Text>
              <Text style={styles.metaVal}>{invoice.number || '—'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued&nbsp;&nbsp;</Text>
              <Text style={styles.metaVal}>{formatDate(invoice.issueDate) || '—'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due&nbsp;&nbsp;</Text>
              <Text style={styles.metaVal}>{formatDate(invoice.dueDate) || '—'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status&nbsp;&nbsp;</Text>
              <Text style={[styles.metaVal, { textTransform: 'capitalize' }]}>
                {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={{ flex: 1 }}>
            <Text style={styles.partyHeading}>BILL TO</Text>
            <Text style={styles.partyName}>{invoice.client.name || '—'}</Text>
            {clientLines.map((line, i) => (
              <Text key={i} style={styles.muted}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.th} fixed>
            <Text style={[styles.colDesc, styles.thText]}>DESCRIPTION</Text>
            <Text style={[styles.colQty, styles.thText]}>QTY</Text>
            <Text style={[styles.colPrice, styles.thText]}>UNIT PRICE</Text>
            <Text style={[styles.colAmount, styles.thText]}>AMOUNT</Text>
          </View>
          {invoice.items.length === 0 ? (
            <View style={styles.tr}>
              <Text style={[styles.colDesc, { color: COLORS.muted }]}>No items yet.</Text>
            </View>
          ) : (
            invoice.items.map((it) => (
              <View key={it.id} style={styles.tr} wrap={false}>
                <Text style={styles.colDesc}>{it.description || '—'}</Text>
                <Text style={styles.colQty}>{it.quantity}</Text>
                <Text style={styles.colPrice}>{money(it.unitPrice)}</Text>
                <Text style={styles.colAmount}>{money(lineTotal(it))}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsLine}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text>{money(totals.subtotal)}</Text>
            </View>
            {totals.discountAmount > 0 ? (
              <View style={styles.totalsLine}>
                <Text style={styles.muted}>
                  Discount
                  {invoice.discountType === 'percent'
                    ? ` (${invoice.discountValue}%)`
                    : ''}
                </Text>
                <Text>-{money(totals.discountAmount)}</Text>
              </View>
            ) : null}
            {totals.taxAmount > 0 ? (
              <View style={styles.totalsLine}>
                <Text style={styles.muted}>
                  {invoice.taxLabel || 'Tax'} ({invoice.taxRate}%)
                </Text>
                <Text>{money(totals.taxAmount)}</Text>
              </View>
            ) : null}
            {totals.shipping > 0 ? (
              <View style={styles.totalsLine}>
                <Text style={styles.muted}>Shipping</Text>
                <Text>{money(totals.shipping)}</Text>
              </View>
            ) : null}
            <View style={styles.grand}>
              <Text style={styles.grandText}>Total</Text>
              <Text style={styles.grandText}>{money(totals.total)}</Text>
            </View>
          </View>
        </View>

        {invoice.notes || invoice.terms || c.bankDetails ? (
          <View style={styles.notes}>
            {invoice.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.partyHeading}>NOTES</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </View>
            ) : null}
            {invoice.terms ? (
              <View style={styles.notesBlock}>
                <Text style={styles.partyHeading}>TERMS</Text>
                <Text style={styles.notesText}>{invoice.terms}</Text>
              </View>
            ) : null}
            {c.bankDetails ? (
              <View style={styles.notesBlock}>
                <Text style={styles.partyHeading}>PAYMENT DETAILS</Text>
                <Text style={styles.notesText}>{c.bankDetails}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${invoice.number || 'Invoice'}  ·  Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
