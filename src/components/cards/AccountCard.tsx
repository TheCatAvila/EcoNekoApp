import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CreditCard, Landmark, Pencil, Plus, UploadCloud, Wallet } from 'lucide-react-native';
import { formatCLP } from '../../lib/currency';
import type { Account } from '../../types/finance';
import { colors } from '../ui/theme';
import { ACCOUNT_TYPE_LABELS, canHaveCards } from './shared';

interface Props {
  account: Account;
  isUploading: boolean;
  uploadDisabled: boolean;
  onEdit: () => void;
  onAddCard: () => void;
  onPay: () => void;
  onUploadStatement: () => void;
}

function Row({
  label,
  value,
  labelClass,
  valueClass,
}: {
  label: string;
  value: string;
  labelClass: string;
  valueClass: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-sm ${labelClass}`}>{label}</Text>
      <Text className={`text-sm ${valueClass}`}>{value}</Text>
    </View>
  );
}

export default function AccountCard({
  account,
  isUploading,
  uploadDisabled,
  onEdit,
  onAddCard,
  onPay,
  onUploadStatement,
}: Props) {
  const isCredit = account.isCreditAccount;
  const allowsCards = canHaveCards(account);

  return (
    <View
      className={`rounded-3xl border p-6 shadow-sm ${
        isCredit ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-100 bg-white'
      }`}
    >
      <View className="mb-6 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className={`text-lg font-bold ${isCredit ? 'text-white' : 'text-neutral-800'}`}>
            {account.name}
          </Text>
          {!!account.bankName && (
            <Text className={`mt-0.5 text-xs ${isCredit ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {account.bankName}
            </Text>
          )}
          <View
            className={`mt-2 self-start rounded-md px-2 py-1 ${
              isCredit ? 'bg-neutral-800' : 'bg-neutral-100'
            }`}
          >
            <Text
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isCredit ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {ACCOUNT_TYPE_LABELS[account.typeName] ?? account.typeName}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={onEdit}
            accessibilityLabel={isCredit ? 'Editar cupo y datos' : 'Editar cuenta'}
            className={`h-10 w-10 items-center justify-center rounded-xl ${
              isCredit ? 'bg-neutral-800 active:bg-neutral-700' : 'bg-neutral-100 active:bg-neutral-200'
            }`}
          >
            <Pencil size={16} color={isCredit ? colors.neutral400 : colors.neutral500} />
          </Pressable>
          <View
            className={`h-10 w-10 items-center justify-center rounded-xl ${
              isCredit ? 'bg-neutral-800' : 'bg-neutral-100'
            }`}
          >
            {isCredit ? (
              <CreditCard size={20} color={colors.yellow400} />
            ) : (
              <Landmark size={20} color={colors.green600} />
            )}
          </View>
        </View>
      </View>

      <View className="mb-6 gap-2">
        {isCredit ? (
          <>
            <Row label="Cupo total" value={formatCLP(account.creditLimit)} labelClass="text-neutral-400" valueClass="font-medium text-neutral-300" />
            <Row label="Cupo disponible" value={formatCLP(account.availableCredit)} labelClass="text-neutral-400" valueClass="font-bold text-green-400" />
            <Row label="Cupo utilizado" value={formatCLP(account.balance)} labelClass="text-neutral-400" valueClass="font-bold text-red-400" />
            <View className="border-t border-neutral-800 pt-1">
              <Row label="Pago de este mes" value={formatCLP(account.paymentRequiredThisMonth)} labelClass="text-neutral-400" valueClass="font-bold text-white" />
            </View>
          </>
        ) : (
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-neutral-500">Saldo actual</Text>
            <Text className="text-xl font-bold text-neutral-800">{formatCLP(account.balance)}</Text>
          </View>
        )}
      </View>

      {/* Tarjetas vinculadas a la cuenta */}
      {allowsCards && (
        <View className={`gap-2 border-t pt-4 ${isCredit ? 'border-neutral-800' : 'border-neutral-100'}`}>
          {account.cards.map((card) => (
            <View
              key={card.id}
              className={`flex-row items-center justify-between rounded-xl px-3 py-2 ${
                isCredit ? 'bg-neutral-800' : 'bg-neutral-50'
              } ${card.isActive ? '' : 'opacity-50'}`}
            >
              <Text
                numberOfLines={1}
                className={`flex-1 text-sm font-bold ${isCredit ? 'text-white' : 'text-neutral-800'}`}
              >
                {card.name}
              </Text>
              <Text className={`ml-3 text-xs ${isCredit ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {card.brandName !== 'Unknown' ? `${card.brandName} ` : ''}
                {card.lastFourDigits ? `•••• ${card.lastFourDigits}` : ''}
              </Text>
            </View>
          ))}

          <Pressable
            onPress={onAddCard}
            className={`w-full flex-row items-center justify-center gap-2 rounded-xl py-2 ${
              isCredit ? 'active:bg-neutral-800' : 'active:bg-neutral-100'
            }`}
          >
            <Plus size={14} color={isCredit ? colors.neutral300 : colors.neutral500} />
            <Text className={`text-xs font-bold ${isCredit ? 'text-neutral-300' : 'text-neutral-500'}`}>
              Agregar tarjeta
            </Text>
          </Pressable>
        </View>
      )}

      {/* Acciones de cuenta de crédito */}
      {isCredit && (
        <View className="mt-4 gap-2 border-t border-neutral-800 pt-4">
          <Pressable
            onPress={onPay}
            disabled={uploadDisabled}
            className={`w-full flex-row items-center justify-center gap-2 rounded-xl border border-neutral-700 px-4 py-2.5 active:bg-neutral-800 ${
              uploadDisabled ? 'opacity-50' : ''
            }`}
          >
            <Wallet size={16} color={colors.green400} />
            <Text className="text-sm font-bold text-green-400">Pagar tarjeta</Text>
          </Pressable>

          <Pressable
            onPress={onUploadStatement}
            disabled={uploadDisabled}
            className={`w-full flex-row items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 py-2.5 active:bg-neutral-700 ${
              uploadDisabled && !isUploading ? 'opacity-50' : ''
            }`}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color={colors.neutral400} />
                <Text className="text-sm font-bold text-neutral-400">Analizando...</Text>
              </>
            ) : (
              <>
                <UploadCloud size={16} color={colors.neutral300} />
                <Text className="text-sm font-bold text-white">Subir Estado de Cuenta</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
