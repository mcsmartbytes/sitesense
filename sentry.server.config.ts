import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://224e162e30286145ff78de8ed2db0aea@o4510562652127232.ingest.us.sentry.io/4510562667200512',

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Enable logging
  enableLogs: true,

  integrations: [
    // Capture console logs
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],

  // Debug mode (disable in production)
  debug: false,
});
