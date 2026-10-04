import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const STATUS_STYLES = {
  paid: { bg: 'rgba(46,204,113,0.15)', text: colors.success, label: 'PAID' },
  partial: { bg: 'rgba(243,156,18,0.15)', text: colors.warning, label: 'PARTIAL' },
  pending: { bg: 'rgba(233,69,96,0.12)', text: colors.accent, label: 'PENDING' },
};

const METHOD_LABELS = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank: 'Bank transfer',
  other: 'Other',
};

function money(symbol, n) {
  const v = Number(n);
  if (Number.isNaN(v)) return `${symbol}—`;
  return `${symbol}${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function Row({ label, value, bold, highlight }) {
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowVal, bold && styles.rowValBold]}>{value}</Text>
    </View>
  );
}

export default function PaymentReceiptCard({ receipt, compact }) {
  if (!receipt) return null;

  const sym = receipt.currencySymbol || '₹';
  const st = STATUS_STYLES[receipt.paymentStatus] || STATUS_STYLES.pending;
  const issued = receipt.issuedAt ? new Date(receipt.issuedAt).toLocaleString() : '—';

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.compactReceipt}>🧾 {receipt.receiptNumber}</Text>
        <Text style={styles.compactAmt}>
          {money(sym, receipt.totalAmount)}
          {receipt.paymentStatus !== 'paid' && receipt.balanceDue > 0
            ? ` · Due ${money(sym, receipt.balanceDue)}`
            : ''}
        </Text>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.receipt}>
      <View style={styles.header}>
        <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
        </View>
      </View>
      <Text style={styles.receiptNo}>{receipt.receiptNumber}</Text>
      <Text style={styles.issued}>Issued: {issued}</Text>
      <View style={styles.divider} />

      <Row label="Order" value={receipt.orderNumber} />
      <Row label="Customer" value={receipt.customerName || '—'} />
      {receipt.customerPhone ? <Row label="Phone" value={receipt.customerPhone} /> : null}
      {receipt.tailorName ? <Row label="Tailor shop" value={receipt.tailorName} /> : null}
      <Row label="Garment" value={receipt.garmentType || '—'} />
      {receipt.fabricDetails ? <Row label="Fabric" value={receipt.fabricDetails} /> : null}

      <View style={styles.divider} />
      <Row label="Total amount" value={money(sym, receipt.totalAmount)} bold />
      <Row label="Amount paid" value={money(sym, receipt.amountPaid)} />
      <Row
        label="Balance due"
        value={money(sym, receipt.balanceDue)}
        highlight={receipt.balanceDue > 0}
        bold={receipt.balanceDue > 0}
      />
      {receipt.paymentMethod ? (
        <Row label="Payment method" value={METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod} />
      ) : null}
      {receipt.paymentNotes ? <Row label="Payment note" value={receipt.paymentNotes} /> : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Thank you for your business</Text>
        <Text style={styles.footerSub}>AI Tailor · Official payment record</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: {
    backgroundColor: '#fffef8',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5, color: colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  receiptNo: { fontSize: 13, fontWeight: '700', color: colors.textLight, marginTop: 6 },
  issued: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowHighlight: { backgroundColor: 'rgba(233,69,96,0.06)', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 6 },
  rowLabel: { fontSize: 13, color: colors.textLight, flex: 1 },
  rowVal: { fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: '55%', textAlign: 'right' },
  rowValBold: { fontSize: 16, fontWeight: '800', color: colors.primary },
  footer: { marginTop: 14, alignItems: 'center' },
  footerText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  footerSub: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  compact: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  compactReceipt: { fontSize: 12, fontWeight: '700', color: colors.primary },
  compactAmt: { fontSize: 12, fontWeight: '600', color: colors.text },
});
