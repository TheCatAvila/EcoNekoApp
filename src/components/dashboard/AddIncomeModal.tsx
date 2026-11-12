import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Repeat,
  TrendingUp,
} from 'lucide-react-native';
import { request } from '../../lib/apiClient';
import { formatCLP } from '../../lib/currency';
import { todayISO } from '../../lib/dates';
import { ModalSheet } from '../ui/ModalSheet';
import {
  Checkbox,
  DateField,
  Input,
  Label,
  NumberInput,
  SegmentedTabs,
  Select,
} from '../ui/form';
import { colors } from '../ui/theme';

export interface IncomeAccount {
  id: number;
  name: string;
  bankName?: string | null;
  typeName: string; // Checking | Prepaid | Cash | CreditCard | CreditLine | Loan
  isCreditAccount: boolean;
}

export interface PendingIncomeTransaction {
  id: number;
  accountId: number;
  accountName: string;
  categoryId?: number | null;
  categoryName?: string | null;
  amount: number;
  description: string;
  transactionDate: string;
  isPending: boolean;
}

interface TransactionCategoryItem {
  id: number;
  name: string;
  type?: number; // 1 = Income, 2 = Expense (opcional según tu DTO)
}

interface AddIncomeModalProps {
  open: boolean;
  accounts: IncomeAccount[];
  pendingIncomes?: PendingIncomeTransaction[]; // Opcional: si ya los tienes en el padre
  /** Pestaña con la que se abre el modal (por defecto: ingreso puntual). */
  initialMode?: IncomeMode;
  onClose: () => void;
  onSaved: () => void;
}

const INCOME_TYPE = 1; // TransactionType.Income

// Ajusta estas rutas si en tu Controller tienen otro nombre
const TRANSACTIONS_ENDPOINT = '/Transactions';
const RECURRING_INCOMES_ENDPOINT = '/recurring-incomes';
const CONFIRM_INCOME_ENDPOINT = (id: number) => `/Transactions/${id}/confirm-income`;
const CATEGORIES_ENDPOINT = '/TransactionCategories';

const canReceiveIncome = (account: IncomeAccount) =>
  !account.isCreditAccount && account.typeName !== 'Loan';

export type IncomeMode = 'single' | 'recurring' | 'pending';

function ErrorText({ children }: { children: string }) {
  return (
    <View accessibilityRole="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
      <Text className="text-sm text-red-600">{children}</Text>
    </View>
  );
}

