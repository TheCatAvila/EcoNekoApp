import { Pressable, ScrollView, Text } from 'react-native';
import type { ExpenseFilter } from '../../lib/expenseCalculations';

const EXPENSE_FILTERS: { key: ExpenseFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'installment', label: 'Cuotas' },
  { key: 'subscription', label: 'Suscripciones' },
];

interface Props {
  value: ExpenseFilter;
  onChange: (filter: ExpenseFilter) => void;
}

export default function ExpenseFilters({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {EXPENSE_FILTERS.map((f) => {
        const active = value === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            className={`rounded-xl px-4 py-2 ${
              active ? 'bg-neutral-900' : 'border border-neutral-100 bg-white'
            }`}
          >
            <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-neutral-500'}`}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
