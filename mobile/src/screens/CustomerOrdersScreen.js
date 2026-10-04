import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { orders } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ProgressBar from '../components/ProgressBar';
import PaymentReceiptCard from '../components/PaymentReceiptCard';
import { colors } from '../theme/colors';

const STATUS_LABELS = {
  placed: 'Order placed',
  measurements_confirmed: 'Measurements confirmed',
  cutting: 'Cutting',
  stitching: 'Stitching',
  fitting: 'Fitting',
  quality_check: 'Quality check',
  ready: 'Ready for pickup!',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function CustomerOrdersScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { onOrderUpdate, onNotification } = useSocket();
  const [list, setList] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, ready: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await orders.customerMy();
    setList(data.orders || []);
    setStats(data.stats || {});
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const off1 = onOrderUpdate?.(() => load());
      const off2 = onNotification?.(() => load());
      return () => {
        off1?.();
        off2?.();
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Orders</Text>
      <Text style={styles.emailHint}>Linked email: {user?.email}</Text>

      <View style={styles.stats}>
        <Stat label="Total" value={stats.total} />
        <Stat label="In progress" value={stats.active} />
        <Stat label="Ready" value={stats.ready} color={colors.success} />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="shirt-outline" size={48} color={colors.textLight} />
            <Text style={styles.empty}>
              No orders found for this email.{'\n'}
              Ask your tailor to save your email on your profile, then pull to refresh.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isReady = item.status === 'ready';
          const isDone = item.status === 'delivered';
          return (
            <TouchableOpacity
              style={[styles.card, isReady && styles.cardReady, isDone && styles.cardDone]}
              onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: item._id })}
            >
              <View style={styles.row}>
                <Text style={styles.num}>{item.orderNumber}</Text>
                <Text style={[styles.status, isReady && styles.statusReady]}>
                  {STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
              <Text style={styles.garment}>{item.garmentType}</Text>
              {item.tailor?.name && (
                <Text style={styles.tailor}>Tailor: {item.tailor.name}</Text>
              )}
              <ProgressBar percent={item.progressPercent} />
              {item.paymentReceipt ? (
                <PaymentReceiptCard receipt={item.paymentReceipt} compact />
              ) : null}
              {isReady && (
                <View style={styles.readyBanner}>
                  <Ionicons name="notifications" size={16} color="#fff" />
                  <Text style={styles.readyText}>Your cloth is ready — visit the shop!</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statVal, color && { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', paddingHorizontal: 20, paddingTop: 56 },
  emailHint: { fontSize: 12, color: colors.textLight, paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 8 },
  stat: {
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  statVal: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textLight },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardReady: { borderWidth: 2, borderColor: colors.success },
  cardDone: { opacity: 0.85 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num: { fontWeight: '800', fontSize: 16 },
  status: { fontSize: 12, fontWeight: '700', color: colors.gold },
  statusReady: { color: colors.success },
  garment: { marginTop: 6, textTransform: 'capitalize', color: colors.textLight },
  tailor: { fontSize: 12, color: colors.text, marginTop: 4 },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: colors.success,
    padding: 10,
    borderRadius: 8,
  },
  readyText: { color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 },
  emptyWrap: { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  empty: { textAlign: 'center', marginTop: 12, color: colors.textLight, lineHeight: 22 },
});
