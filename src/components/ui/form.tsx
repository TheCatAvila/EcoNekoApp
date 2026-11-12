// Controles de formulario que en web eran <input>, <select>, <input type="date">
// y <input type="checkbox">.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Check, ChevronDown } from 'lucide-react-native';
import { parseLocalDate, toISODate } from '../../lib/dates';
import { colors } from './theme';

export const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900';

export function Label({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <Text
      className={
        small
          ? 'mb-1 text-[11px] font-bold text-neutral-500'
          : 'mb-1 text-sm font-bold text-neutral-700'
      }
    >
      {children}
    </Text>
  );
}

/* ───────────── Input ───────────── */

interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className = '', editable = true, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.neutral400}
      editable={editable}
      className={`${inputClass} ${editable ? '' : 'bg-neutral-100 text-neutral-400'} ${className}`}
      {...props}
    />
  );
}

/** Input numérico: solo deja dígitos (equivale a type="number" step="1"). */
export function NumberInput({
  value,
  onChangeText,
  ...props
}: Omit<InputProps, 'keyboardType'> & { value: string; onChangeText: (v: string) => void }) {
  return (
    <Input
      keyboardType="number-pad"
      value={value}
      onChangeText={(text) => onChangeText(text.replace(/\D/g, ''))}
      {...props}
    />
  );
}

/* ───────────── Select ───────────── */

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  /** Texto secundario bajo la opción (ej: la cuenta a la que pertenece la tarjeta). */
  description?: string;
}

interface SelectProps<T extends string | number> {
  value: T | '';
  options: SelectOption<T>[];
  onChange: (value: T | '') => void;
  placeholder?: string;
  /** Si se pasa, se agrega como primera opción y equivale a "sin valor". */
  emptyLabel?: string;
  disabled?: boolean;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción',
  emptyLabel,
  disabled = false,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  const allOptions: SelectOption<T | ''>[] = emptyLabel
    ? [{ value: '', label: emptyLabel }, ...options]
    : options;

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className={`${inputClass} flex-row items-center justify-between ${
          disabled ? 'bg-neutral-100' : ''
        }`}
      >
        <Text
          numberOfLines={1}
          className={`flex-1 text-sm ${
            selected && !disabled ? 'text-neutral-900' : 'text-neutral-400'
          }`}
        >
          {selected?.label ?? emptyLabel ?? placeholder}
        </Text>
        <ChevronDown size={16} color={colors.neutral400} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-neutral-900/40" onPress={() => setOpen(false)} />
        <View className="max-h-[60%] rounded-t-3xl bg-white pb-8 pt-3">
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-neutral-300" />
          <FlatList
            data={allOptions}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value as T | '');
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between px-6 py-4 active:bg-neutral-50"
                >
                  <View className="flex-1 pr-3">
                    <Text
                      className={`text-base ${
                        isSelected ? 'font-bold text-neutral-900' : 'text-neutral-700'
                      }`}
                    >
                      {item.label}
                    </Text>
                    {!!item.description && (
                      <Text className="mt-0.5 text-xs text-neutral-500">{item.description}</Text>
                    )}
                  </View>
                  {isSelected && <Check size={18} color={colors.green600} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

/* ───────────── DateField ───────────── */

interface DateFieldProps {
  /** 'YYYY-MM-DD' */
  value: string;
  onChange: (iso: string) => void;
}

export function DateField({ value, onChange }: DateFieldProps) {
  const [show, setShow] = useState(false);
  const date = value ? parseLocalDate(value) : new Date();

  return (
    <View>
      <Pressable
        onPress={() => setShow((s) => !s)}
        className={`${inputClass} flex-row items-center justify-between`}
      >
        <Text className={`text-sm ${value ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {value
            ? date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Selecciona una fecha'}
        </Text>
        <CalendarDays size={16} color={colors.neutral400} />
      </Pressable>

      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            // En Android el picker se cierra solo; en iOS queda abierto hasta tocar el campo.
            if (Platform.OS === 'android') setShow(false);
            if (event.type === 'set' && selected) onChange(toISODate(selected));
          }}
        />
      )}
    </View>
  );
}

/* ───────────── Checkbox ───────────── */

export function Checkbox({
  checked,
  onChange,
  label,
  labelClassName = 'text-xs font-bold text-neutral-800',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  labelClassName?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-center gap-2.5"
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded border ${
          checked ? 'border-green-600 bg-green-600' : 'border-neutral-300 bg-white'
        }`}
      >
        {checked && <Check size={14} color={colors.white} strokeWidth={3} />}
      </View>
      <Text className={`flex-1 ${labelClassName}`}>{label}</Text>
    </Pressable>
  );
}

/* ───────────── SegmentedTabs ───────────── */

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: string; icon?: ReactNode; badge?: number }[];
}) {
  return (
    <View className="flex-row gap-1 rounded-2xl bg-neutral-100 p-1">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 ${
              active ? 'bg-white shadow-sm' : ''
            }`}
          >
            {tab.icon}
            <Text
              numberOfLines={1}
              className={`text-xs font-bold ${active ? 'text-neutral-900' : 'text-neutral-500'}`}
            >
              {tab.label}
            </Text>
            {!!tab.badge && (
              <View className="rounded-full bg-green-600 px-1.5">
                <Text className="text-[10px] font-bold text-white">{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────── NumericValueInput ───────────── */

/**
 * Input para valores numéricos guardados como number (no string).
 * Mantiene el texto local para permitir estados intermedios como "12." al escribir.
 */
export function NumericValueInput({
  value,
  onChangeValue,
  decimals = false,
  ...props
}: Omit<InputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: number | null | undefined;
  onChangeValue: (value: number) => void;
  decimals?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));

  // Sincroniza si el valor cambia desde afuera (ej: al cargar un borrador).
  const externalText = value == null ? '' : String(value);
  if (Number(text || 0) !== Number(value ?? 0) && text !== externalText) {
    setText(externalText);
  }

  return (
    <Input
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      value={text}
      onChangeText={(raw) => {
        const clean = decimals
          ? raw.replace(',', '.').replace(/[^\d.]/g, '')
          : raw.replace(/\D/g, '');
        setText(clean);
        onChangeValue(Number(clean) || 0);
      }}
      {...props}
    />
  );
}
