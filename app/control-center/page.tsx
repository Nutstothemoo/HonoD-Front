'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { springs } from '@/components/atoms/motion';
import TopBar from '@/components/control-center/TopBar';
import DriverSidebar from '@/components/control-center/DriverSidebar';
import MissionPanel from '@/components/control-center/MissionPanel';
import LayerToggle, { ShortcutItem } from '@/components/control-center/LayerToggle';
import AlertBanner from '@/components/control-center/AlertBanner';
import AssignmentModal, { ModalState } from '@/components/control-center/AssignmentModal';
import { DeliveryPoint, LiveDriver } from '@/types/vrp';
import { useVeloceData } from '@/hooks/useVeloceData';
import { useKPI } from '@/hooks/useKPI';
import { useShipmentMutations } from '@/hooks/useShipmentMutations';
import { applyVeloceSolution } from '@/lib/solve-helpers';
import { VeloceResponse } from '@/types/veloce';
import { plansApi } from '@/lib/veloce-api';
import { uiStatusToShipmentTarget } from '@/lib/status';
import { handleApiError } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { useMapConfig } from '@/lib/map-config-context';

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

// Overlay derived from the last Veloce solution — purely client-side, lives on top of live data.
type DriverRouteOverlay = {
  eta: string | null;
  nextStop: string | null;
  completedStops: number;
  totalStops: number;
  routeCoordinates: [number, number][];
};

