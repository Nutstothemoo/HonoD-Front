import { VeloceRequest, VeloceResponse, VeloceVehicleResult, ResolvedRoute } from '@/types/veloce';
import { LiveDriver, DeliveryPoint } from '@/types/vrp';

const VELOCE_URL = process.env.VELOCE_URL ?? 'http://localhost:3001';

export async function callVeloce(payload: VeloceRequest): Promise<VeloceResponse> {
  const res = await fetch(`${VELOCE_URL}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Veloce ${res.status}: ${text}`);
  }

  return res.json();
}

export function buildVelocePayload(
  drivers: LiveDriver[],
  deliveries: DeliveryPoint[],
  today: Date = new Date(),
): VeloceRequest {
  const datePrefix = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const stops = deliveries
    .filter((d) => d.status === 'pending' || d.status === 'assigned' || d.status === 'at_risk')
    .map((d) => ({
      id: d.id,
      location: { lon: d.location[0], lat: d.location[1] },
      start_time_window: [
        `${datePrefix}T${d.timeWindowStart}:00Z`,
        `${datePrefix}T${d.timeWindowEnd}:00Z`,
      ] as [string, string],
      duration: 180,
    }));

  const vehicles = drivers
    .filter((d) => d.status !== 'idle')
    .map((d) => ({
      id: d.id,
      start_location: { lon: d.position.lng, lat: d.position.lat },
      end_location: { lon: d.position.lng, lat: d.position.lat },
      start_time: `${datePrefix}T07:00:00Z`,
      end_time: `${datePrefix}T19:00:00Z`,
      capacity: d.maxLoad,
      speed: 10, // ~36 km/h
    }));

  return { stops, vehicles, options: { profile: 'car', solve_duration: '5s' } };
}

// Transform Veloce vehicle result → ResolvedRoute for UI
export function toResolvedRoute(
  vehicleResult: VeloceVehicleResult,
  deliveries: DeliveryPoint[],
  completedStopIds: Set<string>,
): ResolvedRoute {
  const deliveryMap = new Map(deliveries.map((d) => [d.id, d]));

  const stops = vehicleResult.route
    .filter((step) => !step.stop.id.includes('-start') && !step.stop.id.includes('-end'))
    .map((step) => {
      const del = deliveryMap.get(step.stop.id);
      return {
        stopId: step.stop.id,
        address: del?.address ?? step.stop.id,
        location: step.stop.location,
        arrivalTime: step.arrival_time,
        startTime: step.start_time,
        endTime: step.end_time,
        isCompleted: completedStopIds.has(step.stop.id),
      };
    });

  const nextStopIndex = stops.findIndex((s) => !s.isCompleted);

  return {
    vehicleId: vehicleResult.id,
    stops,
    totalDistanceMeters: vehicleResult.route_travel_distance,
    totalDurationSeconds: vehicleResult.route_travel_duration,
    nextStopIndex: nextStopIndex >= 0 ? nextStopIndex : stops.length,
  };
}

// Apply Veloce solution to driver/delivery state
export function applyVeloceSolution(
  response: VeloceResponse,
  drivers: LiveDriver[],
  deliveries: DeliveryPoint[],
): { updatedDrivers: LiveDriver[]; updatedDeliveries: DeliveryPoint[] } {
  if (!response.solutions?.length) return { updatedDrivers: drivers, updatedDeliveries: deliveries };

  const solution = response.solutions[0];
  const assignedStopIds = new Set<string>();

  const updatedDrivers = drivers.map((driver) => {
    const vehicleResult = solution.vehicles.find((v) => v.id === driver.id);
    if (!vehicleResult) return driver;

    const activeSteps = vehicleResult.route.filter(
      (s) => !s.stop.id.includes('-start') && !s.stop.id.includes('-end'),
    );

    activeSteps.forEach((s) => assignedStopIds.add(s.stop.id));

    const completedIds = new Set(
      deliveries.filter((d) => d.status === 'done').map((d) => d.id),
    );
    const nextStep = activeSteps.find((s) => !completedIds.has(s.stop.id));

    const routeCoords = vehicleResult.route.map(
      (s) => [s.stop.location.lon, s.stop.location.lat] as [number, number],
    );

    const del = nextStep ? deliveries.find((d) => d.id === nextStep.stop.id) : null;

    return {
      ...driver,
      eta: nextStep?.arrival_time ?? null,
      nextStop: del?.address ?? null,
      completedStops: activeSteps.filter((s) => completedIds.has(s.stop.id)).length,
      totalStops: activeSteps.length,
      routeCoordinates: routeCoords,
    };
  });

  const updatedDeliveries = deliveries.map((d) => {
    if (d.status === 'done') return d;
    if (assignedStopIds.has(d.id)) return { ...d, status: 'assigned' as const };
    return { ...d, status: 'pending' as const };
  });

  return { updatedDrivers, updatedDeliveries };
}
