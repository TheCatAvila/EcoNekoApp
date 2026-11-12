import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CalendarClock, HandCoins, Trash2, Wallet } from 'lucide-react-native';
import { formatCLP } from '../../lib/currency';
import { formatShortDate } from '../../lib/dates';
import { LOAN_TYPE_LABELS, type Loan } from '../../services/loansService';
import { Gradient } from '../ui/Gradient';
import { colors } from '../ui/theme';

interface Props {
  loan: Loan;
  isDeleting: boolean;
  onPay: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-sm text-neutral-500">{label}</Text>
      <Text className={`text-sm ${valueClass}`}>{value}</Text>
    </View>
  );
}

/** Tarjeta de un crédito (consumo, hipotecario, automotriz…). No usa cupo de tarjetas. */
export default function LoanCard({ loan, isDeleting, onPay, onDelete }: Props) {
  const total = Math.max(loan.totalInstallments, 1);
  const paid = Math.min(loan.paidInstallments, total);
  const remaining = total - paid;
  const progress = Math.round((paid / total) * 100);
  const isFinished = remaining === 0;

  return (
    <View className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
      <View className="mb-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text numberOfLines={1} className="text-lg font-bold text-neutral-800">
            {loan.name}
          </Text>
          {!!loan.bankName && <Text className="mt-0.5 text-xs text-neutral-500">{loan.bankName}</Text>}
          <View className="mt-2 self-start rounded-md bg-red-50 px-2 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-red-600">
              {LOAN_TYPE_LABELS[loan.loanTypeName] ?? 'Crédito'}
            </Text>
          </View>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-100">
          <HandCoins size={20} color={colors.red500} />
        </View>
      </View>

      <View className="mb-4 gap-2">
        <Row label="Deuda pendiente" value={formatCLP(loan.outstandingBalance)} valueClass="font-bold text-red-500" />
        <Row label="Cuota mensual" value={formatCLP(loan.monthlyPayment)} valueClass="font-bold text-neutral-900" />
        <Row label="Monto original" value={formatCLP(loan.originalAmount)} valueClass="font-medium text-neutral-700" />
      </View>

      {/* Avance de cuotas */}
      <View className="mb-4">
        <View className="mb-1.5 flex-row justify-between">
          {isFinished ? (
            <Text className="text-xs font-bold text-green-600">¡Crédito pagado!</Text>
          ) : (
            <Text className="text-xs text-neutral-500">
              Cuota <Text className="font-bold text-neutral-700">{paid + 1}</Text> de {total}
            </Text>
          )}
          <Text className="text-xs text-neutral-500">{progress}% pagado</Text>
        </View>
        <View className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <Gradient
            colors={[colors.yellow400, colors.green500] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="h-2 rounded-full"
            style={{ width: `${progress}%` as const }}
          />
        </View>
      </View>

      <View className="mb-4 flex-row flex-wrap items-center gap-1.5">
        <CalendarClock size={14} color={colors.neutral500} />
        <Text className="text-xs text-neutral-500">
          {loan.nextPaymentDate
            ? `Próximo pago: ${formatShortDate(loan.nextPaymentDate.slice(0, 10))}`
            : `Se paga el día ${loan.paymentDay} de cada mes`}
          {loan.payFromAccountName ? ` · desde ${loan.payFromAccountName}` : ''}
        </Text>
        {loan.isCurrentMonthPaid && (
          <View className="rounded bg-green-100 px-1.5 py-0.5">
            <Text className="text-[10px] font-bold uppercase text-green-700">Mes pagado</Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-2 border-t border-neutral-100 pt-4">
        <Pressable
          onPress={() => onPay(loan)}
          disabled={isFinished}
          accessibilityRole="button"
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5 ${
            isFinished ? 'bg-neutral-400' : 'bg-neutral-900 active:bg-neutral-800'
          }`}
        >
          <Wallet size={16} color={colors.white} />
          <Text className="text-sm font-bold text-white">Pagar cuota</Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(loan)}
          disabled={isDeleting}
          accessibilityLabel={`Eliminar crédito ${loan.name}`}
          hitSlop={8}
          className={`items-center justify-center rounded-xl p-2.5 active:bg-red-50 ${
            isDeleting ? 'opacity-50' : ''
          }`}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.neutral400} />
          ) : (
            <Trash2 size={16} color={colors.neutral400} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
