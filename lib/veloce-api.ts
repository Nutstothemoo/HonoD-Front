const BASE = process.env.NEXT_PUBLIC_VELOCE_URL ?? 'http://localhost:3001'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface VeloceDriver {
  id: string
  code: string
  first_name: string
  last_name: string
  phone: string
  email: string
  status: 'available' | 'on_duty' | 'off_duty'
  position: {
    lng: number
    lat: number
    heading: number
    speed: number
    updated_at: string
  }
  capacity: number
  vehicle_type: 'car' | 'bike' | 'truck'
  shift_start: string
  shift_end: string
  skills: string[]
}

export interface VeloceShipment {
  id: string
  reference: string
  status: 'to_assign' | 'assigned' | 'in_progress' | 'delivered' | 'failed' | 'cancelled'
  pickup_address: string
  pickup_lng: number
  pickup_lat: number
  pickup_window_start: string
  pickup_window_end: string
  pickup_duration: number
  dropoff_address: string
  dropoff_lng: number
  dropoff_lat: number
  dropoff_window_start: string
  dropoff_window_end: string
  dropoff_duration: number
  driver_id: string | null
  weight: number
  volume: number
  priority: number
  required_skills: string[]
}

export interface VeloceAutoSolveConfig {
  enabled: boolean
  interval_seconds: number
  profile: string
  solve_duration: string
  updated_at: string
}

export interface VelocePlan {
  id: string
  name: string
  date: string
  status: string
  created_at: string
}

// ── Drivers ──────────────────────────────────────────────────────────────────

export const driversApi = {
  list: () => get<VeloceDriver[]>('/drivers'),
  updatePosition: (id: string, body: { lng: number; lat: number; heading?: number; speed?: number }) =>
    patch<void>(`/drivers/${id}/position`, body),
}

// ── Shipments ────────────────────────────────────────────────────────────────

export const shipmentsApi = {
  list: () => get<VeloceShipment[]>('/shipments'),
  transition: (id: string, status: string) =>
    post<VeloceShipment>(`/shipments/${id}/transition`, { status }),
}

// ── Plans ────────────────────────────────────────────────────────────────────

export const plansApi = {
  list: () => get<VelocePlan[]>('/plans'),
  create: (body: { name: string; date: string; profile: string; solve_duration?: string }) =>
    post<VelocePlan>('/plans', body),
  solve: (id: string) => post<unknown>(`/plans/${id}/solve`, {}),
  apply: (id: string) => post<unknown>(`/plans/${id}/apply`, {}),
}

// ── Auto-solve ───────────────────────────────────────────────────────────────

export const autoSolveApi = {
  get: () => get<VeloceAutoSolveConfig>('/auto-solve'),
  update: (body: Partial<VeloceAutoSolveConfig>) => patch<VeloceAutoSolveConfig>('/auto-solve', body),
  streamUrl: () => `${BASE}/auto-solve/stream`,
}
