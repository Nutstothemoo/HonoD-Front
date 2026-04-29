import type { VeloceDriver, VeloceShipment } from './veloce-api'
import type { LiveDriver, DeliveryPoint } from '@/types/vrp'
import { driverStatusToUi, shipmentStatusToUi } from './status'

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

const DEFAULT_POSITION = { lng: 2.3522, lat: 48.8566, heading: 0 }

export function driversToLive(drivers: VeloceDriver[]): LiveDriver[] {
  const ids = drivers.map((d) => d.id)
  return drivers.map((d) => ({
    id: d.id,
    name: `${d.first_name} ${d.last_name}`.trim() || d.code,
    status: driverStatusToUi(d.status),
    vehicleType: d.vehicle_type,
    position: d.position
      ? { lng: d.position.lng, lat: d.position.lat, heading: d.position.heading }
      : DEFAULT_POSITION,
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
    pickupLocation: [s.pickup_lng, s.pickup_lat] as [number, number],
    pickupAddress: s.pickup_address,
    status: shipmentStatusToUi(s.status),
    driverId: s.driver_id ?? null,
    timeWindowStart: fmtHHmm(s.dropoff_window_start),
    timeWindowEnd: fmtHHmm(s.dropoff_window_end),
    address: s.dropoff_address,
  }))
}
