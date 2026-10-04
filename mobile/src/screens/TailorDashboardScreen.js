import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { orders } from '../services/api';
import { goToMainTab } from '../navigation/helpers';
import ProgressBar from '../components/ProgressBar';
import { colors } from '../theme/colors';

const NEXT_STATUS = {
  placed: 'measurements_confirmed',
  measurements_confirmed: 'cutting',
  cutting: 'stitching',
  stitching: 'fitting',
  fitting: 'quality_check',
  quality_check: 'ready',
  ready: 'delivered',
};

export default function TailorDashboardScreen() {
  const navigation = useNavigation();
  const [ordersList, setOrdersList] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, ready: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await orders.dashboard();
    setOrdersList(data.orders);
    setStats(data.stats);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const advanceStatus = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) {
      Alert.alert('Done', 'Order is at final stage');
      return;
    }
    try {
      await orders.updateStatus(order._id, { status: next });
      await load();
      if (next === 'ready') {
        Alert.alert('Customer notified', 'Cloth is ready — notification sent.');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tailor Dashboard</Text>
      <View style={styles.stats}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Ready" value={stats.ready} color={colors.success} />
      </View>
      <TouchableOpacity
        style={styles.recordsBtn}
        onPress={() => goToMainTab(navigation, 'Customers')}
      >
        <Ionicons name="people" size={20} color="#fff" />
        <Text style={styles.recordsBtnText}>All customer records & measurements</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
      <FlatList
        data={ordersList}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
          >
            <Text style={styles.num}>{item.orderNumber}</Text>
            <Text style={styles.customer}>
              {item.clientName || item.shopCustomer?.name || 'Customer'}
            </Text>
            <Text style={styles.status}>{item.status.replace(/_/g, ' ')}</Text>
            <ProgressBar percent={item.progressPercent} />
            {item.measurements && (
              <Text style={styles.meas}>
                Chest {item.measurements.chest}cm · Waist {item.measurements.waist}cm
              </Text>
            )}
            <TouchableOpacity style={styles.btn} onPress={() => advanceStatus(item)}>
              <Text style={styles.btnText}>
                {NEXT_STATUS[item.status]
                  ? `Mark as ${NEXT_STATUS[item.status].replace(/_/g, ' ')}`
                  : 'Complete'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
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
  title: { fontSize: 24, fontWeight: '800', padding: 20, paddingTop: 56 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 8 },
  recordsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  recordsBtnText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  stat: { alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 12, flex: 1, marginHorizontal: 4 },
  statVal: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textLight },
  list: { padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  num: { fontWeight: '800', fontSize: 16 },
  customer: { marginTop: 4, color: colors.textLight },
  status: { textTransform: 'capitalize', marginTop: 8, color: colors.gold, fontWeight: '600' },
  meas: { fontSize: 12, color: colors.textLight, marginTop: 8 },
  btn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