export default function ControlCenterPage() {
  const queryClient = useQueryClient();
  const { drivers: liveDrivers, deliveries: liveDeliveries } = useVeloceData();
  const mutations = useShipmentMutations();
  const { applied: mapConfig } = useMapConfig();

  const [overlays, setOverlays] = useState<Record<string, DriverRouteOverlay>>({});
  const [flyToDriver, setFlyToDriver] = useState<{ driverId: string; token: number } | null>(null);
  const [assignmentBurst, setAssignmentBurst] = useState<{ kind: 'assign' | 'unassign'; driverId: string; deliveryId: string; token: number } | null>(null);
  const [lastSolution, setLastSolution] = useState<VeloceResponse | null>(null);
  const [assignModal, setAssignModal] = useState<ModalState>(null);
  const [visibleDriverIds, setVisibleDriverIds] = useState<string[] | undefined>(undefined);
  const [visibleDeliveryIds, setVisibleDeliveryIds] = useState<string[] | undefined>(undefined);
  const [driversLayerVisible, setDriversLayerVisible] = useState(true);
  const [deliveriesLayerVisible, setDeliveriesLayerVisible] = useState(true);
  const [driverPanelOpen, setDriverPanelOpen] = useState(true);
  const [missionPanelOpen, setMissionPanelOpen] = useState(false);
  // Quick-assign mode: click a driver pin → next mission click attributes to that driver.
  const [pinnedDriverId, setPinnedDriverId] = useState<string | null>(null);
  const rerouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drivers exposed to the UI = live driver merged with any route overlay from last optimisation.
  const drivers = useMemo<LiveDriver[]>(
    () => liveDrivers.map((d) => {
      const overlay = overlays[d.id];
      return overlay ? { ...d, ...overlay } : d;
    }),
    [liveDrivers, overlays],
  );

  const deliveries = liveDeliveries;

  const kpi = useKPI(drivers, deliveries, lastSolution);
  const atRiskDeliveries = deliveries.filter((d) => d.status === 'at_risk');

  // Sidebar driver click — fly the camera to the driver. The map pin click no longer flies.
  const handleDriverClick = useCallback((id: string) => {
    setFlyToDriver((prev) => ({ driverId: id, token: (prev?.token ?? 0) + 1 }));
  }, []);

  const handleDriverAssign = useCallback((driverId: string) => {
    setAssignModal({ type: 'driver', id: driverId });
  }, []);

  // Map left-click on a driver pin → toggle quick-assign mode (no camera focus, no modal).
  const handleDriverPinClick = useCallback((id: string) => {
    setPinnedDriverId((prev) => (prev === id ? null : id));
  }, []);

  // Map right-click on a driver pin → open the assignment modal.
  const handleDriverPinContextMenu = useCallback((id: string) => {
    setPinnedDriverId(null);
    setAssignModal({ type: 'driver', id });
  }, []);

  const handleDeliveryClick = useCallback((delivery: DeliveryPoint) => {
    if (pinnedDriverId) {
      // Trigger the celebration animation synchronously — it's optimistic and replays on success
      // regardless of how long the mutation takes. The token bumps so re-assigning re-plays.
      setAssignmentBurst({ kind: 'assign', driverId: pinnedDriverId, deliveryId: delivery.id, token: Date.now() });
      mutations.assign.mutate({ id: delivery.id, driverId: pinnedDriverId });
      setPinnedDriverId(null);
      return;
    }
    setAssignModal({ type: 'delivery', id: delivery.id });
  }, [pinnedDriverId, mutations]);

  const handleDeliveryDoubleClick = useCallback((delivery: DeliveryPoint) => {
    // delivery.driverId is still set at click time — capture it before the mutation flips it.
    if (delivery.driverId) {
      setAssignmentBurst({ kind: 'unassign', driverId: delivery.driverId, deliveryId: delivery.id, token: Date.now() });
      mutations.unassign.mutate(delivery.id);
    }
  }, [mutations]);

  const handleMapDismiss = useCallback(() => {
    setPinnedDriverId(null);
  }, []);

  // ESC clears the quick-assign pin.
  useEffect(() => {
    if (!pinnedDriverId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinnedDriverId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinnedDriverId]);

  const pinnedDriver = pinnedDriverId ? drivers.find((d) => d.id === pinnedDriverId) ?? null : null;

  const handleAssign = useCallback((deliveryId: string, driverId: string | null) => {
    if (driverId) {
      setAssignmentBurst({ kind: 'assign', driverId, deliveryId, token: Date.now() });
      mutations.assign.mutate({ id: deliveryId, driverId });
    } else {
      const previousDriverId = deliveries.find((d) => d.id === deliveryId)?.driverId ?? null;
      if (previousDriverId) {
        setAssignmentBurst({ kind: 'unassign', driverId: previousDriverId, deliveryId, token: Date.now() });
      }
      mutations.unassign.mutate(deliveryId);
    }
  }, [mutations, deliveries]);

  const handleStatusChange = useCallback((deliveryId: string, status: DeliveryPoint['status']) => {
    mutations.transition.mutate({ id: deliveryId, status: uiStatusToShipmentTarget(status) });
  }, [mutations]);

  const handleBulkAssign = useCallback((deliveryIds: string[], driverId: string) => {
    if (deliveryIds.length === 0) return;
    mutations.bulkAssign.mutate({ ids: deliveryIds, driverId });
  }, [mutations]);

  const handleBulkUnassign = useCallback((deliveryIds: string[]) => {
    if (deliveryIds.length === 0) return;
    mutations.bulkUnassign.mutate(deliveryIds);
  }, [mutations]);

  const handleVisibleDriversChange = useCallback((ids: string[]) => {
    setVisibleDriverIds(ids.length === drivers.length ? undefined : ids);
  }, [drivers.length]);

  const handleVisibleDeliveriesChange = useCallback((ids: string[]) => {
    setVisibleDeliveryIds(ids.length === deliveries.length ? undefined : ids);
  }, [deliveries.length]);

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const date = new Date().toISOString().slice(0, 10);
      const plan = await plansApi.create({ date, profile: 'car', solve_duration: '5s' });
      const solved = await plansApi.solve(plan.id);
      if (solved.status === 'failed' || !solved.solution) {
        throw new Error(solved.error ?? 'Aucune solution renvoyee par le solveur');
      }
      await plansApi.apply(plan.id);
      return solved.solution;
    },
    onSuccess: (solution) => {
      setLastSolution(solution);
      // Extract per-driver route overlay from the Nextroute solution.
      const { updatedDrivers } = applyVeloceSolution(solution, drivers, deliveries);
      const next: Record<string, DriverRouteOverlay> = {};
      for (const d of updatedDrivers) {
        next[d.id] = {
          eta: d.eta,
          nextStop: d.nextStop,
          completedStops: d.completedStops,
          totalStops: d.totalStops,
          routeCoordinates: d.routeCoordinates,
        };
      }
      setOverlays(next);
      // Force immediate refresh so shipments statuses reflect the /apply.
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments() });
    },
    // Retry is wired in `handleOptimize` below — keeps TS happy (no self-reference).
    onError: (err) => handleApiError(err, 'Optimisation'),
  });

  const handleOptimize = useCallback(() => {
    optimizeMutation.mutate();
  }, [optimizeMutation]);

  const handleReroute = useCallback(() => {
    if (rerouteTimerRef.current) clearTimeout(rerouteTimerRef.current);
    rerouteTimerRef.current = setTimeout(() => handleOptimize(), 45_000);
    handleOptimize();
  }, [handleOptimize]);

  return (
    <div className="flex flex-col h-full w-full">
      <TopBar kpi={kpi} isOptimizing={optimizeMutation.isPending} onOptimize={handleOptimize} />

      {/* Map container */}
      <div className="flex-1 relative min-h-0 overflow-hidden">

        <MapView
          drivers={drivers}
          deliveries={deliveries}
          flyToDriver={flyToDriver}
          driversLayerVisible={driversLayerVisible}
          deliveriesLayerVisible={deliveriesLayerVisible}
          visibleDriverIds={visibleDriverIds}
          visibleDeliveryIds={visibleDeliveryIds}
          pinnedDriverId={pinnedDriverId}
          assignmentBurst={assignmentBurst}
          mapConfig={mapConfig}
          onDriverClick={handleDriverPinClick}
          onDriverContextMenu={handleDriverPinContextMenu}
          onDeliveryClick={handleDeliveryClick}
          onDeliveryDoubleClick={handleDeliveryDoubleClick}
          onMapClick={handleMapDismiss}
        />

        {/* Driver panel — slides from the left, cross-fades with the collapsed pill button */}
        <div className="absolute inset-y-0 left-0 z-10 pointer-events-none">
          <AnimatePresence mode="wait" initial={false}>
            {driverPanelOpen ? (
              <motion.div
                key="driver-panel"
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={springs.default}
                className="h-full pointer-events-auto"
              >
                <DriverSidebar
                  drivers={drivers}
                  deliveries={deliveries}
                  onDriverClick={handleDriverClick}
                  onDriverAssign={handleDriverAssign}
                  onDeliveryClick={handleDeliveryClick}
                  onVisibleDriversChange={handleVisibleDriversChange}
                  onClose={() => setDriverPanelOpen(false)}
                />
              </motion.div>
            ) : (
              <motion.button
                key="driver-button"
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -16, opacity: 0 }}
                transition={springs.snappy}
                onClick={() => setDriverPanelOpen(true)}
                className="pointer-events-auto mt-3 ml-3 bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/60 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-2 rounded-xl flex items-center gap-2 transition-colors hover:bg-zinc-800/90 shadow-lg"
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
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Mission panel — symmetrical of the driver panel, slides from the right */}
        <div className="absolute inset-y-0 right-0 z-10 pointer-events-none">
          <AnimatePresence mode="wait" initial={false}>
            {missionPanelOpen ? (
              <motion.div
                key="mission-panel"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={springs.default}
                className="h-full pointer-events-auto"
              >
                <MissionPanel
                  deliveries={deliveries}
                  drivers={drivers}
                  onDeliveryClick={handleDeliveryClick}
                  onVisibleDeliveriesChange={handleVisibleDeliveriesChange}
                  onBulkAssign={handleBulkAssign}
                  onBulkUnassign={handleBulkUnassign}
                  onClose={() => setMissionPanelOpen(false)}
                />
              </motion.div>
            ) : (
              <motion.button
                key="mission-button"
                initial={{ x: 16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 16, opacity: 0 }}
                transition={springs.snappy}
                onClick={() => setMissionPanelOpen(true)}
                className="pointer-events-auto mt-3 mr-3 bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/60 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-2 rounded-xl flex items-center gap-2 transition-colors hover:bg-zinc-800/90 shadow-lg"
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
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <LayerToggle
          drivers={{
            visible: driversLayerVisible,
            shown: visibleDriverIds?.length ?? drivers.length,
            total: drivers.length,
          }}
          deliveries={{
            visible: deliveriesLayerVisible,
            shown: visibleDeliveryIds?.length ?? deliveries.length,
            total: deliveries.length,
          }}
          onToggleDrivers={() => setDriversLayerVisible((v) => !v)}
          onToggleDeliveries={() => setDeliveriesLayerVisible((v) => !v)}
        />

        <AlertBanner
          atRiskDeliveries={atRiskDeliveries}
          pendingAlert={null}
          onReroute={handleReroute}
          onDismissAlert={() => {}}
        />
      </div>

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
