'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRightIcon, Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { springs } from '@/components/atoms/motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LiveDriver, DeliveryPoint } from '@/types/vrp';

// Stagger entry of list items, capped so long lists don't feel sluggish.
const STAGGER_STEP_S = 0.025;
const STAGGER_MAX_S  = 0.2;
const stagger = (i: number) => Math.min(i * STAGGER_STEP_S, STAGGER_MAX_S);

interface MissionPanelProps {
  deliveries: DeliveryPoint[];
  drivers: LiveDriver[];
  onDeliveryClick: (delivery: DeliveryPoint) => void;
  onVisibleDeliveriesChange: (ids: string[]) => void;
  onBulkAssign: (deliveryIds: string[], driverId: string) => void;
  onBulkUnassign: (deliveryIds: string[]) => void;
  onClose: () => void;
}

type StatusFilter = DeliveryPoint['status'] | 'all';
type DriverFilter = string | 'all' | 'unassigned';

const STATUS_CONFIG = {
  all:         { label: 'Toutes',       dot: 'bg-zinc-500',                  color: 'text-zinc-400',    bg: '#6b7280' },
  pending:     { label: 'En attente',   dot: 'bg-zinc-500',                  color: 'text-zinc-400',    bg: '#6b7280' },
  preassigned: { label: 'Préattribuée', dot: 'bg-violet-400',                color: 'text-violet-300',  bg: '#a78bfa' },
  assigned:    { label: 'Assignée',     dot: 'bg-blue-400',                  color: 'text-blue-400',    bg: '#3b82f6' },
  done:        { label: 'Livrée',       dot: 'bg-emerald-400',               color: 'text-emerald-400', bg: '#10b981' },
  at_risk:     { label: '⚠ Retard',     dot: 'bg-red-500 animate-pulse',    color: 'text-red-400',     bg: '#ef4444' },
} as const;

/**
 * Compact "chip" filter button. Built on top of shadcn Button to keep the
 * visual (10-11px font, 20px height) the panel already uses.
 */
function FilterChip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        'h-auto shrink-0 gap-1 rounded-md border px-2 py-0.5 text-[10px] font-normal shadow-none',
        active
          ? 'border-zinc-600 bg-zinc-700 text-zinc-200 hover:bg-zinc-700/90 hover:text-zinc-200'
          : 'border-zinc-800 bg-transparent text-zinc-500 hover:border-zinc-700 hover:bg-transparent hover:text-zinc-400',
        className,
      )}
    >
      {children}
    </Button>
  );
}

