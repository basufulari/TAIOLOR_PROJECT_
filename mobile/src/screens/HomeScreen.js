import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { measurements, notifications as notifApi } from '../services/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import Card from '../components/Card';
import { colors } from '../theme/colors';

const QUICK_ACTIONS = [
  { title: 'AI Measure', icon: 'scan', screen: 'Measure', tab: true },
  { title: 'Design Canvas', icon: 'brush', screen: 'DesignCanvas' },
  { title: 'Virtual Try-On', icon: 'glasses', screen: 'TryOn' },
  { title: 'New Order', icon: 'add-circle', screen: 'PlaceOrder' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { onNotification } = useSocket();
  const { guard } = useRequireBackend();
  const [primary, setPrimary] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user?._previewOnly) return;
    measurements.primary().then((r) => setPrimary(r.data.measurement)).catch(() => {});
    notifApi.list().then((r) => {
      setUnread(r.data.notifications.filter((n) => !n.read).length);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    return onNotification?.(() => {
      setUnread((u) => u + 1);
    });
  }, [onNotification]);

  const navigate = (action) => {
    if (!guard()) return;
    if (action.tab) navigation.navigate(action.screen);
    else navigation.navigate(action.screen);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={colors.gradient} style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.headerSub}>Your smart tailoring assistant</Text>
        {unread > 0 && (
          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications" size={24} color="#fff" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.section}>Quick Actions</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.title} style={styles.action} onPress={() => navigate(a)}>
              <Ionicons name={a.icon} size={28} color={colors.accent} />
              <Text style={styles.actionText}>{a.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {primary ? (
          <Card>
            <Text style={styles.cardTitle}>Latest Measurements</Text>
            <View style={styles.measRow}>
              <Meas label="Chest" value={primary.chest} />
              <Meas label="Waist" value={primary.waist} />
              <Meas label="Shoulder" value={primary.shoulder} />
            </View>
            <View style={styles.measRow}>
              <Meas label="Sleeve" value={primary.sleeveLength} />
              <Meas label="Height" value={primary.height} />
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={styles.cardTitle}>Get started</Text>
            <Text style={styles.hint}>
              Upload a full-body photo to detect measurements automatically with AI.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Measure')}>
              <Text style={styles.link}>Scan now →</Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function Meas({ label, value }) {
  return (
    <View style={styles.meas}>
      <Text style={styles.measVal}>{value ?? '—'} cm</Text>
      <Text style={styles.measLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  bell: { position: 'absolute', right: 24, top: 56 },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: colors.gold,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  body: { padding: 20 },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  action: {
    width: '47%',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 2,
  },
  actionText: { marginTop: 8, fontWeight: '600', color: colors.text, fontSize: 13 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  measRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meas: { alignItems: 'center', flex: 1 },
  measVal: { fontSize: 16, fontWeight: '700', color: colors.accent },
  measLabel: { fontSize: 12, color: colors.textLight },
  hint: { color: colors.textLight, lineHeight: 20 },
  link: { color: colors.accent, fontWeight: '700', marginTop: 8 },
});
