import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { CheckCircle2, FileWarning, Plus, Trash2 } from 'lucide-react-native';
import { formatCLP } from '../../lib/currency';
import { todayISO } from '../../lib/dates';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton, GhostButton } from '../ui/buttons';
import { DateField, Input, Label, NumericValueInput } from '../ui/form';
import { colors } from '../ui/theme';
import type { DraftTransaction, StatementDraft, StatementDto } from './shared';

/* ───────────── Overlay mientras se analiza el archivo ───────────── */

export function AnalyzingOverlay({ visible }: { visible: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-neutral-900/50 p-4">
        <View className="w-full max-w-sm items-center rounded-3xl bg-white p-8 shadow-2xl">
          <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <ActivityIndicator size="large" color="#d97706" />
          </View>
          <Text className="mb-2 text-center text-xl font-bold text-neutral-900">
            Analizando tu estado de cuenta
          </Text>
          <Text className="mb-1 text-center text-sm text-neutral-500">
            Estamos leyendo tus movimientos. Esto puede tomar unos minutos.
          </Text>
          <Text className="text-center text-sm text-neutral-500">
            No cierres la app. Aún no se guarda nada: podrás revisar los datos antes de confirmar.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────── Revisión del borrador (paso 2) ───────────── */

interface ReviewProps {
  draft: StatementDraft | null;
  accountName?: string;
  isConfirming: boolean;
  onChange: (draft: StatementDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function StatementReviewModal({
  draft,
  accountName,
  isConfirming,
  onChange,
  onCancel,
  onConfirm,
}: ReviewProps) {
  if (!draft) return <ModalSheet open={false} onClose={onCancel}>{null}</ModalSheet>;

  const updateField = <K extends keyof StatementDraft>(key: K, value: StatementDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const updateTransaction = (index: number, changes: Partial<DraftTransaction>) =>
    onChange({
      ...draft,
      transactions: draft.transactions.map((t, i) => (i === index ? { ...t, ...changes } : t)),
    });

  const removeTransaction = (index: number) =>
    onChange({ ...draft, transactions: draft.transactions.filter((_, i) => i !== index) });

  const addTransaction = () =>
    onChange({
      ...draft,
      transactions: [...draft.transactions, { date: todayISO(), description: '', amount: 0 }],
    });

  const transactionsTotal = draft.transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const discrepancy = Math.abs(Number(draft.officialTotalBilled) - transactionsTotal);

  return (
    <ModalSheet open onClose={onCancel}>
      <View className="gap-6">
        <View className="pr-8">
          <Text className="mb-1 text-xl font-bold text-neutral-900">Revisa tu estado de cuenta</Text>
          <Text className="text-sm text-neutral-500">
            Verifica que los datos detectados sean correctos. Puedes editarlos antes de guardar: aún
            no se ha guardado nada.
          </Text>
          {!!accountName && (
            <Text className="mt-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
              Cuenta: {accountName}
            </Text>
          )}
          {draft.requiresManualReview && (
            <View className="mt-4 flex-row items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <FileWarning size={20} color={colors.amber500} />
              <Text className="flex-1 text-sm text-amber-800">
                {draft.message ||
                  'Algunos datos requieren revisión manual. Verifica los movimientos antes de confirmar.'}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Label>Mes</Label>
            <NumericValueInput
              maxLength={2}
              value={draft.detectedMonth}
              onChangeValue={(v) => updateField('detectedMonth', v)}
            />
          </View>
          <View className="flex-1">
            <Label>Año</Label>
            <NumericValueInput
              maxLength={4}
              value={draft.detectedYear}
              onChangeValue={(v) => updateField('detectedYear', v)}
            />
          </View>
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Label>Fecha de emisión</Label>
            <DateField
              value={(draft.emissionDate ?? '').slice(0, 10)}
              onChange={(iso) => updateField('emissionDate', iso)}
            />
          </View>
          <View className="flex-1">
            <Label>Fecha de pago</Label>
            <DateField
              value={(draft.dueDate ?? '').slice(0, 10)}
              onChange={(iso) => updateField('dueDate', iso)}
            />
          </View>
        </View>

        <View>
          <Label>Total facturado</Label>
          <NumericValueInput
            decimals
            value={draft.officialTotalBilled}
            onChangeValue={(v) => updateField('officialTotalBilled', v)}
          />
        </View>

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-neutral-700">
              Movimientos ({draft.transactions.length})
            </Text>
            <Pressable
              onPress={addTransaction}
              className="flex-row items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 active:bg-neutral-200"
            >
              <Plus size={14} color={colors.neutral700} />
              <Text className="text-xs font-bold text-neutral-700">Agregar</Text>
            </Pressable>
          </View>

          {draft.transactions.length === 0 && (
            <Text className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-center text-sm text-neutral-500">
              No se detectaron movimientos. Puedes agregarlos manualmente.
            </Text>
          )}

          <View className="gap-2">
            {draft.transactions.map((tx, index) => (
              <View key={index} className="gap-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <DateField
                      value={String(tx.date ?? '').slice(0, 10)}
                      onChange={(iso) => updateTransaction(index, { date: iso })}
                    />
                  </View>
                  <Pressable
                    onPress={() => removeTransaction(index)}
                    accessibilityLabel="Eliminar movimiento"
                    hitSlop={8}
                    className="rounded-xl p-2 active:bg-red-50"
                  >
                    <Trash2 size={16} color={colors.neutral400} />
                  </Pressable>
                </View>
                <Input
                  accessibilityLabel="Descripción"
                  placeholder="Descripción"
                  value={tx.description}
                  onChangeText={(text) => updateTransaction(index, { description: text })}
                />
                <NumericValueInput
                  decimals
                  accessibilityLabel="Monto"
                  placeholder="Monto"
                  value={tx.amount}
                  onChangeValue={(v) => updateTransaction(index, { amount: v })}
                />

                {(tx.categoryName || (tx.installmentTotal ?? 0) > 1) && (
                  <View className="flex-row flex-wrap gap-2 px-1">
                    {!!tx.categoryName && (
                      <View className="rounded-md border border-neutral-100 bg-white px-2 py-1">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          {tx.categoryName}
                        </Text>
                      </View>
                    )}
                    {(tx.installmentTotal ?? 0) > 1 && (
                      <View className="rounded-md border border-neutral-100 bg-white px-2 py-1">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Cuota {tx.installmentCurrent}/{tx.installmentTotal}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>

          <View className="mt-4 gap-2 px-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-neutral-500">Suma de movimientos</Text>
              <Text className="text-sm font-bold text-neutral-900">{formatCLP(transactionsTotal)}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm text-neutral-500">Diferencia con el total facturado</Text>
              <Text
                className={`text-sm font-bold ${
                  Math.round(discrepancy) > 0 ? 'text-amber-600' : 'text-green-600'
                }`}
              >
                {formatCLP(discrepancy)}
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3 border-t border-neutral-100 pt-4">
          <DarkButton onPress={onConfirm} loading={isConfirming} className="w-full">
            {isConfirming ? 'Guardando...' : 'Confirmar y guardar'}
          </DarkButton>
          <GhostButton onPress={onCancel} disabled={isConfirming}>
            Cancelar
          </GhostButton>
        </View>
      </View>
    </ModalSheet>
  );
}

/* ───────────── Estado de cuenta guardado ───────────── */

export function SavedStatementModal({
  statement,
  onClose,
}: {
  statement: StatementDto | null;
  onClose: () => void;
}) {
  return (
    <ModalSheet open={!!statement} onClose={onClose}>
      {statement && (
        <>
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
            <CheckCircle2 size={24} color={colors.green600} />
          </View>
          <Text className="mb-2 text-xl font-bold text-neutral-900">Estado de cuenta guardado</Text>
          <Text className="mb-6 text-sm text-neutral-500">
            {statement.message || 'Tus movimientos ya quedaron registrados.'}
          </Text>
          <View className="mb-6 gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-neutral-500">Período</Text>
              <Text className="text-sm font-bold text-neutral-900">
                {statement.detectedMonth}/{statement.detectedYear}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-neutral-500">Transacciones guardadas</Text>
              <Text className="text-sm font-bold text-neutral-900">{statement.transactionCount}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-neutral-500">Total facturado</Text>
              <Text className="text-sm font-bold text-red-500">{formatCLP(statement.totalBilled)}</Text>
            </View>
          </View>
          {statement.requiresManualReview && (
            <View className="mb-6 flex-row items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <FileWarning size={20} color={colors.amber500} />
              <Text className="flex-1 text-sm text-amber-800">
                Algunas transacciones requieren revisión manual. Por favor, verifica tus movimientos
                recientes.
              </Text>
            </View>
          )}
          <DarkButton onPress={onClose} className="w-full">
            Entendido
          </DarkButton>
        </>
      )}
    </ModalSheet>
  );
}
