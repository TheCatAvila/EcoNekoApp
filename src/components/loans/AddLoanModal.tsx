import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { HandCoins } from 'lucide-react-native';
import { getErrorMessage, request } from '../../lib/apiClient';
import { formatCLP } from '../../lib/currency';
import { createLoan, LOAN_TYPE_OPTIONS } from '../../services/loansService';
import type { Account } from '../../types/finance';
import type { Bank } from '../cards/shared';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton } from '../ui/buttons';
import { Banner } from '../ui/feedback';
import { Input, Label, NumberInput, Select } from '../ui/form';
import { colors } from '../ui/theme';

interface Props {
  open: boolean;
  /** Cuentas líquidas (corriente, vista, prepago, efectivo) desde las que se paga la cuota. */
  payFromAccounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  name: '',
  loanType: 1,
  bankId: '' as number | '',
  originalAmount: '',
  outstandingBalance: '',
  monthlyPayment: '',
  totalInstallments: '',
  paidInstallments: '0',
  paymentDay: '',
  payFromAccountId: '' as number | '',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View className="flex-1">
      <Label>{label}</Label>
      {children}
      {!!hint && <Text className="mt-1 text-[11px] text-neutral-500">{hint}</Text>}
    </View>
  );
}

/** Nuevo crédito (POST /Loans). Es una deuda aparte: no usa cupo de tarjetas. */
export default function AddLoanModal({ open, payFromAccounts, onClose, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      payFromAccountId: payFromAccounts.length === 1 ? payFromAccounts[0].id : '',
    });
    setError(null);
    if (banks.length === 0) {
      request<Bank[]>('/Banks', { auth: true })
        .then(setBanks)
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = Number(form.totalInstallments || 0);
  const paid = Number(form.paidInstallments || 0);
  const monthly = Number(form.monthlyPayment || 0);
  // Estimación simple de la deuda pendiente si el usuario no la conoce
  const estimatedOutstanding = Math.max(total - paid, 0) * monthly;

  const handleSubmit = async () => {
    setError(null);

    const day = Number(form.paymentDay);
    if (!form.name.trim()) return setError('Ingresa un nombre para el crédito.');
    if (!Number(form.originalAmount)) return setError('Ingresa el monto original.');
    if (!monthly) return setError('Ingresa la cuota mensual.');
    if (total < 1) return setError('Ingresa el total de cuotas.');
    if (paid >= total) return setError('Las cuotas pagadas deben ser menores al total.');
    if (day < 1 || day > 31) return setError('El día de pago debe estar entre 1 y 31.');

    setIsSubmitting(true);
    try {
      await createLoan({
        name: form.name.trim(),
        bankId: form.bankId ? Number(form.bankId) : null,
        loanType: Number(form.loanType),
        originalAmount: Number(form.originalAmount),
        outstandingBalance: form.outstandingBalance
          ? Number(form.outstandingBalance)
          : estimatedOutstanding,
        monthlyPayment: monthly,
        totalInstallments: total,
        paidInstallments: paid,
        paymentDay: day,
        payFromAccountId: form.payFromAccountId ? Number(form.payFromAccountId) : null,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el crédito.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet open={open} onClose={onClose}>
      <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
        <HandCoins size={24} color={colors.red500} />
      </View>
      <Text className="mb-1 text-xl font-bold text-neutral-900">Nuevo crédito</Text>
      <Text className="mb-6 text-sm text-neutral-500">
        Los créditos son una deuda aparte: no usan el cupo de tus tarjetas. Solo su cuota mensual
        cuenta como compromiso del mes.
      </Text>

      <View className="gap-4">
        <Field label="Nombre">
          <Input
            placeholder="Ej: Crédito auto, Consumo Santander..."
            value={form.name}
            onChangeText={(text) => set('name', text)}
          />
        </Field>

        <Field label="Tipo">
          <Select
            value={form.loanType}
            onChange={(value) => set('loanType', Number(value) || 1)}
            options={LOAN_TYPE_OPTIONS.map((o) => ({ value: o.code, label: o.label }))}
          />
        </Field>

        <Field label="Institución">
          <Select
            value={form.bankId}
            onChange={(value) => set('bankId', value === '' ? '' : Number(value))}
            emptyLabel="Sin especificar"
            options={banks.map((b) => ({ value: b.id, label: b.name }))}
          />
        </Field>

        <View className="flex-row gap-3">
          <Field label="Monto original">
            <NumberInput
              placeholder="Ej: 10000000"
              value={form.originalAmount}
              onChangeText={(v) => set('originalAmount', v)}
            />
          </Field>
          <Field label="Cuota mensual">
            <NumberInput
              placeholder="Ej: 350000"
              value={form.monthlyPayment}
              onChangeText={(v) => set('monthlyPayment', v)}
            />
          </Field>
        </View>

        <View className="flex-row gap-3">
          <Field label="Total cuotas">
            <NumberInput
              placeholder="48"
              value={form.totalInstallments}
              onChangeText={(v) => set('totalInstallments', v)}
            />
          </Field>
          <Field label="Ya pagadas">
            <NumberInput value={form.paidInstallments} onChangeText={(v) => set('paidInstallments', v)} />
          </Field>
          <Field label="Día de pago">
            <NumberInput
              placeholder="5"
              maxLength={2}
              value={form.paymentDay}
              onChangeText={(v) => set('paymentDay', v)}
            />
          </Field>
        </View>

        <Field
          label="Deuda pendiente (opcional)"
          hint={
            estimatedOutstanding > 0
              ? `Si lo dejas vacío usaremos ${formatCLP(estimatedOutstanding)} (cuotas restantes × cuota mensual).`
              : 'Revisa tu banco: incluye intereses. Si lo dejas vacío se estima con las cuotas restantes.'
          }
        >
          <NumberInput
            placeholder="Saldo para prepagar según tu banco"
            value={form.outstandingBalance}
            onChangeText={(v) => set('outstandingBalance', v)}
          />
        </Field>

        <Field label="Se paga desde">
          <Select
            value={form.payFromAccountId}
            onChange={(value) => set('payFromAccountId', value === '' ? '' : Number(value))}
            emptyLabel="Elegir al pagar cada cuota"
            options={payFromAccounts.map((a) => ({
              value: a.id,
              label: `${a.name}${a.bankName ? ` (${a.bankName})` : ''}`,
            }))}
          />
        </Field>

        {!!error && <Banner>{error}</Banner>}

        <DarkButton onPress={handleSubmit} loading={isSubmitting}>
          Guardar crédito
        </DarkButton>
      </View>
    </ModalSheet>
  );
}
