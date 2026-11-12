import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { getErrorMessage, request } from '../lib/apiClient';
import { formatCLP } from '../lib/currency';
import { daysUntil, formatShortDate, todayISO } from '../lib/dates';
import type { Account } from '../types/finance';
import AddChequeModal from '../components/cheques/AddChequeModal';
import {
  deleteCheque,
  getCheques,
  updateChequeStatus,
  type Cheque,
  type ChequeDirection,
  type ChequeStatus,
} from '../services/chequesService';
import { PageHeader } from '../components/ui/PageHeader';
import { ActionButton } from '../components/ui/buttons';
import { Screen } from '../components/ui/Screen';
import { LoadingView, confirm } from '../components/ui/feedback';
import { SegmentedTabs } from '../components/ui/form';
import { colors } from '../components/ui/theme';

type ViewFilter = 'pending' | 'history';

const STATUS_BADGE: Record<ChequeStatus, { label: string; box: string; text: string }> = {
  Pending: { label: 'Pendiente', box: 'bg-amber-100', text: 'text-amber-800' },
  Cashed: { label: 'Cobrado', box: 'bg-green-100', text: 'text-green-700' },
  Cancelled: { label: 'Anulado', box: 'bg-neutral-200', text: 'text-neutral-600' },
  Bounced: { label: 'Protestado', box: 'bg-red-100', text: 'text-red-700' },
};

/** Texto del vencimiento para cheques pendientes. */
const dueBadge = (cashDate: string) => {
  const days = daysUntil(cashDate.slice(0, 10));
  if (days < 0) return { text: 'Ya se puede cobrar', className: 'text-red-600' };
  if (days === 0) return { text: 'Se cobra hoy', className: 'text-red-600' };
  if (days === 1) return { text: 'Mañana', className: 'text-amber-600' };
  return { text: `En ${days} días`, className: days <= 7 ? 'text-amber-600' : 'text-neutral-500' };
};

function SummaryTile({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: string;
  valueClass: string;
  hint: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
      <Text numberOfLines={1} className="mb-1 text-xs font-bold text-neutral-500">
        {label}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className={`text-xl font-black ${valueClass}`}>
        {value}
      </Text>
      <Text numberOfLines={2} className="mt-0.5 text-[11px] text-neutral-400">
        {hint}
      </Text>
    </View>
  );
}

