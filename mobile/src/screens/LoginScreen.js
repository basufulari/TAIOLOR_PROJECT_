import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors } from '../theme/colors';

function FloatingOrb({ size, top, left, right, delay, color }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 2800 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2800 + delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, drift]);

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });
  const opacity = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.25, 0.45, 0.25],
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          right,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

function AnimatedField({ delay, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        delay,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, slide]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
}

export default function LoginScreen({ navigation }) {
  const { login, apiErrorMessage, loginRole, setLoginRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isCustomer = loginRole === 'customer';

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const iconBob = useRef(new Animated.Value(0)).current;
  const formScale = useRef(new Animated.Value(0.92)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const linkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.spring(formScale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(linkOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    const iconLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(iconBob, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(iconBob, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: 0,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    iconLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: 1.03,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();

    return () => {
      iconLoop.stop();
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [
    btnPulse,
    formOpacity,
    formScale,
    iconBob,
    iconRotate,
    linkOpacity,
    logoOpacity,
    logoScale,
    shimmer,
  ]);

  const iconBobY = iconBob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const iconRotateDeg = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '12deg'],
  });
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 280],
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password, loginRole);
      if (res.linkedOrders > 0 && loginRole === 'customer') {
        Alert.alert('Welcome back', `${res.linkedOrders} order(s) linked to your email.`);
      }
    } catch (e) {
      Alert.alert('Login failed', apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onPressIn = () => {
    Animated.spring(btnPulse, {
      toValue: 0.96,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(btnPulse, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <FloatingOrb size={140} top={80} left={-40} delay={0} color="rgba(233,69,96,0.35)" />
      <FloatingOrb size={100} top={160} right={-30} delay={400} color="rgba(244,162,97,0.3)" />
      <FloatingOrb size={80} bottom={120} left={20} delay={800} color="rgba(255,255,255,0.12)" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <Animated.View
          style={[
            styles.hero,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Animated.Text
            style={[
              styles.icon,
              { transform: [{ translateY: iconBobY }, { rotate: iconRotateDeg }] },
            ]}
          >
            ✂️
          </Animated.Text>
          <Text style={styles.logo}>AI Tailor</Text>
          <View style={styles.subtitleWrap}>
            <Text style={styles.subtitle}>Professional tailoring</Text>
            <Animated.View
              style={[styles.shimmerBar, { transform: [{ translateX: shimmerX }] }]}
            />
          </View>
          <Text style={styles.tagline}>
            {isCustomer ? 'Track your order progress' : 'Powered by MongoDB Atlas'}
          </Text>
        </Animated.View>

        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, !isCustomer && styles.roleBtnActive]}
            onPress={() => setLoginRole('tailor')}
          >
            <Text style={[styles.roleText, !isCustomer && styles.roleTextActive]}>Tailor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, isCustomer && styles.roleBtnActive]}
            onPress={() => setLoginRole('customer')}
          >
            <Text style={[styles.roleText, isCustomer && styles.roleTextActive]}>Customer</Text>
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.formWrap,
            {
              opacity: formOpacity,
              transform: [{ scale: formScale }],
            },
          ]}
        >
          <View style={styles.form}>
            <AnimatedField delay={280}>
              <Input
                label="Email or username"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </AnimatedField>
            <AnimatedField delay={380}>
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </AnimatedField>
            <AnimatedField delay={480}>
              <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
                <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
                  <Button
                    title={isCustomer ? 'Sign in as customer' : 'Sign in as tailor'}
                    onPress={handleLogin}
                    loading={loading}
                  />
                </Pressable>
              </Animated.View>
            </AnimatedField>
            <Animated.View style={{ opacity: linkOpacity }}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(isCustomer ? 'CustomerRegister' : 'Register')
                }
                disabled={loading}
                style={styles.linkBtn}
              >
                <Text style={styles.link}>
                  {isCustomer ? 'Register as customer →' : 'Register tailor shop →'}
                </Text>
              </TouchableOpacity>
              {isCustomer && (
                <Text style={styles.emailHint}>
                  Use the same email your tailor saved when measuring or placing your order.
                </Text>
              )}
            </Animated.View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  orb: { position: 'absolute' },
  hero: { alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 56, marginBottom: 8 },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitleWrap: {
    marginTop: 10,
    overflow: 'hidden',
    borderRadius: 4,
    paddingVertical: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
  tagline: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 6,
    fontSize: 12,
    letterSpacing: 1,
  },
  roleRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 4,
  },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  roleBtnActive: { backgroundColor: colors.card },
  roleText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  roleTextActive: { color: colors.primary, fontWeight: '800' },
  emailHint: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  formWrap: { marginTop: 16 },
  form: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 28,
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  linkBtn: { marginTop: 20, paddingVertical: 8 },
  link: {
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
});
