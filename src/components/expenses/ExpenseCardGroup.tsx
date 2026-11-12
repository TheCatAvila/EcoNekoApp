import { Text, View } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { fixedExpenseKey, type FixedExpense } from '../../services/fixedExpensesService';
import type { ExpenseGroup } from '../../lib/expenseCalculations';
import { formatCLP } from '../../lib/currency';
import { describeCard } from '../../lib/cardLabels';
import type { Card } from '../../types/finance';
import { colors } from '../ui/theme';
import ExpenseItem from './ExpenseItem';

interface Props {
  group: ExpenseGroup;
  /** Datos completos de la tarjeta (tipo, marca, últimos 4), si están disponibles. */
  card?: Card;
  /** Clave (tipo-id) del egreso que se está eliminando. */
  deletingKey: string | null;
  onDelete: (expense: FixedExpense) => void;
}

export default function ExpenseCardGroup({ group, card, deletingKey, onDelete }: Props) {
  const subtitle = [card ? describeCard(card) : null, card?.bankName ?? group.bankName]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm">
      {/* Header de la tarjeta */}
      <View className="flex-row items-center justify-between gap-3 border-b border-neutral-100 p-5">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-neutral-900">
            <CreditCard size={20} color={colors.yellow400} />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="font-bold text-neutral-900">
              {group.cardAlias}
            </Text>
            {!!subtitle && (
              <Text numberOfLines={1} className="text-xs text-neutral-500">
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Total mensual
          </Text>
          <Text className="font-black text-neutral-900">{formatCLP(group.subtotal)}</Text>
        </View>
      </View>

      {/* Egresos de la tarjeta */}
      <View className="gap-3 p-4">
        {group.items.map((expense, index) => (
          <ExpenseItem
            // Suscripciones y cuotas pueden compartir id; el índice cubre ids faltantes.
            key={`${expense.type}-${expense.id ?? 'sin-id'}-${index}`}
            expense={expense}
            isDeleting={deletingKey === fixedExpenseKey(expense)}
            onDelete={onDelete}
          />
        ))}
      </View>
    </View>
  );
}
