type BetterAuthLogLevel = "debug" | "info" | "warn" | "error";

const DUPLICATE_SIGNUP_PREFIX = "Sign-up attempt for existing email:";

/** Preserve Better Auth logs while redacting its duplicate-signup email message. */
export function writeBetterAuthLog(
  level: BetterAuthLogLevel,
  message: string,
  ...args: unknown[]
): void {
  const safeMessage = message.startsWith(DUPLICATE_SIGNUP_PREFIX)
    ? "Sign-up attempt for existing email (address redacted)."
    : message;
  const write = level === "error"
    ? console.error
    : level === "warn"
      ? console.warn
      : console.log;

  write(`[Better Auth] ${safeMessage}`, ...args);
}
