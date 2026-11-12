import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { request } from '../../lib/apiClient';
import { formatCLP } from '../../lib/currency';
import type { Account } from '../../types/finance';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton, GhostButton } from '../ui/buttons';
import { Input, Label, NumberInput } from '../ui/form';
import { ACCOUNT_TYPE_LABELS } from './shared';

interface Props {
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
}

const toFormData = (account: Account) => ({
  name: account.name,
  balance: String(Math.round(account.balance ?? 0)),
  creditLimit:
    account.creditLimit !== null && account.creditLimit !== undefined
      ? String(Math.round(account.creditLimit))
      : '',
  billingDay: account.billingDay ? String(account.billingDay) : '',
  dueDay: account.dueDay ? String(account.dueDay) : '',
});

export default function EditAccountModal({ account, onClose, onSaved }: Props) {
  const [data, setData] = useState({ name: '', balance: '', creditLimit: '', billingDay: '', dueDay: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) setData(toFormData(account));
  }, [account]);

  const set = (key: keyof typeof data) => (value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const handleUpdateAccount = async () => {
    if (!account) return;
    if (!data.name.trim()) return Alert.alert('Falta información', 'Ingresa el nombre de la cuenta.');

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        balance: Number(data.balance || 0),
      };

      if (account.isCreditAccount) {
        payload.creditLimit = Number(data.creditLimit || 0);
        if (data.billingDay) payload.billingDay = Number(data.billingDay);
        if (data.dueDay) payload.dueDay = Number(data.dueDay);
      }

      await request(`/Accounts/${account.id}`, { method: 'PATCH', body: payload, auth: true });
      onSaved();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error && err.message
          ? err.message
          : 'Hubo un error al actualizar la cuenta. Inténtalo nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet open={!!account} onClose={onClose}>
      {account && (
        <View className="gap-5">
          <View className="pr-8">
            <Text className="text-lg font-bold text-neutral-900">
              {account.isCreditAccount ? 'Editar cupos y cuenta' : 'Editar cuenta'}
            </Text>
            <Text className="text-xs text-neutral-500">
              {account.bankName ?? 'Efectivo'} • {ACCOUNT_TYPE_LABELS[account.typeName] ?? account.typeName}
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Label>Nombre de la cuenta</Label>
              <Input value={data.name} onChangeText={set('name')} placeholder="Ej: Visa Signature" />
            </View>

            {account.isCreditAccount ? (
              <>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Label>Cupo total ($)</Label>
                    <NumberInput value={data.creditLimit} onChangeText={set('creditLimit')} placeholder="Ej: 2000000" />
                  </View>
                  <View className="flex-1">
                    <Label>Cupo utilizado ($)</Label>
                    <NumberInput value={data.balance} onChangeText={set('balance')} placeholder="Ej: 450000" />
                  </View>
                </View>

                <View className="flex-row items-center justify-between rounded-2xl bg-neutral-900 p-4">
                  <Text className="text-xs text-neutral-400">Cupo disponible resultante</Text>
                  <Text className="text-base font-bold text-green-400">
                    {formatCLP(Number(data.creditLimit || 0) - Number(data.balance || 0))}
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Label>Día de facturación</Label>
                    <NumberInput maxLength={2} value={data.billingDay} onChangeText={set('billingDay')} placeholder="1 - 31" />
                  </View>
                  <View className="flex-1">
                    <Label>Día de vencimiento</Label>
                    <NumberInput maxLength={2} value={data.dueDay} onChangeText={set('dueDay')} placeholder="1 - 31" />
                  </View>
                </View>
              </>
            ) : (
              <View>
                <Label>Saldo actual ($)</Label>
                <NumberInput value={data.balance} onChangeText={set('balance')} placeholder="Ej: 350000" />
              </View>
            )}

            <View className="flex-row justify-end gap-2 pt-2">
              <GhostButton onPress={onClose}>Cancelar</GhostButton>
              <DarkButton onPress={handleUpdateAccount} loading={isSubmitting} className="">
                Guardar cambios
              </DarkButton>
            </View>
          </View>
        </View>
      )}
    </ModalSheet>
  );
}
