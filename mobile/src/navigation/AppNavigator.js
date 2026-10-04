import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CustomerRegisterScreen from '../screens/CustomerRegisterScreen';
import MeasureScreen from '../screens/MeasureScreen';
import DesignsScreen from '../screens/DesignsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import CustomerOrdersScreen from '../screens/CustomerOrdersScreen';
import CustomerOrderDetailScreen from '../screens/CustomerOrderDetailScreen';
import PlaceOrderScreen from '../screens/PlaceOrderScreen';
import TryOnScreen from '../screens/TryOnScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TailorDashboardScreen from '../screens/TailorDashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import AddDesignScreen from '../screens/AddDesignScreen';
import DesignCanvasScreen from '../screens/DesignCanvasScreen';
import AdminScreen from '../screens/AdminScreen';
import RazorpayQrPayScreen from '../screens/RazorpayQrPayScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TailorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textLight,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={TailorDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Measure"
        component={MeasureScreen}
        options={{
          title: 'AI Measure',
          tabBarIcon: ({ color, size }) => <Ionicons name="body" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomersScreen}
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Designs"
        component={DesignsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="shirt" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textLight,
      }}
    >
      <Tab.Screen
        name="MyOrders"
        component={CustomerOrdersScreen}
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="shirt" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#2d2d44' },
      }}
    >
      <Tab.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          title: 'Database',
          tabBarIcon: ({ color, size }) => <Ionicons name="server" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, isAdmin, isCustomer } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const MainTabs = isAdmin ? AdminTabs : isCustomer ? CustomerTabs : TailorTabs;

  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Tailor Registration' }}
          />
          <Stack.Screen
            name="CustomerRegister"
            component={CustomerRegisterScreen}
            options={{ title: 'Customer Registration' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          {isCustomer ? (
            <>
              <Stack.Screen
                name="CustomerOrderDetail"
                component={CustomerOrderDetailScreen}
                options={{ title: 'Order progress' }}
              />
            </>
          ) : !isAdmin ? (
            <>
              <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order' }} />
              <Stack.Screen name="PlaceOrder" component={PlaceOrderScreen} options={{ title: 'New Order' }} />
              <Stack.Screen name="RazorpayPay" component={RazorpayQrPayScreen} options={{ title: 'Pay online' }} />
              <Stack.Screen
                name="CustomerDetail"
                component={CustomerDetailScreen}
                options={{ title: 'Customer record' }}
              />
              <Stack.Screen name="TryOn" component={TryOnScreen} options={{ title: 'Virtual Try-On' }} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
              <Stack.Screen name="AddDesign" component={AddDesignScreen} options={{ title: 'New design' }} />
              <Stack.Screen name="DesignCanvas" component={DesignCanvasScreen} options={{ title: 'Design Canvas' }} />
            </>
          ) : null}
        </>
      )}
    </Stack.Navigator>
  );
}
