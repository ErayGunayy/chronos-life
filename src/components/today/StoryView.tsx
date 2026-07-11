'use client';

import { useState } from 'react';

import type { DayResponse, EventView, GapView } from '@/app/api/day/handler';
import { commitMemories, deleteMemory } from '@/components/today/api';
import { GapFillForm } from '@/components/today/GapFillForm';
import { ghostButton, primaryButton, quietButton } from '@/components/today/ui';

const SOURCE_LABELS: Record<EventView['source'], string> = {
  'life-conversation': 'from your story',
  'gap-fill': 'filled in later',
  'quick-add': 'quick add',
  'manual-edit': 'edited by hand',
  'ai-reconstruction': 'reconstructed with AI',
};

type Props = {
  day: DayResponse;
  localDate: string;
  timezone: string;
  onContinue: () => void;
  onChanged: () => void;
};

export function StoryView({ day, localDate, timezone, onContinue, onChanged }: Props) {
  const [openGap, setOpenGap] = useState<string | null>(null);
  const [busyGap, setBusyGap] = useState<string | null>(null);
  const [confirmingEventId, setConfirmingEventId] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [isInviteDismissed, setIsInviteDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteEvent = async (id: string) => {
    if (busyEventId) return;
    setBusyEventId(id);
    setError(null);
    try {
      await deleteMemory(id);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDontRemember = async (gap: GapView) => {
    if (busyGap) return;
    setBusyGap(gap.startAt);
    setError(null);
    try {
      // "I don't remember" is a real, complete answer (§6.4) — recorded, never nagged again.
      await commitMemories(localDate, timezone, [
        { kind: 'unremembered', source: 'gap-fill', startAt: gap.startAt, endAt: gap.endAt },
      ]);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setBusyGap(null);
    }
  };

  if (day.segments.length === 0) {
    return (
      <section className="flex flex-col items-start gap-4">
        <h2 className="font-display text-2xl">Today is still unwritten.</h2>
        <button type="button" onClick={onContinue} className={primaryButton}>
          Tell today&apos;s story
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Today&apos;s Story</h2>
        {day.rememberedShare !== null && (
          <span
            className="rounded-full border border-line bg-card px-3 py-1 text-xs text-muted"
            title="How much of the day is written down — coverage, never a score."
          >
            {Math.round(day.rememberedShare * 100)}% remembered
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <ol className="flex flex-col">
        {day.segments.map((segment) =>
          segment.type === 'event' ? (
            <li key={segment.event.id}>
              <EventBlock
                event={segment.event}
                isConfirmingDelete={confirmingEventId === segment.event.id}
                isDeleting={busyEventId === segment.event.id}
                onRequestDelete={() => setConfirmingEventId(segment.event.id)}
                onConfirmDelete={() => void handleDeleteEvent(segment.event.id)}
                onCancelDelete={() => setConfirmingEventId(null)}
              />
            </li>
          ) : segment.gap.kind === 'routine' ? (
            // Routine gaps stay gray and silent (§6.3) — a quiet passage of time.
            <li key={segment.gap.startAt} aria-hidden className="my-1 ml-8 h-6 border-l-2 border-line" />
          ) : (
            <li key={segment.gap.startAt}>
              <ForgottenMomentBlock
                gap={segment.gap}
                isOpen={openGap === segment.gap.startAt}
                isBusy={busyGap === segment.gap.startAt}
                onOpen={() => setOpenGap(segment.gap.startAt)}
                onClose={() => setOpenGap(null)}
                onFilled={() => {
                  setOpenGap(null);
                  onChanged();
                }}
                onDontRemember={() => void handleDontRemember(segment.gap)}
                localDate={localDate}
                timezone={timezone}
              />
            </li>
          ),
        )}
      </ol>

      {day.invite && !isInviteDismissed && (
        <aside className="rounded-xl border border-question-line bg-question-bg/60 p-4">
          <p className="text-sm leading-6">{day.invite.message}</p>
          <button
            type="button"
            onClick={() => setIsInviteDismissed(true)}
            className={`${quietButton} mt-2 -ml-3`}
          >
            Later is fine
          </button>
        </aside>
      )}

      <footer className="mt-4 flex flex-col gap-4 border-t border-line pt-5">
        <p className="font-display text-lg italic text-muted">
          Looking back, how does today feel so far?
        </p>
        <div>
          <button type="button" onClick={onContinue} className={ghostButton}>
            Continue your story
          </button>
        </div>
      </footer>
    </section>
  );
}

function EventBlock({
  event,
  isConfirmingDelete,
  isDeleting,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  event: EventView;
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  if (event.kind === 'unremembered') {
    return (
      <article className="my-2 rounded-xl border border-dashed border-line bg-card/60 p-4">
        <p className="font-mono text-xs text-muted">
          {event.startLabel}–{event.endLabel}
        </p>
        <h3 className="font-display mt-1 flex items-center gap-2 text-lg text-muted">
          <QuestionMark /> Unremembered time
        </h3>
        <p className="mt-1 text-sm text-muted">
          You marked this as not remembered — it can always be filled in later.
        </p>
        {isConfirmingDelete ? (
          <DeleteRow
            isDeleting={isDeleting}
            onConfirmDelete={onConfirmDelete}
            onCancelDelete={onCancelDelete}
          />
        ) : (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={onRequestDelete} className={quietButton}>
              Delete
            </button>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className="my-2 rounded-xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-xs text-muted">
          {event.startLabel}–{event.endLabel}
        </p>
        {event.category && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">
            {event.category}
          </span>
        )}
      </div>
      <h3 className="font-display mt-1 text-xl">{event.title}</h3>
      {(event.people.length > 0 || event.place) && (
        <p className="mt-1 text-sm text-muted">
          {event.people.join(', ')}
          {event.people.length > 0 && event.place ? ' · ' : ''}
          {event.place ?? ''}
        </p>
      )}
      {event.description && <p className="mt-2 text-sm leading-6">{event.description}</p>}
      {event.notes && <p className="mt-2 text-sm leading-6 text-muted">{event.notes}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted/80">{SOURCE_LABELS[event.source]}</p>
        {!isConfirmingDelete && (
          <button type="button" onClick={onRequestDelete} className={quietButton}>
            Delete
          </button>
        )}
      </div>
      {isConfirmingDelete && (
        <DeleteRow
          isDeleting={isDeleting}
          onConfirmDelete={onConfirmDelete}
          onCancelDelete={onCancelDelete}
        />
      )}
    </article>
  );
}

/** The inline "are you sure" step for deleting a memory — no native confirm(), matching GapFillForm's Cancel/Submit convention. */
function DeleteRow({
  isDeleting,
  onConfirmDelete,
  onCancelDelete,
}: {
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <p className="text-sm text-muted">Delete this memory?</p>
      <button type="button" onClick={onConfirmDelete} disabled={isDeleting} className={ghostButton}>
        {isDeleting ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" onClick={onCancelDelete} disabled={isDeleting} className={quietButton}>
        Cancel
      </button>
    </div>
  );
}

function ForgottenMomentBlock({
  gap,
  isOpen,
  isBusy,
  onOpen,
  onClose,
  onFilled,
  onDontRemember,
  localDate,
  timezone,
}: {
  gap: GapView;
  isOpen: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onFilled: () => void;
  onDontRemember: () => void;
  localDate: string;
  timezone: string;
}) {
  return (
    <article className="my-2 rounded-xl border border-dashed border-question-line bg-question-bg p-4">
      <p className="font-mono text-xs text-question">
        {gap.startLabel}–{gap.endLabel}
      </p>
      <h3 className="font-display mt-1 flex items-center gap-2 text-lg text-question">
        <QuestionMark /> Still unwritten
      </h3>
      <p className="mt-1 text-sm text-question/90">
        Looks like this part of today hasn&apos;t been written yet.
      </p>

      {isOpen ? (
        <GapFillForm
          gap={gap}
          localDate={localDate}
          timezone={timezone}
          onDone={onFilled}
          onCancel={onClose}
        />
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onOpen} className={ghostButton}>
            Fill this in
          </button>
          <button type="button" onClick={onDontRemember} disabled={isBusy} className={quietButton}>
            {isBusy ? 'Noting that…' : 'I don’t remember'}
          </button>
        </div>
      )}
    </article>
  );
}

function QuestionMark() {
  return (
    <span
      aria-hidden
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-semibold"
    >
      ?
    </span>
  );
}
