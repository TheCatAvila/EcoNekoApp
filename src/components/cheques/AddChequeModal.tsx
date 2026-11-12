import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react-native';
import { getErrorMessage } from '../../lib/apiClient';
import { todayISO } from '../../lib/dates';
import {
  CHEQUE_DIRECTION_CODE,
  createCheque,
  type ChequeDirection,
} from '../../services/chequesService';
import type { Account } from '../../types/finance';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton } from '../ui/buttons';
import { Banner } from '../ui/feedback';
import { DateField, Input, Label, NumberInput, SegmentedTabs, Select } from '../ui/form';
import { colors } from '../ui/theme';

interface Props {
  open: boolean;
  initialDirection: ChequeDirection;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = () => ({
  number: '',
  accountId: '' as number | '',
  counterpartName: '',
  drawerBankName: '',
  amount: '',
  issueDate: todayISO(),
  cashDate: todayISO(),
  description: '',
});

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View className="flex-1">
      <Label>{label}</Label>
      {children}
      {!!hint && <Text className="mt-1 text-[11px] text-amber-700">{hint}</Text>}
    </View>
  );
}

/** Registrar un cheque emitido o recibido (POST /Cheques). Queda pendiente hasta cobrarlo. */
export default function AddChequeModal({ open, initialDirection, accounts, onClose, onSaved }: Props) {
  const [direction, setDirection] = useState<ChequeDirection>(initialDirection);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIssued = direction === 'Issued';

  // Los cheques se emiten desde una cuenta corriente; los recibidos se depositan en
  // cualquier cuenta líquida.
  const availableAccounts = accounts.filter((a) =>
    isIssued ? a.typeName === 'Checking' : ['Checking', 'Prepaid', 'Cash'].includes(a.typeName),
  );

  const set = <K extends keyof ReturnType<typeof emptyForm>>(
    key: K,
    value: ReturnType<typeof emptyForm>[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!open) return;
    setDirection(initialDirection);
    setForm(emptyForm());
    setError(null);
  }, [open, initialDirection]);

  // Si cambia el tipo y la cuenta elegida ya no aplica, se limpia
  useEffect(() => {
    if (form.accountId && !availableAccounts.some((a) => a.id === form.accountId)) {
      set('accountId', availableAccounts.length === 1 ? availableAccounts[0].id : '');
    } else if (!form.accountId && availableAccounts.length === 1) {
      set('accountId', availableAccounts[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, accounts, open]);

  const handleSubmit = async () => {
    setError(null);

    if (!form.accountId) {
      return setError(isIssued ? 'Selecciona la cuenta corriente.' : 'Selecciona dónde lo depositarás.');
    }
    if (!form.number.trim()) return setError('Ingresa el número del cheque.');
    if (!Number(form.amount)) return setError('Ingresa el monto del cheque.');
    if (!form.counterpartName.trim()) {
      return setError(isIssued ? 'Indica a nombre de quién está.' : 'Indica quién te lo entregó.');
    }
    if (form.cashDate < form.issueDate) {
      return setError('La fecha de cobro no puede ser anterior a la fecha de emisión.');
    }

    setIsSubmitting(true);
    try {
      await createCheque({
        direction: CHEQUE_DIRECTION_CODE[direction],
        number: form.number.trim(),
        accountId: Number(form.accountId),
        drawerBankName: !isIssued && form.drawerBankName.trim() ? form.drawerBankName.trim() : null,
        counterpartName: form.counterpartName.trim(),
        amount: Number(form.amount),
        issueDate: form.issueDate,
        cashDate: form.cashDate,
        description: form.description.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar el cheque.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet open={open} onClose={onClose}>
      <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
        <FileText size={24} color={colors.neutral700} />
      </View>
      <Text className="mb-6 text-xl font-bold text-neutral-900">Registrar cheque</Text>

      <View className="gap-4">
        <SegmentedTabs
          value={direction}
          onChange={setDirection}
          tabs={[
            {
              value: 'Issued',
              label: 'Emitido',
              icon: <ArrowUpRight size={16} color={isIssued ? colors.neutral900 : colors.neutral500} />,
            },
            {
              value: 'Received',
              label: 'Recibido',
              icon: <ArrowDownLeft size={16} color={!isIssued ? colors.neutral900 : colors.neutral500} />,
            },
          ]}
        />

        <Field
          label={isIssued ? 'Cuenta corriente' : 'Cuenta donde lo depositarás'}
          hint={
            isIssued && availableAccounts.length === 0
              ? 'Necesitas una cuenta corriente para emitir cheques.'
              : undefined
          }
        >
          <Select
            value={form.accountId}
            onChange={(value) => set('accountId', value === '' ? '' : Number(value))}
            placeholder="Selecciona una cuenta"
            disabled={availableAccounts.length === 0}
            options={availableAccounts.map((a) => ({
              value: a.id,
              label: `${a.name}${a.bankName ? ` (${a.bankName})` : ''}`,
            }))}
          />
        </Field>

        <View className="flex-row gap-3">
          <Field label="N° de cheque">
            <Input
              placeholder="Ej: 0012345"
              keyboardType="number-pad"
              value={form.number}
              onChangeText={(v) => set('number', v)}
            />
          </Field>
          <Field label="Monto">
            <NumberInput placeholder="Ej: 250000" value={form.amount} onChangeText={(v) => set('amount', v)} />
          </Field>
        </View>

        <Field label={isIssued ? 'A nombre de' : 'Entregado por'}>
          <Input
            placeholder={isIssued ? 'Ej: Inmobiliaria Los Andes' : 'Ej: Juan Pérez'}
            value={form.counterpartName}
            onChangeText={(v) => set('counterpartName', v)}
          />
        </Field>

        {!isIssued && (
          <Field label="Banco del cheque (opcional)">
            <Input
              placeholder="Ej: Banco de Chile"
              value={form.drawerBankName}
              onChangeText={(v) => set('drawerBankName', v)}
            />
          </Field>
        )}

        <View className="flex-row gap-3">
          <Field label="Fecha de emisión">
            <DateField value={form.issueDate} onChange={(v) => set('issueDate', v)} />
          </Field>
          <Field label={isIssued ? 'Se cobra desde' : 'Se deposita desde'}>
            <DateField value={form.cashDate} onChange={(v) => set('cashDate', v)} />
          </Field>
        </View>

        <Field label="Descripción (opcional)">
          <Input
            placeholder="Ej: Arriendo marzo, pago proveedor..."
            value={form.description}
            onChangeText={(v) => set('description', v)}
          />
        </Field>

        {isIssued && (
          <Text className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Mientras esté pendiente, el monto se descuenta de tu liquidez segura porque ya está
            comprometido.
          </Text>
        )}

        {!!error && <Banner>{error}</Banner>}

        <DarkButton onPress={handleSubmit} loading={isSubmitting}>
          Guardar cheque
        </DarkButton>
      </View>
    </ModalSheet>
  );
}