export default function ChequesScreen() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [direction, setDirection] = useState<ChequeDirection>('Issued');
  const [view, setView] = useState<ViewFilter>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const [chequesRes, accountsRes] = await Promise.allSettled([
      getCheques(),
      request<Account[]>('/Accounts/me', { auth: true }),
    ]);

    if (accountsRes.status === 'fulfilled') setAccounts(accountsRes.value);

    if (chequesRes.status === 'fulfilled') {
      setCheques(Array.isArray(chequesRes.value) ? chequesRes.value : []);
      setError(null);
    } else {
      setCheques([]);
      setError('No pudimos cargar tus cheques.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingIssued = cheques.filter((c) => c.directionName === 'Issued' && c.statusName === 'Pending');
  const pendingReceived = cheques.filter((c) => c.directionName === 'Received' && c.statusName === 'Pending');
  const nextDue = [...pendingIssued, ...pendingReceived].sort((a, b) =>
    a.cashDate.localeCompare(b.cashDate),
  )[0];

  const list = useMemo(
    () =>
      cheques
        .filter((c) => c.directionName === direction)
        .filter((c) => (view === 'pending' ? c.statusName === 'Pending' : c.statusName !== 'Pending'))
        .sort((a, b) =>
          view === 'pending'
            ? a.cashDate.localeCompare(b.cashDate)
            : (b.statusDate ?? b.cashDate).localeCompare(a.statusDate ?? a.cashDate),
        ),
    [cheques, direction, view],
  );

  const isIssued = direction === 'Issued';

  const changeStatus = async (cheque: Cheque, status: ChequeStatus, title: string, question: string) => {
    const ok = await confirm(title, question, {
      confirmText: 'Confirmar',
      destructive: status !== 'Cashed',
    });
    if (!ok) return;
    setBusyId(cheque.id);
    try {
      await updateChequeStatus(cheque.id, status, `${todayISO()}T12:00:00`);
      await fetchData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'No se pudo actualizar el cheque.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cheque: Cheque) => {
    const warning =
      cheque.statusName === 'Cashed'
        ? ` Como ya está ${cheque.directionName === 'Issued' ? 'cobrado' : 'depositado'}, también se revertirá su movimiento en ${cheque.accountName ?? 'la cuenta'}.`
        : '';
    const ok = await confirm(
      'Eliminar cheque',
      `¿Eliminar el cheque N° ${cheque.number}?${warning} Esta acción no se puede deshacer.`,
      { confirmText: 'Eliminar' },
    );
    if (!ok) return;
    setBusyId(cheque.id);
    try {
      await deleteCheque(cheque.id);
      await fetchData();
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'No se pudo eliminar el cheque.'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <LoadingView message="Cargando tus cheques..." />
      </Screen>
    );
  }

  return (
    <Screen
      contentClassName="p-4 gap-6 pb-10"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      <AddChequeModal
        open={isModalOpen}
        initialDirection={direction}
        accounts={accounts}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setIsModalOpen(false);
          fetchData();
        }}
      />

      <PageHeader
        title="Cheques"
        subtitle="Controla los cheques que emites y los que recibes hasta que se cobren"
        actions={
          <ActionButton
            onPress={() => setIsModalOpen(true)}
            icon={<Plus size={16} color={colors.white} />}
            label="Registrar cheque"
          />
        }
      />

      {/* Resumen */}
      <View className="gap-3">
        <View className="flex-row gap-3">
          <SummaryTile
            label="Emitidos por cobrar"
            value={formatCLP(pendingIssued.reduce((sum, c) => sum + c.amount, 0))}
            valueClass="text-red-500"
            hint={`${pendingIssued.length} ${pendingIssued.length === 1 ? 'cheque' : 'cheques'} · descuentan tu liquidez`}
          />
          <SummaryTile
            label="Recibidos por depositar"
            value={formatCLP(pendingReceived.reduce((sum, c) => sum + c.amount, 0))}
            valueClass="text-green-600"
            hint={`${pendingReceived.length} ${pendingReceived.length === 1 ? 'cheque' : 'cheques'} · suman al depositarlos`}
          />
        </View>
        <SummaryTile
          label="Próximo vencimiento"
          value={nextDue ? formatShortDate(nextDue.cashDate.slice(0, 10)) : '—'}
          valueClass="text-neutral-900"
          hint={
            nextDue
              ? `${nextDue.directionName === 'Issued' ? 'Emitido a' : 'Recibido de'} ${nextDue.counterpartName} · ${formatCLP(nextDue.amount)}`
              : 'Sin cheques pendientes'
          }
        />
      </View>

      {/* Emitidos / Recibidos + Pendientes / Historial */}
      <View className="gap-3">
        <SegmentedTabs
          value={direction}
          onChange={setDirection}
          tabs={[
            {
              value: 'Issued',
              label: 'Emitidos',
              icon: <ArrowUpRight size={16} color={isIssued ? colors.neutral900 : colors.neutral500} />,
            },
            {
              value: 'Received',
              label: 'Recibidos',
              icon: <ArrowDownLeft size={16} color={!isIssued ? colors.neutral900 : colors.neutral500} />,
            },
          ]}
        />
        <View className="flex-row gap-2">
          {(
            [
              { value: 'pending', label: 'Pendientes' },
              { value: 'history', label: 'Historial' },
            ] as const
          ).map((tab) => {
            const active = view === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setView(tab.value)}
                className={`rounded-xl px-4 py-2 ${active ? 'bg-neutral-900' : 'border border-neutral-200 bg-white'}`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-600'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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

      {list.length === 0 ? (
        <View className="items-center rounded-3xl border border-dashed border-neutral-200 bg-white p-8">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
            <FileText size={24} color={colors.neutral500} />
          </View>
          <Text className="mb-1 text-center font-bold text-neutral-900">
            {view === 'pending'
              ? `No tienes cheques ${isIssued ? 'emitidos' : 'recibidos'} pendientes`
              : 'Aún no hay historial'}
          </Text>
          <Text className="mb-5 text-center text-sm text-neutral-500">
            {isIssued
              ? 'Registra los cheques que entregas para saber cuánto dinero ya está comprometido.'
              : 'Registra los cheques que te entregan para recordar cuándo depositarlos.'}
          </Text>
          {view === 'pending' && (
            <ActionButton
              onPress={() => setIsModalOpen(true)}
              icon={<Plus size={16} color={colors.white} />}
              label="Registrar cheque"
            />
          )}
        </View>
      ) : (
        <View className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
          {list.map((cheque, index) => {
            const badge = STATUS_BADGE[cheque.statusName] ?? STATUS_BADGE.Pending;
            const due = cheque.statusName === 'Pending' ? dueBadge(cheque.cashDate) : null;
            const busy = busyId === cheque.id;
            const details = [
              `N° ${cheque.number}`,
              cheque.accountName,
              cheque.drawerBankName,
              cheque.description,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <View
                key={cheque.id}
                className={`gap-3 p-4 ${index > 0 ? 'border-t border-neutral-100' : ''}`}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-xl ${
                      isIssued ? 'bg-red-50' : 'bg-green-50'
                    }`}
                  >
                    {isIssued ? (
                      <ArrowUpRight size={20} color={colors.red500} />
                    ) : (
                      <ArrowDownLeft size={20} color={colors.green600} />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text numberOfLines={1} className="shrink font-bold text-neutral-900">
                        {cheque.counterpartName}
                      </Text>
                      <View className={`rounded-md px-2 py-0.5 ${badge.box}`}>
                        <Text className={`text-[10px] font-bold uppercase tracking-wider ${badge.text}`}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text numberOfLines={1} className="text-xs text-neutral-500">
                      {details}
                    </Text>
                    <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
                      <CalendarClock size={14} color={colors.neutral400} />
                      <Text className="text-xs text-neutral-500">
                        {cheque.statusName === 'Pending'
                          ? `${isIssued ? 'Se cobra' : 'Se deposita'} desde ${formatShortDate(cheque.cashDate.slice(0, 10))}`
                          : `${badge.label} el ${formatShortDate((cheque.statusDate ?? cheque.cashDate).slice(0, 10))}`}
                      </Text>
                      {due && <Text className={`text-xs font-bold ${due.className}`}>· {due.text}</Text>}
                    </View>
                  </View>
                  <Text className={`text-lg font-black ${isIssued ? 'text-red-500' : 'text-green-600'}`}>
                    {isIssued ? '−' : '+'}
                    {formatCLP(cheque.amount)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-end gap-2">
                  {cheque.statusName === 'Pending' && (
                    <>
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          changeStatus(
                            cheque,
                            'Cashed',
                            isIssued ? 'Cheque cobrado' : 'Cheque depositado',
                            isIssued
                              ? `¿Marcar el cheque N° ${cheque.number} como cobrado? Se descontará ${formatCLP(cheque.amount)} de ${cheque.accountName ?? 'la cuenta'}.`
                              : `¿Marcar el cheque N° ${cheque.number} como depositado? Se sumará ${formatCLP(cheque.amount)} a ${cheque.accountName ?? 'la cuenta'}.`,
                          )
                        }
                        className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${
                          busy ? 'bg-green-400' : 'bg-green-600 active:bg-green-700'
                        }`}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <CheckCircle2 size={14} color={colors.white} />
                        )}
                        <Text className="text-xs font-bold text-white">{isIssued ? 'Cobrado' : 'Depositado'}</Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          changeStatus(
                            cheque,
                            isIssued ? 'Cancelled' : 'Bounced',
                            isIssued ? 'Anular cheque' : 'Cheque protestado',
                            isIssued
                              ? `¿Anular el cheque N° ${cheque.number}? Ya no se descontará de tu liquidez.`
                              : `¿Marcar el cheque N° ${cheque.number} como protestado (sin fondos)?`,
                          )
                        }
                        className={`flex-row items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 active:bg-neutral-50 ${
                          busy ? 'opacity-50' : ''
                        }`}
                      >
                        <Ban size={14} color={colors.neutral500} />
                        <Text className="text-xs font-bold text-neutral-600">{isIssued ? 'Anular' : 'Protestado'}</Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable
                    disabled={busy}
                    onPress={() => handleDelete(cheque)}
                    accessibilityLabel={`Eliminar cheque ${cheque.number}`}
                    hitSlop={8}
                    className={`rounded-lg p-2 active:bg-red-50 ${busy ? 'opacity-50' : ''}`}
                  >
                    <Trash2 size={16} color={colors.neutral400} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
