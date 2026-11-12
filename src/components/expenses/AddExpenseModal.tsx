import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Check, Plus, Receipt, Repeat, Sparkles } from 'lucide-react-native';
import type { Card } from '../../types/finance';
import type { FixedExpenseType } from '../../services/fixedExpensesService';
import type { NewFixedExpense } from '../../hooks/useFixedExpenses';
import {
  createCustomCategoryApi,
  suggestCategoryApi,
  type CategoryItem,
} from '../../services/categoriesService';
import { ModalSheet } from '../ui/ModalSheet';
import { DateField, Input, NumberInput, SegmentedTabs, Select } from '../ui/form';
import { colors } from '../ui/theme';
import { describeCard, describeCardAccount } from '../../lib/cardLabels';
import { formatCLP } from '../../lib/currency';

interface FormState {
  name: string;
  type: FixedExpenseType;
  cardId: number | '';
  monthlyAmount: string;
  totalInstallments: string;
  paidInstallments: string;
  nextChargeDate: string;
  categoryId: number | '';
}

function Field({
  label,
  badge,
  action,
  children,
}: {
  label: string;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View>
      <View className="mb-1 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-neutral-700">{label}</Text>
          {badge}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

// En móvil el modal se monta siempre y se controla con `open`
// (en web se montaba/desmontaba con {isModalOpen && ...}).
interface Props {
  open: boolean;
  cards: Card[];
  categories: CategoryItem[];
  onClose: () => void;
  onSubmit: (payload: NewFixedExpense) => Promise<void>;
  onCategoryCreated?: (newCategory: CategoryItem) => void;
}

const expenseCategories = (categories: CategoryItem[]) =>
  categories.filter((c) => !c.typeCode || c.typeCode === 2);

const emptyForm = (cards: Card[], categories: CategoryItem[]): FormState => ({
  name: '',
  type: 'installment',
  cardId: cards[0]?.id ?? '',
  monthlyAmount: '',
  totalInstallments: '',
  paidInstallments: '0',
  nextChargeDate: '',
  categoryId: categories[0]?.id ?? '',
});

export default function AddExpenseModal({
  open,
  cards,
  categories,
  onClose,
  onSubmit,
  onCategoryCreated,
}: Props) {
  const [localCategories, setLocalCategories] = useState<CategoryItem[]>(() =>
    expenseCategories(categories),
  );
  const [form, setForm] = useState<FormState>(() => emptyForm(cards, localCategories));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [hasManualCategoryChange, setHasManualCategoryChange] = useState(false);
  const [suggestionSource, setSuggestionSource] = useState<'UserHistory' | 'KeywordDictionary' | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Reiniciar el formulario cada vez que se abre
  useEffect(() => {
    if (!open) return;
    const filtered = expenseCategories(categories);
    setLocalCategories(filtered);
    setForm(emptyForm(cards, filtered));
    setErrorMessage(null);
    setIsSubmitting(false);
    setHasManualCategoryChange(false);
    setSuggestionSource(null);
    setIsAddingCategory(false);
    setNewCategoryName('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sincronizar si las categorías o tarjetas terminan de cargar después de abrir el modal
  useEffect(() => {
    const filtered = expenseCategories(categories);
    setLocalCategories(filtered);
    setForm((prev) => ({
      ...prev,
      categoryId: prev.categoryId === '' && filtered[0] ? filtered[0].id : prev.categoryId,
    }));
  }, [categories]);

  useEffect(() => {
    if (form.cardId === '' && cards[0]) {
      setForm((prev) => ({ ...prev, cardId: cards[0].id }));
    }
  }, [cards, form.cardId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isInstallment = form.type === 'installment';
  const selectedCard = cards.find((c) => c.id === Number(form.cardId));

  // Sugerencia automática de categoría según el nombre (con debounce)
  useEffect(() => {
    if (!open || hasManualCategoryChange || form.name.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const suggestion = await suggestCategoryApi(form.name, 2);

        if (
          suggestion?.suggestedCategoryId &&
          localCategories.some((c) => c.id === suggestion.suggestedCategoryId)
        ) {
          setForm((prev) => ({ ...prev, categoryId: suggestion.suggestedCategoryId! }));
          setSuggestionSource(
            suggestion.source === 'UserHistory' ? 'UserHistory' : 'KeywordDictionary',
          );
        }
      } catch {
        // Silencioso
      } finally {
        setIsSuggesting(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [open, form.name, hasManualCategoryChange, localCategories]);

  const handleCreateCustomCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    setErrorMessage(null);
    try {
      const created = await createCustomCategoryApi(newCategoryName, 'tag', 2);
      setLocalCategories((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, categoryId: created.id }));
      setHasManualCategoryChange(true);
      setSuggestionSource(null);
      setNewCategoryName('');
      setIsAddingCategory(false);
      onCategoryCreated?.(created);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al crear la categoría.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const card = cards.find((c) => c.id === Number(form.cardId));
    if (!card) return setErrorMessage('Selecciona una tarjeta o cuenta.');
    if (!form.name.trim()) return setErrorMessage('Ingresa un nombre.');
    if (form.categoryId === '') return setErrorMessage('Selecciona una categoría.');
    if (!form.monthlyAmount || Number(form.monthlyAmount) < 1) {
      return setErrorMessage('Ingresa un monto mayor a cero.');
    }
    if (!form.nextChargeDate) return setErrorMessage('Selecciona la fecha del próximo cobro.');

    const total = Number(form.totalInstallments);
    const paid = Number(form.paidInstallments);
    if (isInstallment && total < 2) {
      return setErrorMessage('Una compra en cuotas debe tener al menos 2 cuotas.');
    }
    if (isInstallment && paid >= total) {
      return setErrorMessage('Las cuotas pagadas deben ser menores al total de cuotas.');
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        type: form.type,
        cardId: card.id,
        cardAlias: card.alias || card.name || `Tarjeta #${card.id}`,
        bankName: card.bankName ?? null,
        accountId: card.accountId,
        categoryId: Number(form.categoryId),
        monthlyAmount: Number(form.monthlyAmount),
        totalInstallments: isInstallment ? total : null,
        paidInstallments: isInstallment ? paid : null,
        nextChargeDate: form.nextChargeDate,
      });
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Hubo un error al guardar el egreso. Inténtalo nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled = isSubmitting || cards.length === 0;

  return (
    <ModalSheet open={open} onClose={onClose}>
      <Text className="mb-6 text-xl font-bold text-neutral-900">Nuevo egreso fijo</Text>

      {!!errorMessage && (
        <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-xs font-medium text-red-700">{errorMessage}</Text>
        </View>
      )}

      <View className="gap-4">
        <SegmentedTabs
          value={form.type}
          onChange={(type) => update('type', type)}
          tabs={[
            { value: 'installment', label: 'En cuotas', icon: <Receipt size={16} color={colors.neutral500} /> },
            { value: 'subscription', label: 'Suscripción', icon: <Repeat size={16} color={colors.neutral500} /> },
          ]}
        />

        <Field label="Nombre">
          <Input
            placeholder={isInstallment ? 'Ej: Notebook, MercadoLibre...' : 'Ej: Netflix, Crunchyroll...'}
            value={form.name}
            onChangeText={(text) => update('name', text)}
          />
        </Field>

        <Field label="Tarjeta / Cuenta">
          <Select
            value={form.cardId}
            onChange={(value) => update('cardId', value)}
            placeholder="Cargando tarjetas o sin tarjetas..."
            disabled={cards.length === 0}
            // Etiqueta + cuenta: distingue tarjetas con el mismo alias
            options={cards.map((card) => ({
              value: card.id,
              label: `${card.alias} — ${describeCard(card)}`,
              description: describeCardAccount(card),
            }))}
          />

          {selectedCard && (
            <View className="mt-2 flex-row items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-xs font-bold text-neutral-800">
                  {describeCard(selectedCard)}
                </Text>
                <Text numberOfLines={1} className="text-[11px] text-neutral-500">
                  {describeCardAccount(selectedCard)}
                </Text>
              </View>
              {selectedCard.availableAmount != null && (
                <View className="items-end">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {selectedCard.isCreditAccount ? 'Cupo disponible' : 'Saldo'}
                  </Text>
                  <Text
                    className={`text-sm font-black ${
                      selectedCard.availableAmount < 0 ? 'text-red-500' : 'text-neutral-900'
                    }`}
                  >
                    {formatCLP(selectedCard.availableAmount)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Field>

        <Field
          label="Categoría"
          badge={
            isSuggesting ? (
              <ActivityIndicator size="small" color={colors.neutral400} />
            ) : suggestionSource ? (
              <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5">
                <Sparkles size={12} color="#92400e" />
                <Text className="text-[11px] font-semibold text-amber-800">
                  {suggestionSource === 'UserHistory' ? 'Según tu historial' : 'Sugerida'}
                </Text>
              </View>
            ) : null
          }
          action={
            <Pressable
              onPress={() => setIsAddingCategory((prev) => !prev)}
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <Plus size={14} color={colors.neutral500} />
              <Text className="text-xs font-bold text-neutral-600">
                {isAddingCategory ? 'Cancelar' : 'Nueva'}
              </Text>
            </Pressable>
          }
        >
          {isAddingCategory ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  placeholder="Nombre de tu categoría..."
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  autoFocus
                />
              </View>
              <Pressable
                onPress={handleCreateCustomCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                accessibilityLabel="Guardar categoría"
                className={`items-center justify-center rounded-xl px-4 ${
                  isCreatingCategory || !newCategoryName.trim() ? 'bg-neutral-300' : 'bg-neutral-900'
                }`}
              >
                {isCreatingCategory ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Check size={16} color={colors.white} />
                )}
              </Pressable>
            </View>
          ) : (
            <Select
              value={form.categoryId}
              onChange={(value) => {
                update('categoryId', value);
                setHasManualCategoryChange(true);
                setSuggestionSource(null);
              }}
              placeholder="Selecciona una categoría"
              options={localCategories.map((c) => ({
                value: c.id,
                label: `${c.name}${c.isCustom ? ' (Personalizada)' : ''}`,
              }))}
            />
          )}
        </Field>

        <Field label={isInstallment ? 'Valor de la cuota' : 'Monto mensual'}>
          <NumberInput
            placeholder="Ej: 19990"
            value={form.monthlyAmount}
            onChangeText={(text) => update('monthlyAmount', text)}
          />
        </Field>

        {isInstallment && (
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Field label="Total de cuotas">
                <NumberInput
                  placeholder="Ej: 12"
                  value={form.totalInstallments}
                  onChangeText={(text) => update('totalInstallments', text)}
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Ya pagadas">
                <NumberInput
                  value={form.paidInstallments}
                  onChangeText={(text) => update('paidInstallments', text)}
                />
              </Field>
            </View>
          </View>
        )}

        <Field label="Próximo cobro">
          <DateField
            value={form.nextChargeDate}
            onChange={(iso) => update('nextChargeDate', iso)}
          />
        </Field>

        <Pressable
          onPress={handleSubmit}
          disabled={submitDisabled}
          className={`mt-2 flex-row items-center justify-center gap-2 rounded-xl py-3.5 ${
            submitDisabled ? 'bg-neutral-400' : 'bg-neutral-900 active:bg-neutral-800'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-bold text-white">Guardar egreso</Text>
          )}
        </Pressable>
      </View>
    </ModalSheet>
  );
}
