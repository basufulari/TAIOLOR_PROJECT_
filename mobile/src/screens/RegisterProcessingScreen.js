import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const STEPS = [
  'Validating',
  'Creating account',
  'Saving profile',
  'Done',
];

export default function RegisterProcessingScreen({ route }) {
  const { register } = useAuth();
  const form = route.params?.form || {};
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (let i = 0; i < STEPS.length - 1; i++) {
        if (cancelled) return;
        setStep(i);
        await new Promise((r) => setTimeout(r, 400));
      }
      if (cancelled) return;
      setStep(2);
      await register(form);
      if (cancelled) return;
      setStep(3);
      setDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.title}>{done ? 'Welcome!' : 'Creating account...'}</Text>
        <Text style={styles.email}>{form.name} • {form.email}</Text>
        <Text style={styles.hint}>{done ? 'Demo account ready' : 'Demo mode (no server needed)'}</Text>

        {STEPS.map((label, i) => (
          <View key={label} style={styles.row}>
            <Ionicons
              name={i < step || done ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={i <= step || done ? colors.success : colors.border}
            />
            <Text style={styles.step}>{label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 28 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  email: { textAlign: 'center', color: colors.textLight, marginTop: 8 },
  hint: { textAlign: 'center', color: colors.accent, marginBottom: 20, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  step: { fontSize: 15 },
});
