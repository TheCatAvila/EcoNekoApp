import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Cat, Check, Copy, RotateCcw, Send, Sparkles } from 'lucide-react-native';
import { request } from '../lib/apiClient';
import { sendChatMessageApi, type ChatMessage } from '../services/chatService';
import type { Account } from '../types/finance';
import FormattedMessage from '../components/chat/FormattedMessage';
import ChatWelcome from '../components/chat/ChatWelcome';
import { Screen } from '../components/ui/Screen';
import { Gradient } from '../components/ui/Gradient';
import { brandGradient, colors } from '../components/ui/theme';

const nowLabel = () =>
  new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contexto financiero real (en web: panel lateral)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    request<Account[]>('/Accounts/me', { auth: true })
      .then(setAccounts)
      .catch(() => undefined)
      .finally(() => setLoadingContext(false));
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      createdAt: nowLabel(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessageApi(query, messages);

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        createdAt: nowLabel(),
        suggestedFollowUps: response.suggestedFollowUps ?? [
          '¿Cómo puedo reducir este gasto?',
          'Muéstrame el detalle por tarjeta',
        ],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          err instanceof Error && err.message
            ? `No pude procesar tu consulta en este momento: ${err.message}`
            : 'Todavía no pude conectarme con el motor de IA en el servidor (`POST /AiChat/ask`). Verifica que el endpoint esté activo.',
        createdAt: nowLabel(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Screen scroll={false}>
      {/* Header */}
      <View className="mx-4 mt-2 flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <View className="relative">
            <Gradient
              colors={brandGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="h-11 w-11 rounded-2xl p-0.5"
            >
              <View className="flex-1 items-center justify-center rounded-2xl bg-neutral-900">
                <Cat size={20} color={colors.amber400} strokeWidth={1.75} />
              </View>
            </Gradient>
            <View className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-black leading-tight text-neutral-900">NekoAI</Text>
              <View className="flex-row items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5">
                <Sparkles size={12} color="#92400e" />
                <Text className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Gemini
                </Text>
              </View>
            </View>
            <Text numberOfLines={1} className="text-xs text-neutral-500">
              Asistente financiero conectado a tus cuentas
            </Text>
          </View>
        </View>

        {messages.length > 0 && (
          <Pressable
            onPress={() => setMessages([])}
            accessibilityLabel="Nueva conversación"
            className="rounded-xl bg-neutral-900 p-2.5 active:bg-neutral-800"
          >
            <RotateCcw size={16} color={colors.white} />
          </Pressable>
        )}
      </View>

      {/* Mensajes */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="gap-6 p-4"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {messages.length === 0 ? (
          <ChatWelcome
            accounts={accounts}
            loadingContext={loadingContext}
            disabled={isLoading}
            onSend={handleSendMessage}
          />
        ) : (
          <>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <View key={msg.id} className={isUser ? 'items-end' : 'items-start'}>
                  <View className="max-w-[90%] flex-row items-start gap-3">
                    {!isUser && (
                      <View className="mt-1 h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 shadow-sm">
                        <Cat size={16} color={colors.amber400} />
                      </View>
                    )}

                    <View className="shrink gap-2">
                      <View
                        className={`rounded-3xl p-4 ${
                          isUser
                            ? 'rounded-br-lg bg-neutral-900'
                            : 'rounded-bl-lg border border-neutral-100 bg-neutral-50'
                        }`}
                      >
                        {isUser ? (
                          <Text selectable className="text-sm leading-relaxed text-white">
                            {msg.content}
                          </Text>
                        ) : (
                          <FormattedMessage content={msg.content} />
                        )}
                      </View>

                      {/* Footer del mensaje (hora + copiar) */}
                      <View
                        className={`flex-row items-center gap-2 px-1 ${
                          isUser ? 'justify-end' : 'justify-between'
                        }`}
                      >
                        <Text className="text-[11px] text-neutral-400">{msg.createdAt}</Text>
                        {!isUser && (
                          <Pressable
                            onPress={() => handleCopy(msg.id, msg.content)}
                            hitSlop={8}
                            className="flex-row items-center gap-1"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={12} color={colors.green600} />
                                <Text className="text-[11px] font-medium text-green-600">Copiado</Text>
                              </>
                            ) : (
                              <>
                                <Copy size={12} color={colors.neutral400} />
                                <Text className="text-[11px] text-neutral-400">Copiar</Text>
                              </>
                            )}
                          </Pressable>
                        )}
                      </View>

                      {/* Sugerencias de seguimiento */}
                      {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                        <View className="flex-row flex-wrap gap-1.5 pt-1">
                          {msg.suggestedFollowUps.map((followUp) => (
                            <Pressable
                              key={followUp}
                              disabled={isLoading}
                              onPress={() => handleSendMessage(followUp)}
                              className={`rounded-xl border border-neutral-200 bg-white px-3 py-1.5 active:border-neutral-900 ${
                                isLoading ? 'opacity-50' : ''
                              }`}
                            >
                              <Text className="text-xs font-semibold text-neutral-700">{followUp}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Indicador de "Analizando..." */}
            {isLoading && (
              <View className="flex-row items-start gap-3">
                <View className="mt-1 h-8 w-8 items-center justify-center rounded-xl bg-neutral-900">
                  <Cat size={16} color={colors.amber400} />
                </View>
                <View className="flex-row items-center gap-3 rounded-3xl rounded-bl-lg border border-neutral-100 bg-neutral-50 px-4 py-3.5">
                  <ActivityIndicator size="small" color="#d97706" />
                  <Text className="text-xs font-bold text-neutral-600">
                    Analizando tus cuentas y movimientos...
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Barra de input */}
      <View className="border-t border-neutral-100 bg-white p-3">
        <View className="flex-row items-end gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Pregúntale a NekoAI sobre tus tarjetas, gastos, ahorros..."
            placeholderTextColor={colors.neutral400}
            editable={!isLoading}
            multiline
            className="max-h-32 flex-1 px-3 py-2 text-sm text-neutral-800"
          />
          <Pressable
            onPress={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            accessibilityLabel="Enviar consulta"
            className={`rounded-xl p-3 active:scale-95 ${
              !input.trim() || isLoading ? 'bg-neutral-200' : 'bg-neutral-900'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.neutral400} />
            ) : (
              <Send size={16} color={!input.trim() ? colors.neutral400 : colors.white} />
            )}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
