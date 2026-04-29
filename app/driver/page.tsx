'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { driversApi, shipmentsApi, type VeloceShipment } from '@/lib/veloce-api';
import { queryKeys } from '@/lib/query-keys';
import { useShipmentMutations } from '@/hooks/useShipmentMutations';
import { handleApiError } from '@/lib/api-error';

type GeoStatus = 'idle' | 'requesting' | 'active' | 'error';

const PUSH_INTERVAL_MS = 5000;
const SHIPMENTS_REFRESH_MS = 15000;
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

function formatETA(iso: string) {
  const date = new Date(iso);
  const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return 'Maintenant';
  if (diffMin < 60) return `Dans ${diffMin} min`;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function DriverPage() {
  const [driverId, setDriverId] = useState('');
  const [inputId, setInputId] = useState('');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [pushCount, setPushCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shipments assigned to this driver — empty array until login.
  const { data: shipmentsRaw = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: queryKeys.shipments({ driver_id: driverId }),
    queryFn: ({ signal }) => shipmentsApi.list({ driver_id: driverId }, { signal }),
    enabled: driverId.length > 0,
    refetchInterval: SHIPMENTS_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  // Sorted by dropoff window start, active-first.
  const shipments = useMemo<VeloceShipment[]>(() => {
    const copy = [...shipmentsRaw];
    copy.sort((a, b) =>
      new Date(a.dropoff_window_start).getTime() - new Date(b.dropoff_window_start).getTime(),
    );
    return copy.filter((s) => s.status !== 'cancelled');
  }, [shipmentsRaw]);

  const { transition } = useShipmentMutations();

  // Position push — optimistic, silent on network errors.
  const positionMutation = useMutation({
    mutationFn: (body: { lat: number; lng: number; heading: number; speed: number }) =>
      driversApi.updatePosition(driverId, body),
    onSuccess: () => setPushCount((c) => c + 1),
    onError: (err) => {
      if (err instanceof Error && !err.message.includes('Failed to fetch')) {
        handleApiError(err, 'Position');
      }
      // Network errors stay silent — will retry on next interval.
    },
  });

  const pushPosition = useCallback(
    (lat: number, lng: number, heading: number, speed: number) => {
      if (!driverId) return;
      positionMutation.mutate({ lat, lng, heading, speed });
    },
    [driverId, positionMutation],
  );

  const startGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalisation non supportee sur cet appareil.');
      setGeoStatus('error');
      return;
    }

    setGeoStatus('requesting');
    setGeoError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading } = pos.coords;
        setGeoStatus('active');
        setLastPosition({ lat, lng, heading: heading ?? 0 });
        lastPosRef.current = { lat, lng };
      },
      (err) => {
        setGeoStatus('error');
        setGeoError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );

    pushTimerRef.current = setInterval(() => {
      if (!lastPosRef.current) return;
      const { lat, lng } = lastPosRef.current;
      pushPosition(lat, lng, lastPosition?.heading ?? 0, 0);
    }, PUSH_INTERVAL_MS);
  }, [pushPosition, lastPosition?.heading]);

  const stopGeo = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pushTimerRef.current) {
      clearInterval(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    setGeoStatus('idle');
  }, []);

  useEffect(() => {
    return () => {
      stopGeo();
    };
  }, [stopGeo]);

  const handleStart = useCallback(() => {
    if (!inputId.trim()) return;
    setDriverId(inputId.trim());
    startGeo();
  }, [inputId, startGeo]);

  const markInProgress = useCallback(
    (shipmentId: string) => transition.mutate({ id: shipmentId, status: 'in_progress' }),
    [transition],
  );

  const markDelivered = useCallback(
    (shipmentId: string) => transition.mutate({ id: shipmentId, status: 'delivered' }),
    [transition],
  );

  const activeShipments = shipments.filter((s) => s.status !== 'delivered');
  const deliveredCount = shipments.length - activeShipments.length;
  const totalCount = shipments.length;
  const nextShipment = activeShipments.find((s) => s.status === 'in_progress') ?? activeShipments[0];
  const driverColor = driverId ? COLORS[driverId.charCodeAt(driverId.length - 1) % COLORS.length] : '#3b82f6';

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!driverId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚚</span>
            </div>
            <h1 className="text-xl font-bold text-zinc-100">App Chauffeur</h1>
            <p className="text-sm text-zinc-500 mt-1">VRP Control</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Identifiant chauffeur (UUID)</label>
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="UUID du chauffeur"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 text-base placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                autoComplete="off"
                autoCapitalize="none"
              />
            </div>
            <button
              onClick={handleStart}
              disabled={!inputId.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Commencer ma tournee
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Driver dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ borderColor: driverColor, backgroundColor: `${driverColor}22` }}
        >
          {driverId.toUpperCase().slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-200">Chauffeur {driverId.slice(0, 8)}</div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                geoStatus === 'active' ? 'bg-green-400 animate-pulse'
                : geoStatus === 'requesting' ? 'bg-yellow-400 animate-pulse'
                : geoStatus === 'error' ? 'bg-red-500'
                : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs text-zinc-500">
              {geoStatus === 'active'
                ? `GPS actif · ${pushCount} envois`
                : geoStatus === 'requesting'
                ? 'Recherche GPS…'
                : geoStatus === 'error'
                ? 'Erreur GPS'
                : 'GPS inactif'}
            </span>
          </div>
        </div>
        <button
          onClick={geoStatus === 'active' ? stopGeo : startGeo}
          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
            geoStatus === 'active'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
          }`}
        >
          {geoStatus === 'active' ? 'Arreter' : 'Activer GPS'}
        </button>
      </header>

      {geoError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400">
          {geoError}
        </div>
      )}

      {lastPosition && (
        <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 flex gap-4 text-xs text-zinc-500">
          <span>Lat {lastPosition.lat.toFixed(5)}</span>
          <span>Lng {lastPosition.lng.toFixed(5)}</span>
          <span>Cap. {Math.round(lastPosition.heading)}°</span>
        </div>
      )}

      {/* Progress */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-500">Progression</span>
          <span className="text-xs font-semibold text-zinc-300">
            {deliveredCount}/{totalCount} livraisons
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0}%`,
              backgroundColor: driverColor,
            }}
          />
        </div>
      </div>

      {shipmentsLoading && shipments.length === 0 && (
        <div className="px-4 py-8 text-center text-xs text-zinc-500">Chargement des missions…</div>
      )}

      {nextShipment && (
        <div className="mx-4 mt-4 bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">
            {nextShipment.status === 'in_progress' ? 'En cours' : 'Prochain arret'}
          </div>
          <div className="text-sm font-semibold text-zinc-100 mb-1">{nextShipment.dropoff_address}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Creneau : {formatTime(nextShipment.dropoff_window_start)} – {formatTime(nextShipment.dropoff_window_end)}
            </span>
            <span className="text-xs font-semibold text-blue-400">
              {formatETA(nextShipment.dropoff_window_end)}
            </span>
          </div>
          {nextShipment.status === 'in_progress' ? (
            <button
              onClick={() => markDelivered(nextShipment.id)}
              className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              ✓ Marquer comme livre
            </button>
          ) : (
            <button
              onClick={() => markInProgress(nextShipment.id)}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              Demarrer cette mission
            </button>
          )}
        </div>
      )}

      {totalCount > 0 && deliveredCount === totalCount && (
        <div className="mx-4 mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-sm font-semibold text-green-400">Tournee terminee !</div>
          <div className="text-xs text-zinc-500 mt-1">{totalCount} livraisons effectuees</div>
        </div>
      )}

      {!shipmentsLoading && totalCount === 0 && (
        <div className="mx-4 mt-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
          <div className="text-sm text-zinc-400">Aucune mission assignee</div>
          <div className="text-xs text-zinc-600 mt-1">Les missions arriveront au prochain refresh</div>
        </div>
      )}

      {shipments.length > 0 && (
        <div className="flex-1 px-4 py-3">
          <div className="text-xs font-semibold text-zinc-500 mb-2">Toutes les missions</div>
          <div className="space-y-2">
            {shipments.map((shipment, idx) => {
              const isDelivered = shipment.status === 'delivered';
              const isCurrent = shipment.id === nextShipment?.id;
              return (
                <div
                  key={shipment.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isDelivered
                      ? 'border-zinc-800 bg-zinc-900/40 opacity-50'
                      : isCurrent
                      ? 'border-blue-500/40 bg-blue-500/5'
                      : 'border-zinc-800 bg-zinc-900/40'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: isDelivered ? '#27272a' : driverColor }}
                  >
                    {isDelivered ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${isDelivered ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                      {shipment.dropoff_address}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {formatTime(shipment.dropoff_window_start)} – {formatTime(shipment.dropoff_window_end)}
                      {!isDelivered && ` · ${shipment.reference}`}
                    </div>
                  </div>
                  {!isDelivered && !isCurrent && shipment.status !== 'in_progress' && (
                    <button
                      onClick={() => markInProgress(shipment.id)}
                      className="text-xs text-zinc-600 hover:text-blue-400 transition-colors shrink-0"
                    >
                      Demarrer
                    </button>
                  )}
                  {!isDelivered && shipment.status === 'in_progress' && !isCurrent && (
                    <button
                      onClick={() => markDelivered(shipment.id)}
                      className="text-xs text-zinc-600 hover:text-green-400 transition-colors shrink-0"
                    >
                      Livre
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
