import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function ProgressBar({ percent, label }) {
  const p = Math.min(100, Math.max(0, percent || 0));
  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.pct}>{p}%</Text>
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${p}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13, color: colors.textLight },
  pct: { fontSize: 13, fontWeight: '700', color: colors.accent },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
});
