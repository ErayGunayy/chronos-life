'use client';

import Link from 'next/link';
import { useState } from 'react';

import { deleteAllData } from '@/components/settings/api';
import { fieldLabel, ghostButton, quietButton, textInput } from '@/components/today/ui';

const CONFIRM_WORD = 'DELETE';

type Stage = 'idle' | 'confirming' | 'done';

/**
 * The one deliberately stronger confirmation in the app (§5.11 "or
 * everything"): irreversible and total, unlike a single memory's delete, so a
 * type-to-confirm gate is a safety rail here, not the "artificial friction"
 * CLAUDE.md warns against elsewhere.
 */
export function DeleteEverythingSection() {
  const [stage, setStage] = useState<Stage>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);

  const handleConfirm = async () => {
    if (isBusy || confirmText !== CONFIRM_WORD) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await deleteAllData();
      setDeletedCount(result.deletedEvents);
      setStage('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <h2 className="font-display text-xl">Delete everything</h2>

      {stage === 'done' ? (
        <>
          <p className="mt-2 text-sm leading-6">
            <strong>{deletedCount} {deletedCount === 1 ? 'memory' : 'memories'} deleted.</strong>{' '}
            Chronos is a blank page again.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/" className="underline decoration-line underline-offset-2 hover:text-accent">
              Back to Today
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-muted">
            Permanently remove every memory and reset your categories, chapters, and sleep
            window. This can&apos;t be undone.
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm text-accent">
              {error}
            </p>
          )}

          {stage === 'idle' ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStage('confirming')}
                className={ghostButton}
              >
                Delete everything
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className={fieldLabel} htmlFor="confirm-delete-all">
                  Type {CONFIRM_WORD} to confirm
                </label>
                <input
                  id="confirm-delete-all"
                  className={textInput}
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={isBusy || confirmText !== CONFIRM_WORD}
                  className={ghostButton}
                >
                  {isBusy ? 'Deleting…' : 'Delete everything, permanently'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStage('idle');
                    setConfirmText('');
                  }}
                  disabled={isBusy}
                  className={quietButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
