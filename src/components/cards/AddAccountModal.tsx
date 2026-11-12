import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { request } from '../../lib/apiClient';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton } from '../ui/buttons';
import { Checkbox, Input, Label, NumberInput, Select } from '../ui/form';
import { colors } from '../ui/theme';
import { ACCOUNT_TYPE, ACCOUNT_TYPE_OPTIONS, BRAND_OPTIONS, type Bank } from './shared';

const emptyAccountForm = {
  name: '',
  type: ACCOUNT_TYPE.CreditCard as number,
  bankId: '' as number | '',
  initialBalance: '',
  creditLimit: '',
  billingDay: '',
  dueDay: '',
  createDefaultCard: false,
  defaultCardBrand: 0,
  defaultCardLastFourDigits: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddAccountModal({ open, onClose, onSaved }: Props) {
  const [form, setForm] = useState(emptyAccountForm);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCashForm = form.type === ACCOUNT_TYPE.Cash;
  const isCreditForm =
    form.type === ACCOUNT_TYPE.CreditCard || form.type === ACCOUNT_TYPE.CreditLine;

  const set = <K extends keyof typeof emptyAccountForm>(key: K, value: (typeof emptyAccountForm)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (open) setForm(emptyAccountForm);
  }, [open]);

  // Cargar bancos la primera vez que se abre el modal
  useEffect(() => {
    if (!open || banks.length > 0) return;

    setIsLoadingBanks(true);
    request<Bank[]>('/Banks', { auth: true })
      .then(setBanks)
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingBanks(false));
  }, [open, banks.length]);

  const handleAccountTypeChange = (type: number) => {
    setForm((prev) => ({
      ...prev,
      type,
      bankId: type === ACCOUNT_TYPE.Cash ? '' : prev.bankId,
      createDefaultCard: type === ACCOUNT_TYPE.Cash ? false : prev.createDefaultCard,
    }));
  };

  const handleCreateAccount = async () => {
    if (!form.name.trim()) return Alert.alert('Falta información', 'Ingresa el nombre de la cuenta.');
    if (!isCashForm && !form.bankId) {
      return Alert.alert('Falta información', 'Selecciona la institución financiera.');
    }
    if (isCreditForm) {
      const billing = Number(form.billingDay);
      const due = Number(form.dueDay);
      if (!Number(form.creditLimit)) return Alert.alert('Falta información', 'Ingresa el cupo total.');
      if (billing < 1 || billing > 31 || due < 1 || due > 31) {
        return Alert.alert('Datos inválidos', 'Los días de facturación y pago deben estar entre 1 y 31.');
      }
    }

    setIsSubmitting(true);
    try {
      const createDefaultCard = !isCashForm && form.createDefaultCard;

      await request('/Accounts', {
        method: 'POST',
        auth: true,
        body: {
          bankId: isCashForm ? null : Number(form.bankId),
          name: form.name.trim(),
          type: form.type,
          currency: 'CLP',
          initialBalance: Number(form.initialBalance || 0),
          creditLimit: isCreditForm ? Number(form.creditLimit) : null,
          billingDay: isCreditForm ? Number(form.billingDay) : null,
          dueDay: isCreditForm ? Number(form.dueDay) : null,
          createDefaultCard,
          defaultCardBrand: createDefaultCard ? Number(form.defaultCardBrand) : 0,
          defaultCardLastFourDigits: createDefaultCard ? form.defaultCardLastFourDigits || null : null,
        },
      });

      onSaved();
    } catch {
      Alert.alert('Error', 'Hubo un error al crear la cuenta. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet open={open} onClose={onClose}>
      <Text className="mb-6 text-xl font-bold text-neutral-900">Agregar nueva cuenta</Text>

      <View className="gap-4">
        <View>
          <Label>Nombre de la cuenta</Label>
          <Input
            placeholder="Ej: CMR Falabella, Cuenta Corriente, Billetera..."
            value={form.name}
            onChangeText={(v) => set('name', v)}
          />
        </View>

        <View>
          <Label>Tipo de cuenta</Label>
          <Select
            value={form.type}
            onChange={(v) => v !== '' && handleAccountTypeChange(v)}
            options={ACCOUNT_TYPE_OPTIONS}
          />
        </View>

        {!isCashForm && (
          <View>
            <View className="flex-row items-center gap-2">
              <Label>Institución financiera</Label>
              {isLoadingBanks && <ActivityIndicator size="small" color={colors.neutral400} />}
            </View>
            <Select
              value={form.bankId}
              onChange={(v) => set('bankId', v)}
              placeholder="Selecciona un banco"
              disabled={isLoadingBanks || banks.length === 0}
              options={banks.map((bank) => ({ value: bank.id, label: bank.name }))}
            />
          </View>
        )}

        <View>
          <Label>{isCreditForm ? 'Cupo utilizado actual' : 'Saldo disponible'}</Label>
          <NumberInput
            placeholder="Ej: 0"
            value={form.initialBalance}
            onChangeText={(v) => set('initialBalance', v)}
          />
        </View>

        {isCreditForm && (
          <>
            <View>
              <Label>Cupo total (límite)</Label>
              <NumberInput
                placeholder="Ej: 500000"
                value={form.creditLimit}
                onChangeText={(v) => set('creditLimit', v)}
              />
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Label>Día de facturación</Label>
                <NumberInput
                  maxLength={2}
                  placeholder="Ej: 25"
                  value={form.billingDay}
                  onChangeText={(v) => set('billingDay', v)}
                />
              </View>
              <View className="flex-1">
                <Label>Día de pago</Label>
                <NumberInput
                  maxLength={2}
                  placeholder="Ej: 5"
                  value={form.dueDay}
                  onChangeText={(v) => set('dueDay', v)}
                />
              </View>
            </View>
          </>
        )}

        {!isCashForm && (
          <View className="gap-4 rounded-2xl border border-neutral-200 p-4">
            <View>
              <Checkbox
                checked={form.createDefaultCard}
                onChange={(v) => set('createDefaultCard', v)}
                label="Crear también la tarjeta principal"
                labelClassName="text-sm font-bold text-neutral-700"
              />
              <Text className="ml-8 mt-1 text-xs text-neutral-500">
                Usará el nombre de la cuenta. Podrás agregar más tarjetas después.
              </Text>
            </View>

            {form.createDefaultCard && (
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Label>Marca</Label>
                  <Select
                    value={form.defaultCardBrand}
                    onChange={(v) => set('defaultCardBrand', v === '' ? 0 : v)}
                    options={BRAND_OPTIONS}
                  />
                </View>
                <View className="flex-1">
                  <Label>Últimos 4 dígitos</Label>
                  <NumberInput
                    maxLength={4}
                    placeholder="Opcional"
                    value={form.defaultCardLastFourDigits}
                    onChangeText={(v) => set('defaultCardLastFourDigits', v)}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        <DarkButton onPress={handleCreateAccount} loading={isSubmitting}>
          Guardar cuenta
        </DarkButton>
      </View>
    </ModalSheet>
  );
}