export default function AddIncomeModal({
  open,
  accounts,
  pendingIncomes: externalPendingIncomes,
  initialMode = 'single',
  onClose,
  onSaved,
}: AddIncomeModalProps) {
  const incomeAccounts = accounts.filter(canReceiveIncome);

  // Modo del modal: Ingreso único | Ingreso fijo | Confirmar pendientes ("Ya lo recibí")
  const [mode, setMode] = useState<IncomeMode>('single');

  // Campos del formulario
  const [accountId, setAccountId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO());
  const [expectedDay, setExpectedDay] = useState<string>(String(new Date().getDate()));
  const [alreadyReceivedThisMonth, setAlreadyReceivedThisMonth] = useState(false);

  // Categorías y pendientes
  const [categories, setCategories] = useState<TransactionCategoryItem[]>([]);
  const [pendingList, setPendingList] = useState<PendingIncomeTransaction[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Estado para confirmar un ingreso pendiente ("Ya lo recibí") con ajuste de monto
  const [confirmingTxId, setConfirmingTxId] = useState<number | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reiniciar estado al abrir el modal
  useEffect(() => {
    if (!open) return;

    setMode(initialMode);
    setAccountId(incomeAccounts.length === 1 ? incomeAccounts[0].id : '');
    setCategoryId('');
    setAmount('');
    setDescription('');
    setDate(todayISO());
    setExpectedDay(String(new Date().getDate()));
    setAlreadyReceivedThisMonth(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cargar categorías y transacciones de ingreso pendientes al abrir
  useEffect(() => {
    if (!open) return;

    // 1. Cargar categorías (silencioso si el endpoint no existe o falla)
    request<TransactionCategoryItem[]>(CATEGORIES_ENDPOINT, { auth: true })
      .then((data) => {
        if (Array.isArray(data)) {
          // Si tu categoría distingue por Type (1 = Income), filtramos; si no, mostramos todas
          const filtered = data.some((c) => c.type !== undefined)
            ? data.filter((c) => c.type === INCOME_TYPE)
            : data;
          setCategories(filtered);
        }
      })
      .catch(() => {
        // Ignorar si aún no hay endpoint de categorías
      });

    const initAmounts = (list: PendingIncomeTransaction[]) => {
      const initialAmounts: Record<number, string> = {};
      list.forEach((tx) => {
        initialAmounts[tx.id] = String(Math.round(tx.amount));
      });
      setCustomAmounts(initialAmounts);
    };

    // 2. Si el padre nos pasó los pendientes, usarlos; si no, intentar consultarlos
    if (externalPendingIncomes) {
      setPendingList(externalPendingIncomes);
      initAmounts(externalPendingIncomes);
      return;
    }

    setLoadingPending(true);
    request<PendingIncomeTransaction[]>(`${TRANSACTIONS_ENDPOINT}?type=1&isPending=true`, {
      auth: true,
    })
      .then((data) => {
        if (Array.isArray(data)) {
          const onlyPendingIncomes = data.filter((t) => t.isPending);
          setPendingList(onlyPendingIncomes);
          initAmounts(onlyPendingIncomes);
        }
      })
      .catch(() => {
        setPendingList([]);
      })
      .finally(() => setLoadingPending(false));
  }, [open, externalPendingIncomes]);

  // Guardar Ingreso Único o Ingreso Fijo Mensual
  const handleSubmit = async () => {
    if (!accountId) {
      setError('Selecciona la cuenta que recibe el ingreso.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Ingresa un monto mayor a cero.');
      return;
    }
    if (!description.trim()) {
      setError('Agrega una descripción.');
      return;
    }
    const day = Number(expectedDay);
    if (mode === 'recurring' && (!day || day < 1 || day > 31)) {
      setError('El día de pago debe estar entre 1 y 31.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'single') {
        // 1. Ingreso estándar (impacta el saldo inmediatamente)
        await request(TRANSACTIONS_ENDPOINT, {
          method: 'POST',
          auth: true,
          body: {
            accountId: Number(accountId),
            categoryId: categoryId ? Number(categoryId) : null,
            type: INCOME_TYPE,
            amount: Number(amount),
            description: description.trim(),
            transactionDate: `${date}T12:00:00`,
          },
        });
      } else if (mode === 'recurring') {
        // 2. Ingreso fijo mensual (crea RecurringIncome + primera transacción pendiente o confirmada)
        await request(RECURRING_INCOMES_ENDPOINT, {
          method: 'POST',
          auth: true,
          body: {
            accountId: Number(accountId),
            categoryId: categoryId ? Number(categoryId) : null,
            amount: Number(amount),
            description: description.trim(),
            dayOfMonth: day,
            expectedDayOfMonth: day, // Enviamos ambos por compatibilidad con tu DTO
            alreadyReceivedThisMonth,
          },
        });
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Hubo un error al registrar el ingreso. Inténtalo nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmar un ingreso pendiente ("Ya lo recibí") -> ConfirmIncomeTransactionHandler
  const handleConfirmPendingIncome = async (tx: PendingIncomeTransaction) => {
    setConfirmingTxId(tx.id);
    setError(null);

    try {
      const rawAmount = customAmounts[tx.id];
      const finalAmount = rawAmount ? Number(rawAmount) : tx.amount;

      if (!finalAmount || finalAmount <= 0) {
        setError('El monto recibido debe ser mayor a cero.');
        setConfirmingTxId(null);
        return;
      }

      await request(CONFIRM_INCOME_ENDPOINT(tx.id), {
        method: 'POST', // Cambia a 'PATCH' si tu endpoint usa [HttpPatch]
        auth: true,
        body: {
          transactionId: tx.id,
          actualAmount: finalAmount,
        },
      });

      // Quitamos de la lista local y refrescamos el dashboard
      setPendingList((prev) => prev.filter((item) => item.id !== tx.id));
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo confirmar el ingreso pendiente.',
      );
    } finally {
      setConfirmingTxId(null);
    }
  };

  const changeMode = (next: IncomeMode) => {
    setMode(next);
    setError(null);
  };

  return (
    <ModalSheet open={open} onClose={onClose}>
      <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
        <TrendingUp size={24} color={colors.green600} />
      </View>
      <Text className="mb-1 text-xl font-bold text-neutral-900">Ingresos</Text>
      <Text className="mb-5 text-sm text-neutral-500">
        Registra un abono puntual, configura tu sueldo fijo o confirma ingresos pendientes.
      </Text>

      {/* Selector de modo (Tabs) */}
      <View className="mb-6">
        <SegmentedTabs
          value={mode}
          onChange={changeMode}
          tabs={[
            { value: 'single', label: 'Puntual', icon: <TrendingUp size={14} color={colors.neutral500} /> },
            { value: 'recurring', label: 'Fijo', icon: <Repeat size={14} color={colors.neutral500} /> },
            {
              value: 'pending',
              label: 'Por recibir',
              icon: <CalendarClock size={14} color={colors.neutral500} />,
              badge: pendingList.length,
            },
          ]}
        />
      </View>

      {incomeAccounts.length === 0 ? (
        <View className="flex-row items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <AlertTriangle size={20} color={colors.amber500} />
          <Text className="flex-1 text-sm text-amber-800">
            Necesitas una cuenta corriente, prepago o de efectivo para registrar ingresos. Crea una
            y vuelve a intentarlo.
          </Text>
        </View>
      ) : mode === 'pending' ? (
        /* MODO 3: CONFIRMAR INGRESOS PENDIENTES ("YA LO RECIBÍ") */
        <View className="gap-4">
          {loadingPending ? (
            <View className="items-center justify-center gap-2 py-8">
              <ActivityIndicator color={colors.neutral400} />
              <Text className="text-xs text-neutral-400">Buscando ingresos pendientes...</Text>
            </View>
          ) : pendingList.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
              <CheckCircle2 size={32} color={colors.green500} />
              <Text className="text-center text-sm font-bold text-neutral-800">
                No tienes ingresos pendientes por confirmar
              </Text>
              <Text className="text-center text-xs text-neutral-500">
                Cuando configures un ingreso fijo mensual, aparecerá aquí cada mes para que lo
                confirmes con un toque.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-xs text-neutral-500">
                Si el monto depositado este mes varió, puedes ajustarlo antes de tocar{' '}
                <Text className="font-bold text-neutral-700">Ya lo recibí</Text>:
              </Text>

              {pendingList.map((tx) => {
                const isConfirming = confirmingTxId === tx.id;
                return (
                  <View
                    key={tx.id}
                    className="gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-neutral-900">{tx.description}</Text>
                        <Text className="text-xs text-neutral-500">
                          Cuenta: <Text className="font-medium">{tx.accountName}</Text> • Esperado:{' '}
                          {new Date(tx.transactionDate).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                      <View className="rounded-lg bg-amber-100 px-2.5 py-1">
                        <Text className="text-[11px] font-bold text-amber-800">Pendiente</Text>
                      </View>
                    </View>

                    <View className="flex-row items-end gap-2">
                      <View className="flex-1">
                        <Label small>Monto final recibido ($)</Label>
                        <TextInput
                          keyboardType="number-pad"
                          value={customAmounts[tx.id] ?? String(Math.round(tx.amount))}
                          onChangeText={(text) =>
                            setCustomAmounts((prev) => ({
                              ...prev,
                              [tx.id]: text.replace(/\D/g, ''),
                            }))
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-bold text-neutral-900"
                        />
                      </View>

                      <Pressable
                        disabled={isConfirming}
                        onPress={() => handleConfirmPendingIncome(tx)}
                        className={`flex-row items-center gap-1.5 rounded-xl px-4 py-2.5 ${
                          isConfirming ? 'bg-neutral-400' : 'bg-green-600 active:bg-green-700'
                        }`}
                      >
                        {isConfirming ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <CheckCircle2 size={16} color={colors.white} />
                            <Text className="text-xs font-bold text-white">Ya lo recibí</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!!error && <ErrorText>{error}</ErrorText>}
        </View>
      ) : (
        /* MODOS 1 Y 2: INGRESO PUNTUAL O FIJO MENSUAL */
        <View className="gap-4">
          <View>
            <Label>Cuenta que recibe el ingreso</Label>
            <Select
              value={accountId}
              onChange={setAccountId}
              placeholder="Selecciona una cuenta"
              options={incomeAccounts.map((account) => ({
                value: account.id,
                label: `${account.name}${account.bankName ? ` (${account.bankName})` : ''}`,
              }))}
            />
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Label>{mode === 'recurring' ? 'Monto estimado ($)' : 'Monto ($)'}</Label>
              <NumberInput placeholder="Ej: 1200000" value={amount} onChangeText={setAmount} />
            </View>

            <View className="flex-1">
              {mode === 'single' ? (
                <>
                  <Label>Fecha</Label>
                  <DateField value={date} onChange={setDate} />
                </>
              ) : (
                <>
                  <Label>Día de pago (1-31)</Label>
                  <NumberInput
                    maxLength={2}
                    placeholder="Ej: 5 o 30"
                    value={expectedDay}
                    onChangeText={setExpectedDay}
                  />
                </>
              )}
            </View>
          </View>

          <View>
            <Label>Descripción</Label>
            <Input
              placeholder={
                mode === 'recurring'
                  ? 'Ej: Sueldo mensual, Arriendo, Pensión...'
                  : 'Ej: Venta, Bono, Reembolso...'
              }
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {categories.length > 0 && (
            <View>
              <Label>Categoría (opcional)</Label>
              <Select
                value={categoryId}
                onChange={setCategoryId}
                emptyLabel="Sin categoría"
                options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              />
            </View>
          )}

          {mode === 'recurring' && (
            <View className="gap-2.5 rounded-2xl border border-green-100 bg-green-50 p-3.5">
              <Text className="text-xs leading-relaxed text-green-900">
                Cada mes se generará como <Text className="font-bold">ingreso pendiente</Text> para
                que solo tengas que tocar <Text className="font-bold">“Ya lo recibí”</Text> y sumar
                el dinero a tu saldo real.
              </Text>

              <Checkbox
                checked={alreadyReceivedThisMonth}
                onChange={setAlreadyReceivedThisMonth}
                label="Ya recibí el pago de este mes (sumar al saldo ahora)"
                labelClassName="text-xs font-bold text-green-950"
              />
            </View>
          )}

          {!!error && <ErrorText>{error}</ErrorText>}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`mt-2 flex-row items-center justify-center gap-2 rounded-xl py-3.5 ${
              isSubmitting ? 'bg-neutral-400' : 'bg-green-600 active:bg-green-700'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="font-bold text-white">
                {mode === 'recurring'
                  ? `Guardar ingreso fijo${amount ? ` (${formatCLP(Number(amount))})` : ''}`
                  : 'Guardar ingreso'}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </ModalSheet>
  );
}
