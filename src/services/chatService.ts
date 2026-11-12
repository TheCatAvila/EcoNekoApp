import { request } from '../lib/apiClient';

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  suggestedFollowUps?: string[];
}

export interface ChatHistoryItemDto {
  role: MessageRole;
  content: string;
}

export interface SendChatMessageRequestDto {
  message: string;
  history: ChatHistoryItemDto[];
}

export interface SendChatMessageResponseDto {
  reply: string;
  suggestedFollowUps?: string[];
}

export async function sendChatMessageApi(
  message: string,
  history: ChatMessage[]
): Promise<SendChatMessageResponseDto> {
  // Enviamos los últimos 10 mensajes para mantener el contexto sin sobrecargar tokens
  const compactHistory: ChatHistoryItemDto[] = history.slice(-10).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const payload: SendChatMessageRequestDto = {
    message: message.trim(),
    history: compactHistory,
  };

  return await request<SendChatMessageResponseDto>('/AiChat/ask', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}