export default function MissionPanel({
  deliveries,
  drivers,
  onDeliveryClick,
  onVisibleDeliveriesChange,
  onBulkAssign,
  onBulkUnassign,
  onClose,
}: MissionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterDriver, setFilterDriver] = useState<DriverFilter>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Drop stale selected ids (deliveries no longer visible / removed).
  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(deliveries.map((d) => d.id));
      const next = new Set<string>();
      let changed = false;
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [deliveries]);

  const counts = useMemo(() => ({
    all: deliveries.length,
    pending: deliveries.filter((d) => d.status === 'pending').length,
    preassigned: deliveries.filter((d) => d.status === 'preassigned').length,
    assigned: deliveries.filter((d) => d.status === 'assigned').length,
    done: deliveries.filter((d) => d.status === 'done').length,
    at_risk: deliveries.filter((d) => d.status === 'at_risk').length,
  }), [deliveries]);

  const driverOptions = useMemo(() => {
    const used = new Set(deliveries.map((d) => d.driverId).filter(Boolean));
    return drivers.filter((d) => used.has(d.id));
  }, [deliveries, drivers]);

  const selectedCount = selectedIds.size;
  const filteredIds = useMemo(() => filteredDeliveries.map((d) => d.id), [filteredDeliveries]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const selectionHasAssigned = useMemo(() => {
    for (const d of deliveries) if (selectedIds.has(d.id) && d.driverId) return true;
    return false;
  }, [deliveries, selectedIds]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      if (filteredIds.every((id) => prev.has(id))) {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of filteredIds) next.add(id);
      return next;
    });
  }, [filteredIds]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleAssignTo = useCallback((driverId: string) => {
    if (selectedIds.size === 0) return;
    onBulkAssign(Array.from(selectedIds), driverId);
    exitSelectionMode();
  }, [onBulkAssign, selectedIds, exitSelectionMode]);

  const handleUnassignSelection = useCallback(() => {
    if (selectedIds.size === 0) return;
    onBulkUnassign(Array.from(selectedIds));
    exitSelectionMode();
  }, [onBulkUnassign, selectedIds, exitSelectionMode]);

  const handleRowClick = useCallback(
    (delivery: DeliveryPoint) => {
      if (selectionMode) {
        toggleSelection(delivery.id);
      } else {
        onDeliveryClick(delivery);
      }
    },
    [selectionMode, toggleSelection, onDeliveryClick],
  );

  // ── Single shell that animates width — content cross-fades inside ────────────
  return (
    <motion.aside
      animate={{ width: collapsed ? 48 : 288 }}
      initial={false}
      transition={springs.default}
      className="h-full bg-zinc-950/75 backdrop-blur-xl backdrop-saturate-150 border-l border-zinc-800/50 flex flex-col overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex flex-col h-full overflow-hidden"
          >
            <div className="h-11 border-b border-zinc-800/50 flex items-center justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(false)}
                title="Afficher les missions"
                className="h-7 w-7 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <ChevronRightIcon className="w-4 h-4 rotate-180" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-2">
              {(['pending', 'preassigned', 'assigned', 'done', 'at_risk'] as const).map((s) => (
                counts[s] > 0 && (
                  <motion.button
                    key={s}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springs.snappy}
                    onClick={() => { setCollapsed(false); setFilterStatus(s); }}
                    title={`${STATUS_CONFIG[s].label} (${counts[s]})`}
                    className="relative h-8 w-8 rounded-lg p-0 text-[10px] font-bold text-white"
                    style={{ background: STATUS_CONFIG[s].bg }}
                  >
                    {counts[s]}
                  </motion.button>
                )
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="flex flex-col h-full overflow-hidden"
          >
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectionMode((v) => {
                if (v) setSelectedIds(new Set());
                return !v;
              });
            }}
            title={selectionMode ? 'Quitter la selection' : 'Selection multiple'}
            className={cn(
              'h-6 px-2 text-[10px] font-medium',
              selectionMode
                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300',
            )}
          >
            {selectionMode ? 'Annuler' : 'Selectionner'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            title="Réduire"
            className="h-6 w-6 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Fermer"
            className="h-6 w-6 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <Cross2Icon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Selection header — only in selection mode */}
      {selectionMode && (
        <div className="px-3 py-2 border-b border-zinc-800/50 bg-blue-500/5 flex items-center gap-2">
          <Checkbox
            checked={allFilteredSelected}
            onCheckedChange={() => toggleAllFiltered()}
            aria-label="Tout selectionner"
          />
          <span className="text-[11px] text-zinc-400">
            {selectedCount > 0
              ? `${selectedCount} selectionnee${selectedCount > 1 ? 's' : ''}`
              : `Cliquer pour selectionner (${filteredIds.length})`}
          </span>
          {selectedCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto h-auto px-1 py-0 text-[10px] font-normal text-zinc-500 hover:bg-transparent hover:text-zinc-300"
            >
              Tout desactiver
            </Button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Adresse ou reference…"
            className="h-7 border-zinc-800 bg-zinc-900/70 pl-8 pr-8 text-xs text-zinc-300 shadow-none placeholder:text-zinc-600 focus-visible:border-zinc-600 focus-visible:ring-0"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600 hover:bg-transparent hover:text-zinc-400"
            >
              <Cross2Icon className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Status filter */}
      <div className="px-3 pb-1">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'pending', 'preassigned', 'assigned', 'done', 'at_risk'] as const).map((s) => (
            <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[s].dot)} />
              {STATUS_CONFIG[s].label}
              {s !== 'all' && <span className="text-zinc-600 ml-0.5">{counts[s]}</span>}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Driver filter */}
      {driverOptions.length > 0 && (
        <div className="px-3 pb-2.5">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            <FilterChip active={filterDriver === 'all'} onClick={() => setFilterDriver('all')}>
              Tous
            </FilterChip>
            <FilterChip active={filterDriver === 'unassigned'} onClick={() => setFilterDriver('unassigned')}>
              Non attribuees
            </FilterChip>
            {driverOptions.map((driver) => (
              <FilterChip
                key={driver.id}
                active={filterDriver === driver.id}
                onClick={() => setFilterDriver(driver.id)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: driver.routeColor }}
                />
                {driver.name.split(' ')[0]}
              </FilterChip>
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
          <AnimatePresence initial={false}>
          {filteredDeliveries.map((delivery, index) => {
            const driver = delivery.driverId ? drivers.find((d) => d.id === delivery.driverId) : null;
            const cfg = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.pending;
            const isSelected = selectedIds.has(delivery.id);
            return (
              <motion.button
                key={delivery.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16, scale: 0.97 }}
                transition={{ ...springs.default, delay: stagger(index) }}
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleRowClick(delivery)}
                className={cn(
                  'block w-full text-left px-3 py-3 transition-colors group',
                  isSelected ? 'bg-blue-500/10 hover:bg-blue-500/15' : 'hover:bg-zinc-800/50',
                )}
              >
                <div className="flex items-start gap-2.5">
                  {selectionMode && (
                    <div className="pt-1.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(delivery.id)}
                        aria-label={`Selectionner ${delivery.label}`}
                      />
                    </div>
                  )}
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
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        <span className={cn('text-[10px]', cfg.color)}>{cfg.label}</span>
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
              </motion.button>
            );
          })}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Bulk actions footer — only when items are selected */}
      {selectionMode && selectedCount > 0 && (
        <div className="border-t border-zinc-800/70 bg-zinc-950/95 backdrop-blur-xl px-3 py-2.5 flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
              {selectedCount}
            </span>
            <span className="text-zinc-500">mission{selectedCount > 1 ? 's' : ''}</span>
          </div>

          <div className="flex-1" />

          {selectionHasAssigned && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleUnassignSelection}
              className="h-7 bg-red-500/10 px-2.5 text-[11px] text-red-300 shadow-none hover:bg-red-500/20"
            >
              Desattribuer
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="h-7 bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-500">
                Attribuer a...
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-56 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/60 text-zinc-200"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Choisir un chauffeur
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800/60" />
              {drivers.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-zinc-500">Aucun chauffeur disponible</div>
              )}
              {drivers.map((driver) => (
                <DropdownMenuItem
                  key={driver.id}
                  onSelect={() => handleAssignTo(driver.id)}
                  className="text-xs cursor-pointer focus:bg-zinc-800/80 focus:text-zinc-100"
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2 shrink-0"
                    style={{ background: driver.routeColor }}
                  />
                  <span className="truncate">{driver.name}</span>
                  <span className="ml-auto text-[10px] text-zinc-500 shrink-0">{driver.vehicleType}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
