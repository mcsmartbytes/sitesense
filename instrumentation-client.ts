import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://224e162e30286145ff78de8ed2db0aea@o4510562652127232.ingest.us.sentry.io/4510562667200512',

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Enable logging
  enableLogs: true,

  // Session Replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    // Capture console logs
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    // Session replay
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Debug mode (disable in production)
  debug: false,
});

// Export hook for Next.js navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
