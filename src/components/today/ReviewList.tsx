'use client';

import { useState } from 'react';

import type { CaptureResponse } from '@/app/api/capture/handler';
import { commitMemories } from '@/components/today/api';
import { fieldLabel, ghostButton, primaryButton, quietButton, textInput } from '@/components/today/ui';

const APPROXIMATE_TIME_THRESHOLD = 0.6;

interface EditableCandidate {
  title: string;
  startLocalTime: string;
  endLocalTime: string;
  category: string;
  peopleText: string;
  place: string;
  description: string | null;
  categoryConfidence: number | null;
  timeConfidence: number;
}

type Props = {
  response: CaptureResponse;
  localDate: string;
  timezone: string;
  onCommitted: () => void;
  onBack: () => void;
};

export function ReviewList({ response, localDate, timezone, onCommitted, onBack }: Props) {
  const [items, setItems] = useState<EditableCandidate[]>(() =>
    response.candidates.map((candidate) => ({
      title: candidate.title,
      startLocalTime: candidate.startLocalTime,
      endLocalTime: candidate.endLocalTime,
      category: candidate.category ?? '',
      peopleText: candidate.people.join(', '),
      place: candidate.place ?? '',
      description: candidate.description,
      categoryConfidence: candidate.categoryConfidence,
      timeConfidence: candidate.timeConfidence,
    })),
  );
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateItem = (index: number, patch: Partial<EditableCandidate>) => {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const handleCommit = async () => {
    if (isBusy || items.length === 0) return;
    setIsBusy(true);
    setError(null);
    try {
      await commitMemories(
        localDate,
        timezone,
        items.map((item) => ({
          title: item.title,
          description: item.description,
          category: item.category.trim() === '' ? null : item.category.trim(),
          categoryConfidence: item.category.trim() === '' ? null : item.categoryConfidence,
          startLocalTime: item.startLocalTime,
          endLocalTime: item.endLocalTime,
          people: item.peopleText
            .split(',')
            .map((person) => person.trim())
            .filter((person) => person.length > 0),
          place: item.place.trim() === '' ? null : item.place.trim(),
          source: 'life-conversation' as const,
        })),
      );
      onCommitted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      setIsBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl">Here&apos;s what I heard</h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <ProvenanceBadge extractor={response.extractor} />
          Nothing is saved yet — correct anything, then keep what&apos;s true.
        </p>
        {response.note && <p className="mt-2 text-sm italic text-muted">{response.note}</p>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="text-sm text-muted">
            I couldn&apos;t turn that into memories yet. Want to tell it a little differently?
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item, index) => (
            <li key={index} className="rounded-xl border border-line bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <label className={fieldLabel} htmlFor={`title-${index}`}>
                    Memory
                  </label>
                  <input
                    id={`title-${index}`}
                    className={textInput}
                    value={item.title}
                    onChange={(event) => updateItem(index, { title: event.target.value })}
                    placeholder="What happened?"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className={`${quietButton} mt-5 shrink-0`}
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className={fieldLabel} htmlFor={`start-${index}`}>
                    From
                  </label>
                  <input
                    id={`start-${index}`}
                    type="time"
                    className={textInput}
                    value={item.startLocalTime}
                    onChange={(event) => updateItem(index, { startLocalTime: event.target.value })}
                  />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor={`end-${index}`}>
                    Until
                  </label>
                  <input
                    id={`end-${index}`}
                    type="time"
                    className={textInput}
                    value={item.endLocalTime}
                    onChange={(event) => updateItem(index, { endLocalTime: event.target.value })}
                  />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor={`category-${index}`}>
                    Category
                  </label>
                  <input
                    id={`category-${index}`}
                    className={textInput}
                    value={item.category}
                    onChange={(event) => updateItem(index, { category: event.target.value })}
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor={`place-${index}`}>
                    Place
                  </label>
                  <input
                    id={`place-${index}`}
                    className={textInput}
                    value={item.place}
                    onChange={(event) => updateItem(index, { place: event.target.value })}
                    placeholder="optional"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={fieldLabel} htmlFor={`people-${index}`}>
                  People (comma-separated)
                </label>
                <input
                  id={`people-${index}`}
                  className={textInput}
                  value={item.peopleText}
                  onChange={(event) => updateItem(index, { peopleText: event.target.value })}
                  placeholder="optional"
                />
              </div>

              {item.timeConfidence <= APPROXIMATE_TIME_THRESHOLD && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-question-bg px-3 py-1 text-xs text-question">
                  <span aria-hidden>≈</span> the time is a guess — please check it
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        {items.length > 0 && (
          <button type="button" onClick={handleCommit} disabled={isBusy} className={primaryButton}>
            {isBusy ? 'Keeping…' : `Keep ${items.length === 1 ? 'this memory' : 'these memories'}`}
          </button>
        )}
        <button type="button" onClick={onBack} className={ghostButton}>
          Tell it differently
        </button>
      </div>
    </section>
  );
}

const PROVENANCE: Record<
  CaptureResponse['extractor'],
  { label: string; title: string; isAi: boolean }
> = {
  claude: {
    label: 'Read by AI',
    title: 'These candidates were read from your story by Claude.',
    isAi: true,
  },
  ollama: {
    label: 'Read by AI · on your device',
    title: 'These candidates were read from your story by a local model — nothing left your device.',
    isAi: true,
  },
  stub: {
    label: 'Parsed · no AI',
    title: 'Parsed with the deterministic dev stub — no AI involved.',
    isAi: false,
  },
};

function ProvenanceBadge({ extractor }: { extractor: CaptureResponse['extractor'] }) {
  const { label, title, isAi } = PROVENANCE[extractor];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAi ? 'bg-accent-soft text-accent' : 'border border-line text-muted'
      }`}
      title={title}
    >
      {label}
    </span>
  );
}
