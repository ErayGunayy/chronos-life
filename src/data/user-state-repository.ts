import type { ChapterRecord } from '@/domain/chapters/types';
import type { SleepWindow } from '@/domain/home/types';

/**
 * Per-user product state that is not a memory: category color assignments
 * (§5.2.3 — a color, once assigned, never changes), the usual sleep window
 * (§5.8.4), accepted Life Chapters and dismissed chapter suggestions (§5.7).
 *
 * Facts about the life itself stay in LifeEventRepository; this store only
 * holds how Chronos presents and organizes them.
 */
export interface UserState {
  /** Category name → default palette index, assigned in first-seen order (§5.2.3). */
  readonly categoryColors: Readonly<Record<string, number>>;
  readonly sleepWindow: SleepWindow | null;
  readonly chapters: readonly ChapterRecord[];
  /** chapterThemeKey() values the user said "not now" to — never re-suggested. */
  readonly dismissedChapterKeys: readonly string[];
}

export const EMPTY_USER_STATE: UserState = Object.freeze({
  categoryColors: Object.freeze({}),
  sleepWindow: null,
  chapters: Object.freeze([]) as readonly ChapterRecord[],
  dismissedChapterKeys: Object.freeze([]) as readonly string[],
});

export interface UserStateRepository {
  get(userId: string): Promise<UserState>;

  /**
   * Atomic read-modify-write: the updater receives the current state and
   * returns the next one (pure — never mutate the input). Implementations
   * serialize updates so concurrent callers cannot lose writes.
   */
  update(userId: string, updater: (state: UserState) => UserState): Promise<UserState>;
}

/** Defensive freeze so state read from the store cannot be mutated in place. */
export function freezeUserState(state: UserState): UserState {
  return Object.freeze({
    categoryColors: Object.freeze({ ...state.categoryColors }),
    sleepWindow: state.sleepWindow ? Object.freeze({ ...state.sleepWindow }) : null,
    chapters: Object.freeze(state.chapters.map((chapter) => Object.freeze({ ...chapter }))),
    dismissedChapterKeys: Object.freeze([...state.dismissedChapterKeys]),
  });
}
