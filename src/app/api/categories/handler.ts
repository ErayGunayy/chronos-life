import type { UserStateRepository } from '@/data/user-state-repository';
import { buildCategorySuggestions, type CategorySuggestion } from '@/domain/category/suggestions';
import { type ApiEnvelope, ok } from '@/lib/api/envelope';

export interface CategoriesResponse {
  readonly categories: readonly CategorySuggestion[];
}

/**
 * Known + default category suggestions for the review-step chips (§5.2).
 * Read-only: new categories persist through the normal commit → ring
 * color-assignment flow, never here.
 */
export async function handleCategoriesRequest(
  state: UserStateRepository,
  userId: string,
): Promise<{ status: number; body: ApiEnvelope<CategoriesResponse> }> {
  const { categoryColors } = await state.get(userId);
  return {
    status: 200,
    body: ok({ categories: buildCategorySuggestions(categoryColors) }),
  };
}
