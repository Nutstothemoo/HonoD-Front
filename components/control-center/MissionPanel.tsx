'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronRightIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LiveDriver, DeliveryPoint } from '@/types/vrp';

interface MissionPanelProps {
  deliveries: DeliveryPoint[];
  drivers: LiveDriver[];
  onDeliveryClick: (delivery: DeliveryPoint) => void;
  onVisibleDeliveriesChange: (ids: string[]) => void;
  onClose: () => void;
}

type StatusFilter = DeliveryPoint['status'] | 'all';
type DriverFilter = string | 'all' | 'unassigned';

const STATUS_CONFIG = {
  all:      { label: 'Toutes',     dot: 'bg-zinc-500',  color: 'text-zinc-400',   bg: '#6b7280' },
  pending:  { label: 'En attente', dot: 'bg-zinc-500',  color: 'text-zinc-400',   bg: '#6b7280' },
  assigned: { label: 'Assignée',   dot: 'bg-blue-400',  color: 'text-blue-400',   bg: '#3b82f6' },
  done:     { label: 'Livrée',     dot: 'bg-emerald-400', color: 'text-emerald-400', bg: '#10b981' },
  at_risk:  { label: '⚠ Retard',  dot: 'bg-red-500 animate-pulse', color: 'text-red-400', bg: '#ef4444' },
} as const;

export default function MissionPanel({ deliveries, drivers, onDeliveryClick, onVisibleDeliveriesChange, onClose }: MissionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterDriver, setFilterDriver] = useState<DriverFilter>('all');

  const q = search.trim().toLowerCase();

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterDriver === 'unassigned' && d.driverId !== null) return false;
      if (filterDriver !== 'all' && filterDriver !== 'unassigned' && d.driverId !== filterDriver) return false;
      if (q && !d.address.toLowerCase().includes(q) && !d.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deliveries, filterStatus, filterDriver, q]);

  useEffect(() => {
    onVisibleDeliveriesChange(filteredDeliveries.map((d) => d.id));
  }, [filteredDeliveries]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: deliveries.length,
    pending: deliveries.filter((d) => d.status === 'pending').length,
    assigned: deliveries.filter((d) => d.status === 'assigned').length,
    done: deliveries.filter((d) => d.status === 'done').length,
    at_risk: deliveries.filter((d) => d.status === 'at_risk').length,
  }), [deliveries]);

  const driverOptions = useMemo(() => {
    const used = new Set(deliveries.map((d) => d.driverId).filter(Boolean));
    return drivers.filter((d) => used.has(d.id));
  }, [deliveries, drivers]);

  // ── Collapsed strip ──────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="w-12 h-full bg-zinc-950/90 backdrop-blur-md border-l border-zinc-800/50 flex flex-col overflow-hidden">
        <div className="h-11 border-b border-zinc-800/50 flex items-center justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Afficher les missions"
          >
            <ChevronRightIcon className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-2">
          {(['pending', 'assigned', 'done', 'at_risk'] as const).map((s) => (
            counts[s] > 0 && (
              <button
                key={s}
                onClick={() => { setCollapsed(false); setFilterStatus(s); }}
                title={`${STATUS_CONFIG[s].label} (${counts[s]})`}
                className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white transition-all hover:scale-110"
                style={{ background: STATUS_CONFIG[s].bg }}
              >
                {counts[s]}
              </button>
            )
          ))}
        </div>
      </aside>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────────────
  return (
    <aside className="w-72 h-full bg-zinc-950/90 backdrop-blur-md border-l border-zinc-800/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-zinc-300 truncate">Missions</span>
          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0 h-4">
            {filteredDeliveries.length}/{deliveries.length}
          </Badge>
          {counts.at_risk > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 h-4">
              {counts.at_risk} retard{counts.at_risk > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Réduire"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
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
            placeholder="Adresse ou référence…"
            className="w-full bg-zinc-900/70 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <Cross2Icon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Status filter */}
      <div className="px-3 pb-1">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'pending', 'assigned', 'done', 'at_risk'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                filterStatus === s
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                  : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].label}
              {s !== 'all' && <span className="text-zinc-600 ml-0.5">{counts[s]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Driver filter */}
      {driverOptions.length > 0 && (
        <div className="px-3 pb-2.5">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterDriver('all')}
              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                filterDriver === 'all'
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                  : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterDriver('unassigned')}
              className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                filterDriver === 'unassigned'
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                  : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              Non attribuées
            </button>
            {driverOptions.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setFilterDriver(driver.id)}
                className={`shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                  filterDriver === driver.id
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                    : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: driver.routeColor }}
                />
                {driver.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mission list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-zinc-800/40">
          {filteredDeliveries.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-zinc-600">
              Aucune mission ne correspond
            </div>
          )}
          {filteredDeliveries.map((delivery) => {
            const driver = delivery.driverId ? drivers.find((d) => d.id === delivery.driverId) : null;
            const cfg = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.pending;
            return (
              <button
                key={delivery.id}
                onClick={() => onDeliveryClick(delivery)}
                className="w-full text-left px-3 py-3 hover:bg-zinc-800/50 transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}
                  >
                    {delivery.label.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 truncate transition-colors">
                      {delivery.address}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {driver && (
                        <>
                          <span className="text-zinc-700 text-[10px]">·</span>
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: driver.routeColor }} />
                            {driver.name.split(' ')[0]}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">
                      {delivery.timeWindowStart} → {delivery.timeWindowEnd}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
