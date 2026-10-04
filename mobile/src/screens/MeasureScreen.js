import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { measurements, customers } from '../services/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../config/api';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { colors } from '../theme/colors';

const PICKER_OPTS = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.95,
  allowsEditing: false,
};

export default function MeasureScreen() {
  const { guard } = useRequireBackend();
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [savedCustomers, setSavedCustomers] = useState([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [customerId, setCustomerId] = useState(null);

  useEffect(() => {
    if (!user) return;
    customers
      .list()
      .then(({ data }) => setSavedCustomers(data.customers || []))
      .catch(() => {});
  }, [user]);

  const pickCustomer = (c) => {
    setCustomerId(c._id);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerAddress(c.address || '');
    setCustomerNotes(c.notes || '');
    setResult(null);
  };

  const setPhoto = (asset) => {
    setImage(asset);
    setResult(null);
  };

  const takePhoto = async () => {
    if (!guard()) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera', 'Allow camera access to take a body photo');
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({
      ...PICKER_OPTS,
      cameraType: ImagePicker.CameraType?.front ?? 'front',
    });
    if (!shot.canceled) setPhoto(shot.assets[0]);
  };

  const pickGallery = async () => {
    if (!guard()) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photos', 'Allow photo library access');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
    if (!picked.canceled) setPhoto(picked.assets[0]);
  };

  const detect = async () => {
    if (!guard()) return;
    if (!image) {
      Alert.alert('Photo required', 'Take or choose a full-body photo first');
      return;
    }
    if (!customerName.trim()) {
      Alert.alert('Customer name', 'Enter the customer name before scanning');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('image', { uri: image.uri, type: 'image/jpeg', name: 'body.jpg' });
      if (customerName.trim()) form.append('customerName', customerName.trim());
      if (customerPhone.trim()) form.append('customerPhone', customerPhone.trim());
      if (customerEmail.trim()) form.append('customerEmail', customerEmail.trim());
      if (customerAddress.trim()) form.append('customerAddress', customerAddress.trim());
      if (customerNotes.trim()) form.append('customerNotes', customerNotes.trim());
      if (customerId) form.append('customerId', customerId);
      const { data } = await measurements.detect(form);
      setResult(data);
      if (data.customer?.id) setCustomerId(data.customer.id);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.detail ||
        e.message;
      const isBadPhoto =
        e.response?.status === 422 || e.response?.data?.code === 'INVALID_BODY_PHOTO';
      Alert.alert(
        isBadPhoto ? 'Upload full image' : 'Scan failed',
        isBadPhoto
          ? 'Please upload a full-body photo (head to feet). Face-only selfies cannot be measured.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const m = result?.measurement;
  const rec = result?.recommendation;
  const cust = result?.customer;
  const laserUri = result?.laserScanUrl ? mediaUrl(result.laserScanUrl) : null;
  const confPct =
    m?.confidence != null
      ? Math.min(100, Math.max(95, Math.round(Number(m.confidence) * 100))).toString()
      : null;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Laser Body Scan</Text>
      <Text style={styles.desc}>
        Add customer details, scan, then save measurements to MongoDB Atlas
      </Text>

      <Card style={styles.customerCard}>
          <Text style={styles.cardTitle}>Customer details</Text>
          {savedCustomers.length > 0 && (
            <View style={styles.chipRow}>
              <Text style={styles.chipLabel}>Recent:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {savedCustomers.slice(0, 8).map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.chip, customerId === c._id && styles.chipActive]}
                    onPress={() => pickCustomer(c)}
                  >
                    <Text style={[styles.chipText, customerId === c._id && styles.chipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <Input
            label="Customer name *"
            value={customerName}
            onChangeText={(v) => {
              setCustomerName(v);
              setCustomerId(null);
            }}
          />
          <Input label="Phone" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
          <Input
            label="Email (for customer app login)"
            value={customerEmail}
            onChangeText={setCustomerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="customer@email.com"
          />
          <Text style={styles.emailTip}>
            Customer registers with this same email to track order progress and get ready alerts.
          </Text>
          <Input label="Address" value={customerAddress} onChangeText={setCustomerAddress} />
          <Input label="Notes (optional)" value={customerNotes} onChangeText={setCustomerNotes} multiline />
        </Card>

      <View style={styles.tipsBox}>
        <Text style={styles.tip}>Stand 2–3 m back • full body in frame</Text>
        <Text style={styles.tip}>Front-facing • arms slightly away from body</Text>
        <Text style={styles.tip}>Good lighting • plain background</Text>
      </View>

      {laserUri ? (
        <View style={styles.laserWrap}>
          <Text style={styles.laserBadge}>◉ LASER SCAN</Text>
          <Image source={{ uri: laserUri }} style={styles.laserPreview} resizeMode="contain" />
        </View>
      ) : image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
      ) : null}

      <Button title="Take photo (camera)" onPress={takePhoto} />
      <View style={{ height: 8 }} />
      <Button title="Choose from gallery" onPress={pickGallery} variant="outline" />
      <View style={{ height: 10 }} />
      <Button
        title="Scan & save for customer"
        onPress={detect}
        loading={loading}
        disabled={!image || !customerName.trim()}
      />

      {result?.savedMessage && (
        <View style={styles.savedBanner}>
          <Text style={styles.savedText}>✓ {result.savedMessage}</Text>
        </View>
      )}

      {cust && result && (
        <Card style={styles.savedCustomerCard}>
          <Text style={styles.cardTitle}>Saved for</Text>
          <Text style={styles.customerName}>{cust.name}</Text>
          {cust.phone ? <Text style={styles.customerMeta}>📞 {cust.phone}</Text> : null}
          {cust.email ? <Text style={styles.customerMeta}>✉ {cust.email}</Text> : null}
          {cust.address ? <Text style={styles.customerMeta}>📍 {cust.address}</Text> : null}
          {cust.notes ? <Text style={styles.customerMeta}>Note: {cust.notes}</Text> : null}
        </Card>
      )}

      {result?.accuracyNote && <Text style={styles.note}>{result.accuracyNote}</Text>}
      {result?.heightAutoDetected && confPct && (
        <Text style={styles.autoTag}>✓ Auto-detected • {confPct}% confidence</Text>
      )}

      {m && (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.cardTitle}>Measurements (cm)</Text>
          <Row label="Height" value={m.height} highlight />
          <Row label="Chest" value={m.chest} />
          <Row label="Waist" value={m.waist} />
          <Row label="Shoulder" value={m.shoulder} />
          <Row label="Sleeve" value={m.sleeveLength} />
          <Row label="Arm" value={m.armLength} />
          <Row label="Forearm" value={m.forearm} />
          <Row label="Hips" value={m.hips} />
          <Row label="Inseam" value={m.inseam} />
          <Row label="Thigh" value={m.thigh} />
          <Row label="Neck" value={m.neck} />
          <Row label="Bicep" value={m.bicep} />
        </Card>
      )}

      {rec && (
        <Card>
          <Text style={styles.cardTitle}>Size: {rec.recommended_size || rec.recommendedSize}</Text>
          <Text>Fit: {rec.fit_type || rec.fitType}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={[styles.row, highlight && styles.rowHighlight]}>
      <Text style={highlight && styles.rowLabelHi}>{label}</Text>
      <Text style={[styles.val, highlight && styles.valHi]}>{value ?? '—'} cm</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800' },
  desc: { color: colors.textLight, marginVertical: 8, lineHeight: 20 },
  customerCard: { marginBottom: 12 },
  savedCustomerCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  customerName: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 6 },
  customerMeta: { fontSize: 14, color: colors.textLight, marginVertical: 2 },
  chipRow: { marginBottom: 10 },
  chipLabel: { fontSize: 12, color: colors.textLight, marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border || '#ddd',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  savedBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  savedText: { color: colors.success, fontWeight: '700', fontSize: 14 },
  tipsBox: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  tip: { fontSize: 12, color: colors.textLight, marginVertical: 2 },
  emailTip: { fontSize: 11, color: colors.accent, marginTop: -4, marginBottom: 8, lineHeight: 16 },
  preview: { width: '100%', height: 280, borderRadius: 12, marginVertical: 12 },
  laserWrap: {
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00ff88',
    backgroundColor: '#0a0f0a',
    overflow: 'hidden',
  },
  laserBadge: {
    color: '#00ff88',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 2,
    padding: 8,
    textAlign: 'center',
    backgroundColor: 'rgba(0,255,120,0.12)',
  },
  laserPreview: { width: '100%', height: 320 },
  note: { fontSize: 12, color: colors.textLight, marginTop: 10 },
  autoTag: { fontSize: 12, color: colors.success, marginTop: 6, fontWeight: '600' },
  cardTitle: { fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowHighlight: {
    backgroundColor: 'rgba(0,255,120,0.08)',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rowLabelHi: { fontWeight: '700', color: colors.primary },
  val: { fontWeight: '700' },
  valHi: { color: colors.accent, fontSize: 16 },
});
