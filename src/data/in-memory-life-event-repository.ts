import { freezeLifeEvent } from '@/domain/life-event/factory';
import type { LifeEvent } from '@/domain/life-event/types';
import type { LifeEventRepository } from '@/data/life-event-repository';

/** Repository for tests and ephemeral dev runs. Not durable. */
export class InMemoryLifeEventRepository implements LifeEventRepository {
  private readonly events = new Map<string, LifeEvent>();

  async save(event: LifeEvent): Promise<void> {
    this.events.set(event.id, freezeLifeEvent(event));
  }

  async getById(userId: string, id: string): Promise<LifeEvent | null> {
    const event = this.events.get(id);
    return event && event.userId === userId ? event : null;
  }

  async listBetween(userId: string, fromUtc: string, toUtc: string): Promise<LifeEvent[]> {
    const fromMs = Date.parse(fromUtc);
    const toMs = Date.parse(toUtc);
    return this.sorted(
      (event) =>
        event.userId === userId &&
        Date.parse(event.startAt) < toMs &&
        Date.parse(event.endAt) > fromMs,
    );
  }

  async listAll(userId: string): Promise<LifeEvent[]> {
    return this.sorted((event) => event.userId === userId);
  }

  async deleteById(userId: string, id: string): Promise<boolean> {
    const event = this.events.get(id);
    if (!event || event.userId !== userId) return false;
    this.events.delete(id);
    return true;
  }

  async deleteAll(userId: string): Promise<number> {
    let removed = 0;
    for (const [id, event] of this.events) {
      if (event.userId === userId) {
        this.events.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  private sorted(keep: (event: LifeEvent) => boolean): LifeEvent[] {
    return [...this.events.values()]
      .filter(keep)
      .sort(
        (a, b) =>
          Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id),
      );
  }
}
