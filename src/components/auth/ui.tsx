import { useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Check, Circle, Eye, EyeOff, Lock } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PASSWORD_RULES } from '../../lib/validation';
import { colors } from '../ui/theme';

/* ───────────── TextField ───────────── */

interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: LucideIcon;
  error?: string;
  trailing?: ReactNode;
  inputClassName?: string;
}

export function TextField({
  label,
  icon: Icon,
  error,
  trailing,
  inputClassName = '',
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-red-400'
    : focused
      ? 'border-red-400 bg-white'
      : 'border-neutral-300';

  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-neutral-700">{label}</Text>
      <View className="relative justify-center">
        {Icon && (
          <View className="absolute left-4 z-10">
            <Icon size={16} color={colors.neutral400} />
          </View>
        )}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.neutral400}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={[
            'w-full rounded-xl border bg-neutral-50 py-3 text-neutral-800',
            Icon ? 'pl-11' : 'pl-4',
            trailing ? 'pr-12' : 'pr-4',
            borderClass,
            inputClassName,
          ].join(' ')}
        />
        {trailing && <View className="absolute right-3">{trailing}</View>}
      </View>
      {!!error && <Text className="mt-1.5 text-xs text-red-600">{error}</Text>}
    </View>
  );
}

/* ───────────── EmailField ───────────── */

export function EmailField(props: Omit<TextFieldProps, 'icon'> & { icon: LucideIcon }) {
  return (
    <TextField
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      textContentType="emailAddress"
      {...props}
    />
  );
}

/* ───────────── PasswordField ───────────── */

type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'icon' | 'trailing'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      icon={Lock}
      trailing={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          hitSlop={8}
          className="p-1"
        >
          {visible ? (
            <EyeOff size={16} color={colors.neutral400} />
          ) : (
            <Eye size={16} color={colors.neutral400} />
          )}
        </Pressable>
      }
    />
  );
}

/* ───────────── PasswordRules ───────────── */

export function PasswordRules({ value }: { value: string }) {
  return (
    <View
      className="mt-3 flex-row flex-wrap gap-y-1.5"
      accessibilityLabel="Requisitos de contraseña"
    >
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <View key={rule.id} className="w-1/2 flex-row items-center gap-1.5">
            {ok ? (
              <Check size={14} color={colors.green600} />
            ) : (
              <Circle size={12} color={colors.neutral400} />
            )}
            <Text className={`text-xs ${ok ? 'text-green-600' : 'text-neutral-400'}`}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ───────────── SubmitButton ───────────── */

interface SubmitButtonProps {
  onPress: () => void;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function SubmitButton({
  onPress,
  loading = false,
  loadingText = 'Procesando...',
  disabled,
  children,
}: SubmitButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`w-full flex-row items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3.5 shadow-lg active:scale-95 active:bg-red-600 ${
        isDisabled ? 'opacity-70' : ''
      }`}
    >
      {loading && <ActivityIndicator size="small" color={colors.white} />}
      <Text className="text-sm font-bold text-white">{loading ? loadingText : children}</Text>
    </Pressable>
  );
}
