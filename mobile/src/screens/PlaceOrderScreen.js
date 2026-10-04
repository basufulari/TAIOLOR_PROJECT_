import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  View,
} from 'react-native';
import { orders, measurements, customers } from '../services/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import Input from '../components/Input';
import Button from '../components/Button';
import { goToMainTab } from '../navigation/helpers';
import { colors } from '../theme/colors';

export default function PlaceOrderScreen({ navigation, route }) {
  const { guard } = useRequireBackend();
  const design = route.params?.design;
  const [garmentType, setGarmentType] = useState(design?.category || 'shirt');
  const [fabricDetails, setFabricDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState(design?.price?.toString() || '');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [measurementId, setMeasurementId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guard()) return;
    customers.list().then(({ data }) => setCustomerList(data.customers || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!customerId || !guard()) return;
    measurements
      .primary(customerId)
      .then((r) => setMeasurementId(r.data.measurement?._id || null))
      .catch(() => setMeasurementId(null));
  }, [customerId]);

  useEffect(() => {
    const t = parseFloat(amount) || 0;
    const p = parseFloat(amountPaid) || 0;
    if (t > 0 && p >= t) setPaymentStatus('paid');
    else if (p > 0) setPaymentStatus('partial');
    else setPaymentStatus('pending');
  }, [amount, amountPaid]);

  const submit = async () => {
    if (!guard()) return;
    if (!customerId) {
      Alert.alert('Customer', 'Select a customer for this order');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('customerId', customerId);
      if (design?._id) form.append('designId', design._id);
      if (measurementId) form.append('measurementId', measurementId);
      form.append('garmentType', garmentType);
      form.append('fabricDetails', fabricDetails);
      form.append('notes', notes);
      if (amount) form.append('totalAmount', amount);
      if (amountPaid) form.append('amountPaid', amountPaid);
      form.append('paymentMethod', paymentMethod);
      form.append('paymentStatus', paymentStatus);
      if (paymentNotes.trim()) form.append('paymentNotes', paymentNotes.trim());
      const { data } = await orders.create(form);
      const rcpt = data.paymentReceipt;
      if (paymentMethod === 'upi') {
        Alert.alert('Order saved', 'Now complete online payment by QR.', [
          {
            text: 'Pay now',
            onPress: () =>
              navigation.navigate('RazorpayPay', {
                orderId: data.order?._id || data.orderId,
                amountInr: parseFloat(amount) || 0,
              }),
          },
          { text: 'Later', onPress: () => goToMainTab(navigation, 'Orders') },
        ]);
      } else {
        Alert.alert(
          'Order & receipt saved',
          rcpt
            ? `Receipt ${rcpt.receiptNumber}\nTotal ${rcpt.currencySymbol}${rcpt.totalAmount} · Paid ${rcpt.currencySymbol}${rcpt.amountPaid}\nCustomer can view receipt in their app.`
            : 'Order saved to MongoDB Atlas',
          [{ text: 'OK', onPress: () => goToMainTab(navigation, 'Orders') }]
        );
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const selected = customerList.find((c) => c._id === customerId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {design && <Text style={styles.design}>Design: {design.title}</Text>}
      <Text style={styles.label}>Select customer *</Text>
      <View style={styles.chipRow}>
        {customerList.map((c) => (
          <TouchableOpacity
            key={c._id}
            style={[styles.chip, customerId === c._id && styles.chipActive]}
            onPress={() => setCustomerId(c._id)}
          >
            <Text style={[styles.chipText, customerId === c._id && styles.chipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!customerList.length && (
        <Text style={styles.warn}>Add a customer in AI Measure first (scan with name)</Text>
      )}
      {selected && measurementId ? (
        <Text style={styles.ok}>✓ Using saved measurements for {selected.name}</Text>
      ) : selected ? (
        <Text style={styles.warn}>No measurements yet for {selected.name} — scan in AI Measure</Text>
      ) : null}
      <Input label="Garment type" value={garmentType} onChangeText={setGarmentType} />
      <Input label="Fabric details" value={fabricDetails} onChangeText={setFabricDetails} />
      <Input label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Text style={styles.sectionTitle}>Payment & receipt</Text>
      <Text style={styles.sectionHint}>Receipt is shown to the customer in their app after you submit.</Text>
      <Input label="Total amount (₹) *" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <Input
        label="Amount paid now (₹)"
        value={amountPaid}
        onChangeText={setAmountPaid}
        keyboardType="numeric"
        placeholder="0 if paying later"
      />
      <Text style={styles.label}>Payment status</Text>
      <View style={styles.chipRow}>
        {['pending', 'partial', 'paid'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, paymentStatus === s && styles.chipActive]}
            onPress={() => setPaymentStatus(s)}
          >
            <Text style={[styles.chipText, paymentStatus === s && styles.chipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Payment method</Text>
      <View style={styles.chipRow}>
        {['cash', 'upi', 'card', 'bank', 'other'].map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, paymentMethod === m && styles.chipActive]}
            onPress={() => setPaymentMethod(m)}
          >
            <Text style={[styles.chipText, paymentMethod === m && styles.chipTextActive]}>
              {m.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Input label="Payment note (optional)" value={paymentNotes} onChangeText={setPaymentNotes} multiline />
      <Button title="Submit order & issue receipt" onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  design: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: colors.accent },
  label: { fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  ok: { color: colors.success, marginBottom: 12 },
  warn: { color: colors.warning, marginBottom: 12, fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 16, marginBottom: 4, color: colors.primary },
  sectionHint: { fontSize: 12, color: colors.textLight, marginBottom: 12, lineHeight: 18 },
});
