
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LiveDriver, DriverStatus, DeliveryPoint } from '@/types/vrp';

interface DriverSidebarProps {
  drivers: LiveDriver[];
  deliveries: DeliveryPoint[];
  focusDriverId: string | null;
  onDriverClick: (id: string) => void;
  onDriverAssign: (driverId: string) => void;
  onDeliveryClick: (delivery: DeliveryPoint) => void;
  onVisibleDriversChange: (ids: string[]) => void;
  onClose: () => void;
}

type VehicleFilter = 'all' | 'car' | 'bike' | 'truck';
type StatusFilter = 'all' | 'available' | 'busy' | 'offline';

const STATUS_CONFIG: Record<DriverStatus, { label: string; color: string; dot: string; group: StatusFilter; bg: string }> = {
  on_route: { label: 'En route',   color: 'text-blue-400',    dot: 'bg-blue-400',              group: 'busy',      bg: '#3b82f6' },
  paused:   { label: 'En pause',   color: 'text-yellow-400',  dot: 'bg-yellow-400',            group: 'busy',      bg: '#eab308' },
  delayed:  { label: 'Retard',     color: 'text-red-400',     dot: 'bg-red-500 animate-pulse', group: 'busy',      bg: '#ef4444' },
  idle:     { label: 'Disponible', color: 'text-emerald-400', dot: 'bg-emerald-400',           group: 'available', bg: '#22c55e' },
  offline:  { label: 'Hors ligne', color: 'text-zinc-500',    dot: 'bg-zinc-600',              group: 'offline',   bg: '#52525b' },
};

const VEHICLE_LABELS: Record<VehicleFilter, string> = { all: 'Tous', car: 'Voiture', bike: 'Vélo', truck: 'Camion' };

function VehicleIcon({ type, className = '' }: { type: 'car' | 'bike' | 'truck'; className?: string }) {
  if (type === 'car') return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v-4l2.5-6h13l2.5 6v4h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M7 11h10"/>
    </svg>
  );
  if (type === 'bike') return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M5.5 14.5L9 8h6l3.5 4.5M12 17.5l-2-9.5"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>
    </svg>
  );
}

