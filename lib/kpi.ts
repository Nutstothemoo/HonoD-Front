import { LiveDriver, DeliveryPoint, KPIData } from '@/types/vrp';
import { VeloceResponse } from '@/types/veloce';

// Cost per delivery in euros (configurable)
const COST_PER_KM = 0.4;
const AVG_COST_FIXED_PER_DRIVER = 80; // €/day fixed

export function computeKPI(
  drivers: LiveDriver[],
  deliveries: DeliveryPoint[],
  lastSolution?: VeloceResponse | null,
): KPIData {
  const totalCount = deliveries.length;
  const completedCount = deliveries.filter((d) => d.status === 'done').length;
  const atRiskCount = deliveries.filter((d) => d.status === 'at_risk').length;

  // Fill rate: average load across active drivers
  const activeDrivers = drivers.filter((d) => d.status !== 'idle');
  const fillRate =
    activeDrivers.length > 0
      ? Math.round(
          (activeDrivers.reduce((acc, d) => acc + (d.maxLoad > 0 ? d.currentLoad / d.maxLoad : 0), 0) /
            activeDrivers.length) *
            100,
        )
      : 0;

  // Total distance from last Veloce solution (meters → km)
  let totalDistanceKm = 0;
  if (lastSolution?.solutions?.[0]) {
    const totalMeters = lastSolution.solutions[0].vehicles.reduce(
      (acc, v) => acc + (v.route_travel_distance ?? 0),
      0,
    );
    totalDistanceKm = Math.round(totalMeters / 100) / 10; // 1 decimal
  } else {
    // Fallback: estimate from driver route coordinates
    totalDistanceKm = drivers.reduce((acc, d) => {
      const coords = d.routeCoordinates;
      let dist = 0;
      for (let i = 1; i < coords.length; i++) {
        dist += haversineKm(coords[i - 1], coords[i]);
      }
      return acc + dist;
    }, 0);
    totalDistanceKm = Math.round(totalDistanceKm * 10) / 10;
  }

  // Cost per delivery
  const totalCost =
    totalDistanceKm * COST_PER_KM + activeDrivers.length * AVG_COST_FIXED_PER_DRIVER;
  const costPerDelivery =
    completedCount > 0 ? Math.round((totalCost / completedCount) * 100) / 100 : 0;

  // On-time rate: delivered stops that arrived before deadline
  // We approximate from solution data; for now use a heuristic
  const onTimeRate =
    totalCount > 0
      ? Math.round(((totalCount - atRiskCount) / totalCount) * 100)
      : 100;

  return {
    fillRate,
    totalDistance: totalDistanceKm,
    costPerDelivery,
    onTimeRate,
    atRiskCount,
    completedCount,
    totalCount,
  };
}

// Haversine distance in km between two [lng, lat] points
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = deg2rad(b[1] - a[1]);
  const dLon = deg2rad(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c =
    sinLat * sinLat +
    Math.cos(deg2rad(a[1])) * Math.cos(deg2rad(b[1])) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function deg2rad(deg: number) {
  return (deg * Math.PI) / 180;
}
