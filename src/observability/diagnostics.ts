/**
 * The application's diagnostics entry point. Clipboard writes local logs and
 * keeps this compatibility surface no-op so shared callers need no branching.
 */
export {
  initSentry as initializeDiagnostics,
  setFrontendSentryEnabled as setDiagnosticsEnabled,
  applyDeviceMetaToSentry as applyDiagnosticDeviceContext,
  sentryEnabled as diagnosticsConfigured,
  captureDiagnosticException,
  recordDiagnosticBreadcrumb,
  writeDiagnosticLog,
  submitDiagnosticFeedback,
  startDiagnosticTrace,
  createDiagnosticsEnhancer,
  DiagnosticsErrorBoundary,
  DiagnosticsRoutes,
} from './sentry'

export type {
  DiagnosticBreadcrumb,
  DiagnosticDeviceContext,
  DiagnosticExceptionContext,
  DiagnosticFeedback,
  DiagnosticLogLevel,
  DiagnosticTrace,
} from './types'
