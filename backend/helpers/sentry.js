import * as Sentry from '@sentry/node';

// Called as early as possible in index.js — after dotenv, before express is
// imported — so @sentry/node's Express auto-instrumentation has a chance to
// patch the module. Error tracking only (no tracesSampleRate/performance
// tracing) — see CURRENT_STATUS.md's Observability item, that's a
// deliberately separate scope from this pass. No-ops with no DSN configured
// or under tests, so a missing SENTRY_DSN never breaks local dev or `npm
// test`, and captureException calls made elsewhere stay safe no-ops too.
export const initSentry = () => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === 'test') return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Sentry's own OnUncaughtException/OnUnhandledRejection default
    // integrations would double-report alongside index.js's own
    // process.on() handlers (which also log via pino before exiting) —
    // excluded here so each crash is captured exactly once.
    integrations: (defaults) =>
      defaults.filter((i) => i.name !== 'OnUncaughtException' && i.name !== 'OnUnhandledRejection'),
  });
};

export { Sentry };
