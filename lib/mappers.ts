import type { VeloceDriver, VeloceShipment } from './veloce-api'
import type { LiveDriver, DeliveryPoint } from '@/types/vrp'

const ROUTE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
]

function colorForDriver(id: string, allIds: string[]): string {
  const idx = allIds.indexOf(id)
  return ROUTE_COLORS[idx % ROUTE_COLORS.length]
}

function fmtHHmm(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

export function driversToLive(drivers: VeloceDriver[]): LiveDriver[] {
  const ids = drivers.map((d) => d.id)
  return drivers.map((d) => ({
    id: d.id,
    name: `${d.first_name} ${d.last_name}`,
    status: d.status === 'on_duty' ? 'on_route' : 'idle' as const,
    position: {
      lng: d.position.lng,
      lat: d.position.lat,
      heading: d.position.heading,
    },
    currentLoad: 0,
    maxLoad: d.capacity,
    eta: null,
    nextStop: null,
    completedStops: 0,
    totalStops: 0,
    routeColor: colorForDriver(d.id, ids),
    routeCoordinates: [],
  }))
}

export function shipmentsToDeliveries(shipments: VeloceShipment[]): DeliveryPoint[] {
  return shipments.map((s) => ({
    id: s.id,
    label: s.reference,
    location: [s.dropoff_lng, s.dropoff_lat] as [number, number],
    status:
      s.status === 'delivered' ? 'done'
      : s.status === 'in_progress' ? 'assigned'
      : s.status === 'assigned' ? 'assigned'
      : s.status === 'failed' ? 'at_risk'
      : 'pending',
    driverId: s.driver_id,
    timeWindowStart: fmtHHmm(s.dropoff_window_start),
    timeWindowEnd: fmtHHmm(s.dropoff_window_end),
    address: s.dropoff_address,
  }))
}
