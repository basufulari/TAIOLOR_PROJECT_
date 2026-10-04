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
import { notifications } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { colors } from '../theme/colors';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { isCustomer } = useAuth();
  const { onNotification } = useSocket();
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await notifications.list();
    setList(data.notifications || []);
    setUnread(data.unread ?? 0);
  };

  useFocusEffect(
    useCallback(() => {
      load();
      notifications.markAllRead();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const off = onNotification?.(() => load());
      return () => off?.();
    }, [])
  );

  const openOrder = (item) => {
    const orderId =
      item.order?._id || item.order?.id || item.order || item.data?.orderId;
    if (!orderId) return;
    if (isCustomer) {
      navigation.navigate('CustomerOrderDetail', { orderId: String(orderId) });
    } else {
      navigation.navigate('OrderDetail', { orderId: String(orderId) });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {unread > 0 && <Text style={styles.unreadBadge}>{unread} new</Text>}
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
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
        renderItem={({ item }) => {
          const isComplete = item.type === 'order_complete' || item.title?.includes('ready');
          const Wrapper = item.order ? TouchableOpacity : View;
          return (
            <Wrapper
              style={[
                styles.card,
                !item.read && styles.unread,
                isComplete && styles.completeCard,
              ]}
              onPress={item.order ? () => openOrder(item) : undefined}
              activeOpacity={item.order ? 0.7 : 1}
            >
              {isComplete && (
                <View style={styles.completeRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.completeTag}>Important</Text>
                </View>
              )}
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.msg}>{item.message}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.order && (
                <Text style={styles.tapHint}>Tap to view order progress →</Text>
              )}
            </Wrapper>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', padding: 20, paddingTop: 56, paddingBottom: 4 },
  unreadBadge: {
    marginHorizontal: 20,
    marginBottom: 8,
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  unread: { borderLeftWidth: 4, borderLeftColor: colors.accent },
  completeCard: { borderLeftWidth: 4, borderLeftColor: colors.success },
  completeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  completeTag: { color: colors.success, fontWeight: '700', fontSize: 11 },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  msg: { color: colors.textLight, marginTop: 4, lineHeight: 20 },
  date: { fontSize: 11, color: colors.textLight, marginTop: 8 },
  tapHint: { fontSize: 11, color: colors.accent, marginTop: 8, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textLight },
});
