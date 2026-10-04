import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import { payments } from '../services/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import { colors } from '../theme/colors';

export default function RazorpayQrPayScreen({ navigation, route }) {
  const { guard } = useRequireBackend();
  const orderId = route.params?.orderId;
  const amountInr = route.params?.amountInr;

  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [shortUrl, setShortUrl] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');

  const pollingRef = useRef(null);

  const title = useMemo(() => {
    const amt = Number(amountInr || 0);
    return Number.isFinite(amt) && amt > 0 ? `Pay ₹${amt}` : 'Pay online';
  }, [amountInr]);

  const createLink = async () => {
    if (!(await guard())) return;
    if (!orderId) {
      Alert.alert('Payment', 'Order id missing');
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const { data } = await payments.razorpayCreatePaymentLink({ orderId, amountInr });
      setQrDataUrl(data.qrCodeDataUrl || null);
      setShortUrl(data.shortUrl || null);
      setPaymentStatus(data.paymentStatus || 'pending');
    } catch (e) {
      Alert.alert('Payment error', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      if (!(await guard())) return;
      const { data } = await payments.razorpayPaymentLinkStatus(orderId);
      const st = data.paymentStatus || 'pending';
      setPaymentStatus(st);
      if (st === 'paid') {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        Alert.alert('Payment successful', 'OK', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch {
      // ignore temporary errors while polling
    }
  };

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    createLink();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    if (pollingRef.current) return;
    pollingRef.current = setInterval(checkStatus, 3500);
  }, [orderId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>{title}</Text>
      <Text style={styles.sub}>
        Scan this QR with any UPI app. After payment, this screen will automatically show OK.
      </Text>

      {qrDataUrl ? (
        <View style={styles.qrWrap}>
          <Image source={{ uri: qrDataUrl }} style={styles.qr} />
        </View>
      ) : (
        <Text style={styles.warn}>
          {loading ? 'Generating QR…' : 'QR not available yet. Tap retry.'}
        </Text>
      )}

      {shortUrl ? <Text style={styles.link}>Link: {shortUrl}</Text> : null}

      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text style={[styles.status, paymentStatus === 'paid' && styles.statusPaid]}>
          {String(paymentStatus).toUpperCase()}
        </Text>
      </View>

      <Button title="Retry / Regenerate QR" onPress={createLink} loading={loading} />
      <View style={{ height: 10 }} />
      <Button title="Check status now" onPress={checkStatus} variant="secondary" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  h1: { fontSize: 18, fontWeight: '900', color: colors.primary, marginBottom: 6 },
  sub: { color: colors.textLight, lineHeight: 18, marginBottom: 16, fontSize: 12 },
  qrWrap: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  qr: { width: 280, height: 280 },
  warn: { color: colors.warning, marginBottom: 12, fontSize: 13 },
  link: { fontSize: 12, color: colors.textLight, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  label: { fontWeight: '800' },
  status: { fontWeight: '900', color: colors.warning },
  statusPaid: { color: colors.success },
});

