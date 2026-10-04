import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { orders } from '../services/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import ProgressBar from '../components/ProgressBar';
import { colors } from '../theme/colors';

const STATUS_LABELS = {
  placed: 'Placed',
  measurements_confirmed: 'Measurements OK',
  cutting: 'Cutting',
  stitching: 'Stitching',
  fitting: 'Fitting',
  quality_check: 'Quality Check',
  ready: 'Ready!',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrdersScreen({ navigation }) {
  const { guard } = useRequireBackend();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await orders.dashboard();
    setList(data.orders);
  };

  useFocusEffect(
    useCallback(() => {
      if (!guard()) return;
      load();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop Orders</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('PlaceOrder')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
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
        ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
          >
            <View style={styles.row}>
              <Text style={styles.num}>{item.orderNumber}</Text>
              <Text style={[styles.status, item.status === 'ready' && styles.ready]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
            <Text style={styles.client}>
              {item.clientName || item.shopCustomer?.name || 'Customer'}
            </Text>
            <Text style={styles.type}>{item.garmentType}</Text>
            <ProgressBar percent={item.progressPercent} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 56,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  newBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newBtnText: { color: '#fff', fontWeight: '700' },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { fontWeight: '800', fontSize: 16 },
  status: { fontSize: 12, fontWeight: '600', color: colors.textLight },
  ready: { color: colors.success },
  client: { marginTop: 4, fontWeight: '600', color: colors.primary },
  type: { marginTop: 2, textTransform: 'capitalize', color: colors.textLight },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textLight },
});