function formatETA(isoString: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const diffMin = Math.round((date.getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return 'Arrivé';
  if (diffMin < 60) return `${diffMin} min`;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function LoadBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
        <span>Charge</span>
        <span style={{ color }}>{current}/{max}</span>
      </div>
      <div className="h-1 bg-zinc-800/60 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ProgressBar({ completed, total, color }: { completed: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-zinc-800/60 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color + '99' }} />
      </div>
      <span className="text-[10px] text-zinc-600 shrink-0">{completed}/{total}</span>
    </div>
  );
}

export default function DriverSidebar({
  drivers, deliveries, focusDriverId,
  onDriverClick, onDriverAssign, onDeliveryClick, onVisibleDriversChange, onClose,
}: DriverSidebarProps) {
  const [search, setSearch] = useState('');
  const [filterVehicle, setFilterVehicle] = useState<VehicleFilter>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  const q = search.trim().toLowerCase();

  const filteredDrivers = useMemo(() => drivers.filter((d) => {
    if (filterVehicle !== 'all' && d.vehicleType !== filterVehicle) return false;
    if (filterStatus !== 'all' && STATUS_CONFIG[d.status].group !== filterStatus) return false;
    if (q && !d.name.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false;
    return true;
  }), [drivers, filterVehicle, filterStatus, q]);

  useEffect(() => {
    onVisibleDriversChange(filteredDrivers.map((d) => d.id));
  }, [filteredDrivers]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchedDeliveries = useMemo(() => {
    if (!q) return [];
    return deliveries.filter((d) =>
      d.address.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [deliveries, q]);

  const delayed = drivers.filter((d) => d.status === 'delayed');
  const active  = drivers.filter((d) => d.status !== 'idle' && d.status !== 'offline');

  return (
    <aside className="w-72 h-full bg-zinc-950/90 backdrop-blur-md border-r border-zinc-800/50 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-zinc-300 truncate">Chauffeurs</span>
          <Badge className="bg-zinc-800/60 text-zinc-400 border-zinc-700/50 text-[10px] px-1.5 py-0 h-4">
            {active.length} actifs
          </Badge>
          {delayed.length > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 h-4">
              {delayed.length} retard{delayed.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Fermer"
          >
            <Cross2Icon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chauffeur ou mission…"
            className="w-full bg-zinc-900/50 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600/80 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 pb-2.5 space-y-1.5">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'car', 'bike', 'truck'] as VehicleFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setFilterVehicle(v)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                filterVehicle === v
                  ? 'bg-zinc-700/70 border-zinc-600/70 text-zinc-200'
                  : 'bg-transparent border-zinc-800/60 text-zinc-500 hover:border-zinc-700/60 hover:text-zinc-400'
              }`}
            >
              {v !== 'all' && <VehicleIcon type={v} className="w-3 h-3" />}
              {VEHICLE_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {([
            { key: 'all',       label: 'Tous',       dot: 'bg-zinc-500' },
            { key: 'available', label: 'Dispo',      dot: 'bg-emerald-400' },
            { key: 'busy',      label: 'Occupé',     dot: 'bg-blue-400' },
            { key: 'offline',   label: 'Hors ligne', dot: 'bg-zinc-600' },
          ] as { key: StatusFilter; label: string; dot: string }[]).map(({ key, label, dot }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                filterStatus === key
                  ? 'bg-zinc-700/70 border-zinc-600/70 text-zinc-200'
                  : 'bg-transparent border-zinc-800/60 text-zinc-500 hover:border-zinc-700/60 hover:text-zinc-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Driver list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-zinc-800/40">
          {filteredDrivers.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-zinc-600">Aucun chauffeur ne correspond</div>
          )}

          {filteredDrivers.map((driver) => {
            const cfg = STATUS_CONFIG[driver.status];
            const isFocused = focusDriverId === driver.id;

            return (
              <div
                key={driver.id}
                className={`border-l-2 transition-colors ${
                  isFocused ? 'bg-zinc-800/50 border-l-blue-500' : 'border-l-transparent'
                }`}
              >
                <button
                  onClick={() => onDriverClick(driver.id)}
                  className="w-full text-left px-3 py-3 hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar — rounded-xl like MissionPanel items */}
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold text-white relative"
                        style={{ background: driver.routeColor + '22', border: `1.5px solid ${driver.routeColor}` }}
                      >
                        {driver.name.charAt(0)}
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-950/90 border border-zinc-700/60 flex items-center justify-center"
                          style={{ color: driver.routeColor }}
                        >
                          <VehicleIcon type={driver.vehicleType} className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors">
                          {driver.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDriverAssign(driver.id); }}
                        className="p-1 rounded hover:bg-zinc-700/60 text-zinc-600 hover:text-zinc-300 transition-colors"
                        title="Gérer les missions"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="2" width="6" height="4" rx="1"/><path d="M6 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M8 12h8M8 16h5"/>
                        </svg>
                      </button>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-600">ETA</div>
                        <div className={`text-xs font-semibold ${driver.status === 'delayed' ? 'text-red-400' : 'text-zinc-300'}`}>
                          {formatETA(driver.eta)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {driver.nextStop && (
                    <div className="mt-1.5 text-[10px] text-zinc-600 truncate pl-[46px]">
                      → {driver.nextStop}
                    </div>
                  )}

                  <div className="pl-[46px]">
                    <ProgressBar completed={driver.completedStops} total={driver.totalStops} color={driver.routeColor} />
                    <LoadBar current={driver.currentLoad} max={driver.maxLoad} color={driver.routeColor} />
                  </div>
                </button>
              </div>
            );
          })}

          {/* Mission search results */}
          {matchedDeliveries.length > 0 && (
            <>
              <div className="px-3 py-1.5 bg-zinc-800/20">
                <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                  Missions ({matchedDeliveries.length})
                </span>
              </div>
              {matchedDeliveries.map((delivery) => {
                const bg = { pending: '#6b7280', assigned: '#3b82f6', done: '#10b981', at_risk: '#ef4444' }[delivery.status];
                return (
                  <button
                    key={delivery.id}
                    onClick={() => onDeliveryClick(delivery)}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: bg }}
                      >
                        {delivery.label.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-400 group-hover:text-zinc-200 truncate transition-colors">
                          {delivery.address}
                        </div>
                        <div className="text-[10px] text-zinc-600">{delivery.timeWindowStart} – {delivery.timeWindowEnd}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
