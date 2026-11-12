// Equivale a <ProtectedRoute />: solo usuarios con sesión.
// La barra de pestañas es el navbar común (igual que AppLayout en la web).
import { Redirect, Tabs } from 'expo-router';
import { CreditCard, FileText, LayoutDashboard, Receipt, Sparkles, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Screen } from '../../src/components/ui/Screen';
import { LoadingView } from '../../src/components/ui/feedback';
import { colors } from '../../src/components/ui/theme';

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingView />
      </Screen>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red500,
        tabBarInactiveTintColor: colors.neutral400,
        // 6 secciones: etiqueta más pequeña para que quepan en pantallas angostas
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ingresos"
        options={{
          title: 'Ingresos',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="egresos"
        options={{
          title: 'Egresos',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tarjetas"
        options={{
          title: 'Cuentas',
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cheques"
        options={{
          title: 'Cheques',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="asistente"
        options={{
          title: 'NekoAI',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
