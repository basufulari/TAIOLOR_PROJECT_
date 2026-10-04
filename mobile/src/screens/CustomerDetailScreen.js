import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import { customers } from '../services/api';
import { mediaUrl } from '../config/api';
import Card from '../components/Card';
import { colors } from '../theme/colors';

const MEASURE_FIELDS = [
  ['Height', 'height', true],
  ['Chest', 'chest'],
  ['Waist', 'waist'],
  ['Shoulder', 'shoulder'],
  ['Sleeve', 'sleeveLength'],
  ['Arm length', 'armLength'],
  ['Forearm', 'forearm'],
  ['Hips', 'hips'],
  ['Inseam', 'inseam'],
  ['Thigh', 'thigh'],
  ['Neck', 'neck'],
  ['Bicep', 'bicep'],
];

const STATUS_LABELS = {
  placed: 'Placed',
  measurements_confirmed: 'Measurements OK',
  cutting: 'Cutting',
  stitching: 'Stitching',
  fitting: 'Fitting',
  quality_check: 'Quality Check',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function fmt(d) {
  return d ? new Date(d).toLocaleString() : '—';
}

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId } = route.params;
  const [data, setData] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    const { data: res } = await customers.get(customerId);
    setData(res);
    if (res?.measurements?.length && !expandedId) {
      setExpandedId(res.measurements.find((m) => m.isPrimary)?.id || res.measurements[0]?.id);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  if (!data?.customer) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const { customer, measurements, orders, stats } = data;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <Text style={styles.title}>{customer.name}</Text>
      <Text style={styles.statsLine}>
        {stats.measurementCount} measurement{stats.measurementCount === 1 ? '' : 's'} ·{' '}
        {stats.orderCount} order{stats.orderCount === 1 ? '' : 's'}
      </Text>

      <Card>
        <Text style={styles.sectionTitle}>Contact & notes</Text>
        <InfoRow label="Phone" value={customer.phone} />
        <InfoRow label="Email" value={customer.email} />
        <InfoRow label="Address" value={customer.address} />
        <InfoRow label="Notes" value={customer.notes} />
        <InfoRow label="Customer since" value={fmt(customer.createdAt)} />
        <InfoRow label="Last updated" value={fmt(customer.updatedAt)} />
      </Card>

      <Text style={styles.sectionHeader}>Measurement history</Text>
      {measurements.length === 0 ? (
        <Card>
          <Text style={styles.empty}>No scans yet. Use AI Measure to add measurements.</Text>
        </Card>
      ) : (
        measurements.map((m) => (
          <Card key={m.id} style={m.isPrimary && styles.primaryCard}>
            <TouchableOpacity
              onPress={() => setExpandedId(expandedId === m.id ? null : m.id)}
              activeOpacity={0.8}
            >
              <View style={styles.measHead}>
                <Text style={styles.measTitle}>
                  {m.isPrimary ? '★ Primary scan' : 'Scan'} · {fmt(m.scannedAt)}
                </Text>
                <Text style={styles.chevron}>{expandedId === m.id ? '▲' : '▼'}</Text>
              </View>
              <Text style={styles.measSummary}>
                H {m.height ?? '—'} cm · Chest {m.chest ?? '—'} · Waist {m.waist ?? '—'}
                {m.confidence != null ? ` · ${(m.confidence * 100).toFixed(0)}% conf` : ''}
              </Text>
            </TouchableOpacity>

            {expandedId === m.id && (
              <View style={styles.expanded}>
                <Text style={styles.subSection}>Body measurements ({m.unit || 'cm'})</Text>
                {MEASURE_FIELDS.map(([label, key, hi]) => (
                  <MeasRow key={key} label={label} value={m[key]} highlight={hi} unit={m.unit} />
                ))}

                {(m.customerName || m.customerPhone || m.customerEmail) && (
                  <>
                    <Text style={[styles.subSection, { marginTop: 12 }]}>Snapshot at scan time</Text>
                    {m.customerName ? <InfoRow label="Name" value={m.customerName} /> : null}
                    {m.customerPhone ? <InfoRow label="Phone" value={m.customerPhone} /> : null}
                    {m.customerEmail ? <InfoRow label="Email" value={m.customerEmail} /> : null}
                    {m.customerAddress ? <InfoRow label="Address" value={m.customerAddress} /> : null}
                    {m.customerNotes ? <InfoRow label="Notes" value={m.customerNotes} /> : null}
                  </>
                )}

                {m.aiMetadata?.method && (
                  <InfoRow label="AI method" value={String(m.aiMetadata.method)} />
                )}
                {m.aiMetadata?.usedFallback && (
                  <Text style={styles.warn}>Estimated (AI offline at scan time)</Text>
                )}

                {m.laserScanImage ? (
                  <View style={styles.laserWrap}>
                    <Text style={styles.laserBadge}>LASER SCAN</Text>
                    <Image
                      source={{ uri: mediaUrl(m.laserScanImage) }}
                      style={styles.laserImg}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}
              </View>
            )}
          </Card>
        ))
      )}

      {orders.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Orders</Text>
          {orders.map((o) => (
            <TouchableOpacity
              key={o._id}
              onPress={() => navigation.navigate('OrderDetail', { orderId: o._id })}
            >
              <Card>
                <Text style={styles.orderNum}>{o.orderNumber}</Text>
                <Text style={styles.orderMeta}>
                  {o.garmentType} · {STATUS_LABELS[o.status] || o.status}
                </Text>
                {o.measurements && (
                  <Text style={styles.orderMeas}>
                    Order measurements: Chest {o.measurements.chest} · Waist {o.measurements.waist} cm
                  </Text>
                )}
                <Text style={styles.orderDate}>{fmt(o.createdAt)}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoVal}>{value}</Text>
    </View>
  );
}

function MeasRow({ label, value, highlight, unit }) {
  const u = unit || 'cm';
  return (
    <View style={[styles.measRow, highlight && styles.measRowHi]}>
      <Text style={highlight && styles.measLabelHi}>{label}</Text>
      <Text style={[styles.measVal, highlight && styles.measValHi]}>
        {value != null ? `${value} ${u}` : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', padding: 20, paddingBottom: 4, color: colors.primary },
  statsLine: { fontSize: 13, color: colors.textLight, paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 10, color: colors.primary },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  primaryCard: { borderWidth: 1, borderColor: colors.gold },
  measHead: { flexDirection: 'row', justifyContent: 'space-between' },
  measTitle: { fontWeight: '700', flex: 1 },
  chevron: { color: colors.textLight, fontSize: 12 },
  measSummary: { fontSize: 12, color: colors.textLight, marginTop: 6 },
  expanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  subSection: { fontWeight: '700', fontSize: 13, marginBottom: 8, color: colors.primary },
  measRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  measRowHi: {
    backgroundColor: 'rgba(244,162,97,0.12)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  measLabelHi: { fontWeight: '700' },
  measVal: { fontWeight: '600' },
  measValHi: { color: colors.accent, fontSize: 16 },
  infoRow: { marginBottom: 8 },
  infoLabel: { fontSize: 11, color: colors.textLight, textTransform: 'uppercase' },
  infoVal: { fontSize: 15, color: colors.text, marginTop: 2 },
  laserWrap: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00ff88',
    overflow: 'hidden',
    backgroundColor: '#0a0f0a',
  },
  laserBadge: {
    color: '#00ff88',
    fontWeight: '800',
    fontSize: 10,
    textAlign: 'center',
    padding: 6,
    letterSpacing: 1,
  },
  laserImg: { width: '100%', height: 240 },
  warn: { fontSize: 11, color: colors.warning, marginTop: 6 },
  empty: { color: colors.textLight, textAlign: 'center' },
  orderNum: { fontWeight: '800', fontSize: 15 },
  orderMeta: { marginTop: 4, textTransform: 'capitalize', color: colors.textLight },
  orderMeas: { fontSize: 12, marginTop: 6, color: colors.text },
  orderDate: { fontSize: 11, color: colors.textLight, marginTop: 6 },
});
