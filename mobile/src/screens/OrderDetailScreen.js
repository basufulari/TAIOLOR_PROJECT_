import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { orders } from '../services/api';
import { useSocket } from '../context/SocketContext';
import ProgressBar from '../components/ProgressBar';
import Card from '../components/Card';
import PaymentReceiptCard from '../components/PaymentReceiptCard';
import { colors } from '../theme/colors';

export default function OrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const { joinOrder, onOrderUpdate } = useSocket();

  const load = async () => {
    const { data } = await orders.get(orderId);
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
      }
    });
  }, [orderId]);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const rec = order.sizeRecommendation;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <Text style={styles.num}>{order.orderNumber}</Text>
      <Text style={styles.client}>
        {order.clientName || order.shopCustomer?.name || 'Customer'}
        {order.clientPhone || order.shopCustomer?.phone
          ? ` · ${order.clientPhone || order.shopCustomer?.phone}`
          : ''}
      </Text>
      <Text style={styles.status}>{order.status.replace(/_/g, ' ')}</Text>
      <ProgressBar percent={order.progressPercent} label="Progress" />

      {order.paymentReceipt && (
        <>
          <Text style={styles.receiptTitle}>Payment receipt (customer view)</Text>
          <PaymentReceiptCard receipt={order.paymentReceipt} />
        </>
      )}

      <Card>
        <Text style={styles.label}>Garment</Text>
        <Text style={styles.val}>{order.garmentType}</Text>
        {order.fabricDetails && (
          <>
            <Text style={styles.label}>Fabric</Text>
            <Text style={styles.val}>{order.fabricDetails}</Text>
          </>
        )}
      </Card>

      {rec && (
        <Card>
          <Text style={styles.label}>AI Size Recommendation</Text>
          <Text style={styles.size}>
            {rec.recommended_size || rec.recommendedSize} — {rec.fit_type || rec.fitType}
          </Text>
        </Card>
      )}

      {order.measurements && (
        <Card>
          <Text style={styles.label}>Measurements Used</Text>
          <Text style={styles.val}>
            Chest {order.measurements.chest} · Waist {order.measurements.waist} cm
          </Text>
        </Card>
      )}

      <Card>
        <Text style={styles.label}>Status History</Text>
        {(order.statusHistory || []).slice().reverse().map((h, i) => (
          <View key={i} style={styles.hist}>
            <Text style={styles.histStatus}>{h.status}</Text>
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
  receiptTitle: { fontSize: 14, fontWeight: '800', marginTop: 12, marginBottom: 8, color: colors.primary },
  num: { fontSize: 22, fontWeight: '800' },
  client: { fontSize: 16, fontWeight: '600', color: colors.primary, marginTop: 4 },
  status: { textTransform: 'capitalize', color: colors.accent, marginVertical: 8 },
  label: { fontSize: 12, color: colors.textLight, marginTop: 8 },
  val: { fontSize: 16, fontWeight: '600' },
  size: { fontSize: 18, fontWeight: '700', color: colors.accent },
  hist: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  histStatus: { fontWeight: '600', textTransform: 'capitalize' },
  histDate: { fontSize: 11, color: colors.textLight },
});
