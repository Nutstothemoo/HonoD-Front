import type { DeliveryPoint, DriverStatus } from '@/types/vrp'
import type { VeloceDriverStatus, VeloceShipmentStatus } from './veloce-api'

// ── Delivery status palette ─────────────────────────────────────────────────
// Single source of truth for mission marker / row colors. Tuned for the dark
// map background — vivid enough to read at a glance without bleeding.
//   pending     → sky-400      (en attente d'assignation)
//   preassigned → violet-400   (réservée à un chauffeur, pas encore active)
//   assigned    → blue-500     (en cours, chauffeur dessus)
//   done        → emerald-500  (livré)
//   at_risk     → red-500      (retard / échec)
// The companion `bg-*` Tailwind classes live in DOT_TW for status dots that
// need pulse/animation utilities.

export const DELIVERY_STATUS_COLORS: Record<DeliveryPoint['status'], string> = {
  pending:     '#38bdf8', // sky-400
  preassigned: '#a78bfa', // violet-400
  assigned:    '#3b82f6', // blue-500
  done:        '#10b981', // emerald-500
  at_risk:     '#ef4444', // red-500
}

export const DELIVERY_STATUS_DOT_TW: Record<DeliveryPoint['status'], string> = {
  pending:     'bg-sky-400',
  preassigned: 'bg-violet-400',
  assigned:    'bg-blue-400',
  done:        'bg-emerald-400',
  at_risk:     'bg-red-500 animate-pulse',
}

export const DELIVERY_STATUS_TEXT_TW: Record<DeliveryPoint['status'], string> = {
  pending:     'text-sky-300',
  preassigned: 'text-violet-300',
  assigned:    'text-blue-300',
  done:        'text-emerald-300',
  at_risk:     'text-red-300',
}

// ── Driver status ────────────────────────────────────────────────────────────

export function driverStatusToUi(status: VeloceDriverStatus): DriverStatus {
  switch (status) {
    case 'on_route': return 'on_route'
    case 'paused':   return 'paused'
    case 'offline':  return 'offline'
    case 'available':
    default:         return 'idle'
  }
}

// ── Shipment status ──────────────────────────────────────────────────────────

export function shipmentStatusToUi(status: VeloceShipmentStatus): DeliveryPoint['status'] {
  switch (status) {
    case 'delivered':    return 'done'
    case 'in_progress':  return 'assigned'
    case 'assigned':     return 'assigned'
    case 'pre_assigned': return 'preassigned'
    case 'failed':       return 'at_risk'
    case 'cancelled':    return 'at_risk'
    case 'to_assign':
    default:             return 'pending'
  }
}

// UI status → preferred target shipment status on explicit user transition.
// Using the most "forward" valid target: pending→to_assign, done→delivered, at_risk→failed.
export function uiStatusToShipmentTarget(status: DeliveryPoint['status']): VeloceShipmentStatus {
  switch (status) {
    case 'pending':     return 'to_assign'
    case 'preassigned': return 'pre_assigned'
    case 'assigned':    return 'assigned'
    case 'done':        return 'delivered'
    case 'at_risk':     return 'failed'
  }
}

// Valid transitions mirror the back-end shipment state machine (see Veloce.md).
// Used to short-circuit invalid UI requests with a clear toast rather than a 400.
const VALID_TRANSITIONS: Record<VeloceShipmentStatus, VeloceShipmentStatus[]> = {
  to_assign:    ['pre_assigned', 'assigned', 'cancelled'],
  pre_assigned: ['to_assign', 'assigned', 'cancelled'],
  assigned:     ['pre_assigned', 'in_progress', 'to_assign', 'cancelled'],
  in_progress:  ['delivered', 'failed'],
  delivered:    [],
  cancelled:    [],
  failed:       ['to_assign', 'pre_assigned'],
}

export function isValidShipmentTransition(from: VeloceShipmentStatus, to: VeloceShipmentStatus): boolean {
  if (from === to) return true
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
