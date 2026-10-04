import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { customers } from '../services/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import { colors } from '../theme/colors';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomersScreen({ navigation }) {
  const { guard } = useRequireBackend();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    const { data } = await customers.records();
    setList(data.customers || []);
  };

  useFocusEffect(
    useCallback(() => {
      if (!guard()) return;
      load();
    }, [])
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      )
    : list;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Records</Text>
      <Text style={styles.subtitle}>
        All saved customers with measurements — for future reference
      </Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textLight} />
        <TextInput
          style={styles.search}
          placeholder="Search name, phone, email…"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={colors.textLight}
        />
      </View>

      <FlatList
        data={filtered}
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
          <Text style={styles.empty}>
            {q ? 'No customers match your search' : 'No customers yet — scan from AI Measure tab'}
          </Text>
        }
        renderItem={({ item }) => {
          const m = item.latestMeasurement;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item._id })}
            >
              <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </View>
              {item.phone ? <Text style={styles.meta}>📞 {item.phone}</Text> : null}
              {item.email ? <Text style={styles.meta}>✉ {item.email}</Text> : null}
              <View style={styles.badges}>
                <Badge
                  icon="body"
                  label={`${item.measurementCount || 0} scan${item.measurementCount === 1 ? '' : 's'}`}
                />
                {item.orderCount > 0 && (
                  <Badge icon="receipt" label={`${item.orderCount} order${item.orderCount === 1 ? '' : 's'}`} />
                )}
              </View>
              {m ? (
                <Text style={styles.measPreview}>
                  Latest: H {m.height ?? '—'} · Chest {m.chest ?? '—'} · Waist {m.waist ?? '—'} cm
                  {m.isPrimary ? ' · Primary' : ''}
                </Text>
              ) : (
                <Text style={styles.noMeas}>No measurements saved yet</Text>
              )}
              <Text style={styles.date}>Updated {formatDate(item.updatedAt)}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function Badge({ icon, label }) {
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={12} color={colors.primary} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, paddingHorizontal: 20, paddingTop: 56 },
  subtitle: { fontSize: 13, color: colors.textLight, paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 15, color: colors.text },
  list: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: colors.primary, flex: 1 },
  meta: { fontSize: 13, color: colors.textLight, marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,162,97,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  measPreview: { fontSize: 12, color: colors.text, marginTop: 10, fontWeight: '600' },
  noMeas: { fontSize: 12, color: colors.textLight, marginTop: 8, fontStyle: 'italic' },
  date: { fontSize: 11, color: colors.textLight, marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 48, color: colors.textLight, paddingHorizontal: 24 },
});
