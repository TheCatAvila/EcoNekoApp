import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  PiggyBank,
  Plus,
  Wallet,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { formatCLP } from '../lib/currency';
import { request } from '../lib/apiClient';
import type { Account } from '../types/finance';
import { analyzeStatement, confirmStatement, pickStatementFile } from '../services/statementsService';
import AccountCard from '../components/cards/AccountCard';
import AddAccountModal from '../components/cards/AddAccountModal';
import AddCardModal from '../components/cards/AddCardModal';
import EditAccountModal from '../components/cards/EditAccountModal';
import PayCardModal from '../components/cards/PayCardModal';
import {
  AnalyzingOverlay,
  SavedStatementModal,
  StatementReviewModal,
} from '../components/cards/StatementModals';
import {
  ACCOUNT_GROUPS,
  canHaveCards,
  getAccountGroupKey,
  isLiquidAccount,
  type AccountGroupKey,
  type StatementDraft,
  type StatementDto,
} from '../components/cards/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { ActionButton } from '../components/ui/buttons';
import { Screen } from '../components/ui/Screen';
import { LoadingView, confirm } from '../components/ui/feedback';
import { colors } from '../components/ui/theme';

type FilterTab = 'all' | AccountGroupKey;

// Ícono y colores de cada grupo (los textos están en ACCOUNT_GROUPS)
const GROUP_ICONS: Record<AccountGroupKey, { Icon: LucideIcon; color: string; bg: string }> = {
  credit: { Icon: CreditCard, color: colors.yellow400, bg: 'bg-neutral-900' },
  checking: { Icon: Landmark, color: colors.green600, bg: 'bg-green-100' },
  prepaid: { Icon: PiggyBank, color: colors.blue600, bg: 'bg-blue-100' },
  cash: { Icon: Banknote, color: '#d97706', bg: 'bg-amber-100' },
  loan: { Icon: HandCoins, color: colors.red500, bg: 'bg-red-100' },
  other: { Icon: Wallet, color: colors.neutral500, bg: 'bg-neutral-100' },
};

function SummaryTile({
  label,
  value,
  valueClass,
  hint,
}: {
  label: string;
  value: number;
  valueClass: string;
  hint?: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
      <Text numberOfLines={1} className="text-xs font-bold text-neutral-500">
        {label}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className={`text-xl font-black ${valueClass}`}>
        {formatCLP(value)}
      </Text>
      {!!hint && (
        <Text numberOfLines={1} className="text-[11px] text-neutral-400">
          {hint}
        </Text>
      )}
    </View>
  );
}

// En iOS no se puede abrir un Modal mientras otro se está cerrando: esperamos la animación.
const afterModalClose = (fn: () => void) => setTimeout(fn, 450);

