import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { admin as adminApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FadeInView from '../components/FadeInView';
import { colors } from '../theme/colors';

const SECTIONS = [
  { key: 'users', label: 'Users', icon: 'people' },
  { key: 'customers', label: 'Customers', icon: 'person-circle' },
  { key: 'measurements', label: 'Measures', icon: 'body' },
  { key: 'orders', label: 'Orders', icon: 'receipt' },
  { key: 'designs', label: 'Designs', icon: 'shirt' },
];

function StatCard({ label, value, icon, accent, index }) {
  return (
    <FadeInView delay={index * 70} slide={10} duration={400}>
      <View style={[styles.statCard, accent && styles.statCardAccent]}>
        <Ionicons name={icon} size={22} color={accent ? '#fff' : colors.gold} />
        <Text style={[styles.statVal, accent && styles.statValLight]}>{value}</Text>
        <Text style={[styles.statLbl, accent && styles.statLblLight]}>{label}</Text>
      </View>
    </FadeInView>
  );
}

function Row({ title, sub, meta, index }) {
  return (
    <FadeInView delay={Math.min(index * 45, 360)} slide={14} duration={380}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
          {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </View>
    </FadeInView>
  );
}

export default function AdminScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [section, setSection] = useState('users');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setError(null);
      const [dash, all] = await Promise.all([adminApi.dashboard(), adminApi.data()]);
      setStats(dash.data.stats);
      setData(all.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item, index }) => {
    switch (section) {
      case 'users':
        return (
          <Row
            index={index}
            title={item.name}
            sub={item.email}
            meta={`${item.role} · ${item.phone || '—'}`}
          />
        );
      case 'customers':
        return (
          <Row
            index={index}
            title={item.name}
            sub={item.phone || item.email || '—'}
            meta={`Tailor: ${item.tailor?.name || '—'}`}
          />
        );
      case 'measurements':
        return (
          <Row
            index={index}
            title={item.customerName || item.customer?.name || 'Customer'}
            sub={`Chest ${item.chest ?? '—'} · Waist ${item.waist ?? '—'} · H ${item.height ?? '—'} cm`}
            meta={new Date(item.createdAt).toLocaleString()}
          />
        );
      case 'orders':
        return (
          <Row
            index={index}
            title={item.orderNumber}
            sub={item.clientName || item.shopCustomer?.name || '—'}
            meta={`${item.status} · ₹${item.totalAmount ?? 0}`}
          />
        );
      case 'designs':
        return (
          <Row
            index={index}
            title={item.title}
            sub={item.category}
            meta={item.source === 'canvas' ? 'Canvas sketch' : 'Upload'}
          />
        );
      default:
        return null;
    }
  };

  const list = data?.[section] || [];
  const statItems = stats
    ? [
        { label: 'Users', value: stats.users, icon: 'people' },
        { label: 'Tailors', value: stats.tailors, icon: 'cut' },
        { label: 'Customers', value: stats.customers, icon: 'person' },
        { label: 'Measures', value: stats.measurements, icon: 'body', accent: true },
        { label: 'Orders', value: stats.orders, icon: 'receipt' },
        { label: 'Designs', value: stats.designs, icon: 'shirt' },
      ]
    : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.header}>
        <FadeInView slide={8} duration={500}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.badge}>ADMIN CONSOLE</Text>
              <Text style={styles.greet}>Hi, {user?.name?.split(' ')[0] || 'Admin'}</Text>
              <Text style={styles.sub}>Live data from MongoDB Atlas</Text>
            </View>
            <View style={styles.shield}>
              <Ionicons name="shield-checkmark" size={32} color={colors.gold} />
            </View>
          </View>
        </FadeInView>
        {stats && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            {statItems.map((s, i) => (
              <StatCard key={s.label} index={i} {...s} />
            ))}
          </ScrollView>
        )}
      </LinearGradient>

      <FadeInView delay={150} slide={6}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
          contentContainerStyle={styles.tabsInner}
        >
          {SECTIONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.tab, section === s.key && styles.tabActive]}
              onPress={() => setSection(s.key)}
            >
              <Ionicons
                name={s.icon}
                size={16}
                color={section === s.key ? '#fff' : colors.textLight}
              />
              <Text style={[styles.tabText, section === s.key && styles.tabTextActive]}>{s.label}</Text>
              <View style={styles.tabCount}>
                <Text style={[styles.tabCountText, section === s.key && styles.tabCountTextActive]}>
                  {data?.[s.key]?.length ?? 0}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </FadeInView>

      {error ? (
        <View style={styles.errBox}>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        key={section}
        data={list}
        keyExtractor={(item, i) => String(item._id || i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <FadeInView>
            <Text style={styles.empty}>No {section} in database yet</Text>
          </FadeInView>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f8' },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  greet: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  shield: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsScroll: { marginTop: 18 },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 14,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  statCardAccent: { backgroundColor: colors.accent },
  statVal: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  statValLight: { color: '#fff' },
  statLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  statLblLight: { color: 'rgba(255,255,255,0.9)' },
  tabs: { maxHeight: 52, marginTop: 12 },
  tabsInner: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
  tabTextActive: { color: '#fff' },
  tabCount: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  tabCountText: { fontSize: 10, fontWeight: '700', color: colors.textLight },
  tabCountTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  rowSub: { fontSize: 13, color: colors.textLight, marginTop: 4 },
  rowMeta: { fontSize: 11, color: colors.gold, marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textLight, marginTop: 40 },
  errBox: { margin: 16, padding: 12, backgroundColor: '#fee', borderRadius: 10 },
  errText: { color: '#c00' },
  retry: { color: colors.accent, fontWeight: '700', marginTop: 8 },
});
