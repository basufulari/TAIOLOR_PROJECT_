import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { orders } from '../services/api';
import { useSocket } from '../context/SocketContext';
import ProgressBar from '../components/ProgressBar';
import Card from '../components/Card';
import PaymentReceiptCard from '../components/PaymentReceiptCard';
import { colors } from '../theme/colors';

const STAGES = [
  'placed',
  'measurements_confirmed',
  'cutting',
  'stitching',
  'fitting',
  'quality_check',
  'ready',
  'delivered',
];

const LABELS = {
  placed: 'Placed',
  measurements_confirmed: 'Measurements',
  cutting: 'Cutting',
  stitching: 'Stitching',
  fitting: 'Fitting',
  quality_check: 'Quality',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function CustomerOrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const { joinOrder, onOrderUpdate } = useSocket();

  const load = async () => {
    const { data } = await orders.customerGet(orderId);
    setOrder(data.order);
  };

  useEffect(() => {
    load();
    joinOrder?.(orderId);
    return onOrderUpdate?.((payload) => {
      if (payload.orderId === orderId) {
        setOrder((o) =>
          o
            ? {
                ...o,
                status: payload.status,
                progressPercent: payload.progressPercent,
              }
            : o
        );
        load();
      }
    });
  }, [orderId]);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const currentIdx = STAGES.indexOf(order.status);
  const isReady = order.status === 'ready';
  const isDelivered = order.status === 'delivered';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      {isReady && (
        <View style={styles.alertReady}>
          <Text style={styles.alertTitle}>Your cloth is ready!</Text>
          <Text style={styles.alertSub}>Visit your tailor to collect order {order.orderNumber}</Text>
        </View>
      )}
      {isDelivered && (
        <View style={styles.alertDone}>
          <Text style={styles.alertTitle}>Order completed</Text>
          <Text style={styles.alertSub}>Thank you for choosing AI Tailor</Text>
        </View>
      )}

      <Text style={styles.num}>{order.orderNumber}</Text>
      <Text style={styles.status}>{LABELS[order.status] || order.status}</Text>
      <ProgressBar percent={order.progressPercent} label="Progress" />

      <Text style={styles.receiptSectionTitle}>Payment receipt</Text>
      <PaymentReceiptCard receipt={order.paymentReceipt} />

      <Card>
        <Text style={styles.label}>Garment</Text>
        <Text style={styles.val}>{order.garmentType}</Text>
        {order.fabricDetails && (
          <>
            <Text style={styles.label}>Fabric</Text>
            <Text style={styles.val}>{order.fabricDetails}</Text>
          </>
        )}
        {order.tailor?.name && (
          <>
            <Text style={styles.label}>Tailor</Text>
            <Text style={styles.val}>{order.tailor.name}</Text>
          </>
        )}
        {order.estimatedDelivery && (
          <>
            <Text style={styles.label}>Estimated delivery</Text>
            <Text style={styles.val}>{new Date(order.estimatedDelivery).toLocaleDateString()}</Text>
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.label}>Production stages</Text>
        {STAGES.filter((s) => s !== 'cancelled').map((stage, i) => {
          const done = currentIdx >= i && order.status !== 'cancelled';
          const active = order.status === stage;
          return (
            <View key={stage} style={styles.stageRow}>
              <Text style={[styles.stageDot, done && styles.stageDotDone, active && styles.stageDotActive]}>
                {done ? '✓' : '○'}
              </Text>
              <Text style={[styles.stageLabel, done && styles.stageLabelDone]}>{LABELS[stage]}</Text>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={styles.label}>Status updates</Text>
        {(order.statusHistory || []).slice().reverse().map((h, i) => (
          <View key={i} style={styles.hist}>
            <Text style={styles.histStatus}>{LABELS[h.status] || h.status}</Text>
            <Text style={styles.histNote}>{h.note}</Text>
            <Text style={styles.histDate}>{new Date(h.at).toLocaleString()}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  alertReady: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertDone: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  alertSub: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  receiptSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 10,
    color: colors.primary,
  },
  num: { fontSize: 22, fontWeight: '800' },
  status: { fontSize: 16, color: colors.gold, fontWeight: '700', marginVertical: 8, textTransform: 'capitalize' },
  label: { fontSize: 12, color: colors.textLight, marginTop: 8, textTransform: 'uppercase' },
  val: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  stageRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  stageDot: { width: 28, color: colors.textLight, fontWeight: '700' },
  stageDotDone: { color: colors.success },
  stageDotActive: { color: colors.accent },
  stageLabel: { color: colors.textLight },
  stageLabelDone: { color: colors.text, fontWeight: '600' },
  hist: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  histStatus: { fontWeight: '700', textTransform: 'capitalize' },
  histNote: { color: colors.textLight, fontSize: 13, marginTop: 2 },
  histDate: { fontSize: 11, color: colors.textLight, marginTop: 4 },
});