export default function CardsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Estado de cuenta: paso 1 (analizar) y paso 2 (revisar y confirmar)
  const [uploadingAccountId, setUploadingAccountId] = useState<number | null>(null);
  const [statementDraft, setStatementDraft] = useState<StatementDraft | null>(null);
  const [isConfirmingStatement, setIsConfirmingStatement] = useState(false);
  const [savedStatement, setSavedStatement] = useState<StatementDto | null>(null);

  // Modales
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [addCardModal, setAddCardModal] = useState<{ open: boolean; accountId?: number }>({ open: false });
  const [payingAccount, setPayingAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const accountsWithCards = accounts.filter(canHaveCards);
  const liquidAccounts = accounts.filter(isLiquidAccount);

  // Cuentas agrupadas por tipo, en el orden de ACCOUNT_GROUPS (solo grupos con cuentas)
  const accountGroups = ACCOUNT_GROUPS.map((group) => ({
    ...group,
    accounts: accounts
      .filter((a) => getAccountGroupKey(a) === group.key)
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  })).filter((group) => group.accounts.length > 0);

  const filtered =
    activeTab === 'all' ? accountGroups : accountGroups.filter((g) => g.key === activeTab);
  const visibleGroups = filtered.length > 0 ? filtered : accountGroups;

  // Resumen general
  const creditAccounts = accounts.filter((a) => a.isCreditAccount);
  const totalLiquid = liquidAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCreditUsed = creditAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCreditAvailable = creditAccounts.reduce((sum, a) => sum + (a.availableCredit || 0), 0);
  const totalPaymentThisMonth = creditAccounts.reduce(
    (sum, a) => sum + (a.paymentRequiredThisMonth || 0),
    0,
  );

  const groupSummary = (key: AccountGroupKey, list: Account[]) => {
    const total = list.reduce((sum, a) => sum + (a.balance || 0), 0);
    if (key === 'credit') return `Utilizado ${formatCLP(total)}`;
    if (key === 'loan') return `Deuda ${formatCLP(total)}`;
    return `Saldo ${formatCLP(total)}`;
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const accountsResponse = await request<Account[]>('/Accounts/me', { auth: true });
      setAccounts(accountsResponse);
      setError(null);
    } catch {
      setError('No pudimos cargar tus cuentas y tarjetas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /* ── Estado de cuenta ── */

  const handleUploadStatement = async (accountId: number) => {
    const file = await pickStatementFile();
    if (!file) return;

    setUploadingAccountId(accountId);
    try {
      const draft = await analyzeStatement(accountId, file);
      setUploadingAccountId(null);
      afterModalClose(() => setStatementDraft(draft));
    } catch (err) {
      setUploadingAccountId(null);
      Alert.alert(
        'Error',
        err instanceof Error && err.message
          ? err.message
          : 'Hubo un error al analizar tu estado de cuenta. Inténtalo nuevamente.',
      );
    }
  };

  const handleCancelDraft = async () => {
    const ok = await confirm('Descartar estado de cuenta', 'No se guardará ningún dato.', {
      confirmText: 'Descartar',
    });
    if (ok) setStatementDraft(null);
  };

  const handleConfirmStatement = async () => {
    if (!statementDraft) return;

    setIsConfirmingStatement(true);
    try {
      const saved = await confirmStatement(statementDraft);
      setStatementDraft(null);
      afterModalClose(() => setSavedStatement(saved));
      fetchAccounts();
    } catch {
      Alert.alert('Error', 'Hubo un error al guardar el estado de cuenta. Inténtalo nuevamente.');
    } finally {
      setIsConfirmingStatement(false);
    }
  };

  const afterSave = (close: () => void) => () => {
    close();
    fetchAccounts();
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <LoadingView message="Cargando tus tarjetas y cuentas..." />
      </Screen>
    );
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `Todas (${accounts.length})` },
    ...accountGroups.map((g) => ({
      key: g.key as FilterTab,
      label: `${g.shortLabel} (${g.accounts.length})`,
    })),
  ];

  return (
    <Screen
      contentClassName="p-4 gap-6 pb-10"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchAccounts();
      }}
    >
      <AnalyzingOverlay visible={uploadingAccountId !== null} />

      <StatementReviewModal
        draft={statementDraft}
        accountName={accounts.find((a) => a.id === statementDraft?.accountId)?.name}
        isConfirming={isConfirmingStatement}
        onChange={setStatementDraft}
        onCancel={handleCancelDraft}
        onConfirm={handleConfirmStatement}
      />

      <SavedStatementModal statement={savedStatement} onClose={() => setSavedStatement(null)} />

      <AddAccountModal
        open={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onSaved={afterSave(() => setIsAddAccountModalOpen(false))}
      />

      <EditAccountModal
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSaved={afterSave(() => setEditingAccount(null))}
      />

      <PayCardModal
        account={payingAccount}
        liquidAccounts={liquidAccounts}
        onClose={() => setPayingAccount(null)}
        onSaved={afterSave(() => setPayingAccount(null))}
      />

      <AddCardModal
        open={addCardModal.open}
        initialAccountId={addCardModal.accountId}
        accountsWithCards={accountsWithCards}
        onClose={() => setAddCardModal({ open: false })}
        onSaved={afterSave(() => setAddCardModal({ open: false }))}
      />

      <PageHeader
        title="Cuentas y tarjetas"
        subtitle="Administra tus saldos y cupos, paga tus tarjetas y sube estados de cuenta"
        actions={
          <>
            <ActionButton
              onPress={() => setIsAddAccountModalOpen(true)}
              icon={<Plus size={16} color={colors.white} />}
              label="Nueva cuenta"
            />
            <ActionButton
              variant="light"
              onPress={() => setAddCardModal({ open: true })}
              disabled={accountsWithCards.length === 0}
              icon={<CreditCard size={16} color={colors.neutral700} />}
              label="Nueva tarjeta"
            />
          </>
        }
      />

      {!!error && (
        <View className="flex-row items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <AlertTriangle size={20} color={colors.red600} />
          <Text className="flex-1 text-sm text-red-700">{error}</Text>
        </View>
      )}

      {/* Resumen general */}
      {accounts.length > 0 && (
        <View className="gap-3">
          <View className="flex-row gap-3">
            <SummaryTile label="Saldo en cuentas" value={totalLiquid} valueClass="text-neutral-900" hint="Vista, prepago y efectivo" />
            <SummaryTile
              label="Cupo utilizado"
              value={totalCreditUsed}
              valueClass="text-red-500"
              hint={`${creditAccounts.length} ${creditAccounts.length === 1 ? 'cuenta de crédito' : 'cuentas de crédito'}`}
            />
          </View>
          <View className="flex-row gap-3">
            <SummaryTile label="Cupo disponible" value={totalCreditAvailable} valueClass="text-green-600" />
            <SummaryTile label="A pagar este mes" value={totalPaymentThisMonth} valueClass="text-neutral-900" hint="Suma de tus tarjetas" />
          </View>
        </View>
      )}

      {/* Filtros por tipo de cuenta */}
      {accountGroups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-2 ${
                  active ? 'bg-neutral-900' : 'border border-neutral-200 bg-white'
                }`}
              >
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-600'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Listado de Cuentas y Tarjetas */}
      {accounts.length === 0 ? (
        <View className="items-center rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
            <Landmark size={24} color={colors.neutral500} />
          </View>
          <Text className="mb-1 font-bold text-neutral-900">Aún no tienes cuentas</Text>
          <Text className="mb-5 text-center text-sm text-neutral-500">
            Crea una cuenta para registrar tus saldos. Después podrás vincularle tus tarjetas.
          </Text>
          <Pressable
            onPress={() => setIsAddAccountModalOpen(true)}
            className="flex-row items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 active:bg-neutral-800"
          >
            <Plus size={16} color={colors.white} />
            <Text className="text-sm font-bold text-white">Crear mi primera cuenta</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-8">
          {visibleGroups.map((group) => {
            const { Icon, color, bg } = GROUP_ICONS[group.key];
            return (
              <View key={group.key} className="gap-3" accessibilityLabel={group.title}>
                <View className="flex-row items-end justify-between gap-3 px-1">
                  <View className="flex-1 flex-row items-center gap-3">
                    <View className={`h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                      <Icon size={16} color={color} />
                    </View>
                    <View className="flex-1">
                      <Text numberOfLines={1} className="font-bold text-neutral-900">
                        {group.title}{' '}
                        <Text className="font-medium text-neutral-400">({group.accounts.length})</Text>
                      </Text>
                      {!!group.description && (
                        <Text numberOfLines={1} className="text-xs text-neutral-500">
                          {group.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-neutral-500">
                    {groupSummary(group.key, group.accounts)}
                  </Text>
                </View>

                <View className="gap-4">
                  {group.accounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      isUploading={uploadingAccountId === account.id}
                      uploadDisabled={uploadingAccountId !== null}
                      onEdit={() => setEditingAccount(account)}
                      onAddCard={() => setAddCardModal({ open: true, accountId: account.id })}
                      onPay={() => setPayingAccount(account)}
                      onUploadStatement={() => handleUploadStatement(account.id)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
