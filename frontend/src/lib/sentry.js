import * as Sentry from '@sentry/react';

// Error tracking only — no performance/APM tracing (out of scope for this
// pass, see CURRENT_STATUS.md's Observability item). No-ops safely if the
// DSN isn't set, so local dev without a configured Sentry account is
// unaffected. Browser's default integrations (unhandled window errors,
// unhandled promise rejections) come from Sentry.init() alone, no extra
// config needed.
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
  });
};

export { Sentry };
