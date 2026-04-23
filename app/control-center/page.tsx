'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TopBar from '@/components/control-center/TopBar';
import DriverSidebar from '@/components/control-center/DriverSidebar';
import AlertBanner from '@/components/control-center/AlertBanner';
import { DeliveryPoint, LiveDriver } from '@/types/vrp';
import { useVeloceData } from '@/hooks/useVeloceData';
import { useKPI } from '@/hooks/useKPI';
import { buildVelocePayload, applyVeloceSolution } from '@/lib/veloce';
import { VeloceResponse } from '@/types/veloce';

const MapView = dynamic(() => import('@/components/control-center/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs text-zinc-600">Chargement de la carte…</span>
      </div>
    </div>
  ),
});

export default function ControlCenterPage() {
  const { drivers: liveDrivers, deliveries: liveDeliveries, loading } = useVeloceData();

  // Local state — updated by live polling, overridable after optimization
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryPoint[]>([]);
  const [focusDriverId, setFocusDriverId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [lastSolution, setLastSolution] = useState<VeloceResponse | null>(null);
  const rerouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optimizingRef = useRef(false);

  // Sync live positions into local state (preserve route overlays after optimization)
  useEffect(() => {
    if (liveDrivers.length === 0) return;
    if (optimizingRef.current) return;
    setDrivers((prev) => {
      if (prev.length === 0) return liveDrivers;
      return liveDrivers.map((live) => {
        const existing = prev.find((d) => d.id === live.id);
        if (!existing) return live;
        return {
          ...existing,
          position: live.position,
          status: live.status,
        };
      });
    });
  }, [liveDrivers]);

  useEffect(() => {
    if (liveDeliveries.length === 0) return;
    if (optimizingRef.current) return;
    setDeliveries(liveDeliveries);
  }, [liveDeliveries]);

  const kpi = useKPI(drivers, deliveries, lastSolution);
  const atRiskDeliveries = deliveries.filter((d) => d.status === 'at_risk');

  const handleDriverClick = useCallback((id: string) => {
    setFocusDriverId((prev) => (prev === id ? null : id));
  }, []);

  const handleOptimize = useCallback(async () => {
    setIsOptimizing(true);
    optimizingRef.current = true;
    setOptimizeError(null);
    try {
      const payload = buildVelocePayload(drivers, deliveries);
      if (!payload.stops.length || !payload.vehicles.length) return;

      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Erreur inconnue');
      }

      const solution: VeloceResponse = await res.json();
      setLastSolution(solution);
      const { updatedDrivers, updatedDeliveries } = applyVeloceSolution(solution, drivers, deliveries);
      setDrivers(updatedDrivers);
      setDeliveries(updatedDeliveries);
    } catch (e: unknown) {
      setOptimizeError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsOptimizing(false);
      optimizingRef.current = false;
    }
  }, [drivers, deliveries]);

  const handleReroute = useCallback(() => {
    if (rerouteTimerRef.current) clearTimeout(rerouteTimerRef.current);
    rerouteTimerRef.current = setTimeout(() => handleOptimize(), 45_000);
    handleOptimize();
  }, [handleOptimize]);

  const handleDeliveryClick = useCallback((delivery: DeliveryPoint) => {
    if (delivery.driverId) setFocusDriverId(delivery.driverId);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs text-zinc-600 mt-3">Connexion à Veloce…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <TopBar kpi={kpi} isOptimizing={isOptimizing} onOptimize={handleOptimize} />

      {optimizeError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-1.5 text-xs text-red-400 flex items-center gap-2">
          <span>⚠ Erreur Veloce :</span>
          <span className="text-red-300">{optimizeError}</span>
          <button onClick={() => setOptimizeError(null)} className="ml-auto text-red-500 hover:text-red-300">✕</button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <DriverSidebar drivers={drivers} focusDriverId={focusDriverId} onDriverClick={handleDriverClick} />

        <div className="flex-1 relative">
          <MapView
            drivers={drivers}
            deliveries={deliveries}
            focusDriverId={focusDriverId}
            onDeliveryClick={handleDeliveryClick}
          />
          <AlertBanner
            atRiskDeliveries={atRiskDeliveries}
            pendingAlert={null}
            onReroute={handleReroute}
            onDismissAlert={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
