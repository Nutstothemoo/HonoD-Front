'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TopBar from '@/components/control-center/TopBar';
import DriverSidebar from '@/components/control-center/DriverSidebar';
import MissionPanel from '@/components/control-center/MissionPanel';
import AlertBanner from '@/components/control-center/AlertBanner';
import AssignmentModal, { ModalState } from '@/components/control-center/AssignmentModal';
import { DeliveryPoint, LiveDriver } from '@/types/vrp';
import { useVeloceData } from '@/hooks/useVeloceData';
import { useKPI } from '@/hooks/useKPI';
import { buildVelocePayload, applyVeloceSolution } from '@/lib/veloce';
import { VeloceResponse } from '@/types/veloce';
import { shipmentsApi } from '@/lib/veloce-api';

const MapView = dynamic(() => import('@/components/control-center/MapView'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs text-zinc-600">Chargement de la carte…</span>
      </div>
    </div>
  ),
});

const DELIVERY_STATUS_TO_API: Record<DeliveryPoint['status'], string> = {
  pending: 'to_assign', assigned: 'assigned', done: 'delivered', at_risk: 'failed',
};

export default function ControlCenterPage() {
  const { drivers: liveDrivers, deliveries: liveDeliveries, loading } = useVeloceData();

  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryPoint[]>([]);
  const [focusDriverId, setFocusDriverId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [lastSolution, setLastSolution] = useState<VeloceResponse | null>(null);
  const [assignModal, setAssignModal] = useState<ModalState>(null);
  const [visibleDriverIds, setVisibleDriverIds] = useState<string[] | undefined>(undefined);
  const [visibleDeliveryIds, setVisibleDeliveryIds] = useState<string[] | undefined>(undefined);
  const [driverPanelOpen, setDriverPanelOpen] = useState(true);
  const [missionPanelOpen, setMissionPanelOpen] = useState(false);
  const rerouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optimizingRef = useRef(false);

  // Sync live positions (preserve route overlays after optimization)
  useEffect(() => {
    if (liveDrivers.length === 0) return;
    if (optimizingRef.current) return;
    setDrivers((prev) => {
      if (prev.length === 0) return liveDrivers;
      return liveDrivers.map((live) => {
        const existing = prev.find((d) => d.id === live.id);
        if (!existing) return live;
        return { ...existing, position: live.position, status: live.status };
      });
    });
  }, [liveDrivers]);

  useEffect(() => {
    if (liveDeliveries.length === 0) return;
    if (optimizingRef.current) return;
    setDeliveries((prev) => {
      if (prev.length === 0) return liveDeliveries;

      const previousById = new Map(prev.map((delivery) => [delivery.id, delivery]));

      return liveDeliveries.map((liveDelivery) => {
        const existing = previousById.get(liveDelivery.id);
        if (!existing) return liveDelivery;

        return {
          ...existing,
          address: liveDelivery.address,
          location: liveDelivery.location,
          pickupAddress: liveDelivery.pickupAddress,
          pickupLocation: liveDelivery.pickupLocation,
          timeWindowStart: liveDelivery.timeWindowStart,
          timeWindowEnd: liveDelivery.timeWindowEnd,
          driverId: liveDelivery.driverId,
          status: liveDelivery.status,
          demand: liveDelivery.demand,
          serviceMinutes: liveDelivery.serviceMinutes,
          label: liveDelivery.label,
        };
      });
    });
  }, [liveDeliveries]);

  const kpi = useKPI(drivers, deliveries, lastSolution);
  const atRiskDeliveries = deliveries.filter((d) => d.status === 'at_risk');

  const handleDriverClick = useCallback((id: string) => {
    setFocusDriverId((prev) => (prev === id ? null : id));
  }, []);

  const handleDriverAssign = useCallback((driverId: string) => {
    setAssignModal({ type: 'driver', id: driverId });
  }, []);

  const handleDeliveryClick = useCallback((delivery: DeliveryPoint) => {
    setAssignModal({ type: 'delivery', id: delivery.id });
  }, []);

  const handleAssign = useCallback((deliveryId: string, driverId: string | null) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? { ...d, driverId, status: driverId ? 'assigned' : 'pending' }
          : d,
      ),
    );
    shipmentsApi.assign(deliveryId, driverId).catch(() => {});
  }, []);

  const handleStatusChange = useCallback((deliveryId: string, status: DeliveryPoint['status']) => {
    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? { ...d, status } : d)));
    shipmentsApi.transition(deliveryId, DELIVERY_STATUS_TO_API[status]).catch(() => {});
  }, []);

  const handleVisibleDriversChange = useCallback((ids: string[]) => {
    // undefined = all visible, array = filtered
    setVisibleDriverIds(ids.length === drivers.length ? undefined : ids);
  }, [drivers.length]);

  const handleVisibleDeliveriesChange = useCallback((ids: string[]) => {
    setVisibleDeliveryIds(ids.length === deliveries.length ? undefined : ids);
  }, [deliveries.length]);

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

      {/* Map container — fills remaining space, panels overlay on top */}
      <div className="flex-1 relative min-h-0 overflow-hidden">

        {/* Map — full size base layer */}
        <MapView
          drivers={drivers}
          deliveries={deliveries}
          focusDriverId={focusDriverId}
          visibleDriverIds={visibleDriverIds}
          visibleDeliveryIds={visibleDeliveryIds}
          onDriverClick={(driverId) => {
            setFocusDriverId(driverId);
            setAssignModal({ type: 'driver', id: driverId });
          }}
          onDeliveryClick={handleDeliveryClick}
        />

        {/* Driver panel — glass overlay, left edge */}
        <div className="absolute inset-y-0 left-0 z-10 pointer-events-none">
          {driverPanelOpen ? (
            <div className="h-full pointer-events-auto">
              <DriverSidebar
                drivers={drivers}
                deliveries={deliveries}
                focusDriverId={focusDriverId}
                onDriverClick={handleDriverClick}
                onDriverAssign={handleDriverAssign}
                onDeliveryClick={handleDeliveryClick}
                onVisibleDriversChange={handleVisibleDriversChange}
                onClose={() => { setDriverPanelOpen(false); setVisibleDriverIds(undefined); }}
              />
            </div>
          ) : (
            <button
              onClick={() => setDriverPanelOpen(true)}
              className="pointer-events-auto mt-3 ml-3 bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/60 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-2 rounded-xl flex items-center gap-2 transition-all hover:bg-zinc-800/90 shadow-lg"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H3v-4l2.5-6h13l2.5 6v4h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M7 11h10"/>
              </svg>
              Chauffeurs
              {drivers.length > 0 && (
                <span className="bg-zinc-700/80 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {drivers.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Mission panel — glass overlay, right edge */}
        <div className="absolute inset-y-0 right-0 z-10 pointer-events-none">
          {missionPanelOpen ? (
            <div className="h-full pointer-events-auto">
              <MissionPanel
                deliveries={deliveries}
                drivers={drivers}
                onDeliveryClick={handleDeliveryClick}
                onVisibleDeliveriesChange={handleVisibleDeliveriesChange}
                onClose={() => { setMissionPanelOpen(false); setVisibleDeliveryIds(undefined); }}
              />
            </div>
          ) : (
            /* Toggle button when panel is closed */
            <button
              onClick={() => setMissionPanelOpen(true)}
              className="pointer-events-auto mt-3 mr-3 bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/60 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-2 rounded-xl flex items-center gap-2 transition-all hover:bg-zinc-800/90 shadow-lg"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
              </svg>
              Missions
              {atRiskDeliveries.length > 0 && (
                <span className="bg-red-500/80 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {atRiskDeliveries.length}
                </span>
              )}
            </button>
          )}
        </div>

        <AlertBanner
          atRiskDeliveries={atRiskDeliveries}
          pendingAlert={null}
          onReroute={handleReroute}
          onDismissAlert={() => {}}
        />
      </div>

      {/* Assignment modal */}
      <AssignmentModal
        state={assignModal}
        drivers={drivers}
        deliveries={deliveries}
        onAssign={handleAssign}
        onStatusChange={handleStatusChange}
        onClose={() => setAssignModal(null)}
      />
    </div>
  );
}
