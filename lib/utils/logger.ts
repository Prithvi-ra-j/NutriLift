/**
 * Minimal development-only error reporting for client-side services.
 * Avoids sending user data or provider payloads to production logs.
 */
export function logServiceFailure(context: string): void {
  if (__DEV__) {
    console.error(context);
  }
}
