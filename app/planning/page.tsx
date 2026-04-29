'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import TopBar from '@/components/control-center/TopBar';
import { LiveDriver, DeliveryPoint } from '@/types/vrp';
import { VeloceResponse, VeloceVehicleResult, VeloceRequest } from '@/types/veloce';
import { buildVelocePayload, applyVeloceSolution } from '@/lib/solve-helpers';
import { solverApi } from '@/lib/veloce-api';
import { handleApiError } from '@/lib/api-error';
import { useKPI } from '@/hooks/useKPI';
import { useVeloceData } from '@/hooks/useVeloceData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VehicleConfig {
  driverId: string;
  startTime: string; // "HH:MM"
  endTime: string;
  capacity: number;
  enabled: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

const DRIVER_COLORS: Record<string, string> = {
  d1: '#3b82f6',
  d2: '#10b981',
  d3: '#ef4444',
  d4: '#f59e0b',
  d5: '#6b7280',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlanningTopBar({
  isOptimizing,
  onOptimize,
  hasResult,
}: {
  isOptimizing: boolean;
  onOptimize: () => void;
  hasResult: boolean;
}) {
  return (
    <header className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
      <Link href="/control-center" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← Carte
      </Link>
      <div className="w-px h-5 bg-zinc-800" />
      <span className="text-sm font-semibold text-zinc-200">Planning</span>
      <div className="flex-1" />
      {hasResult && (
        <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded px-2 py-0.5">
          Plan calculé
        </span>
      )}
      <button
        onClick={onOptimize}
        disabled={isOptimizing}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold px-4 py-1.5 rounded transition-colors flex items-center gap-1.5"
      >
        {isOptimizing ? (
          <>
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            Calcul…
          </>
        ) : (
          '⚡ Lancer l\'optimisation'
        )}
      </button>
    </header>
  );
}

function VehicleConfigRow({
  driver,
  config,
  onChange,
}: {
  driver: LiveDriver;
  config: VehicleConfig;
  onChange: (c: VehicleConfig) => void;
}) {
  const color = DRIVER_COLORS[driver.id] ?? '#6b7280';
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 ${!config.enabled ? 'opacity-40' : ''}`}
    >
      <button
        onClick={() => onChange({ ...config, enabled: !config.enabled })}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          config.enabled ? 'border-blue-500 bg-blue-500' : 'border-zinc-600 bg-transparent'
        }`}
      >
        {config.enabled && <span className="text-white text-xs leading-none">✓</span>}
      </button>

      <div
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ borderColor: color, backgroundColor: `${color}22` }}
      >
        {driver.name.charAt(0)}
      </div>
      <span className="text-sm text-zinc-300 w-28 truncate">{driver.name}</span>

      <div className="flex items-center gap-1 text-xs text-zinc-500">
        <input
          type="time"
          value={config.startTime}
          onChange={(e) => onChange({ ...config, startTime: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-xs"
        />
        <span>→</span>
        <input
          type="time"
          value={config.endTime}
          onChange={(e) => onChange({ ...config, endTime: e.target.value })}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-xs"
        />
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-xs text-zinc-500">Cap.</span>
        <input
          type="number"
          value={config.capacity}
          min={1}
          max={999}
          onChange={(e) => onChange({ ...config, capacity: Number(e.target.value) })}
          className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-xs text-center"
        />
      </div>
    </div>
  );
}

function StopRow({ delivery }: { delivery: DeliveryPoint }) {
  const statusColors: Record<DeliveryPoint['status'], string> = {
    pending:     'bg-zinc-700 text-zinc-400',
    preassigned: 'bg-violet-500/20 text-violet-300',
    assigned:    'bg-blue-500/20 text-blue-400',
    done:        'bg-green-500/20 text-green-400',
    at_risk:     'bg-red-500/20 text-red-400',
  };
  const statusLabels: Record<DeliveryPoint['status'], string> = {
    pending:     'En attente',
    preassigned: 'Préattribuée',
    assigned:    'Assigné',
    done:        'Livré',
    at_risk:     'Risque',
  };
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/40 hover:bg-zinc-900/40 transition-colors">
      <div
        className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{
          backgroundColor: DRIVER_COLORS[delivery.driverId ?? ''] ?? '#52525b',
        }}
      >
        {delivery.label}
      </div>
      <span className="text-sm text-zinc-300 flex-1 truncate">{delivery.address}</span>
      <span className="text-xs text-zinc-500 shrink-0">{delivery.timeWindowStart}–{delivery.timeWindowEnd}</span>
      <span
        className={`text-xs px-2 py-0.5 rounded shrink-0 ${statusColors[delivery.status]}`}
      >
        {statusLabels[delivery.status]}
      </span>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function RouteTimeline({
  vehicle,
  driverName,
  color,
}: {
  vehicle: VeloceVehicleResult;
  driverName: string;
  color: string;
}) {
  const steps = vehicle.route.filter(
    (s) => !s.stop.id.includes('-start') && !s.stop.id.includes('-end'),
  );

  if (steps.length === 0) return null;

  // Compute timeline bar positions (start = first step arrival, end = last step end)
  const firstArrival = new Date(vehicle.route[0].arrival_time).getTime();
  const lastEnd = new Date(vehicle.route[vehicle.route.length - 1].end_time).getTime();
  const totalSpan = lastEnd - firstArrival || 1;

  return (
    <div className="px-5 py-4 border-b border-zinc-800">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ borderColor: color, backgroundColor: `${color}22` }}
        >
          {driverName.charAt(0)}
        </div>
        <span className="text-sm font-medium text-zinc-300">{driverName}</span>
        <span className="text-xs text-zinc-500 ml-auto">
          {steps.length} arrêts · {formatDistance(vehicle.route_travel_distance)} · {formatDuration(vehicle.route_travel_duration)}
        </span>
      </div>

      {/* Timeline bar */}
      <div className="relative h-8 bg-zinc-900 rounded-lg overflow-hidden mb-3">
        {steps.map((step) => {
          const start = new Date(step.arrival_time).getTime();
          const end = new Date(step.end_time).getTime();
          const left = ((start - firstArrival) / totalSpan) * 100;
          const width = Math.max(((end - start) / totalSpan) * 100, 1.5);
          return (
            <div
              key={step.stop.id}
              className="absolute top-1 bottom-1 rounded"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: color,
                opacity: 0.8,
              }}
              title={`${step.stop.id} — ${formatTime(step.arrival_time)} → ${formatTime(step.end_time)}`}
            />
          );
        })}
      </div>

      {/* Stop list */}
      <div className="space-y-1">
        {steps.map((step, idx) => (
          <div key={step.stop.id} className="flex items-center gap-2 text-xs text-zinc-500">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: color }}
            >
              {idx + 1}
            </span>
            <span className="text-zinc-400 truncate flex-1">{step.stop.id}</span>
            <span className="shrink-0">{formatTime(step.arrival_time)}</span>
            {step.waiting_duration ? (
              <span className="text-yellow-600 shrink-0">+{formatDuration(step.waiting_duration)} att.</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const { drivers: liveDrivers, deliveries: liveDeliveries } = useVeloceData();
  const [solution, setSolution] = useState<VeloceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vehicleConfigOverrides, setVehicleConfigOverrides] = useState<Record<string, Partial<VehicleConfig>>>({});
  // Post-simulate overlay on deliveries (status change) — local only.
  const [deliveryStatusOverlay, setDeliveryStatusOverlay] = useState<Record<string, DeliveryPoint['status']>>({});

  const drivers = liveDrivers;

  // Compose deliveries = live data + simulated overlay.
  const deliveries = useMemo<DeliveryPoint[]>(
    () => liveDeliveries.map((d) =>
      deliveryStatusOverlay[d.id] ? { ...d, status: deliveryStatusOverlay[d.id] } : d,
    ),
    [liveDeliveries, deliveryStatusOverlay],
  );

  // Vehicle configs derived from drivers + user overrides.
  const vehicleConfigs = useMemo<VehicleConfig[]>(
    () => drivers.map((d) => ({
      driverId: d.id,
      startTime: vehicleConfigOverrides[d.id]?.startTime ?? '07:00',
      endTime: vehicleConfigOverrides[d.id]?.endTime ?? '19:00',
      capacity: vehicleConfigOverrides[d.id]?.capacity ?? d.maxLoad,
      enabled: vehicleConfigOverrides[d.id]?.enabled ?? (d.status === 'on_route' || d.status === 'idle'),
    })),
    [drivers, vehicleConfigOverrides],
  );

  const kpi = useKPI(drivers, deliveries, solution);

  const updateVehicleConfig = useCallback((driverId: string, config: VehicleConfig) => {
    setVehicleConfigOverrides((prev) => ({ ...prev, [driverId]: config }));
  }, []);

  const solveMutation = useMutation<VeloceResponse, Error, VeloceRequest>({
    mutationFn: (payload) => solverApi.solve(payload),
    onMutate: () => setError(null),
    onSuccess: (data) => {
      setSolution(data);
      const { updatedDeliveries } = applyVeloceSolution(data, drivers, deliveries);
      const overlay: Record<string, DeliveryPoint['status']> = {};
      for (const d of updatedDeliveries) overlay[d.id] = d.status;
      setDeliveryStatusOverlay(overlay);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      setError(message);
      handleApiError(e, 'Simulation d\'optimisation');
    },
  });

  const handleOptimize = useCallback(() => {
    const activeDrivers = drivers.filter((d) =>
      vehicleConfigs.find((c) => c.driverId === d.id && c.enabled),
    );
    const activeDeliveries = deliveries.filter((d) => d.status !== 'done');

    const configMap = new Map(vehicleConfigs.map((c) => [c.driverId, c]));
    const today = new Date(planDate);
    const payload = buildVelocePayload(activeDrivers, activeDeliveries, today);

    payload.vehicles = activeDrivers.map((d) => {
      const cfg = configMap.get(d.id)!;
      return {
        id: d.id,
        start_location: { lon: d.position.lng, lat: d.position.lat },
        end_location: { lon: d.position.lng, lat: d.position.lat },
        start_time: `${planDate}T${cfg.startTime}:00Z`,
        end_time: `${planDate}T${cfg.endTime}:00Z`,
        capacity: cfg.capacity,
        speed: 10,
      };
    });

    if (!payload.stops.length || !payload.vehicles.length) {
      setError('Aucun arret ou vehicule a planifier.');
      return;
    }

    solveMutation.mutate(payload);
  }, [drivers, deliveries, vehicleConfigs, planDate, solveMutation]);

  const isOptimizing = solveMutation.isPending;

  const unassignedCount = solution
    ? solution.solutions?.[0]?.unplanned?.length ?? 0
    : 0;

  return (
    <div className="flex flex-col h-screen">
      <TopBar isOptimizing={isOptimizing} onOptimize={handleOptimize} />

      {!!solution && (
        <div className="border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-[11px] text-emerald-300">
          ✓ Plan calculé — {unassignedCount} non planifiée{unassignedCount > 1 ? 's' : ''}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Left panel: config */}
        <div className="w-80 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
          {/* Date */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <label className="text-xs text-zinc-500 block mb-1">Date de planification</label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 text-sm"
            />
          </div>

          {/* Vehicle configs */}
          <div className="px-4 py-2 border-b border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400">Véhicules</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {drivers.map((driver) => {
              const config = vehicleConfigs.find((c) => c.driverId === driver.id)!;
              if (!config) return null;
              return (
                <VehicleConfigRow
                  key={driver.id}
                  driver={driver}
                  config={config}
                  onChange={(c) => updateVehicleConfig(driver.id, c)}
                />
              );
            })}
          </div>

          {/* KPI summary */}
          <div className="border-t border-zinc-800 p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Remplissage', value: `${kpi.fillRate}%` },
              { label: 'Distance', value: `${kpi.totalDistance} km` },
              { label: 'Coût/livraison', value: `${kpi.costPerDelivery.toFixed(2)}€` },
              { label: 'Ponctualité', value: `${kpi.onTimeRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 rounded p-2">
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="text-sm font-bold text-zinc-200">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: stops + timeline */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {error && (
            <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-xs text-red-400 flex items-center gap-2">
              <span>⚠ {error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-500">✕</button>
            </div>
          )}

          {solution ? (
            <>
              <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-400">
                  Résultat — {solution.solutions?.[0]?.vehicles?.length ?? 0} tournées
                </span>
                {unassignedCount > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded px-2 py-0.5">
                    {unassignedCount} non-assigné{unassignedCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {solution.solutions?.[0]?.vehicles?.map((vehicle) => {
                  const driver = drivers.find((d) => d.id === vehicle.id);
                  return (
                    <RouteTimeline
                      key={vehicle.id}
                      vehicle={vehicle}
                      driverName={driver?.name ?? vehicle.id}
                      color={DRIVER_COLORS[vehicle.id] ?? '#6b7280'}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400">
                  Arrêts à planifier — {deliveries.filter((d) => d.status !== 'done').length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {deliveries.map((d) => (
                  <StopRow key={d.id} delivery={d} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
