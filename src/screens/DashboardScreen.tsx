import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Cat, LogOut } from 'lucide-react-native';
import { request } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import AddIncomeModal from '../components/dashboard/AddIncomeModal';
import DashboardHome from '../components/dashboard/DashboardHome';
import { Screen } from '../components/ui/Screen';
import { Gradient } from '../components/ui/Gradient';
import { LoadingView } from '../components/ui/feedback';
import { brandGradient, colors } from '../components/ui/theme';
import type { Account, DashboardHomeData } from '../types/finance';
import type { User } from '../types/auth';

export default function DashboardScreen() {
  const { logout } = useAuth();

  const [userData, setUserData] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<DashboardHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();

      const [userResponse, accountsResponse, summaryResponse] = await Promise.all([
        request<User>('/Users/me', { auth: true }),
        request<Account[]>('/Accounts/me', { auth: true }),
        request<DashboardHomeData>(`/Dashboard/home?month=${month}&year=${year}`, { auth: true }),
      ]);

      setUserData(userResponse);
      setAccounts(accountsResponse);
      setSummary(summaryResponse);
      setError(null);
    } catch {
      setError('Tuvimos un problema cargando tu información financiera.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading && !userData) {
    return (
      <Screen scroll={false}>
        <LoadingView message="Cargando tu información..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen contentClassName="flex-grow items-center justify-center p-4">
        <View className="w-full max-w-sm items-center rounded-3xl border border-neutral-100 bg-white p-10 shadow-xl">
          <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle size={28} color={colors.red500} />
          </View>
          <Text className="mb-2 text-lg font-bold text-neutral-900">Algo salió mal</Text>
          <Text className="mb-6 text-center text-sm text-neutral-500">{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              fetchDashboardData();
            }}
            className="mb-4 rounded-xl bg-neutral-900 px-5 py-3"
          >
            <Text className="text-sm font-bold text-white">Reintentar</Text>
          </Pressable>
          <Pressable onPress={handleLogout} hitSlop={8}>
            <Text className="text-sm font-bold text-red-500">Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      contentClassName="p-4 gap-6 pb-10"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchDashboardData();
      }}
    >
      <AddIncomeModal
        open={isAddIncomeModalOpen}
        accounts={accounts}
        onClose={() => setIsAddIncomeModalOpen(false)}
        onSaved={() => {
          setIsAddIncomeModalOpen(false);
          fetchDashboardData();
        }}
      />

      {/* Header (la navegación a Tarjetas/Egresos/NekoAI está en la barra de pestañas) */}
      <View className="flex-row items-center justify-between rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
        <View className="flex-1 flex-row items-center gap-4">
          <Gradient
            colors={brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-12 w-12 rounded-2xl p-0.5"
          >
            <View className="flex-1 items-center justify-center rounded-2xl bg-white">
              <Cat size={24} color={colors.red500} strokeWidth={1.75} />
            </View>
          </Gradient>
          <View className="flex-1">
            <Text className="text-xl font-black leading-tight text-neutral-900">EcoNeko</Text>
            <Text numberOfLines={1} className="text-sm text-neutral-500">
              Hola, {userData?.firstName} {userData?.lastName}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          accessibilityLabel="Cerrar sesión"
          hitSlop={8}
          className="rounded-xl p-2.5 active:bg-red-50"
        >
          <LogOut size={20} color={colors.neutral500} />
        </Pressable>
      </View>

      {/* Resumen financiero */}
      {summary && (
        <DashboardHome data={summary} onAddIncome={() => setIsAddIncomeModalOpen(true)} />
      )}
    </Screen>
  );
}
