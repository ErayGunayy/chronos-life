'use client';

import { useState } from 'react';

import type { GapView } from '@/app/api/day/handler';
import { commitMemories } from '@/components/today/api';
import { fieldLabel, primaryButton, quietButton, textInput } from '@/components/today/ui';

type Props = {
  gap: GapView;
  localDate: string;
  timezone: string;
  onDone: () => void;
  onCancel: () => void;
};

export function GapFillForm({ gap, localDate, timezone, onDone, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(gap.startLabel);
  const [end, setEnd] = useState(gap.endLabel);
  const [details, setDetails] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim() === '' || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      await commitMemories(localDate, timezone, [
        {
          title,
          description: details.trim() === '' ? null : details,
          startLocalTime: start,
          endLocalTime: end,
          source: 'gap-fill',
        },
      ]);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      setIsBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 rounded-lg bg-card p-3">
      <div>
        <label className={fieldLabel} htmlFor="gap-title">
          What was happening?
        </label>
        <input
          id="gap-title"
          className={textInput}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          placeholder="Even a small detail counts"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel} htmlFor="gap-start">
            From
          </label>
          <input
            id="gap-start"
            type="time"
            className={textInput}
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="gap-end">
            Until
          </label>
          <input
            id="gap-end"
            type="time"
            className={textInput}
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={fieldLabel} htmlFor="gap-details">
          Anything else? (optional)
        </label>
        <textarea
          id="gap-details"
          className={`${textInput} resize-y`}
          rows={2}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={isBusy || title.trim() === ''} className={primaryButton}>
          {isBusy ? 'Keeping…' : 'Keep this memory'}
        </button>
        <button type="button" onClick={onCancel} className={quietButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}
