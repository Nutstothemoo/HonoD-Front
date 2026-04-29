import { toast, type ExternalToast } from 'sonner'

// ── Typed API error ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number
  readonly path: string

  constructor(status: number, path: string, detail?: string) {
    super(detail ? `${status} ${path} — ${detail}` : `${status} ${path}`)
    this.status = status
    this.path = path
    this.name = 'ApiError'
  }
}

// ── notify — single entry point for every user-visible message ──────────────
// Prefer this over importing `toast` directly so we keep one consistent voice
// (durations, severities, log policy) across the app.

const DURATION = {
  short:   3500,  // success, info — read & dismiss quickly
  default: 5000,  // info that the user might want to action
  long:    8000,  // errors — give the user time to read & retry
  sticky:  Infinity,  // critical — must be dismissed manually
} as const

type NotifyOpts = ExternalToast & { logAs?: 'error' | 'warn' | 'info' | 'none' }

function emit(
  kind: 'success' | 'error' | 'info' | 'warning' | 'message',
  title: string,
  opts?: NotifyOpts,
) {
  const { logAs, ...toastOpts } = opts ?? {}
  const fn = kind === 'message' ? toast : toast[kind]
  const id = fn(title, toastOpts)

  if (typeof window !== 'undefined' && logAs && logAs !== 'none') {
    // eslint-disable-next-line no-console
    console[logAs](`[${kind}] ${title}`, opts?.description ?? '')
  }
  return id
}

export const notify = {
  success: (title: string, opts?: NotifyOpts) => emit('success', title, { duration: DURATION.short, ...opts }),
  error:   (title: string, opts?: NotifyOpts) => emit('error',   title, { duration: DURATION.long,    logAs: 'error', ...opts }),
  warning: (title: string, opts?: NotifyOpts) => emit('warning', title, { duration: DURATION.default, logAs: 'warn',  ...opts }),
  info:    (title: string, opts?: NotifyOpts) => emit('info',    title, { duration: DURATION.default, ...opts }),
  message: (title: string, opts?: NotifyOpts) => emit('message', title, opts),

  /** Dismiss a specific toast by id, or all if no id is given. */
  dismiss: (id?: string | number) => toast.dismiss(id),

  /** Wraps a promise and shows loading → success/error toast automatically. */
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: string
      success: string | ((value: T) => string)
      error:   string | ((err: unknown) => string)
    },
  ) => toast.promise(promise, msgs),
}

// ── Smart API-error reporter ────────────────────────────────────────────────
// Maps HTTP status codes to a short, action-oriented title. The original error
// message becomes the description (collapsible detail line in the toast).

function titleForStatus(status: number, fallback: string): string {
  if (status === 401) return 'Session expirée'
  if (status === 403) return 'Accès refusé'
  if (status === 404) return 'Ressource introuvable'
  if (status === 408) return 'Délai de réponse dépassé'
  if (status === 409) return 'Conflit — recharge nécessaire'
  if (status === 422) return 'Données invalides'
  if (status === 429) return 'Trop de requêtes'
  if (status >= 500)  return 'Erreur serveur'
  if (status >= 400)  return 'Requête refusée'
  return fallback
}

export interface HandleApiErrorOptions {
  /** Optional retry callback — adds an "Réessayer" action button to the toast. */
  retry?: () => void
  /** Override the default duration. */
  duration?: number
}

/**
 * Reports an unknown error to the user as a toast. Silently drops AbortError
 * (caused by component unmount / query cancellation — never the user's problem).
 */
export function handleApiError(
  err: unknown,
  context: string,
  options: HandleApiErrorOptions = {},
): void {
  if (err instanceof DOMException && err.name === 'AbortError') return
  // React Query also surfaces aborts as plain Errors with name === 'AbortError'.
  if (err instanceof Error && err.name === 'AbortError') return

  const isApi = err instanceof ApiError
  const description = err instanceof Error ? err.message : 'Erreur inconnue'
  const title = isApi ? `${context} — ${titleForStatus(err.status, context)}` : context

  notify.error(title, {
    description,
    duration: options.duration,
    action: options.retry
      ? { label: 'Réessayer', onClick: options.retry }
      : undefined,
  })
}
