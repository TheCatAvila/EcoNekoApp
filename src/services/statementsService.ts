import * as DocumentPicker from 'expo-document-picker';
import { API_BASE_URL, getAuthHeaders, request } from '../lib/apiClient';
import type { StatementDraft, StatementDto } from '../components/cards/shared';

/**
 * Abre el selector de archivos del teléfono (PDF o imagen).
 * Devuelve null si el usuario cancela.
 * En web esto era un <input type="file" accept="application/pdf,image/*">.
 */
export async function pickStatementFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

/** Paso 1: el backend analiza el archivo y devuelve un borrador (no guarda nada). */
export async function analyzeStatement(
  accountId: number,
  file: { uri: string; name: string; mimeType?: string | null },
): Promise<StatementDraft> {
  const formData = new FormData();
  formData.append('accountId', String(accountId));
  // En React Native los archivos se envían como { uri, name, type }.
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/pdf',
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/Statements/analyze`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const detail = response.status === 400 ? await response.text() : '';
    throw new Error(detail);
  }

  const json = await response.json();
  return json.data ?? json;
}

/** Paso 2: guardar el borrador revisado por el usuario. */
export function confirmStatement(draft: StatementDraft) {
  const transactions = draft.transactions.map((t) => ({
    ...t,
    description: t.description.trim(),
    amount: Number(t.amount),
  }));

  const payload = {
    accountId: draft.accountId,
    cardId: draft.cardId ?? null,
    detectedMonth: Number(draft.detectedMonth),
    detectedYear: Number(draft.detectedYear),
    emissionDate: draft.emissionDate,
    dueDate: draft.dueDate,
    officialTotalBilled: Number(draft.officialTotalBilled),
    transactionsSum: transactions.reduce((sum, t) => sum + t.amount, 0),
    requiresManualReview: draft.requiresManualReview,
    message: draft.message,
    transactions,
  };

  return request<StatementDto>('/Statements/confirm', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}
