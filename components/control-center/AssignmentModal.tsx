'use client';

import { PlusIcon } from '@radix-ui/react-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LiveDriver, DeliveryPoint, DriverStatus } from '@/types/vrp';

// ── Shared constants ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DriverStatus, { label: string; color: string; dot: string }> = {
  on_route: { label: 'En route',   color: 'text-blue-400',   dot: 'bg-blue-400' },
  paused:   { label: 'En pause',   color: 'text-yellow-400', dot: 'bg-yellow-400' },
  delayed:  { label: 'Retard',     color: 'text-red-400',    dot: 'bg-red-500 animate-pulse' },
  idle:     { label: 'Disponible', color: 'text-green-400',  dot: 'bg-green-400' },
  offline:  { label: 'Hors ligne', color: 'text-zinc-500',   dot: 'bg-zinc-600' },
};

const DELIVERY_STATUS_COLORS: Record<DeliveryPoint['status'], string> = {
  pending:     '#6b7280',
  preassigned: '#a78bfa',
  assigned:    '#3b82f6',
  done:        '#10b981',
  at_risk:     '#ef4444',
};

const DELIVERY_STATUS_OPTIONS: { key: DeliveryPoint['status']; label: string }[] = [
  { key: 'pending',     label: 'En attente' },
  { key: 'preassigned', label: 'Préattribuée' },
  { key: 'assigned',    label: 'Assignée' },
  { key: 'done',        label: '✓ Livrée' },
  { key: 'at_risk',     label: '⚠ Retard' },
];

function VehicleIcon({ type, className = '' }: { type: 'car' | 'bike' | 'truck'; className?: string }) {
  if (type === 'car') return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v-4l2.5-6h13l2.5 6v4h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M7 11h10"/>
    </svg>
  );
  if (type === 'bike') return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M5.5 14.5L9 8h6l3.5 4.5M12 17.5l-2-9.5"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>
    </svg>
  );
}

function GlassSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

interface DeliveryViewProps {
  delivery: DeliveryPoint;
  drivers: LiveDriver[];
  onAssign: (driverId: string) => void;
  onUnassign: () => void;
  onStatusChange: (status: DeliveryPoint['status']) => void;
  onClose: () => void;
}

