import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from './theme';

interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Reemplazo del <div className="fixed inset-0 ..."> de los modales web. */
export function ModalSheet({ open, onClose, children }: ModalSheetProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 items-center justify-center bg-neutral-900/40 p-4">
          {/* Tocar el fondo cierra el modal */}
          <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Cerrar" />

          <View className="w-full max-w-md max-h-[90%] rounded-3xl bg-white shadow-2xl">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="p-6"
            >
              {children}
            </ScrollView>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={8}
              className="absolute right-4 top-4 rounded-full p-2 active:bg-neutral-100"
            >
              <X size={20} color={colors.neutral400} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
