import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Repeat,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { request } from '../lib/apiClient';
import { formatCLP } from '../lib/currency';
import type { Account } from '../types/finance';
import {
  deleteRecurringIncome,
  getMonthlyIncomes,
  getRecurringIncomes,
  type IncomeTransaction,
  type RecurringIncome,
} from '../services/incomesService';
import AddIncomeModal, { type IncomeMode } from '../components/dashboard/AddIncomeModal';
import { Screen } from '../components/ui/Screen';
import { PageHeader } from '../components/ui/PageHeader';
import { ActionButton } from '../components/ui/buttons';
import { confirm } from '../components/ui/feedback';
import { colors } from '../components/ui/theme';

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

const monthLabel = (month: number, year: number) => {
  const name = new Date(year, month - 1, 1).toLocaleDateString('es-CL', { month: 'long' });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
};

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  children: ReactNode;
}) {
  return (
    <View className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
      <View className="flex-row items-center gap-3 border-b border-neutral-100 p-5">
        <View className={`h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={16} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-neutral-900">{title}</Text>
          {!!subtitle && <Text className="text-xs text-neutral-500">{subtitle}</Text>}
        </View>
      </View>
      <View className="p-4">{children}</View>
    </View>
  );
}

function SummaryTile({ label, value, valueClass, hint }: { label: string; value: number; valueClass: string; hint: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
      <Text numberOfLines={1} className="mb-1 text-xs font-bold text-neutral-500">
        {label}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className={`text-xl font-black ${valueClass}`}>
        {formatCLP(value)}
      </Text>
      <Text className="mt-0.5 text-[11px] text-neutral-400">{hint}</Text>
    </View>
  );
}

export default function IncomesScreen() {
  const today = new Date();
  const [period, setPeriod] = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const isCurrentMonth =
    period.month === today.getMonth() + 1 && period.year === today.getFullYear();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomes, setIncomes] = useState<IncomeTransaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recurringError, setRecurringError] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [modal, setModal] = useState<{ open: boolean; mode: IncomeMode }>({
    open: false,
    mode: 'single',
  });

  const fetchData = useCallback(async () => {
    const [accountsRes, incomesRes, recurringRes] = await Promise.allSettled([
      request<Account[]>('/Accounts/me', { auth: true }),
      getMonthlyIncomes(period.month, period.year),
      getRecurringIncomes(),
    ]);

    if (accountsRes.status === 'fulfilled') setAccounts(accountsRes.value);

    if (incomesRes.status === 'fulfilled') {
      setIncomes(incomesRes.value);
      setError(null);
    } else {
      setIncomes([]);
      setError('No pudimos cargar tus ingresos de este mes.');
    }

    if (recurringRes.status === 'fulfilled') {
      setRecurring(recurringRes.value);
      setRecurringError(false);
    } else {
      setRecurring([]);
      setRecurringError(true);
    }

    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const received = useMemo(
    () =>
      incomes
        .filter((t) => !t.isPending)
        .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)),
    [incomes],
  );
  const pending = useMemo(
    () =>
      incomes
        .filter((t) => t.isPending)
        .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate)),
    [incomes],
  );

  const totalReceived = received.reduce((sum, t) => sum + t.amount, 0);
  const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);
  const totalRecurring = recurring.reduce((sum, r) => sum + r.amount, 0);

  const changeMonth = (delta: number) => {
    setPeriod((prev) => {
      const date = new Date(prev.year, prev.month - 1 + delta, 1);
      return { month: date.getMonth() + 1, year: date.getFullYear() };
    });
  };

  const openModal = (mode: IncomeMode) => setModal({ open: true, mode });

  const handleDeleteRecurring = async (item: RecurringIncome) => {
    const ok = await confirm(
      'Eliminar ingreso fijo',
      `¿Dejar de registrar "${item.description}" como ingreso fijo? Los ingresos ya recibidos no se borran.`,
      { confirmText: 'Eliminar' },
    );
    if (!ok) return;

    setDeletingId(item.id);
    try {
      await deleteRecurringIncome(item.id);
      await fetchData();
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el ingreso fijo. Inténtalo nuevamente.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Screen
      contentClassName="p-4 gap-6 pb-10"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      <AddIncomeModal
        open={modal.open}
        initialMode={modal.mode}
        accounts={accounts}
        pendingIncomes={modal.mode === 'pending' ? pending : undefined}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={() => {
          setModal((m) => ({ ...m, open: false }));
          fetchData();
        }}
      />

      <PageHeader
        title="Ingresos"
        subtitle="Sueldos, abonos y otros ingresos que llegan a tus cuentas"
        actions={
          <>
            <ActionButton
              variant="green"
              onPress={() => openModal('single')}
              icon={<Plus size={16} color={colors.white} />}
              label="Nuevo ingreso"
            />
            <ActionButton
              variant="light"
              onPress={() => openModal('recurring')}
              icon={<Repeat size={16} color={colors.neutral700} />}
              label="Ingreso fijo"
            />
          </>
        }
      />

      {/* Selector de mes */}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => changeMonth(-1)}
          accessibilityLabel="Mes anterior"
          className="rounded-xl border border-neutral-200 bg-white p-2 active:bg-neutral-50"
        >
          <ChevronLeft size={16} color={colors.neutral500} />
        </Pressable>
        <Text className="min-w-[140px] text-center text-sm font-bold text-neutral-800">
          {monthLabel(period.month, period.year)}
        </Text>
        <Pressable
          onPress={() => changeMonth(1)}
          disabled={isCurrentMonth}
          accessibilityLabel="Mes siguiente"
          className={`rounded-xl border border-neutral-200 bg-white p-2 active:bg-neutral-50 ${
            isCurrentMonth ? 'opacity-40' : ''
          }`}
        >
          <ChevronRight size={16} color={colors.neutral500} />
        </Pressable>
        {!isCurrentMonth && (
          <Pressable
            onPress={() => setPeriod({ month: today.getMonth() + 1, year: today.getFullYear() })}
            hitSlop={8}
          >
            <Text className="ml-1 text-xs font-bold text-red-500">Volver a hoy</Text>
          </Pressable>
        )}
      </View>

      {/* Resumen */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          <SummaryTile
            label="Recibido en el mes"
            value={totalReceived}
            valueClass="text-green-600"
            hint={`${received.length} ${received.length === 1 ? 'ingreso' : 'ingresos'}`}
          />
          <SummaryTile
            label="Por recibir"
            value={totalPending}
            valueClass="text-amber-600"
            hint={`${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}`}
          />
        </View>
        <SummaryTile
          label="Ingresos fijos al mes"
          value={totalRecurring}
          valueClass="text-neutral-900"
          hint={`${recurring.length} ${recurring.length === 1 ? 'configurado' : 'configurados'}`}
        />
      </View>

      {!!error && (
        <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <View className="flex-1 flex-row items-center gap-2">
            <AlertTriangle size={16} color={colors.red600} />
            <Text className="flex-1 text-sm text-red-700">{error}</Text>
          </View>
          <Pressable onPress={fetchData} hitSlop={8}>
            <Text className="text-sm font-bold text-red-700">Reintentar</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View className="items-center rounded-3xl border border-neutral-100 bg-white p-10">
          <ActivityIndicator color={colors.neutral400} />
        </View>
      ) : (
        <View className="gap-4">
          {/* Pendientes primero: es lo que requiere acción */}
          <SectionCard
            title="Por recibir"
            subtitle="Confírmalos cuando lleguen a tu cuenta"
            icon={CalendarClock}
            iconColor="#d97706"
            iconBg="bg-amber-100"
          >
            {pending.length === 0 ? (
              <View className="items-center gap-2 py-4">
                <CheckCircle2 size={28} color={colors.green500} />
                <Text className="text-sm text-neutral-500">No tienes ingresos pendientes.</Text>
              </View>
            ) : (
              <View className="gap-2">
                {pending.map((tx) => (
                  <View
                    key={tx.id}
                    className="flex-row items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3"
                  >
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-sm font-bold text-neutral-900">
                        {tx.description}
                      </Text>
                      <Text className="text-xs text-neutral-500">
                        Esperado {formatDay(tx.transactionDate)} · {formatCLP(tx.amount)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openModal('pending')}
                      className="rounded-xl bg-green-600 px-3 py-2 active:bg-green-700"
                    >
                      <Text className="text-xs font-bold text-white">Ya lo recibí</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          <SectionCard
            title="Ingresos recibidos"
            subtitle={monthLabel(period.month, period.year)}
            icon={TrendingUp}
            iconColor={colors.green600}
            iconBg="bg-green-100"
          >
            {received.length === 0 ? (
              <View className="items-center gap-2 py-6">
                <Text className="text-center text-sm text-neutral-500">
                  Aún no hay ingresos registrados en este mes.
                </Text>
                {isCurrentMonth && (
                  <Pressable onPress={() => openModal('single')} hitSlop={8}>
                    <Text className="text-sm font-bold text-green-600">Registrar uno</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View>
                {received.map((tx, index) => (
                  <View
                    key={tx.id}
                    className={`flex-row items-center justify-between gap-3 px-1 py-3 ${
                      index > 0 ? 'border-t border-neutral-100' : ''
                    }`}
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-green-50">
                        <Wallet size={16} color={colors.green600} />
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-sm font-bold text-neutral-900">
                          {tx.description || 'Ingreso'}
                        </Text>
                        <Text numberOfLines={1} className="text-xs text-neutral-500">
                          {formatDay(tx.transactionDate)} · {tx.accountName}
                          {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                        </Text>
                      </View>
                    </View>
                    <Text className="font-black text-green-600">+{formatCLP(tx.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          <SectionCard
            title="Ingresos fijos"
            subtitle="Se generan como pendientes cada mes"
            icon={Repeat}
            iconColor={colors.yellow400}
            iconBg="bg-neutral-900"
          >
            {recurringError ? (
              <Text className="py-6 text-center text-sm text-neutral-500">
                No pudimos cargar tus ingresos fijos.
              </Text>
            ) : recurring.length === 0 ? (
              <View className="items-center gap-2 py-6">
                <Text className="text-center text-sm text-neutral-500">
                  Configura tu sueldo u otros ingresos que se repiten.
                </Text>
                <Pressable onPress={() => openModal('recurring')} hitSlop={8}>
                  <Text className="text-sm font-bold text-green-600">Agregar ingreso fijo</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                {recurring.map((item, index) => (
                  <View
                    key={item.id}
                    className={`flex-row items-center justify-between gap-3 px-1 py-3 ${
                      index > 0 ? 'border-t border-neutral-100' : ''
                    }`}
                  >
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-sm font-bold text-neutral-900">
                        {item.description}
                      </Text>
                      <Text numberOfLines={1} className="text-xs text-neutral-500">
                        Día {item.dayOfMonth} de cada mes
                        {item.accountName ? ` · ${item.accountName}` : ''}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-sm font-black text-neutral-900">
                        {formatCLP(item.amount)}
                      </Text>
                      <Pressable
                        onPress={() => handleDeleteRecurring(item)}
                        disabled={deletingId === item.id}
                        accessibilityLabel={`Eliminar ${item.description}`}
                        hitSlop={8}
                        className="rounded-lg p-2 active:bg-red-50"
                      >
                        {deletingId === item.id ? (
                          <ActivityIndicator size="small" color={colors.neutral400} />
                        ) : (
                          <Trash2 size={16} color={colors.neutral400} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </View>
      )}
    </Screen>
  );
}