function DeliveryView({ delivery, drivers, onAssign, onUnassign, onStatusChange, onClose }: DeliveryViewProps) {
  const currentDriver = delivery.driverId ? drivers.find((d) => d.id === delivery.driverId) : null;
  const otherDrivers = drivers.filter((d) => d.id !== delivery.driverId);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <DialogHeader className="relative border-b border-white/10 px-6 pb-5 pt-6">
        <div className="flex items-start gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-[0_10px_25px_rgba(0,0,0,0.28)]"
            style={{ background: DELIVERY_STATUS_COLORS[delivery.status] }}
          >
            {delivery.label.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Badge className="border-white/10 bg-white/5 px-2 py-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Mission
              </Badge>
              <Badge className="border-white/10 bg-zinc-900/70 px-2 py-0 text-[10px] text-zinc-300">
                {delivery.timeWindowStart} → {delivery.timeWindowEnd}
              </Badge>
            </div>
            <DialogTitle className="truncate pr-8 text-lg font-semibold text-zinc-50">{delivery.address}</DialogTitle>
            <DialogDescription className="mt-1 truncate text-zinc-500">
              {delivery.pickupAddress ? `Collecte: ${delivery.pickupAddress}` : 'Mission de livraison directe'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-6 py-5">
          <GlassSection className="p-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Statut</div>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_STATUS_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    delivery.status === key
                      ? key === 'done'        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                      : key === 'at_risk'     ? 'border-red-500/50 bg-red-500/20 text-red-300'
                      : key === 'assigned'    ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                      : key === 'preassigned' ? 'border-violet-500/50 bg-violet-500/20 text-violet-300'
                      :                        'border-white/10 bg-white/10 text-zinc-100'
                      : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </GlassSection>

          {currentDriver && (
            <GlassSection className="p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Chauffeur actuel</div>
              <div className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold text-white"
                  style={{ borderColor: currentDriver.routeColor, backgroundColor: `${currentDriver.routeColor}22` }}
                >
                  {currentDriver.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100">{currentDriver.name}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_CONFIG[currentDriver.status].dot}`} />
                    <span className={`text-xs ${STATUS_CONFIG[currentDriver.status].color}`}>{STATUS_CONFIG[currentDriver.status].label}</span>
                  </div>
                </div>
                <VehicleIcon type={currentDriver.vehicleType} className="h-4 w-4 shrink-0 text-zinc-500" />
                <Button
                  onClick={onUnassign}
                  variant="ghost"
                  className="h-9 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200"
                >
                  Retirer
                </Button>
              </div>
            </GlassSection>
          )}

          <GlassSection className="p-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              {currentDriver ? 'Réattribuer à' : 'Attribuer à'}
            </div>
            <div className="flex flex-col gap-2">
              {otherDrivers.length === 0 && (
                <div className="text-xs text-zinc-600 py-3 text-center">Tous les chauffeurs sont assignés</div>
              )}
              {otherDrivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => onAssign(driver.id)}
                  className="group flex w-full items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition-all hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold text-white"
                    style={{ borderColor: driver.routeColor, backgroundColor: `${driver.routeColor}22` }}
                  >
                    {driver.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-zinc-200 transition-colors group-hover:text-zinc-50">{driver.name}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[driver.status].dot}`} />
                      <span className={`text-xs ${STATUS_CONFIG[driver.status].color}`}>{STATUS_CONFIG[driver.status].label}</span>
                    </div>
                  </div>
                  <VehicleIcon type={driver.vehicleType} className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-zinc-300" />
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors group-hover:bg-white/[0.08]">
                    <PlusIcon className="h-3.5 w-3.5 text-zinc-300" />
                  </div>
                </button>
              ))}
            </div>
          </GlassSection>

          <div className="flex justify-end">
            <Button variant="ghost" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 text-zinc-300 hover:bg-white/[0.08] hover:text-zinc-50" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

interface DriverViewProps {
  driver: LiveDriver;
  deliveries: DeliveryPoint[];
  onAssign: (deliveryId: string) => void;
  onUnassign: (deliveryId: string) => void;
  onStatusChange: (deliveryId: string, status: DeliveryPoint['status']) => void;
  onClose: () => void;
}

function DriverView({ driver, deliveries, onAssign, onUnassign, onStatusChange, onClose }: DriverViewProps) {
  const assigned = deliveries.filter((d) => d.driverId === driver.id);
  const available = deliveries.filter((d) => !d.driverId && d.status !== 'done').slice(0, 10);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <DialogHeader className="relative border-b border-white/10 px-6 pb-5 pt-6">
        <div className="flex items-start gap-4">
          <div
            className="relative flex size-14 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
            style={{ borderColor: driver.routeColor, backgroundColor: `${driver.routeColor}22` }}
          >
            {driver.name.charAt(0)}
            <div
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-zinc-950/90"
              style={{ color: driver.routeColor }}
            >
              <VehicleIcon type={driver.vehicleType} className="h-3 w-3" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge className="border-white/10 bg-white/5 px-2 py-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Chauffeur
              </Badge>
              <Badge className="border-white/10 bg-zinc-900/70 px-2 py-0 text-[10px] text-zinc-300">
                {assigned.length} mission{assigned.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <DialogTitle className="truncate pr-8 text-xl font-semibold text-zinc-50">{driver.name}</DialogTitle>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[driver.status].dot}`} />
                <span className={`text-xs ${STATUS_CONFIG[driver.status].color}`}>{STATUS_CONFIG[driver.status].label}</span>
              </div>
              <span className="text-zinc-700">·</span>
              <DialogDescription className="text-xs text-zinc-500">
                Charge {driver.currentLoad}/{driver.maxLoad}
              </DialogDescription>
            </div>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-6 py-5">

          {assigned.length > 0 && (
            <GlassSection className="p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Missions assignées ({assigned.length})
              </div>
              <div className="flex flex-col gap-2">
                {assigned.map((delivery) => (
                  <div key={delivery.id} className="flex items-center gap-3 rounded-[20px] border border-white/8 bg-black/15 px-4 py-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                      style={{ background: DELIVERY_STATUS_COLORS[delivery.status] }}
                    >
                      {delivery.label.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-300 truncate">{delivery.address}</div>
                      <div className="text-[10px] text-zinc-600">{delivery.timeWindowStart} – {delivery.timeWindowEnd}</div>
                    </div>
                    {/* Inline status toggle */}
                    <div className="flex gap-1 shrink-0">
                      {(['assigned', 'done'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => onStatusChange(delivery.id, s)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                            delivery.status === s
                              ? s === 'done'
                                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                : 'border-blue-500/40 bg-blue-500/20 text-blue-300'
                              : 'border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/15 hover:text-zinc-300'
                          }`}
                        >
                          {s === 'done' ? '✓' : '→'}
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={() => onUnassign(delivery.id)}
                      variant="ghost"
                      className="h-8 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                      title="Désattribuer"
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            </GlassSection>
          )}

          {available.length > 0 && (
            <GlassSection className="p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Missions disponibles ({available.length})
              </div>
              <div className="flex flex-col gap-2">
                {available.map((delivery) => (
                  <button
                    key={delivery.id}
                    onClick={() => onAssign(delivery.id)}
                    className="group flex w-full items-center gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-2.5 text-left transition-all hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-700 text-[10px] font-bold text-white transition-colors group-hover:bg-zinc-600">
                      {delivery.label.slice(0, 2)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="truncate text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-100">{delivery.address}</div>
                      <div className="text-[10px] text-zinc-600">{delivery.timeWindowStart} – {delivery.timeWindowEnd}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-600 transition-colors group-hover:text-zinc-300">
                      <PlusIcon className="h-3 w-3" />
                      Attribuer
                    </div>
                  </button>
                ))}
              </div>
            </GlassSection>
          )}

          {assigned.length === 0 && available.length === 0 && (
            <GlassSection className="p-8 text-center text-xs text-zinc-600">Aucune mission disponible</GlassSection>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 text-zinc-300 hover:bg-white/[0.08] hover:text-zinc-50" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export type ModalState =
  | { type: 'delivery'; id: string }
  | { type: 'driver'; id: string }
  | null;

interface AssignmentModalProps {
  state: ModalState;
  drivers: LiveDriver[];
  deliveries: DeliveryPoint[];
  onAssign: (deliveryId: string, driverId: string | null) => void;
  onStatusChange: (deliveryId: string, status: DeliveryPoint['status']) => void;
  onClose: () => void;
}

export default function AssignmentModal({ state, drivers, deliveries, onAssign, onStatusChange, onClose }: AssignmentModalProps) {
  if (!state) return null;

  const handleClose = () => onClose();

  const delivery = state.type === 'delivery' ? deliveries.find((d) => d.id === state.id) : null;
  const driver   = state.type === 'driver'   ? drivers.find((d) => d.id === state.id)   : null;

  if (state.type === 'delivery' && !delivery) return null;
  if (state.type === 'driver'   && !driver)   return null;

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className={state.type === 'driver' ? 'h-[min(84vh,46rem)] max-w-[min(100vw-1.5rem,58rem)] p-0' : 'h-[min(82vh,40rem)] max-w-[min(100vw-1.5rem,42rem)] p-0'}>
        {delivery && (
          <DeliveryView
            delivery={delivery}
            drivers={drivers}
            onAssign={(driverId) => {
              onAssign(delivery.id, driverId);
              handleClose();
            }}
            onUnassign={() => {
              onAssign(delivery.id, null);
              handleClose();
            }}
            onStatusChange={(status) => onStatusChange(delivery.id, status)}
            onClose={handleClose}
          />
        )}
        {driver && (
          <DriverView
            driver={driver}
            deliveries={deliveries}
            onAssign={(deliveryId) => onAssign(deliveryId, driver.id)}
            onUnassign={(deliveryId) => onAssign(deliveryId, null)}
            onStatusChange={onStatusChange}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
