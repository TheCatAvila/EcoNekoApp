import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { AlertTriangle, Wallet } from 'lucide-react-native';
import { request } from '../../lib/apiClient';
import { formatCLP } from '../../lib/currency';
import type { Account } from '../../types/finance';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton } from '../ui/buttons';
import { Label, NumberInput, Select } from '../ui/form';
import { colors } from '../ui/theme';

interface Props {
  account: Account | null;
  liquidAccounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

export default function PayCardModal({ account, liquidAccounts, onClose, onSaved }: Props) {
  const [sourceAccountId, setSourceAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!account) return;
    setSourceAccountId(liquidAccounts.length === 1 ? liquidAccounts[0].id : '');
    setAmount(
      account.paymentRequiredThisMonth > 0 ? String(Math.round(account.paymentRequiredThisMonth)) : '',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const handlePayCard = async () => {
    if (!account) return;
    if (!sourceAccountId) {
      return Alert.alert('Falta información', 'Selecciona la cuenta desde la que pagarás.');
    }
    if (!Number(amount)) return Alert.alert('Falta información', 'Ingresa el monto a pagar.');

    setIsSubmitting(true);
    try {
      await request('/Transactions/transfer', {
        method: 'POST',
        auth: true,
        body: {
          sourceAccountId: Number(sourceAccountId),
          destinationAccountId: account.id,
          amount: Number(amount),
          description: 'Pago de tarjeta de crédito',
          transactionDate: new Date().toISOString(),
        },
      });
      onSaved();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error && err.message
          ? err.message
          : 'Hubo un error al registrar el pago. Inténtalo nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet open={!!account} onClose={onClose}>
      {account && (
        <>
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
            <Wallet size={24} color={colors.green600} />
          </View>
          <Text className="mb-1 text-xl font-bold text-neutral-900">Pagar Tarjeta de Crédito</Text>
          <Text className="mb-6 text-sm text-neutral-500">
            Pagarás <Text className="font-bold text-neutral-700">{account.name}</Text>
            {account.bankName ? ` (${account.bankName})` : ''}.
          </Text>

          {liquidAccounts.length === 0 ? (
            <View className="flex-row items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle size={20} color={colors.amber500} />
              <Text className="flex-1 text-sm text-amber-800">
                Necesitas una cuenta corriente, prepago o de efectivo para pagar tu tarjeta. Crea una
                y vuelve a intentarlo.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-500">Pago de este mes</Text>
                  <Text className="text-sm font-bold text-neutral-900">
                    {formatCLP(account.paymentRequiredThisMonth)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-500">Cupo utilizado</Text>
                  <Text className="text-sm font-bold text-red-500">{formatCLP(account.balance)}</Text>
                </View>
              </View>

              <View>
                <Label>Cuenta de origen</Label>
                <Select
                  value={sourceAccountId}
                  onChange={setSourceAccountId}
                  placeholder="Selecciona una cuenta"
                  options={liquidAccounts.map((a) => ({
                    value: a.id,
                    label: `${a.name}${a.bankName ? ` (${a.bankName})` : ''} — ${formatCLP(a.balance)}`,
                  }))}
                />
              </View>

              <View>
                <Label>Monto a pagar</Label>
                <NumberInput placeholder="Ej: 150000" value={amount} onChangeText={setAmount} />
              </View>

              <DarkButton onPress={handlePayCard} loading={isSubmitting}>
                Confirmar pago
              </DarkButton>
            </View>
          )}
        </>
      )}
    </ModalSheet>
  );
}
