/** Consistent API response envelope (ECC patterns): success flag, data, error. */
export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

export function ok<T>(data: T): ApiEnvelope<T> {
  return { success: true, data, error: null };
}

export function fail(error: string): ApiEnvelope<never> {
  return { success: false, data: null, error };
}
