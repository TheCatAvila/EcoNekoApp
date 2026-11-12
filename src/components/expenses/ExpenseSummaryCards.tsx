import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { formatCLP } from '../../lib/currency';
import type { FixedSummary } from '../../lib/expenseCalculations';

interface Props {
  summary: FixedSummary;
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
      <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</Text>
      {children}
    </View>
  );
}

export default function ExpenseSummaryCards({ summary }: Props) {
  return (
    <View className="gap-4">
      <SummaryCard title="Comprometido al mes">
        <Text className="text-2xl font-black text-red-500">{formatCLP(summary.monthlyTotal)}</Text>
        {summary.incomePercentage !== null && (
          <Text className="mt-1 text-xs text-neutral-500">
            {summary.incomePercentage}% de tus ingresos del mes
          </Text>
        )}
      </SummaryCard>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <SummaryCard title="Por pagar en cuotas">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-2xl font-black text-neutral-800">
              {formatCLP(summary.remainingDebt)}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500">
              {summary.installmentsCount}{' '}
              {summary.installmentsCount === 1 ? 'compra activa' : 'compras activas'}
            </Text>
          </SummaryCard>
        </View>

        <View className="flex-1">
          <SummaryCard title="Suscripciones">
            <Text className="text-2xl font-black text-green-600">{summary.subscriptionsCount}</Text>
            <Text className="mt-1 text-xs text-neutral-500">Se renuevan cada mes</Text>
          </SummaryCard>
        </View>
      </View>
    </View>
  );
}
