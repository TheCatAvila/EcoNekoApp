import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { AlertTriangle, CreditCard, Landmark, Plus } from 'lucide-react-native';
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
  canHaveCards,
  isLiquidAccount,
  type StatementDraft,
  type StatementDto,
} from '../components/cards/shared';
import { Screen } from '../components/ui/Screen';
import { LoadingView, confirm } from '../components/ui/feedback';
import { colors } from '../components/ui/theme';

type FilterTab = 'all' | 'credit' | 'liquid';

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
  const creditCount = accounts.filter((a) => a.isCreditAccount).length;

  const filteredAccounts = accounts.filter((account) => {
    if (activeTab === 'credit') return account.isCreditAccount;
    if (activeTab === 'liquid') return !account.isCreditAccount;
    return true;
  });

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
    { key: 'credit', label: `Crédito (${creditCount})` },
    { key: 'liquid', label: `Débito / Efectivo (${accounts.length - creditCount})` },
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

      {/* Header de la vista */}
      <View className="gap-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
        <View>
          <Text className="text-xl font-black leading-tight text-neutral-900">
            Mis Cuentas y Tarjetas
          </Text>
          <Text className="text-sm text-neutral-500">
            Administra tus cupos, paga tus tarjetas y sube estados de cuenta
          </Text>
        </View>

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setIsAddAccountModalOpen(true)}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 active:scale-95 active:bg-neutral-800"
          >
            <Plus size={16} color={colors.white} />
            <Text className="text-sm font-bold text-white">Cuenta</Text>
          </Pressable>
          <Pressable
            onPress={() => setAddCardModal({ open: true })}
            disabled={accountsWithCards.length === 0}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-2.5 active:scale-95 active:bg-neutral-200 ${
              accountsWithCards.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <CreditCard size={16} color={colors.neutral700} />
            <Text className="text-sm font-bold text-neutral-700">Tarjeta</Text>
          </Pressable>
        </View>
      </View>

      {!!error && (
        <View className="flex-row items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <AlertTriangle size={20} color={colors.red600} />
          <Text className="flex-1 text-sm text-red-700">{error}</Text>
        </View>
      )}

      {/* Filtros rápidos */}
      {accounts.length > 0 && (
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
        <View className="gap-4">
          {filteredAccounts.map((account) => (
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
      )}
    </Screen>
  );
}
