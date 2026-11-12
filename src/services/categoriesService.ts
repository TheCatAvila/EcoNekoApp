import { request } from '../lib/apiClient';

export interface CategoryItem {
  id: number;
  name: string;
  icon?: string;
  typeCode?: number;
  typeName?: string;
  isCustom?: boolean;
}

export interface CategorySuggestion {
  suggestedCategoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  source: 'UserHistory' | 'KeywordDictionary' | 'None';
}

/** Categorías del usuario (sistema + propias). type: 1 = Ingreso, 2 = Gasto; sin type trae todas. */
export async function getCategoriesApi(type?: 1 | 2): Promise<CategoryItem[]> {
  const query = type ? `?type=${type}` : '';
  const list = await request<CategoryItem[]>(`/TransactionCategories/me${query}`, { auth: true });
  return list ?? [];
}

export async function suggestCategoryApi(
  description: string,
  type: 1 | 2 = 2 // 1 = Income, 2 = Expense
): Promise<CategorySuggestion | null> {
  if (!description || description.trim().length < 2) return null;

  // URLSearchParams tiene soporte limitado en React Native: armamos el query a mano.
  const query = `description=${encodeURIComponent(description.trim())}&type=${type}`;

  try {
    return await request<CategorySuggestion>(
      `/TransactionCategories/suggest?${query}`,
      { auth: true }
    );
  } catch {
    return null;
  }
}

export async function createCustomCategoryApi(
  name: string,
  icon = 'tag',
  type: 1 | 2 = 2
): Promise<CategoryItem> {
  return request<CategoryItem>('/TransactionCategories', {
    method: 'POST',
    body: { name: name.trim(), icon, type },
    auth: true,
  });
}