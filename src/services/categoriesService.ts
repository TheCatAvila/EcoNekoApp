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

export async function getCategoriesApi(): Promise<CategoryItem[]> {
  try {
    return await request<CategoryItem[]>('/TransactionCategories', { auth: true });
  } catch {
    // Fallback por si el endpoint en el backend está como /TransactionCategories/me o /Categories
    try {
      return await request<CategoryItem[]>('/TransactionCategories/me', { auth: true });
    } catch {
      return await request<CategoryItem[]>('/Categories', { auth: true });
    }
  }
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
  try {
    return await request<CategoryItem>('/TransactionCategories', {
      method: 'POST',
      body: { name: name.trim(), icon, type },
      auth: true,
    });
  } catch {
    return await request<CategoryItem>('/Categories', {
      method: 'POST',
      body: { name: name.trim(), icon, type },
      auth: true,
    });
  }
}