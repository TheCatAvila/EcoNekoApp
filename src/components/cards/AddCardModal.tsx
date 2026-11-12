import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { request } from '../../lib/apiClient';
import type { Account } from '../../types/finance';
import { ModalSheet } from '../ui/ModalSheet';
import { DarkButton } from '../ui/buttons';
import { Input, Label, NumberInput, Select } from '../ui/form';
import { BRAND_OPTIONS } from './shared';

interface Props {
  open: boolean;
  /** Cuenta preseleccionada al abrir (desde "Agregar tarjeta" de una cuenta). */
  initialAccountId?: number;
  accountsWithCards: Account[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AddCardModal({
  open,
  initialAccountId,
  accountsWithCards,
  onClose,
  onSaved,
}: Props) {
  const [accountId, setAccountId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState(0);
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAccountId(initialAccountId ?? accountsWithCards[0]?.id ?? '');
    setName('');
    setBrand(0);
    setLastFourDigits('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialAccountId]);

  const handleCreateCard = async () => {
    if (!accountId) {
      return Alert.alert('Falta información', 'Selecciona la cuenta a la que pertenece la tarjeta.');
    }
    if (!name.trim()) return Alert.alert('Falta información', 'Ingresa el nombre de la tarjeta.');

    setIsSubmitting(true);
    try {
      await request('/Cards', {
        method: 'POST',
        auth: true,
        body: {
          accountId: Number(accountId),
          name: name.trim(),
          brand: Number(brand),
          lastFourDigits: lastFourDigits || null,
        },
      });
      onSaved();
    } catch {
      Alert.alert('Error', 'Hubo un error al crear la tarjeta. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet open={open} onClose={onClose}>
      <Text className="mb-6 text-xl font-bold text-neutral-900">Agregar nueva tarjeta</Text>

      <View className="gap-4">
        <View>
          <Label>Cuenta</Label>
          <Select
            value={accountId}
            onChange={setAccountId}
            placeholder="Selecciona una cuenta"
            options={accountsWithCards.map((a) => ({
              value: a.id,
              label: `${a.name}${a.bankName ? ` (${a.bankName})` : ''}`,
            }))}
          />
        </View>

        <View>
          <Label>Nombre de la tarjeta</Label>
          <Input placeholder="Ej: Física, Virtual, Adicional..." value={name} onChangeText={setName} />
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Label>Marca</Label>
            <Select value={brand} onChange={(v) => setBrand(v === '' ? 0 : v)} options={BRAND_OPTIONS} />
          </View>
          <View className="flex-1">
            <Label>Últimos 4 dígitos</Label>
            <NumberInput
              maxLength={4}
              placeholder="Opcional"
              value={lastFourDigits}
              onChangeText={setLastFourDigits}
            />
          </View>
        </View>

        <DarkButton onPress={handleCreateCard} loading={isSubmitting} disabled={!accountId}>
          Guardar tarjeta
        </DarkButton>
      </View>
    </ModalSheet>
  );
}
