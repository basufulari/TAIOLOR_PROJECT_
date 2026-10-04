import React, { useState } from 'react';
import { ScrollView, Alert, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import FadeInView from '../components/FadeInView';
import { colors } from '../theme/colors';

export default function RegisterScreen({ navigation }) {
  const { register, apiErrorMessage } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name?.trim() || !form.email?.trim() || !form.password) {
      Alert.alert('Error', 'Fill shop name, email, and password');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password min 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        password: form.password,
      });
    } catch (e) {
      Alert.alert('Registration failed', apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FadeInView>
        <Text style={styles.banner}>Tailor account — all data saved to MongoDB Atlas</Text>
      </FadeInView>
      <FadeInView delay={100} slide={12}>
      <Input label="Shop / Tailor name" value={form.name} onChangeText={(v) => set('name', v)} />
      <Input label="Email" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
      <Input label="Shop address" value={form.address} onChangeText={(v) => set('address', v)} />
      <Input label="Password (min 6)" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry />
      <Button title="Register tailor" onPress={submit} loading={loading} />
      </FadeInView>
      <FadeInView delay={200}>
        <Button title="Back to login" onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: 12 }} />
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  banner: { backgroundColor: '#d4edda', color: '#155724', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 },
});
