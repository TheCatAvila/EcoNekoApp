import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { CalendarClock, Plus } from 'lucide-react-native';

import type { FixedExpense } from '../services/fixedExpensesService';
import { useExpenseDependencies } from '../hooks/useExpenseDependencies';
import { useFixedExpenses } from '../hooks/useFixedExpenses';
import {
  calculateFixedSummary,
  groupExpensesByCard,
  type ExpenseFilter,
} from '../lib/expenseCalculations';

import AddExpenseModal from '../components/expenses/AddExpenseModal';
import ExpenseCardGroup from '../components/expenses/ExpenseCardGroup';
import ExpenseFilters from '../components/expenses/ExpenseFilters';
import ExpenseSummaryCards from '../components/expenses/ExpenseSummaryCards';
import { Screen } from '../components/ui/Screen';
import { confirm } from '../components/ui/feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { ActionButton } from '../components/ui/buttons';
import { colors } from '../components/ui/theme';

export default function ExpensesScreen() {
  const { cards, categories, summary, handleCategoryCreated } = useExpenseDependencies();
  const { expenses, isLoading, hasError, deletingId, reload, addExpense, removeExpense } =
    useFixedExpenses();

  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fixedSummary = useMemo(
    () => calculateFixedSummary(expenses, summary?.totalIncome ?? null),
    [expenses, summary],
  );
  const groups = useMemo(() => groupExpensesByCard(expenses, filter), [expenses, filter]);

  const handleDelete = async (expense: FixedExpense) => {
    const ok = await confirm('Eliminar egreso', `¿Eliminar "${expense.name}" de tus egresos fijos?`, {
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await removeExpense(expense.id);
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el egreso. Inténtalo nuevamente.');
    }
  };

  return (
    <Screen
      contentClassName="p-4 gap-6 pb-10"
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await reload();
        setRefreshing(false);
      }}
    >
      <AddExpenseModal
        open={isModalOpen}
        cards={cards}
        categories={categories}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addExpense}
        onCategoryCreated={handleCategoryCreated}
      />

      <PageHeader
        title="Egresos fijos"
        subtitle="Suscripciones y compras en cuotas, agrupadas por tarjeta"
        actions={
          <ActionButton
            onPress={() => setIsModalOpen(true)}
            icon={<Plus size={16} color={colors.white} />}
            label="Nuevo egreso"
          />
        }
      />

      {/* Contenido */}
      <View className="gap-4">
        {isLoading ? (
          <View className="items-center rounded-3xl border border-neutral-100 bg-white p-10">
            <ActivityIndicator color={colors.neutral400} />
          </View>
        ) : hasError ? (
          <View className="items-center rounded-3xl border border-neutral-100 bg-white p-8">
            <Text className="mb-3 text-sm text-neutral-500">
              No pudimos cargar tus egresos fijos.
            </Text>
            <Pressable onPress={reload} hitSlop={8}>
              <Text className="text-sm font-bold text-red-500">Reintentar</Text>
            </Pressable>
          </View>
        ) : expenses.length === 0 ? (
          <View className="items-center rounded-3xl border border-dashed border-neutral-200 bg-white p-10">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100">
              <CalendarClock size={24} color="#ca8a04" />
            </View>
            <Text className="mb-1 font-bold text-neutral-900">Aún no tienes egresos fijos</Text>
            <Text className="mb-5 max-w-sm text-center text-sm text-neutral-500">
              Registra tus suscripciones y compras en cuotas para saber cuánto de tu sueldo ya está
              comprometido.
            </Text>
            <Pressable
              onPress={() => setIsModalOpen(true)}
              className="flex-row items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 active:bg-neutral-800"
            >
              <Plus size={16} color={colors.white} />
              <Text className="text-sm font-bold text-white">Agregar el primero</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ExpenseSummaryCards summary={fixedSummary} />
            <ExpenseFilters value={filter} onChange={setFilter} />

            {groups.length === 0 ? (
              <View className="rounded-3xl border border-neutral-100 bg-white p-8">
                <Text className="text-center text-sm text-neutral-500">
                  No hay egresos en esta categoría.
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {groups.map((group) => (
                  <ExpenseCardGroup
                    key={group.cardId}
                    group={group}
                    deletingId={deletingId}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
