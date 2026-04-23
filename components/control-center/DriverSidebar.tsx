'use client';

import { LiveDriver, DriverStatus } from '@/types/vrp';

interface DriverSidebarProps {
  drivers: LiveDriver[];
  focusDriverId: string | null;
  onDriverClick: (id: string) => void;
}

const STATUS_CONFIG: Record<DriverStatus, { label: string; color: string; dot: string }> = {
  on_route: { label: 'En route', color: 'text-blue-400', dot: 'bg-blue-400' },
  paused: { label: 'En pause', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  delayed: { label: 'Retard', color: 'text-red-400', dot: 'bg-red-500 animate-pulse' },
  idle: { label: 'Disponible', color: 'text-zinc-500', dot: 'bg-zinc-500' },
};

function formatETA(isoString: string | null): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const now = new Date();
  const diffMin = Math.round((date.getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return 'Arrivé';
  if (diffMin < 60) return `${diffMin} min`;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function LoadBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>Charge</span>
        <span style={{ color }}>{current}/{max} colis</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 shrink-0">{completed}/{total}</span>
    </div>
  );
}

export default function DriverSidebar({ drivers, focusDriverId, onDriverClick }: DriverSidebarProps) {
  const delayed = drivers.filter((d) => d.status === 'delayed');
  const active = drivers.filter((d) => d.status !== 'idle');

  return (
    <aside className="w-72 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-300">
          Chauffeurs
          <span className="ml-2 text-xs font-normal text-zinc-500">{active.length} actifs</span>
        </span>
        {delayed.length > 0 && (
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded px-2 py-0.5">
            {delayed.length} retard{delayed.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
        {drivers.map((driver) => {
          const cfg = STATUS_CONFIG[driver.status];
          const isFocused = focusDriverId === driver.id;

          return (
            <button
              key={driver.id}
              onClick={() => onDriverClick(driver.id)}
              className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-zinc-900 ${
                isFocused ? 'bg-zinc-900 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ borderColor: driver.routeColor, backgroundColor: `${driver.routeColor}22` }}
                  >
                    {driver.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">{driver.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-zinc-500">ETA</div>
                  <div className={`text-sm font-semibold ${driver.status === 'delayed' ? 'text-red-400' : 'text-zinc-300'}`}>
                    {formatETA(driver.eta)}
                  </div>
                </div>
              </div>

              {driver.nextStop && (
                <div className="mt-2 text-xs text-zinc-500 truncate pl-9">
                  → {driver.nextStop}
                </div>
              )}

              <div className="pl-9">
                <ProgressBar completed={driver.completedStops} total={driver.totalStops} />
                <LoadBar current={driver.currentLoad} max={driver.maxLoad} color={driver.routeColor} />
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
