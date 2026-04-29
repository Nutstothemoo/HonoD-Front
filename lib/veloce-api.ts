import { ApiError } from './api-error'
import type { VeloceRequest, VeloceResponse } from '@/types/veloce'

const BASE = process.env.NEXT_PUBLIC_VELOCE_URL ?? 'http://localhost:3001'

interface RequestOptions {
  signal?: AbortSignal
}

async function request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    cache: 'no-store',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  })
  if (!res.ok) {
    let detail: string | undefined
    try {
      const parsed = await res.json() as { error?: string }
      detail = parsed.error
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(res.status, `${method} ${path}`, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const get   = <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options)
const post  = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
const put   = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body)
const del   = (path: string) => request<void>('DELETE', path)

// ── Shared types aligned with back-end (see Veloce.md) ───────────────────────

export type VeloceDriverStatus = 'available' | 'on_route' | 'paused' | 'offline'

export type VeloceShipmentStatus =
  | 'to_assign'
  | 'pre_assigned'
  | 'assigned'
  | 'in_progress'
  | 'delivered'
  | 'cancelled'
  | 'failed'

export type VehicleType = 'car' | 'bike' | 'truck'
export type RoutingProfile = 'car' | 'bike'
export type PlanStatus = 'draft' | 'solving' | 'solved' | 'applied' | 'failed'

export interface Skill {
  id: string
  code: string
  label: string
  created_at: string
}

export interface VeloceDriverPosition {
  lng: number
  lat: number
  heading: number
  speed: number
  updated_at: string
}

export interface VeloceDriver {
  id: string
  code: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  status: VeloceDriverStatus
  position?: VeloceDriverPosition
  capacity: number
  vehicle_type: VehicleType
  shift_start: string
  shift_end: string
  skills: Skill[]
  created_at: string
  updated_at: string
}

export interface VeloceShipment {
  id: string
  reference: string
  status: VeloceShipmentStatus

  pickup_address: string
  pickup_lng: number
  pickup_lat: number
  pickup_window_start: string
  pickup_window_end: string
  pickup_duration: number
  pickup_done_at?: string

  dropoff_address: string
  dropoff_lng: number
  dropoff_lat: number
  dropoff_window_start: string
  dropoff_window_end: string
  dropoff_duration: number
  dropoff_done_at?: string

  driver_id?: string | null
  assigned_at?: string

  weight: number
  volume: number
  priority: number
  notes?: string
  required_skills: string[]

  created_at: string
  updated_at: string
}

export interface VelocePlan {
  id: string
  date: string
  status: PlanStatus
  solve_duration: string
  profile: RoutingProfile
  solution?: VeloceResponse
  error?: string
  created_at: string
  updated_at: string
}

export interface VeloceAutoSolveConfig {
  enabled: boolean
  interval_seconds: number
  profile: RoutingProfile
  solve_duration: string
  last_run_at?: string
  updated_at: string
  next_run_at?: string
  seconds_until_run?: number
}

// ── Skills ───────────────────────────────────────────────────────────────────

export const skillsApi = {
  list:   () => get<Skill[]>('/skills'),
  create: (body: { code: string; label: string }) => post<Skill>('/skills', body),
  remove: (id: string) => del(`/skills/${id}`),
}

// ── Drivers ──────────────────────────────────────────────────────────────────

export interface CreateDriverBody {
  code: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  capacity: number
  vehicle_type: VehicleType
  shift_start: string
  shift_end: string
  skill_ids?: string[]
}

export interface UpdateDriverBody {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  status?: VeloceDriverStatus
  capacity?: number
  vehicle_type?: VehicleType
  shift_start?: string
  shift_end?: string
  skill_ids?: string[]
}

export interface DriverPositionBody {
  lng: number
  lat: number
  heading?: number
  speed?: number
}

export const driversApi = {
  list:           (options?: RequestOptions) => get<VeloceDriver[]>('/drivers', options),
  get:            (id: string) => get<VeloceDriver>(`/drivers/${id}`),
  create:         (body: CreateDriverBody) => post<VeloceDriver>('/drivers', body),
  update:         (id: string, body: UpdateDriverBody) => put<VeloceDriver>(`/drivers/${id}`, body),
  remove:         (id: string) => del(`/drivers/${id}`),
  updatePosition: (id: string, body: DriverPositionBody) => post<{ ok: boolean }>(`/drivers/${id}/position`, body),
  livePositions:  (options?: RequestOptions) => get<VeloceDriver[]>('/drivers/positions', options),
}

// ── Shipments ────────────────────────────────────────────────────────────────

export interface ShipmentListFilter {
  status?: VeloceShipmentStatus
  driver_id?: string
}

export interface CreateShipmentBody {
  reference: string
  pickup_address: string
  pickup_lng: number
  pickup_lat: number
  pickup_window_start: string
  pickup_window_end: string
  pickup_duration?: number
  dropoff_address: string
  dropoff_lng: number
  dropoff_lat: number
  dropoff_window_start: string
  dropoff_window_end: string
  dropoff_duration?: number
  weight?: number
  volume?: number
  priority?: number
  notes?: string
  required_skills?: string[]
}

export interface BulkAssignBody {
  shipment_ids: string[]
  driver_id: string
  status?: VeloceShipmentStatus
}

function buildShipmentQuery(filter?: ShipmentListFilter): string {
  if (!filter) return ''
  const params = new URLSearchParams()
  if (filter.status) params.set('status', filter.status)
  if (filter.driver_id) params.set('driver_id', filter.driver_id)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const shipmentsApi = {
  list:         (filter?: ShipmentListFilter, options?: RequestOptions) =>
                  get<VeloceShipment[]>(`/shipments${buildShipmentQuery(filter)}`, options),
  get:          (id: string) => get<VeloceShipment>(`/shipments/${id}`),
  create:       (body: CreateShipmentBody) => post<VeloceShipment>('/shipments', body),
  remove:       (id: string) => del(`/shipments/${id}`),
  transition:   (id: string, status: VeloceShipmentStatus, driverId?: string) =>
                  patch<VeloceShipment>(`/shipments/${id}/status`, { status, driver_id: driverId }),
  assign:       (id: string, driverId: string, status: VeloceShipmentStatus = 'assigned') =>
                  post<VeloceShipment>(`/shipments/${id}/assign`, { driver_id: driverId, status }),
  unassign:     (id: string) => post<VeloceShipment>(`/shipments/${id}/unassign`),
  bulkAssign:   (body: BulkAssignBody) =>
                  post<{ count: number; shipments: VeloceShipment[] }>(`/shipments/assign`, body),
  bulkUnassign: (ids: string[]) =>
                  post<{ count: number; shipments: VeloceShipment[] }>(`/shipments/unassign`, { shipment_ids: ids }),
}

// ── Plans ────────────────────────────────────────────────────────────────────

export interface CreatePlanBody {
  date: string
  solve_duration?: string
  profile?: RoutingProfile
}

export const plansApi = {
  list:   () => get<VelocePlan[]>('/plans'),
  get:    (id: string) => get<VelocePlan>(`/plans/${id}`),
  create: (body: CreatePlanBody) => post<VelocePlan>('/plans', body),
  solve:  (id: string) => post<VelocePlan>(`/plans/${id}/solve`),
  apply:  (id: string) => post<VelocePlan>(`/plans/${id}/apply`),
}

// ── Auto-solve ───────────────────────────────────────────────────────────────

export const autoSolveApi = {
  get:       () => get<VeloceAutoSolveConfig>('/auto-solve'),
  update:    (body: Partial<VeloceAutoSolveConfig>) => patch<VeloceAutoSolveConfig>('/auto-solve', body),
  streamUrl: () => `${BASE}/auto-solve/stream`,
}

// ── Legacy stateless /solve ──────────────────────────────────────────────────
// Kept only for client-side "quick simulate" flows. Stateful planning must go
// through plansApi (create -> solve -> apply) so shipments get persisted.

export const solverApi = {
  solve: (payload: VeloceRequest) => post<VeloceResponse>('/solve', payload),
}
