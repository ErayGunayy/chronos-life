import {
  EMPTY_USER_STATE,
  freezeUserState,
  type UserState,
  type UserStateRepository,
} from '@/data/user-state-repository';

/** State store for tests and ephemeral dev runs. Not durable. */
export class InMemoryUserStateRepository implements UserStateRepository {
  private readonly states = new Map<string, UserState>();

  async get(userId: string): Promise<UserState> {
    return this.states.get(userId) ?? EMPTY_USER_STATE;
  }

  async update(
    userId: string,
    updater: (state: UserState) => UserState,
  ): Promise<UserState> {
    const next = freezeUserState(updater(await this.get(userId)));
    this.states.set(userId, next);
    return next;
  }

  /** All users' state — the persistence hook for file-backed wrappers. */
  snapshot(): Record<string, UserState> {
    return Object.fromEntries(this.states);
  }

  restore(userId: string, state: UserState): void {
    this.states.set(userId, freezeUserState(state));
  }
}
