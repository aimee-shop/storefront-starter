import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

/**
 * Result shape returned by the auth server actions: expected failures (bad
 * credentials, validation) come back as values for inline display -- never
 * thrown. Raw SDK error messages are never surfaced to the user.
 */
export type AuthResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> };

/**
 * Map an AuthResult from a server action onto a react-hook-form instance:
 * field errors go to setError() (inline under each input), form-level errors
 * to the caller's alert state. Guards against the action having redirected
 * (in which case the client receives no result value).
 */
export function applyAuthResult<T extends FieldValues>(
  result: AuthResult | undefined,
  setError: UseFormSetError<T>,
  setFormError: (message: string | null) => void
): void {
  if (!result || result.ok) return;
  for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
    setError(field as Path<T>, { message });
  }
  if (result.formError) {
    setFormError(result.formError);
  }
}
