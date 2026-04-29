'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LayerStat {
  visible: boolean;
  shown: number;
  total: number;
}

export interface ShortcutItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** When true, the pill stays in its "active" highlight state. */
  active?: boolean;
  /** Optional accent colour applied to the icon when active. */
  accent?: string;
  onClick: () => void;
}

interface LayerToggleProps {
  drivers: LayerStat;
  deliveries: LayerStat;
  onToggleDrivers: () => void;
  onToggleDeliveries: () => void;
  /** Optional extra pills rendered after a divider — extend by appending to the array. */
  shortcuts?: ShortcutItem[];
}

function LayerDot({
  label,
  accent,
  layer,
  onClick,
}: {
  label: string;
  accent: string;
  layer: LayerStat;
  onClick: () => void;
}) {
  const filtered = layer.shown < layer.total;
  return (
    <button
      onClick={onClick}
      title={`${label} — ${layer.shown}/${layer.total}${layer.visible ? '' : ' (masqué)'}`}
      className={cn(
        'group/dot relative flex items-center h-6 rounded-full transition-all duration-150',
        'overflow-hidden hover:pr-2',
        layer.visible
          ? 'bg-zinc-900/70 hover:bg-zinc-800/90'
          : 'bg-zinc-900/40 hover:bg-zinc-800/60',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full transition-all',
          !layer.visible && 'opacity-40',
        )}
      >
        <span
          className={cn(
            'rounded-full transition-all',
            layer.visible ? 'w-2 h-2' : 'w-2 h-2 ring-1 ring-inset bg-transparent',
          )}
          style={
            layer.visible
              ? { background: accent, boxShadow: `0 0 6px ${accent}80` }
              : { color: accent, boxShadow: `inset 0 0 0 1px ${accent}` }
          }
        />
      </span>
      <span
        className={cn(
          'max-w-0 group-hover/dot:max-w-[120px] overflow-hidden whitespace-nowrap',
          'text-[11px] font-medium tabular-nums transition-all duration-200',
          layer.visible ? 'text-zinc-200' : 'text-zinc-500',
        )}
      >
        {label}
        <span className={cn('ml-1.5', filtered && layer.visible ? 'text-zinc-300' : 'text-zinc-500')}>
          {layer.shown}
          <span className="text-zinc-600">/{layer.total}</span>
        </span>
      </span>
    </button>
  );
}

function ShortcutPill({ item }: { item: ShortcutItem }) {
  return (
    <button
      onClick={item.onClick}
      title={item.label}
      className={cn(
        'group/short relative flex items-center h-6 rounded-full transition-all duration-150',
        'overflow-hidden hover:pr-2.5',
        item.active
          ? 'bg-zinc-800/90 hover:bg-zinc-700/90'
          : 'bg-zinc-900/40 hover:bg-zinc-800/60',
      )}
      style={
        item.active && item.accent
          ? { boxShadow: `inset 0 0 0 1px ${item.accent}33, 0 0 12px -4px ${item.accent}66` }
          : undefined
      }
    >
      <span
        className={cn(
          'flex items-center justify-center w-6 h-6 transition-colors',
          item.active ? 'text-zinc-50' : 'text-zinc-400 group-hover/short:text-zinc-200',
        )}
        style={item.active && item.accent ? { color: item.accent } : undefined}
      >
        {item.icon}
      </span>
      <span
        className={cn(
          'max-w-0 group-hover/short:max-w-[180px] overflow-hidden whitespace-nowrap',
          'text-[11px] font-medium transition-all duration-200',
          item.active ? 'text-zinc-100' : 'text-zinc-300',
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

export default function LayerToggle({
  drivers,
  deliveries,
  onToggleDrivers,
  onToggleDeliveries,
  shortcuts,
}: LayerToggleProps) {
  const hasShortcuts = shortcuts && shortcuts.length > 0;
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-1 p-1 rounded-full',
          'bg-zinc-950/60 backdrop-blur-md border border-zinc-800/40',
          'shadow-[0_2px_10px_rgba(0,0,0,0.3)]',
        )}
      >
        <LayerDot label="Chauffeurs" accent="#8b5cf6" layer={drivers} onClick={onToggleDrivers} />
        <LayerDot label="Missions" accent="#3b82f6" layer={deliveries} onClick={onToggleDeliveries} />
        {hasShortcuts && (
          <>
            <span className="mx-0.5 h-4 w-px bg-zinc-700/60" aria-hidden />
            {shortcuts!.map((s) => (
              <ShortcutPill key={s.id} item={s} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
