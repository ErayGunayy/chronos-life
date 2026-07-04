import type { LifeEventRepository } from '@/data/life-event-repository';
import { EMPTY_USER_STATE, type UserStateRepository } from '@/data/user-state-repository';
import { type ApiEnvelope, fail, ok } from '@/lib/api/envelope';

export interface DeleteAllResponse {
  readonly deletedEvents: number;
}

/**
 * Full wipe (§5.11 "or everything"): every LifeEvent gone, UserState reset to
 * empty. The two writes are independent (no cross-repository transaction
 * exists in this codebase) — acceptable for a single-user local store.
 */
export async function handleDeleteAllData(
  events: LifeEventRepository,
  state: UserStateRepository,
  userId: string,
): Promise<{ status: number; body: ApiEnvelope<DeleteAllResponse> }> {
  try {
    const deletedEvents = await events.deleteAll(userId);
    await state.update(userId, () => EMPTY_USER_STATE);
    return { status: 200, body: ok({ deletedEvents }) };
  } catch (error) {
    console.error('bulk delete failed', error);
    return {
      status: 500,
      body: fail("That didn't fully go through — please try again."),
    };
  }
}
