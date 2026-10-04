import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { tryon } from '../services/api';
import { mediaUrl } from '../config/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import Button from '../components/Button';
import { colors } from '../theme/colors';

const GARMENT_TYPES = [
  { id: 'shirt', label: 'Shirt / Top' },
  { id: 'kurta', label: 'Kurta' },
  { id: 'dress', label: 'Dress' },
];

export default function TryOnScreen() {
  const { guard } = useRequireBackend();
  const [body, setBody] = useState(null);
  const [cloth, setCloth] = useState(null);
  const [garmentType, setGarmentType] = useState('shirt');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const pick = async (setter) => {
    if (!guard()) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Allow photo access');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.95,
    });
    if (!picked.canceled) {
      setter(picked.assets[0]);
      setPreview(null);
    }
  };

  const generate = async () => {
    if (!guard()) return;
    if (!body || !cloth) {
      Alert.alert('Images required', 'Select body and cloth photos');
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append('bodyImage', { uri: body.uri, type: 'image/jpeg', name: 'body.jpg' });
      form.append('clothImage', { uri: cloth.uri, type: 'image/jpeg', name: 'cloth.jpg' });
      form.append('garmentType', garmentType);
      const { data } = await tryon.generate(form);
      setPreview(mediaUrl(data.previewUrl));
    } catch (e) {
      Alert.alert('Try-on failed', e.response?.data?.message || e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Virtual Try-On</Text>
      <Text style={styles.desc}>
        Pose-aware fit: garment warped to your shoulders & hips, seamless blend
      </Text>

      <Text style={styles.sectionLabel}>Garment type</Text>
      <View style={styles.chips}>
        {GARMENT_TYPES.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.chip, garmentType === g.id && styles.chipActive]}
            onPress={() => setGarmentType(g.id)}
          >
            <Text style={[styles.chipText, garmentType === g.id && styles.chipTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.thumbBox}>
          {body ? (
            <Image source={{ uri: body.uri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <Text style={styles.thumbPlaceholder}>Body</Text>
          )}
        </View>
        <View style={styles.thumbBox}>
          {cloth ? (
            <Image source={{ uri: cloth.uri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <Text style={styles.thumbPlaceholder}>Cloth</Text>
          )}
        </View>
      </View>

      <Button title="Body photo (full-body)" onPress={() => pick(setBody)} variant="outline" />
      <Button title="Cloth / design photo" onPress={() => pick(setCloth)} variant="outline" />
      <View style={{ height: 12 }} />
      <Button title="Generate accurate preview" onPress={generate} loading={loading} />

      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>For best results</Text>
        <Text style={styles.tip}>• Body: front-facing, arms slightly out</Text>
        <Text style={styles.tip}>• Cloth: plain background, clear garment edges</Text>
        <Text style={styles.tip}>• Pick matching garment type above</Text>
      </View>

      {preview && (
        <View style={styles.previewWrap}>
          <Text style={styles.previewBadge}>TRY-ON PREVIEW</Text>
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800' },
  desc: { color: colors.textLight, marginVertical: 10, lineHeight: 20 },
  sectionLabel: { fontWeight: '700', marginTop: 8, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: 'rgba(233,69,96,0.12)' },
  chipText: { fontSize: 13, color: colors.textLight },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  thumbBox: {
    flex: 1,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { color: colors.textLight, fontSize: 13 },
  tips: { marginTop: 16, padding: 12, backgroundColor: colors.card, borderRadius: 12 },
  tipsTitle: { fontWeight: '700', marginBottom: 6 },
  tip: { fontSize: 12, color: colors.textLight, marginVertical: 2 },
  previewWrap: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: 'hidden',
    backgroundColor: '#0a0a12',
  },
  previewBadge: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
    padding: 8,
  },
  preview: { width: '100%', height: 420 },
});
