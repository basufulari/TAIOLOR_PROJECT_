import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme/colors';

export default function ProfileScreen() {
  const { user, logout, isAdmin, isCustomer } = useAuth();

  return (
    <View style={styles.container}>
      {isAdmin ? (
        <LinearGradient colors={['#0f0c29', '#302b63']} style={styles.adminBanner}>
          <Text style={styles.adminBadge}>ADMIN</Text>
          <Text style={styles.adminTitle}>{user?.name}</Text>
        </LinearGradient>
      ) : (
        <Text style={styles.title}>Profile</Text>
      )}
      <Card>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={[styles.role, isAdmin && styles.roleAdmin]}>Role: {user?.role}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
        {isCustomer && (
          <Text style={styles.hint}>
            Orders and notifications are linked to this email. It must match what your tailor saved.
          </Text>
        )}
      </Card>
      <Button title="Sign Out" onPress={logout} variant="outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  adminBanner: { padding: 24, paddingTop: 56, borderRadius: 16, marginBottom: 16 },
  adminBadge: { color: colors.gold, fontWeight: '800', letterSpacing: 2, fontSize: 11 },
  adminTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  roleAdmin: { color: colors.gold },
  name: { fontSize: 20, fontWeight: '700' },
  email: { color: colors.textLight, marginTop: 4 },
  role: { marginTop: 8, textTransform: 'capitalize', color: colors.accent, fontWeight: '600' },
  phone: { marginTop: 4, color: colors.textLight },
  hint: { marginTop: 12, fontSize: 12, color: colors.textLight, lineHeight: 18 },
});
