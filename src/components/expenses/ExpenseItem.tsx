import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CalendarClock, Receipt, Repeat, Trash2 } from 'lucide-react-native';
import type { FixedExpense } from '../../services/fixedExpensesService';
import { formatCLP } from '../../lib/currency';
import { daysUntil, formatShortDate } from '../../lib/dates';
import { getInstallmentInfo } from '../../lib/expenseCalculations';
import { Gradient } from '../ui/Gradient';
import { colors } from '../ui/theme';

const chargeBadge = (days: number) => {
  if (days < 0) return { text: 'Atrasado', box: 'bg-red-100', label: 'text-red-600' };
  if (days === 0) return { text: 'Se cobra hoy', box: 'bg-red-100', label: 'text-red-600' };
  if (days === 1) return { text: 'Mañana', box: 'bg-red-100', label: 'text-red-600' };
  if (days <= 7) return { text: `En ${days} días`, box: 'bg-yellow-100', label: 'text-yellow-700' };
  return null;
};

interface Props {
  expense: FixedExpense;
  isDeleting: boolean;
  onDelete: (expense: FixedExpense) => void;
}

export default function ExpenseItem({ expense, isDeleting, onDelete }: Props) {
  const isInstallment = expense.type === 'installment';
  const { total, paid, remaining, progress, isLast } = getInstallmentInfo(expense);
  const badge = chargeBadge(daysUntil(expense.nextChargeDate));
  const isLastInstallment = isInstallment && isLast;

  return (
    <View className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-start gap-3">
          <View
            className={`h-9 w-9 items-center justify-center rounded-xl ${
              isInstallment ? 'bg-red-100' : 'bg-green-100'
            }`}
          >
            {isInstallment ? (
              <Receipt size={16} color={colors.red500} />
            ) : (
              <Repeat size={16} color={colors.green600} />
            )}
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-bold text-neutral-900">
              {expense.name}
            </Text>
            <Text className="text-xs text-neutral-500">
              {isInstallment ? `Cuota ${paid + 1} de ${total}` : 'Suscripción mensual'}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-black text-neutral-900">{formatCLP(expense.monthlyAmount)}</Text>
          <Text className="text-[11px] text-neutral-400">por mes</Text>
        </View>
      </View>

      {/* Progreso (solo cuotas) */}
      {isInstallment && (
        <View className="mt-4">
          <View className="mb-1.5 flex-row justify-between">
            {isLastInstallment ? (
              <Text className="text-xs font-bold text-green-600">¡Última cuota!</Text>
            ) : (
              <Text className="text-xs text-neutral-500">
                Faltan <Text className="font-bold text-neutral-700">{remaining}</Text> cuotas
              </Text>
            )}
            <Text className="text-xs text-neutral-500">
              Restan {formatCLP(remaining * expense.monthlyAmount)}
            </Text>
          </View>
          <View className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <Gradient
              colors={[colors.yellow400, colors.green500] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-2 rounded-full"
              style={{ width: `${progress}%` as const }}
            />
          </View>
        </View>
      )}

      {/* Footer */}
      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-1.5">
            <CalendarClock size={14} color={colors.neutral500} />
            <Text className="text-xs text-neutral-500">
              {isInstallment ? 'Próxima cuota' : 'Próximo cobro'}:{' '}
              {formatShortDate(expense.nextChargeDate)}
            </Text>
          </View>
          {badge && (
            <View className={`rounded-md px-2 py-1 ${badge.box}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-wider ${badge.label}`}>
                {badge.text}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => onDelete(expense)}
          disabled={isDeleting}
          accessibilityLabel={`Eliminar ${expense.name}`}
          hitSlop={8}
          className={`rounded-lg p-2 active:bg-red-50 ${isDeleting ? 'opacity-50' : ''}`}
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
