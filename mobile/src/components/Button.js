import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

export default function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  style,
}) {
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={[styles.outline, style]}
        onPress={onPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={styles.outlineText}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={loading} style={style}>
      <LinearGradient colors={[colors.accent, colors.accentLight]} style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outline: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  outlineText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
