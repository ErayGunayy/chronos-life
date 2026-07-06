import { describe, expect, test } from 'vitest';

import { handleCategoriesRequest } from '@/app/api/categories/handler';
import { InMemoryUserStateRepository } from '@/data/in-memory-user-state-repository';
import { DEFAULT_CATEGORIES } from '@/domain/category/suggestions';

const USER = 'user-1';

describe('handleCategoriesRequest', () => {
  test('an empty state returns the default seed only', async () => {
    const state = new InMemoryUserStateRepository();

    const { status, body } = await handleCategoriesRequest(state, USER);

    expect(status).toBe(200);
    expect(body.data?.categories.map((category) => category.name)).toEqual([...DEFAULT_CATEGORIES]);
  });

  test('known categories come first, ordered by color index, without duplicating a default', async () => {
    const state = new InMemoryUserStateRepository();
    await state.update(USER, (current) => ({
      ...current,
      categoryColors: { Aile: 1, Proje: 0 },
    }));

    const { body } = await handleCategoriesRequest(state, USER);
    const names = body.data?.categories.map((category) => category.name) ?? [];

    // Proje(0) then Aile(1) lead; Aile is a default too but must appear once.
    expect(names.slice(0, 2)).toEqual(['Proje', 'Aile']);
    expect(names.filter((name) => name === 'Aile')).toHaveLength(1);
  });
});
