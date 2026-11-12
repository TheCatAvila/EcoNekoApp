import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { AlertTriangle, Wallet } from 'lucide-react-native';
import { getErrorMessage } from '../../lib/apiClient';
import { formatCLP } from '../../lib/currency';
import { todayISO } from '../../lib/dates';
import { payLoanInstallment, type Loan } from '../../services/loansService';
import type { Account } from '../../types/finance';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton } from '../ui/buttons';
import { Banner } from '../ui/feedback';
import { DateField, Label, NumberInput, Select } from '../ui/form';
import { colors } from '../ui/theme';

interface Props {
  loan: Loan | null;
  /** Cuentas líquidas (corriente, vista, prepago, efectivo). */
  payFromAccounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

/** Pago de una cuota: transferencia de una cuenta líquida al crédito (POST /Loans/{id}/payments). */
export default function PayLoanModal({ loan, payFromAccounts, onClose, onSaved }: Props) {
  const [sourceAccountId, setSourceAccountId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loan) return;
    setSourceAccountId(
      loan.payFromAccountId ?? (payFromAccounts.length === 1 ? payFromAccounts[0].id : ''),
    );
    setAmount(String(Math.round(loan.monthlyPayment)));
    setDate(todayISO());
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan]);

  const handleSubmit = async () => {
    if (!loan) return;
    if (!sourceAccountId) return setError('Selecciona la cuenta desde la que pagas.');
    if (!Number(amount)) return setError('Ingresa el monto pagado.');

    setIsSubmitting(true);
    setError(null);
    try {
      await payLoanInstallment(loan.id, {
        sourceAccountId: Number(sourceAccountId),
        amount: Number(amount),
        paymentDate: `${date}T12:00:00`,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar el pago.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet open={!!loan} onClose={onClose}>
      {loan && (
        <>
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
            <Wallet size={24} color={colors.green600} />
          </View>
          <Text className="mb-1 text-xl font-bold text-neutral-900">Pagar cuota</Text>
          <Text className="mb-6 text-sm text-neutral-500">
            <Text className="font-bold text-neutral-700">{loan.name}</Text> · cuota{' '}
            {Math.min(loan.paidInstallments + 1, loan.totalInstallments)} de {loan.totalInstallments}
          </Text>

          {payFromAccounts.length === 0 ? (
            <View className="flex-row items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertTriangle size={20} color={colors.amber500} />
              <Text className="flex-1 text-sm text-amber-800">
                Necesitas una cuenta corriente, vista, prepago o de efectivo para pagar la cuota.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              <View>
                <Label>Cuenta de origen</Label>
                <Select
                  value={sourceAccountId}
                  onChange={setSourceAccountId}
                  placeholder="Selecciona una cuenta"
                  options={payFromAccounts.map((a) => ({
                    value: a.id,
                    label: `${a.name}${a.bankName ? ` (${a.bankName})` : ''} — ${formatCLP(a.balance)}`,
                  }))}
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Label>Monto</Label>
                  <NumberInput value={amount} onChangeText={setAmount} />
                </View>
                <View className="flex-1">
                  <Label>Fecha de pago</Label>
                  <DateField value={date} onChange={setDate} />
                </View>
              </View>

              {!!error && <Banner>{error}</Banner>}

              <DarkButton onPress={handleSubmit} loading={isSubmitting}>
                Registrar pago
              </DarkButton>
            </View>
          )}
        </>
      )}
    </ModalSheet>
  );
}
