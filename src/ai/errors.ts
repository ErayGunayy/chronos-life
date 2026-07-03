/**
 * Extraction failures carry a user-safe message only — never provider error
 * strings, which can include key material. The original error travels in
 * `cause` for server-side logging.
 */
export class ExtractionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ExtractionError';
  }
}
