'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface DriverStop {
  stopId: string;
  address: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  arrivalTime: string;
  isCompleted: boolean;
}

type GeoStatus = 'idle' | 'requesting' | 'active' | 'error';

const PUSH_INTERVAL_MS = 5000;
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

// Mock stops for demo — in production these come from the planning API
const DEMO_STOPS: DriverStop[] = [
  { stopId: 'p1', address: '14 rue de Rivoli, Paris', timeWindowStart: '10:00', timeWindowEnd: '12:00', arrivalTime: new Date(Date.now() + 14 * 60000).toISOString(), isCompleted: false },
  { stopId: 'p2', address: '8 rue Saint-Antoine, Paris', timeWindowStart: '12:30', timeWindowEnd: '14:00', arrivalTime: new Date(Date.now() + 70 * 60000).toISOString(), isCompleted: false },
  { stopId: 'p3', address: '5 place de la Bastille, Paris', timeWindowStart: '14:00', timeWindowEnd: '16:00', arrivalTime: new Date(Date.now() + 130 * 60000).toISOString(), isCompleted: false },
];

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
  const [stops, setStops] = useState<DriverStop[]>(DEMO_STOPS);
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushPosition = useCallback(
    async (lat: number, lng: number, heading: number, speed: number) => {
      if (!driverId) return;
      const base = process.env.NEXT_PUBLIC_VELOCE_URL ?? 'http://localhost:3001';
      try {
        await fetch(`${base}/drivers/${driverId}/position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, heading, speed }),
        });
        setPushCount((c) => c + 1);
      } catch {
        // Offline — will retry on next interval
      }
    },
    [driverId],
  );

  const startGeo = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée sur cet appareil.');
      setGeoStatus('error');
      return;
    }

    setGeoStatus('requesting');
    setGeoError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading, speed } = pos.coords;
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

    // Push every 5s
    pushTimerRef.current = setInterval(() => {
      if (!lastPosRef.current) return;
      const { lat, lng } = lastPosRef.current;
      pushPosition(lat, lng, lastPosition?.heading ?? 0, 0);
    }, PUSH_INTERVAL_MS);
  }, [driverId, pushPosition, lastPosition?.heading]);

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

  const markDone = useCallback((stopId: string) => {
    setStops((prev) =>
      prev.map((s) => (s.stopId === stopId ? { ...s, isCompleted: true } : s)),
    );
  }, []);

  const completedCount = stops.filter((s) => s.isCompleted).length;
  const nextStop = stops.find((s) => !s.isCompleted);
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
              <label className="text-xs text-zinc-400 block mb-1.5">Identifiant chauffeur</label>
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="ex: d1, d2, d3…"
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
              Commencer ma tournée
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Driver dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ borderColor: driverColor, backgroundColor: `${driverColor}22` }}
        >
          {driverId.toUpperCase().slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-200">Chauffeur {driverId}</div>
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
          {geoStatus === 'active' ? 'Arrêter' : 'Activer GPS'}
        </button>
      </header>

      {geoError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400">
          {geoError}
        </div>
      )}

      {/* Position info */}
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
            {completedCount}/{stops.length} arrêts
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${stops.length > 0 ? (completedCount / stops.length) * 100 : 0}%`,
              backgroundColor: driverColor,
            }}
          />
        </div>
      </div>

      {/* Next stop highlight */}
      {nextStop && (
        <div className="mx-4 mt-4 bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Prochain arrêt</div>
          <div className="text-sm font-semibold text-zinc-100 mb-1">{nextStop.address}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Créneau : {nextStop.timeWindowStart} – {nextStop.timeWindowEnd}
            </span>
            <span className="text-xs font-semibold text-blue-400">
              {formatETA(nextStop.arrivalTime)}
            </span>
          </div>
          <button
            onClick={() => markDone(nextStop.stopId)}
            className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            ✓ Marquer comme livré
          </button>
        </div>
      )}

      {completedCount === stops.length && stops.length > 0 && (
        <div className="mx-4 mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-sm font-semibold text-green-400">Tournée terminée !</div>
          <div className="text-xs text-zinc-500 mt-1">{stops.length} livraisons effectuées</div>
        </div>
      )}

      {/* All stops */}
      <div className="flex-1 px-4 py-3">
        <div className="text-xs font-semibold text-zinc-500 mb-2">Tous les arrêts</div>
        <div className="space-y-2">
          {stops.map((stop, idx) => (
            <div
              key={stop.stopId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                stop.isCompleted
                  ? 'border-zinc-800 bg-zinc-900/40 opacity-50'
                  : stop.stopId === nextStop?.stopId
                  ? 'border-blue-500/40 bg-blue-500/5'
                  : 'border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: stop.isCompleted ? '#27272a' : driverColor }}
              >
                {stop.isCompleted ? '✓' : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${stop.isCompleted ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                  {stop.address}
                </div>
                <div className="text-xs text-zinc-600">
                  {stop.timeWindowStart} – {stop.timeWindowEnd}
                  {!stop.isCompleted && ` · ${formatTime(stop.arrivalTime)}`}
                </div>
              </div>
              {!stop.isCompleted && stop.stopId !== nextStop?.stopId && (
                <button
                  onClick={() => markDone(stop.stopId)}
                  className="text-xs text-zinc-600 hover:text-green-400 transition-colors shrink-0"
                >
                  Livré
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
