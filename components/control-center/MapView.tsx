'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LiveDriver, DeliveryPoint, DriverStatus } from '@/types/vrp';
import {
  DEFAULT_MAP_CONFIG, MapConfig, MarkerShape,
  ROUTE_LINE_DASH,
  formatMissionLabel, getStatusColors, getDriverColors,
} from '@/lib/map-config';

interface MapViewProps {
  drivers: LiveDriver[];
  deliveries: DeliveryPoint[];
  /**
   * One-shot fly trigger. Token must change on each call so the same driverId can be re-focused
   * — the camera is otherwise free to be moved by the user.
   */
  flyToDriver?: { driverId: string; token: number } | null;
  /** When false, the entire driver layer (markers + routes) is hidden. */
  driversLayerVisible?: boolean;
  /** When false, the entire delivery layer (pickup + delivery markers + hover link) is hidden. */
  deliveriesLayerVisible?: boolean;
  /** Filter result — only these driver IDs are shown. `undefined` means all visible. */
  visibleDriverIds?: string[];
  /** Filter result — only these delivery IDs are shown. `undefined` means all visible. */
  visibleDeliveryIds?: string[];
  onDriverClick?: (driverId: string) => void;
  onDriverContextMenu?: (driverId: string) => void;
  onDeliveryClick?: (delivery: DeliveryPoint) => void;
  onDeliveryDoubleClick?: (delivery: DeliveryPoint) => void;
  onMapClick?: () => void;
  /** Driver currently in "quick-assign" mode — visual highlight + cursor swap. */
  pinnedDriverId?: string | null;
  /** Live map UI configuration. Defaults to DEFAULT_MAP_CONFIG when omitted. */
  mapConfig?: MapConfig;
  /**
   * One-shot trigger for the assignment animations.
   * - kind="assign"   → driver → delivery flow (welcoming visuals, route color)
   * - kind="unassign" → delivery → driver flow (release visuals, red caption)
   * The token must change on each call so re-firing the same pair re-plays the animation.
   */
  assignmentBurst?: { kind: 'assign' | 'unassign'; driverId: string; deliveryId: string; token: number } | null;
}

const CLICK_DBLCLICK_DELAY_MS = 220;

type LngLatTuple = [number, number];

// Live config shared by helpers below. The component keeps this in sync with the
// React prop on every render so module-scoped helpers always see fresh values.
// Single MapView instance per app — safe for our use case.
let activeConfig: MapConfig = DEFAULT_MAP_CONFIG;

const STATUS_CHIP_META: Record<DriverStatus, { label: string; pulse: boolean }> = {
  on_route: { label: 'En route',   pulse: false },
  paused:   { label: 'En pause',   pulse: false },
  delayed:  { label: 'Retard',     pulse: true  },
  idle:     { label: 'Disponible', pulse: false },
  offline:  { label: 'Hors ligne', pulse: false },
};

const STATUS_COLORS = new Proxy({} as Record<DeliveryPoint['status'], string>, {
  get: (_target, prop: string) => getStatusColors(activeConfig)[prop as DeliveryPoint['status']],
});

const STATUS_CHIP = new Proxy({} as Record<DriverStatus, { color: string; label: string; pulse: boolean }>, {
  get: (_target, prop: string) => {
    const status = prop as DriverStatus;
    const meta = STATUS_CHIP_META[status];
    if (!meta) return undefined;
    return { color: getDriverColors(activeConfig)[status], label: meta.label, pulse: meta.pulse };
  },
});
const DRIVER_MARKER_OFFSET: [number, number] = [0, -2];
const DELIVERY_MARKER_OFFSET: [number, number] = [0, -2];
const PICKUP_MARKER_OFFSET: [number, number] = [0, -2];

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'background-tiles', type: 'raster', source: 'carto-dark' }],
};

function deliveryBubbleBackground(color: string) {
  return `linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.04)), ${color}30`;
}

function deliveryBubbleShadow(color: string) {
  return `0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.24), 0 0 0 1px ${color}22`;
}

function pickupGlassBackground(color: string) {
  return `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.32), rgba(255,255,255,0.04) 60%), linear-gradient(135deg, ${color}55, ${color}22)`;
}

function pickupGlassShadow(color: string) {
  return `0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(0,0,0,0.18), 0 0 0 1px ${color}44, 0 0 14px ${color}30`;
}

function pickupHoverShadow(color: string) {
  return `0 12px 26px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.18), 0 0 0 1px ${color}77, 0 0 22px ${color}55`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function driverGlassBackground(color: string) {
  return `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04)), ${color}24`;
}

function driverGlassShadow(color: string) {
  return `0 10px 20px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${color}20`;
}

function enableSubpixelPositioning(marker: maplibregl.Marker) {
  const preciseMarker = marker as maplibregl.Marker & {
    setSubpixelPositioning?: (value: boolean) => maplibregl.Marker;
  };

  preciseMarker.setSubpixelPositioning?.(true);
  return marker;
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function interpolateLngLat(start: LngLatTuple, end: LngLatTuple, progress: number): LngLatTuple {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ];
}

function vehicleIconSVG(type: 'car' | 'bike' | 'truck', color: string): string {
  const c = color;
  switch (type) {
    case 'car':
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-4l2.5-6h13l2.5 6v4h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M7 11h10"/></svg>`;
    case 'bike':
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M5.5 14.5L9 8h6l3.5 4.5M12 17.5l-2-9.5"/></svg>`;
    case 'truck':
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/></svg>`;
  }
}

// ── Rich hover tooltip ──────────────────────────────────────────────────
// A single shared tooltip element lives in the map container. It's populated
// with HTML on mouseenter, repositioned on mousemove, and hidden on mouseleave.
// Kept in vanilla DOM to match the imperative marker code — no React state churn.

const VEHICLE_LABELS: Record<LiveDriver['vehicleType'], string> = {
  car: 'Voiture',
  bike: 'Vélo',
  truck: 'Camion',
};

const DELIVERY_STATUS_LABEL: Record<DeliveryPoint['status'], string> = {
  pending:     'En attente',
  preassigned: 'Préattribuée',
  assigned:    'Assignée',
  done:        'Livrée',
  at_risk:     'À risque',
};

// Mission pill label — driven by the active config (format + char count).
// Full code stays in the tooltip header regardless.
function shortMissionLabel(label: string): string {
  return formatMissionLabel(label, activeConfig.markers.label);
}

function ensureTooltipStyles() {
  if (document.getElementById('dm-tooltip-styles')) return;
  const s = document.createElement('style');
  s.id = 'dm-tooltip-styles';
  s.textContent = `
.dm-tooltip{
  position:absolute;left:0;top:0;
  pointer-events:none;
  z-index:9999;
  min-width:200px;max-width:280px;
  padding:10px 12px;
  border-radius:10px;
  background:linear-gradient(180deg, rgba(24,24,27,0.96), rgba(9,9,11,0.96));
  border:1px solid rgba(255,255,255,0.08);
  box-shadow:0 14px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter:blur(14px) saturate(160%);
  -webkit-backdrop-filter:blur(14px) saturate(160%);
  color:#e4e4e7;
  font:500 11.5px/1.45 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  letter-spacing:0.01em;
  opacity:0;
  transform:translate3d(0,0,0) translateY(4px);
  transition:opacity .12s ease, transform .12s ease;
}
.dm-tooltip[data-visible="1"]{opacity:1;transform:translate3d(0,0,0) translateY(0)}
.dm-tt-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.dm-tt-swatch{width:8px;height:8px;border-radius:999px;flex-shrink:0;box-shadow:0 0 8px currentColor}
.dm-tt-title{font-weight:700;font-size:12.5px;color:#fafafa;letter-spacing:-0.01em;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dm-tt-kicker{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:rgba(255,255,255,0.4)}
.dm-tt-row{display:flex;justify-content:space-between;gap:10px;align-items:baseline;padding:2px 0}
.dm-tt-label{color:rgba(255,255,255,0.42);font-size:10.5px;text-transform:uppercase;letter-spacing:0.08em;flex-shrink:0}
.dm-tt-value{color:#fafafa;font-weight:600;font-size:11.5px;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dm-tt-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.04em;border:1px solid currentColor}
.dm-tt-chip-dot{width:5px;height:5px;border-radius:999px;background:currentColor;box-shadow:0 0 6px currentColor}
.dm-tt-divider{height:1px;background:linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);margin:6px 0}
.dm-tt-hint{font-size:9.5px;color:rgba(255,255,255,0.35);margin-top:6px;letter-spacing:0.04em}
.dm-tt-hint kbd{display:inline-block;padding:0 4px;border-radius:3px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);font-family:inherit;font-size:9px;color:#d4d4d8}
.dm-tt-progress{height:4px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;margin-top:4px}
.dm-tt-progress>span{display:block;height:100%;border-radius:inherit;background:currentColor;box-shadow:0 0 8px currentColor}
  `;
  document.head.appendChild(s);
}

function ensureTooltipEl(container: HTMLElement): HTMLElement {
  ensureTooltipStyles();
  let el = container.querySelector<HTMLElement>(':scope > .dm-tooltip');
  if (el) return el;
  el = document.createElement('div');
  el.className = 'dm-tooltip';
  el.dataset.visible = '0';
  container.appendChild(el);
  return el;
}

function showTooltip(container: HTMLElement, html: string, evt: MouseEvent) {
  const tip = ensureTooltipEl(container);
  tip.innerHTML = html;
  tip.dataset.visible = '1';
  positionTooltip(container, tip, evt);
}

function positionTooltip(container: HTMLElement, tip: HTMLElement, evt: MouseEvent) {
  const cRect = container.getBoundingClientRect();
  const tRect = tip.getBoundingClientRect();
  const margin = 12;
  const offsetX = 14;
  const offsetY = -18;

  let x = evt.clientX - cRect.left + offsetX;
  let y = evt.clientY - cRect.top + offsetY;

  if (x + tRect.width + margin > cRect.width) {
    x = evt.clientX - cRect.left - tRect.width - offsetX;
  }
  if (y + tRect.height + margin > cRect.height) {
    y = cRect.height - tRect.height - margin;
  }
  if (y < margin) y = margin;
  if (x < margin) x = margin;

  tip.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function hideTooltip(container: HTMLElement) {
  const tip = container.querySelector<HTMLElement>(':scope > .dm-tooltip');
  if (tip) tip.dataset.visible = '0';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatEta(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

interface DriverAssignmentBreakdown {
  total: number;
  preassigned: number;
  assigned: number;
  atRisk: number;
  done: number;
}

function computeDriverAssignments(driverId: string, deliveries: Record<string, DeliveryPoint>): DriverAssignmentBreakdown {
  const breakdown: DriverAssignmentBreakdown = { total: 0, preassigned: 0, assigned: 0, atRisk: 0, done: 0 };
  for (const delivery of Object.values(deliveries)) {
    if (delivery.driverId !== driverId) continue;
    breakdown.total += 1;
    if (delivery.status === 'preassigned') breakdown.preassigned += 1;
    else if (delivery.status === 'assigned') breakdown.assigned += 1;
    else if (delivery.status === 'at_risk') breakdown.atRisk += 1;
    else if (delivery.status === 'done') breakdown.done += 1;
  }
  return breakdown;
}

function driverTooltipHTML(driver: LiveDriver, breakdown: DriverAssignmentBreakdown): string {
  const chip = STATUS_CHIP[driver.status];
  const loadPct = driver.maxLoad > 0 ? Math.min(100, Math.round((driver.currentLoad / driver.maxLoad) * 100)) : 0;
  const nextStop = driver.nextStop ? escapeHtml(driver.nextStop) : '—';

  // Colored count chips — shown only when non-zero, ordered by lifecycle.
  const countChips: string[] = [];
  if (breakdown.preassigned > 0) {
    countChips.push(`<span class="dm-tt-chip" style="color:${STATUS_COLORS.preassigned}"><span class="dm-tt-chip-dot"></span>${breakdown.preassigned} préatt.</span>`);
  }
  if (breakdown.assigned > 0) {
    countChips.push(`<span class="dm-tt-chip" style="color:${STATUS_COLORS.assigned}"><span class="dm-tt-chip-dot"></span>${breakdown.assigned} en cours</span>`);
  }
  if (breakdown.atRisk > 0) {
    countChips.push(`<span class="dm-tt-chip" style="color:${STATUS_COLORS.at_risk}"><span class="dm-tt-chip-dot"></span>${breakdown.atRisk} à risque</span>`);
  }
  if (breakdown.done > 0) {
    countChips.push(`<span class="dm-tt-chip" style="color:${STATUS_COLORS.done}"><span class="dm-tt-chip-dot"></span>${breakdown.done} livrée${breakdown.done > 1 ? 's' : ''}</span>`);
  }
  const chipsRow = countChips.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${countChips.join('')}</div>`
    : `<div class="dm-tt-hint" style="margin-top:0">Aucune mission active</div>`;

  return `
    <div class="dm-tt-header" style="color:${driver.routeColor}">
      <span class="dm-tt-swatch"></span>
      <div style="flex:1;min-width:0">
        <div class="dm-tt-kicker">Conducteur</div>
        <div class="dm-tt-title">${escapeHtml(driver.name)}</div>
      </div>
      <span class="dm-tt-chip" style="color:${chip.color}">
        <span class="dm-tt-chip-dot"></span>${chip.label}
      </span>
    </div>
    <div class="dm-tt-row"><span class="dm-tt-label">Véhicule</span><span class="dm-tt-value">${VEHICLE_LABELS[driver.vehicleType]}</span></div>
    <div class="dm-tt-row"><span class="dm-tt-label">ETA</span><span class="dm-tt-value">${formatEta(driver.eta)}</span></div>
    <div class="dm-tt-row"><span class="dm-tt-label">Prochain arrêt</span><span class="dm-tt-value">${nextStop}</span></div>
    <div class="dm-tt-divider"></div>
    <div class="dm-tt-row"><span class="dm-tt-label">Charge</span><span class="dm-tt-value">${driver.currentLoad} / ${driver.maxLoad}</span></div>
    <div style="color:${driver.routeColor}"><div class="dm-tt-progress"><span style="width:${loadPct}%"></span></div></div>
    <div class="dm-tt-row" style="margin-top:6px"><span class="dm-tt-label">Missions</span><span class="dm-tt-value">${breakdown.total}</span></div>
    ${chipsRow}
    <div class="dm-tt-hint">Clic : focus carte · Clic droit : actions</div>
  `;
}

// Two-leg block — shows enlèvement + livraison sections side-by-side with a vertical
// connector. The `accent` arg controls which leg is visually emphasized (the one
// the user is currently hovering).
function legSectionsHTML(delivery: DeliveryPoint, accent: 'pickup' | 'delivery'): string {
  const pickupAddr = delivery.pickupAddress ?? 'Adresse non renseignée';
  const pickupActive = accent === 'pickup';
  const deliveryActive = accent === 'delivery';

  // Each leg shows: kind, address, with a small connector dot. Window is shared (delivery's TW
  // is the contract; pickup happens before).
  const legBlock = (kind: 'pickup' | 'delivery', addr: string, hasGeo: boolean) => {
    const isPickup = kind === 'pickup';
    const active = (isPickup && pickupActive) || (!isPickup && deliveryActive);
    const opacity = active ? 1 : 0.6;
    const dotStyle = isPickup
      ? `width:8px;height:8px;background:transparent;border:1.5px dashed #f97316;border-radius:2px;transform:rotate(45deg)`
      : `width:8px;height:8px;background:#f97316;border-radius:999px;box-shadow:0 0 6px #f97316`;
    const label = isPickup ? 'Enlèvement' : 'Livraison';
    const addrHtml = hasGeo ? escapeHtml(addr) : `<span style="color:rgba(255,255,255,0.35)">${escapeHtml(addr)}</span>`;
    return `
      <div style="display:flex;gap:8px;align-items:flex-start;opacity:${opacity}">
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:3px">
          <span style="${dotStyle}"></span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="dm-tt-label" style="margin-bottom:1px">${label}${active ? ' ·' : ''}</div>
          <div style="font-weight:600;font-size:11.5px;color:#fafafa;line-height:1.3;word-break:break-word">${addrHtml}</div>
        </div>
      </div>
    `;
  };

  // Vertical connector between the two legs
  const connector = `
    <div style="display:flex;gap:8px;align-items:stretch;height:10px">
      <div style="width:8px;display:flex;justify-content:center;flex-shrink:0">
        <span style="width:1px;background:linear-gradient(180deg, #f97316aa, #f9731644);"></span>
      </div>
      <div style="flex:1"></div>
    </div>
  `;

  return `
    <div style="display:flex;flex-direction:column;gap:0">
      ${legBlock('pickup', pickupAddr, !!delivery.pickupLocation)}
      ${connector}
      ${legBlock('delivery', delivery.address, true)}
    </div>
  `;
}

function deliveryTooltipHTML(delivery: DeliveryPoint, driver: LiveDriver | undefined): string {
  const color = STATUS_COLORS[delivery.status];
  const driverLabel = delivery.driverId
    ? (driver ? escapeHtml(driver.name) : `#${escapeHtml(delivery.driverId)}`)
    : 'Non assignée';
  return `
    <div class="dm-tt-header" style="color:${color}">
      <span class="dm-tt-swatch"></span>
      <div style="flex:1;min-width:0">
        <div class="dm-tt-kicker">Mission · ${escapeHtml(delivery.label)}</div>
        <div class="dm-tt-title">Livraison ciblée</div>
      </div>
      <span class="dm-tt-chip" style="color:${color}">
        <span class="dm-tt-chip-dot"></span>${DELIVERY_STATUS_LABEL[delivery.status]}
      </span>
    </div>
    ${legSectionsHTML(delivery, 'delivery')}
    <div class="dm-tt-divider"></div>
    <div class="dm-tt-row"><span class="dm-tt-label">Créneau</span><span class="dm-tt-value">${escapeHtml(delivery.timeWindowStart)} — ${escapeHtml(delivery.timeWindowEnd)}</span></div>
    <div class="dm-tt-row"><span class="dm-tt-label">Conducteur</span><span class="dm-tt-value" style="color:${driver ? driver.routeColor : '#a1a1aa'}">${driverLabel}</span></div>
    <div class="dm-tt-hint">Clic : détails · Double-clic : désassigner</div>
  `;
}

function pickupTooltipHTML(delivery: DeliveryPoint, driver: LiveDriver | undefined): string {
  const color = STATUS_COLORS[delivery.status];
  const driverLabel = delivery.driverId
    ? (driver ? escapeHtml(driver.name) : `#${escapeHtml(delivery.driverId)}`)
    : 'Non assignée';
  return `
    <div class="dm-tt-header" style="color:${color}">
      <span class="dm-tt-swatch"></span>
      <div style="flex:1;min-width:0">
        <div class="dm-tt-kicker">Mission · ${escapeHtml(delivery.label)}</div>
        <div class="dm-tt-title">Enlèvement ciblé</div>
      </div>
      <span class="dm-tt-chip" style="color:${color}">
        <span class="dm-tt-chip-dot"></span>${DELIVERY_STATUS_LABEL[delivery.status]}
      </span>
    </div>
    ${legSectionsHTML(delivery, 'pickup')}
    <div class="dm-tt-divider"></div>
    <div class="dm-tt-row"><span class="dm-tt-label">Créneau</span><span class="dm-tt-value">${escapeHtml(delivery.timeWindowStart)} — ${escapeHtml(delivery.timeWindowEnd)}</span></div>
    <div class="dm-tt-row"><span class="dm-tt-label">Conducteur</span><span class="dm-tt-value" style="color:${driver ? driver.routeColor : '#a1a1aa'}">${driverLabel}</span></div>
    <div class="dm-tt-hint">Lien orange = enlèvement → livraison</div>
  `;
}

function attachDriverTooltip(
  el: HTMLElement,
  driverId: string,
  container: HTMLElement,
  driversRef: React.MutableRefObject<Record<string, LiveDriver>>,
  deliveriesRef: React.MutableRefObject<Record<string, DeliveryPoint>>,
) {
  el.addEventListener('mouseenter', (e) => {
    const driver = driversRef.current[driverId];
    if (!driver) return;
    const breakdown = computeDriverAssignments(driverId, deliveriesRef.current);
    showTooltip(container, driverTooltipHTML(driver, breakdown), e as MouseEvent);
  });
  el.addEventListener('mousemove', (e) => {
    const tip = container.querySelector<HTMLElement>(':scope > .dm-tooltip');
    if (tip && tip.dataset.visible === '1') positionTooltip(container, tip, e as MouseEvent);
  });
  el.addEventListener('mouseleave', () => hideTooltip(container));
}

function attachDeliveryTooltip(
  el: HTMLElement,
  deliveryId: string,
  kind: 'delivery' | 'pickup',
  container: HTMLElement,
  deliveriesRef: React.MutableRefObject<Record<string, DeliveryPoint>>,
  driversRef: React.MutableRefObject<Record<string, LiveDriver>>,
) {
  el.addEventListener('mouseenter', (e) => {
    const delivery = deliveriesRef.current[deliveryId];
    if (!delivery) return;
    const driver = delivery.driverId ? driversRef.current[delivery.driverId] : undefined;
    const html = kind === 'delivery'
      ? deliveryTooltipHTML(delivery, driver)
      : pickupTooltipHTML(delivery, driver);
    showTooltip(container, html, e as MouseEvent);
  });
  el.addEventListener('mousemove', (e) => {
    const tip = container.querySelector<HTMLElement>(':scope > .dm-tooltip');
    if (tip && tip.dataset.visible === '1') positionTooltip(container, tip, e as MouseEvent);
  });
  el.addEventListener('mouseleave', () => hideTooltip(container));
}

// ── Quick-assign celebration animation ─────────────────────────────────
// Designed to feel: fast (<1s key visuals), highly readable, integrated.
// Sequence:
//   t=0    driver pin sends a colored ring pulse + a glowing particle launches
//   t=320  particle arrives at delivery → bubble bounces, two concentric rings burst,
//          ephemeral caption "→ {driver name}" floats up in route color
//   t=420  if pickup exists, second leg launches delivery → pickup with same celebration
// All temporary DOM is appended to a dedicated `.dm-anim` overlay layer above markers
// and removed via animation `onfinish` to avoid leaks.

function ensureAnimOverlay(container: HTMLElement): HTMLElement {
  let overlay = container.querySelector<HTMLElement>(':scope > .dm-anim');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'dm-anim';
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:9000;overflow:hidden';
  container.appendChild(overlay);
  return overlay;
}

function spawnPulseRing(host: HTMLElement | undefined | null, color: string, finalScale: number, delay = 0) {
  if (!host) return;
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute;left:50%;top:50%;
    width:30px;height:30px;border-radius:999px;
    border:2px solid ${color};
    box-shadow:0 0 14px ${color}cc, inset 0 0 6px ${color}66;
    transform:translate(-50%,-50%) scale(0.45);
    opacity:0;
    pointer-events:none;
    will-change:transform,opacity;
  `;
  host.appendChild(ring);
  ring.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.45)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1)',    opacity: 0.95, offset: 0.18 },
      { transform: `translate(-50%,-50%) scale(${finalScale})`, opacity: 0 },
    ],
    { duration: 720, delay, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' },
  ).onfinish = () => ring.remove();
}

function spawnTravelingParticle(
  overlay: HTMLElement,
  fromX: number, fromY: number, toX: number, toY: number,
  color: string,
  durationMs: number,
  delay = 0,
) {
  const particle = document.createElement('div');
  particle.style.cssText = `
    position:absolute;left:0;top:0;
    width:12px;height:12px;border-radius:999px;
    background:radial-gradient(circle, #ffffff 0%, ${color} 55%, ${color}00 100%);
    box-shadow:0 0 12px ${color}, 0 0 24px ${color}aa;
    transform:translate3d(${fromX - 6}px, ${fromY - 6}px, 0);
    will-change:transform,opacity;
    pointer-events:none;
  `;
  overlay.appendChild(particle);

  particle.animate(
    [
      { transform: `translate3d(${fromX - 6}px, ${fromY - 6}px, 0) scale(0.6)`, opacity: 0 },
      { transform: `translate3d(${fromX - 6}px, ${fromY - 6}px, 0) scale(1)`, opacity: 1, offset: 0.12 },
      { transform: `translate3d(${toX - 6}px, ${toY - 6}px, 0) scale(1)`, opacity: 1, offset: 0.85 },
      { transform: `translate3d(${toX - 6}px, ${toY - 6}px, 0) scale(2.2)`, opacity: 0 },
    ],
    { duration: durationMs, delay, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' },
  ).onfinish = () => particle.remove();
}

function spawnTrailStreak(
  overlay: HTMLElement,
  fromX: number, fromY: number, toX: number, toY: number,
  color: string,
  durationMs: number,
  delay = 0,
) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none';

  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', String(fromX));
  line.setAttribute('y1', String(fromY));
  line.setAttribute('x2', String(toX));
  line.setAttribute('y2', String(toY));
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-dasharray', '4 8');
  line.setAttribute('opacity', '0');
  line.style.filter = `drop-shadow(0 0 6px ${color})`;

  svg.appendChild(line);
  overlay.appendChild(svg);

  line.animate(
    [
      { opacity: 0, strokeDashoffset: 60 },
      { opacity: 0.85, strokeDashoffset: 30, offset: 0.4 },
      { opacity: 0, strokeDashoffset: 0 },
    ],
    { duration: durationMs, delay, easing: 'ease-out', fill: 'forwards' },
  ).onfinish = () => svg.remove();
}

function bounceMissionBubble(host: HTMLElement | undefined | null, color: string) {
  if (!host) return;
  const isPickup = !!host.querySelector('.pickup-bubble');
  const bubble = host.querySelector(isPickup ? '.pickup-bubble' : '.mission-bubble') as HTMLElement | null;
  if (!bubble) return;
  const baseTransform = isPickup ? 'rotate(45deg)' : '';
  bubble.animate(
    [
      { transform: `${baseTransform} scale(1)`, filter: 'brightness(1) saturate(1)' },
      { transform: `${baseTransform} scale(1.45)`, filter: `brightness(1.6) saturate(1.4) drop-shadow(0 0 12px ${color})`, offset: 0.32 },
      { transform: `${baseTransform} scale(0.95)`, filter: 'brightness(1.1) saturate(1.1)', offset: 0.65 },
      { transform: `${baseTransform} scale(1)`, filter: 'brightness(1) saturate(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  );
}

function bounceDriverIcon(host: HTMLElement | undefined | null, color: string) {
  if (!host) return;
  const icon = host.querySelector('.dm-icon') as HTMLElement | null;
  if (!icon) return;
  icon.animate(
    [
      { transform: 'translate(-50%,-50%) scale(1)', filter: `drop-shadow(0 0 10px ${color}88)` },
      { transform: 'translate(-50%,-50%) scale(1.25)', filter: `drop-shadow(0 0 18px ${color})`, offset: 0.4 },
      { transform: 'translate(-50%,-50%) scale(1)', filter: `drop-shadow(0 0 10px ${color}88)` },
    ],
    { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  );
}

function spawnFloatingCaption(overlay: HTMLElement, x: number, y: number, text: string, color: string) {
  const cap = document.createElement('div');
  cap.textContent = text;
  cap.style.cssText = `
    position:absolute;left:${x}px;top:${y - 28}px;
    transform:translate(-50%, 0);
    padding:5px 10px 5px 8px;
    border-radius:999px;
    background:linear-gradient(180deg, rgba(24,24,27,0.94), rgba(9,9,11,0.94));
    border:1px solid ${color}66;
    box-shadow:0 8px 22px rgba(0,0,0,0.5), 0 0 18px ${color}55;
    color:#fafafa;
    font:700 11px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;
    letter-spacing:0.04em;
    white-space:nowrap;
    backdrop-filter:blur(10px);
    -webkit-backdrop-filter:blur(10px);
    opacity:0;
    pointer-events:none;
    will-change:transform,opacity;
  `;
  overlay.appendChild(cap);
  cap.animate(
    [
      { opacity: 0, transform: 'translate(-50%, 6px) scale(0.92)' },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.18 },
      { opacity: 1, transform: 'translate(-50%, -14px) scale(1)', offset: 0.7 },
      { opacity: 0, transform: 'translate(-50%, -26px) scale(0.96)' },
    ],
    { duration: 1100, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' },
  ).onfinish = () => cap.remove();
}

function playAssignmentAnimation(
  map: maplibregl.Map,
  driver: LiveDriver,
  delivery: DeliveryPoint,
  driverEl: HTMLElement | undefined,
  deliveryEl: HTMLElement | undefined,
  pickupEl: HTMLElement | undefined,
) {
  const overlay = ensureAnimOverlay(map.getContainer());
  const fromPx = map.project([driver.position.lng, driver.position.lat]);
  const toPx = map.project(delivery.location);

  // 1. Driver pulse + small icon bump
  spawnPulseRing(driverEl, driver.routeColor, 1.9);
  bounceDriverIcon(driverEl, driver.routeColor);

  // 2. Trail + traveling particle (~320ms transit)
  spawnTrailStreak(overlay, fromPx.x, fromPx.y, toPx.x, toPx.y, driver.routeColor, 700);
  spawnTravelingParticle(overlay, fromPx.x, fromPx.y, toPx.x, toPx.y, driver.routeColor, 360);

  // 3. Delivery reception
  window.setTimeout(() => {
    spawnPulseRing(deliveryEl, driver.routeColor, 1.9);
    spawnPulseRing(deliveryEl, driver.routeColor, 2.7, 110);
    bounceMissionBubble(deliveryEl, driver.routeColor);
    spawnFloatingCaption(overlay, toPx.x, toPx.y, `→ ${driver.name}`, driver.routeColor);
  }, 320);

  // 4. Second leg to pickup if it exists
  if (delivery.pickupLocation && pickupEl) {
    const pickupPx = map.project(delivery.pickupLocation);
    spawnTrailStreak(overlay, toPx.x, toPx.y, pickupPx.x, pickupPx.y, driver.routeColor, 600, 380);
    spawnTravelingParticle(overlay, toPx.x, toPx.y, pickupPx.x, pickupPx.y, driver.routeColor, 320, 380);
    window.setTimeout(() => {
      spawnPulseRing(pickupEl, driver.routeColor, 1.7);
      bounceMissionBubble(pickupEl, driver.routeColor);
    }, 700);
  }
}

// Mirror of playAssignmentAnimation but inverted: the mission "releases" the driver.
// Direction reverses (pickup → delivery → driver), particles desaturate, the bubble does
// a sharp shake-shrink to read as "detached", and the caption is red with an ✕ glyph.
const UNASSIGN_RED = '#ef4444';

function shakeReleaseBubble(host: HTMLElement | undefined | null) {
  if (!host) return;
  const isPickup = !!host.querySelector('.pickup-bubble');
  const bubble = host.querySelector(isPickup ? '.pickup-bubble' : '.mission-bubble') as HTMLElement | null;
  if (!bubble) return;
  const baseTransform = isPickup ? 'rotate(45deg)' : '';
  bubble.animate(
    [
      { transform: `${baseTransform} scale(1) translateX(0)`, filter: 'saturate(1) brightness(1)' },
      { transform: `${baseTransform} scale(1.18) translateX(-2px)`, filter: 'saturate(1.2) brightness(1.3)', offset: 0.18 },
      { transform: `${baseTransform} scale(1.05) translateX(2px)`, offset: 0.34 },
      { transform: `${baseTransform} scale(0.85) translateX(-1px)`, filter: 'saturate(0.4) brightness(0.85)', offset: 0.62 },
      { transform: `${baseTransform} scale(1) translateX(0)`, filter: 'saturate(1) brightness(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  );
}

function spawnSeverRing(host: HTMLElement | undefined | null, color: string) {
  // Concentric red ring that contracts inward then snaps — feels like a "lock breaking".
  if (!host) return;
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute;left:50%;top:50%;
    width:30px;height:30px;border-radius:999px;
    border:2px dashed ${color};
    transform:translate(-50%,-50%) scale(2);
    opacity:0;
    pointer-events:none;
    will-change:transform,opacity;
  `;
  host.appendChild(ring);
  ring.animate(
    [
      { transform: 'translate(-50%,-50%) scale(2.2) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.1) rotate(90deg)', opacity: 0.9, offset: 0.55 },
      { transform: 'translate(-50%,-50%) scale(1.6) rotate(180deg)', opacity: 0 },
    ],
    { duration: 620, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' },
  ).onfinish = () => ring.remove();
}

function playUnassignmentAnimation(
  map: maplibregl.Map,
  driver: LiveDriver,
  delivery: DeliveryPoint,
  driverEl: HTMLElement | undefined,
  deliveryEl: HTMLElement | undefined,
  pickupEl: HTMLElement | undefined,
) {
  const overlay = ensureAnimOverlay(map.getContainer());
  const driverPx = map.project([driver.position.lng, driver.position.lat]);
  const deliveryPx = map.project(delivery.location);

  // 1. Source side (delivery + pickup) — sever ring + shake. The mission "lets go".
  spawnSeverRing(deliveryEl, UNASSIGN_RED);
  shakeReleaseBubble(deliveryEl);
  if (pickupEl) {
    spawnSeverRing(pickupEl, UNASSIGN_RED);
    shakeReleaseBubble(pickupEl);
  }

  // 2. Pickup → delivery first (if exists) so the chain returns to the driver
  if (delivery.pickupLocation && pickupEl) {
    const pickupPx = map.project(delivery.pickupLocation);
    spawnTrailStreak(overlay, pickupPx.x, pickupPx.y, deliveryPx.x, deliveryPx.y, driver.routeColor, 480);
    spawnTravelingParticle(overlay, pickupPx.x, pickupPx.y, deliveryPx.x, deliveryPx.y, driver.routeColor, 280);
  }

  // 3. Return leg: delivery → driver, slightly delayed if pickup chain is in flight
  const returnDelay = delivery.pickupLocation && pickupEl ? 220 : 60;
  spawnTrailStreak(overlay, deliveryPx.x, deliveryPx.y, driverPx.x, driverPx.y, driver.routeColor, 600, returnDelay);
  spawnTravelingParticle(overlay, deliveryPx.x, deliveryPx.y, driverPx.x, driverPx.y, driver.routeColor, 340, returnDelay);

  // 4. Red ✕ caption rises from the delivery — reads as "detached" at a glance
  spawnFloatingCaption(overlay, deliveryPx.x, deliveryPx.y, `✕ ${driver.name}`, UNASSIGN_RED);

  // 5. Driver "release" pulse — a single muted ring, no icon bump (he's lost the job, not gained one)
  window.setTimeout(() => {
    spawnPulseRing(driverEl, UNASSIGN_RED, 1.6);
  }, returnDelay + 300);
}

// Inject keyframes + global pin styles once
function ensureStyles() {
  if (document.getElementById('dm-styles')) return;
  const s = document.createElement('style');
  s.id = 'dm-styles';
  // NB: Never set `transition` or `transform` on the marker wraps (.dm-wrap/.mission-wrap/.pickup-wrap)
  // — MapLibre owns their `transform: translate()` and updates it every frame during pan/zoom.
  // A transition on transform causes the markers to lag the map; setting transform on :active
  // overwrites the translate and detaches them from their geo coords entirely.
  s.textContent = `
@keyframes dm-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
@keyframes dm-pin-pulse{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.18);opacity:1}}

/* Subtle hover/active feedback — only the filter changes, the wrap's transform stays untouched. */
.dm-wrap,.mission-wrap,.pickup-wrap{transition:filter .15s ease}
.dm-wrap:hover,.mission-wrap:hover,.pickup-wrap:hover{filter:drop-shadow(0 0 6px rgba(255,255,255,.22))}
.dm-wrap:active,.mission-wrap:active,.pickup-wrap:active{filter:drop-shadow(0 0 2px rgba(255,255,255,.45)) brightness(1.1)}

/* Quick-assign mode — crosshair on map and stronger pulse on missions */
.map-pin-mode .maplibregl-canvas-container,
.map-pin-mode .mission-wrap,
.map-pin-mode .pickup-wrap{cursor:crosshair !important}
.map-pin-mode .mission-wrap:hover,
.map-pin-mode .pickup-wrap:hover{filter:drop-shadow(0 0 10px rgba(56,189,248,.55))}
  `;
  document.head.appendChild(s);
}

function createDriverMarkerEl(driver: LiveDriver): HTMLElement {
  ensureStyles();

  // Outer wrap — MapLibre sets its translate() transform AND position:absolute/top:0/left:0
  // via the .maplibregl-marker class. Do NOT override `position`, `top`/`left` or `transform`
  // here. In particular, NEVER set `position:relative` — it pulls the wrap back into normal flow
  // and the markers drift as MapLibre adds/removes tile DOM during zoom. The .maplibregl-marker's
  // `position:absolute` already provides the positioning context the absolute children need.
  const driverSpec = activeConfig.markers.driver;
  const dSize = driverSpec.size;
  const shellSize = Math.max(20, Math.round(dSize * 0.82));
  const wrap = document.createElement('div');
  wrap.className = 'dm-wrap';
  wrap.dataset.driverId = driver.id;
  wrap.style.cssText = `width:${dSize}px;height:${dSize}px;box-sizing:border-box;cursor:pointer;opacity:${driverSpec.opacity};transition:opacity 0.25s ease`;

  // Quick-assign ring — hidden by default, animated when this driver is pinned.
  const ring = document.createElement('div');
  ring.className = 'dm-pin-ring';
  ring.style.cssText = `
    position:absolute;inset:-7px;
    border-radius:999px;
    border:2px solid ${driver.routeColor};
    box-shadow:0 0 18px ${driver.routeColor}aa, inset 0 0 6px ${driver.routeColor}55;
    pointer-events:none;
    opacity:0;
    transform-origin:center center;
    transition:opacity 0.18s ease;
  `;

  const shell = document.createElement('div');
  shell.className = 'dm-shell';
  const shellShape = shapeGeometry(driverSpec.shape);
  shell.style.cssText = `
    position:absolute;left:50%;top:50%;
    transform:translate(-50%,-50%) ${shellShape.transform === 'none' ? '' : shellShape.transform};
    width:${shellSize}px;height:${shellSize}px;
    border-radius:${shellShape.borderRadius};
    clip-path:${shellShape.clipPath};
    background:${driverGlassBackground(driver.routeColor)};
    border:1px solid ${driver.routeColor}33;
    box-shadow:${driverGlassShadow(driver.routeColor)};
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    pointer-events:none;
  `;

  const shouldPulse = STATUS_CHIP[driver.status].pulse && activeConfig.markers.driver.pulseDelayed;
  const status = document.createElement('div');
  status.className = 'dm-status';
  status.title = STATUS_CHIP[driver.status].label;
  status.style.cssText = `
    position:absolute;right:1px;bottom:2px;
    width:10px;height:10px;border-radius:999px;
    background:${STATUS_CHIP[driver.status].color};
    border:1.5px solid rgba(24,24,27,0.95);
    box-shadow:0 0 0 1px rgba(255,255,255,0.06);
    display:${activeConfig.markers.driver.showStatusDot ? 'block' : 'none'};
    ${shouldPulse ? 'animation:dm-pulse 1.5s ease-in-out infinite;' : ''}
    pointer-events:none;
  `;

  // Vehicle icon — centered and rendered without any outer badge.
  const icon = document.createElement('div');
  icon.className = 'dm-icon';
  icon.title = `${driver.name} - ${STATUS_CHIP[driver.status].label}`;
  icon.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    display:flex;align-items:center;justify-content:center;pointer-events:none;
    transform-origin:center center;
    line-height:0;
    filter:drop-shadow(0 0 10px ${driver.routeColor}88) drop-shadow(0 4px 10px rgba(0,0,0,0.3));
  `;
  icon.innerHTML = vehicleIconSVG(driver.vehicleType, driver.routeColor);

  wrap.appendChild(ring);
  wrap.appendChild(shell);
  wrap.appendChild(icon);
  wrap.appendChild(status);
  return wrap;
}

function applyPinnedRing(el: HTMLElement, color: string, pinned: boolean) {
  const ring = el.querySelector('.dm-pin-ring') as HTMLElement | null;
  if (!ring) return;
  ring.style.borderColor = color;
  ring.style.boxShadow = `0 0 18px ${color}aa, inset 0 0 6px ${color}55`;

  if (pinned) {
    // Mark the desired state via dataset so the WAAPI onfinish handler can verify
    // we're still pinned before kicking off the infinite breathing — otherwise a
    // rapid toggle could leave the ring breathing while invisible.
    ring.dataset.pinned = '1';
    ring.style.opacity = '1';
    ring.style.animation = 'none';
    const enter = ring.animate(
      [
        { transform: 'scale(0.55)', opacity: 0 },
        { transform: 'scale(1.14)', opacity: 1, offset: 0.65 },
        { transform: 'scale(1)',    opacity: 1 },
      ],
      { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
    enter.onfinish = () => {
      if (ring.dataset.pinned === '1') {
        ring.style.animation = 'dm-pin-pulse 1.4s ease-in-out infinite';
      }
    };
  } else {
    delete ring.dataset.pinned;
    ring.style.opacity = '0';
    ring.style.animation = '';
  }
}

// Splits raw click into click + dblclick. Browser dblclick already implies click,
// so we delay the click action and cancel it if a dblclick lands within the window.
function bindClickAndDouble(
  el: HTMLElement,
  onClick: () => void,
  onDouble: () => void,
) {
  let pendingClick: ReturnType<typeof setTimeout> | null = null;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pendingClick) clearTimeout(pendingClick);
    pendingClick = setTimeout(() => {
      pendingClick = null;
      onClick();
    }, CLICK_DBLCLICK_DELAY_MS);
  });
  el.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pendingClick) {
      clearTimeout(pendingClick);
      pendingClick = null;
    }
    onDouble();
  });
}

// ── Shape helpers ─────────────────────────────────────────────────────────
// Apply the chosen shape's geometry to the bubble and counter-rotate the label
// when the shape rotates so the text stays upright.

interface ShapeGeometry { borderRadius: string; transform: string; clipPath: string }

function shapeGeometry(shape: MarkerShape): ShapeGeometry {
  switch (shape) {
    case 'circle':
      return { borderRadius: '50%', transform: 'none', clipPath: 'none' };
    case 'diamond':
      return { borderRadius: '4px', transform: 'rotate(45deg) scale(0.72)', clipPath: 'none' };
    case 'rounded-square':
      return { borderRadius: '22%', transform: 'none', clipPath: 'none' };
    case 'hexagon':
      return { borderRadius: '4px', transform: 'none', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' };
    case 'pin':
      return { borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', clipPath: 'none' };
  }
}

function labelCounterTransform(shape: MarkerShape): string {
  switch (shape) {
    case 'diamond': return 'rotate(-45deg)';
    case 'pin':     return 'rotate(45deg)';
    default:        return 'none';
  }
}

function applyBubbleShape(bubble: HTMLElement, label: HTMLElement | null, shape: MarkerShape) {
  const g = shapeGeometry(shape);
  bubble.style.borderRadius = g.borderRadius;
  bubble.style.clipPath = g.clipPath;
  // Preserve any baseline transform like rotate(45deg) for legacy diamond pickup.
  // We always overwrite — the source of truth is the shape config now.
  bubble.style.transform = g.transform;
  if (label) label.style.transform = labelCounterTransform(shape);
}

function createDeliveryMarkerEl(delivery: DeliveryPoint): HTMLElement {
  const color = STATUS_COLORS[delivery.status];
  const spec = activeConfig.markers.delivery;
  const size = spec.size;
  const wrap = document.createElement('div');
  wrap.className = 'mission-wrap';
  wrap.style.cssText = `width:${size}px;height:${size}px;box-sizing:border-box;cursor:pointer;opacity:${spec.opacity};transition:opacity 0.25s ease`;

  const bubble = document.createElement('div');
  bubble.className = 'mission-bubble';
  bubble.style.cssText = `
    position:absolute;inset:0;
    box-sizing:border-box;
    background:${deliveryBubbleBackground(color)};
    border:1px solid rgba(255,255,255,0.16);
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.max(9, Math.round(size * 0.32))}px;font-weight:800;color:white;letter-spacing:-0.5px;
    line-height:1;
    font-family:sans-serif;
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    box-shadow:${deliveryBubbleShadow(color)};
    transition:box-shadow 0.15s ease;
    transform-origin:center center;
    pointer-events:none;
  `;
  bubble.textContent = shortMissionLabel(delivery.label);
  applyBubbleShape(bubble, null, spec.shape);

  wrap.appendChild(bubble);
  return wrap;
}

function applyDeliveryMarkerState(marker: maplibregl.Marker, delivery: DeliveryPoint) {
  marker.setLngLat(delivery.location);

  const bubble = marker.getElement().querySelector('.mission-bubble') as HTMLElement | null;
  if (!bubble) return;

  const color = STATUS_COLORS[delivery.status];
  bubble.textContent = shortMissionLabel(delivery.label);
  bubble.style.background = deliveryBubbleBackground(color);
  bubble.style.boxShadow = deliveryBubbleShadow(color);
  applyBubbleShape(bubble, null, activeConfig.markers.delivery.shape);
}

function createPickupMarkerEl(delivery: DeliveryPoint): HTMLElement {
  const color = STATUS_COLORS[delivery.status];
  const spec = activeConfig.markers.pickup;
  const size = spec.size;
  const wrap = document.createElement('div');
  wrap.className = 'pickup-wrap';
  wrap.style.cssText = `
    width:${size}px;height:${size}px;
    box-sizing:border-box;cursor:pointer;
    display:grid;place-items:center;
    opacity:${spec.opacity};
    transition:opacity 0.25s ease;
  `;

  const bubble = document.createElement('div');
  bubble.className = 'pickup-bubble';
  bubble.style.cssText = `
    position:relative;
    width:${size}px;height:${size}px;
    transform-origin:center center;
    box-sizing:border-box;
    background:${pickupGlassBackground(color)};
    border:1px solid ${color}55;
    box-shadow:${pickupGlassShadow(color)};
    backdrop-filter:blur(14px) saturate(180%);
    -webkit-backdrop-filter:blur(14px) saturate(180%);
    transition:box-shadow 0.18s ease, background 0.2s ease, border-color 0.2s ease;
    pointer-events:none;
  `;

  // Counter-rotate the label so text stays upright when the bubble shape rotates.
  const label = document.createElement('div');
  label.className = 'pickup-label';
  label.style.cssText = `
    position:absolute;inset:0;
    display:grid;place-items:center;
    font-size:${Math.max(9, Math.round(size * 0.32))}px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;
    line-height:1;font-family:sans-serif;
    text-shadow:0 1px 2px rgba(0,0,0,0.55);
    pointer-events:none;
  `;
  label.textContent = shortMissionLabel(delivery.label);
  bubble.appendChild(label);
  applyBubbleShape(bubble, label, spec.shape);

  wrap.appendChild(bubble);
  return wrap;
}

function applyPickupMarkerState(marker: maplibregl.Marker, delivery: DeliveryPoint) {
  if (!delivery.pickupLocation) return;
  marker.setLngLat(delivery.pickupLocation);

  const el = marker.getElement();
  const bubble = el.querySelector('.pickup-bubble') as HTMLElement | null;
  const label = el.querySelector('.pickup-label') as HTMLElement | null;

  if (bubble) {
    const color = STATUS_COLORS[delivery.status];
    bubble.style.background = pickupGlassBackground(color);
    bubble.style.boxShadow = pickupGlassShadow(color);
    bubble.style.borderColor = `${color}55`;
  }
  if (label) label.textContent = shortMissionLabel(delivery.label);
  if (bubble) applyBubbleShape(bubble, label, activeConfig.markers.pickup.shape);
}

// ── Snake animation engine ───────────────────────────────────────────────
// A bright "head" travels from pickup → delivery via line-gradient.
// Requires `lineMetrics: true` on the source.
const SNAKE_CYCLE_MS = 1800;
const SNAKE_TAIL = 0.22;
const SNAKE_FADE = 0.005;

const snakeState: { rafId: number | null; startedAt: number; color: string; map: maplibregl.Map | null } = {
  rafId: null,
  startedAt: 0,
  color: '#f97316',
  map: null,
};

function buildSnakeGradient(headRaw: number, color: string): unknown[] {
  // headRaw goes 0 → 1 + SNAKE_TAIL so the snake fully exits the line before restarting.
  const { r, g, b } = hexToRgb(color);
  const colTrans = `rgba(${r},${g},${b},0)`;
  const colTail  = `rgba(${r},${g},${b},0.55)`;
  const colHead  = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)},1)`;

  const tailStart = Math.max(0, Math.min(1, headRaw - SNAKE_TAIL));
  const tailEnd   = Math.max(0, Math.min(1, headRaw));

  const stops: (number | string)[] = [];

  if (tailStart > SNAKE_FADE) {
    stops.push(0, colTrans);
    stops.push(tailStart - SNAKE_FADE, colTrans);
    stops.push(tailStart, colTail);
  } else if (tailStart > 0) {
    stops.push(0, colTrans);
    stops.push(tailStart, colTail);
  } else {
    stops.push(0, colTail);
  }

  if (tailEnd > tailStart) {
    stops.push(tailEnd, colHead);
  } else {
    // Snake fully off-screen — keep a strictly-increasing 2-stop gradient.
    stops.push(1, colTrans);
    return ['interpolate', ['linear'], ['line-progress'], ...stops];
  }

  if (tailEnd < 1 - SNAKE_FADE) {
    stops.push(tailEnd + SNAKE_FADE, colTrans);
    stops.push(1, colTrans);
  } else if (tailEnd < 1) {
    stops.push(1, colTrans);
  }

  return ['interpolate', ['linear'], ['line-progress'], ...stops];
}

function tickSnake(timestamp: number) {
  const map = snakeState.map;
  if (!map || !map.getLayer('hover-link-snake')) {
    snakeState.rafId = null;
    return;
  }
  const phase = ((timestamp - snakeState.startedAt) % SNAKE_CYCLE_MS) / SNAKE_CYCLE_MS;
  const head = phase * (1 + SNAKE_TAIL);
  map.setPaintProperty('hover-link-snake', 'line-gradient', buildSnakeGradient(head, snakeState.color));
  snakeState.rafId = requestAnimationFrame(tickSnake);
}

function startSnake(map: maplibregl.Map, color: string) {
  snakeState.map = map;
  snakeState.color = color;
  snakeState.startedAt = performance.now();
  if (map.getLayer('hover-link-glow')) {
    map.setPaintProperty('hover-link-glow', 'line-color', color);
  }
  if (map.getLayer('hover-link-base')) {
    map.setPaintProperty('hover-link-base', 'line-color', color);
  }
  if (snakeState.rafId === null) {
    snakeState.rafId = requestAnimationFrame(tickSnake);
  }
}

function stopSnake() {
  if (snakeState.rafId !== null) {
    cancelAnimationFrame(snakeState.rafId);
    snakeState.rafId = null;
  }
  snakeState.map = null;
}

function setMissionHover(
  map: maplibregl.Map,
  delivery: DeliveryPoint,
  deliveryMarker: maplibregl.Marker | undefined,
  pickupMarker: maplibregl.Marker | undefined,
  hovered: boolean,
) {
  const color = STATUS_COLORS[delivery.status];
  const hoverShadow = `0 14px 28px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px ${color}44`;

  const deliveryBubble = deliveryMarker?.getElement().querySelector('.mission-bubble') as HTMLElement | null;
  if (deliveryBubble) {
    deliveryBubble.style.transform = hovered ? 'scale(1.25)' : '';
    deliveryBubble.style.boxShadow = hovered ? hoverShadow : deliveryBubbleShadow(color);
  }

  const pickupBubble = pickupMarker?.getElement().querySelector('.pickup-bubble') as HTMLElement | null;
  if (pickupBubble) {
    pickupBubble.style.transform = hovered ? 'rotate(45deg) scale(1.2)' : 'rotate(45deg)';
    pickupBubble.style.boxShadow = hovered ? pickupHoverShadow(color) : pickupGlassShadow(color);
  }

  const linkSource = map.getSource('hover-link') as maplibregl.GeoJSONSource | undefined;
  if (!linkSource) return;
  if (hovered && delivery.pickupLocation) {
    linkSource.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [delivery.pickupLocation, delivery.location] },
      }],
    });
    startSnake(map, color);
  } else {
    linkSource.setData({ type: 'FeatureCollection', features: [] });
    stopSnake();
  }
}

function attachMissionHoverHandlers(
  map: maplibregl.Map,
  el: HTMLElement,
  deliveryId: string,
  deliveriesRef: React.MutableRefObject<Record<string, DeliveryPoint>>,
  deliveryMarkersRef: React.MutableRefObject<Record<string, maplibregl.Marker>>,
  pickupMarkersRef: React.MutableRefObject<Record<string, maplibregl.Marker>>,
) {
  el.addEventListener('mouseenter', () => {
    const delivery = deliveriesRef.current[deliveryId];
    if (!delivery) return;
    setMissionHover(map, delivery, deliveryMarkersRef.current[deliveryId], pickupMarkersRef.current[deliveryId], true);
  });
  el.addEventListener('mouseleave', () => {
    const delivery = deliveriesRef.current[deliveryId];
    if (!delivery) return;
    setMissionHover(map, delivery, deliveryMarkersRef.current[deliveryId], pickupMarkersRef.current[deliveryId], false);
  });
}

export default function MapView({
  drivers,
  deliveries,
  flyToDriver,
  driversLayerVisible = true,
  deliveriesLayerVisible = true,
  visibleDriverIds,
  visibleDeliveryIds,
  onDriverClick,
  onDriverContextMenu,
  onDeliveryClick,
  onDeliveryDoubleClick,
  onMapClick,
  pinnedDriverId,
  assignmentBurst,
  mapConfig,
}: MapViewProps) {
  // Sync the module-scoped active config used by helpers below. Runs synchronously
  // on every render so any DOM-creating helper called before useEffect fires sees
  // the current values. Single MapView instance per app keeps this safe.
  activeConfig = mapConfig ?? DEFAULT_MAP_CONFIG;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);
  const driverMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const driverPositionsRef = useRef<Record<string, LngLatTuple>>({});
  const driverAnimationFramesRef = useRef<Record<string, number>>({});
  const deliveryMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const pickupMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const deliveriesRef = useRef<Record<string, DeliveryPoint>>({});
  const driversRef = useRef<Record<string, LiveDriver>>({});
  const onDeliveryClickRef = useRef(onDeliveryClick);
  const onDeliveryDoubleClickRef = useRef(onDeliveryDoubleClick);
  const onDriverClickRef = useRef(onDriverClick);
  const onDriverContextMenuRef = useRef(onDriverContextMenu);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    deliveriesRef.current = Object.fromEntries(deliveries.map((delivery) => [delivery.id, delivery]));
  }, [deliveries]);

  useEffect(() => {
    driversRef.current = Object.fromEntries(drivers.map((driver) => [driver.id, driver]));
  }, [drivers]);

  useEffect(() => { onDeliveryClickRef.current = onDeliveryClick; }, [onDeliveryClick]);
  useEffect(() => { onDeliveryDoubleClickRef.current = onDeliveryDoubleClick; }, [onDeliveryDoubleClick]);
  useEffect(() => { onDriverClickRef.current = onDriverClick; }, [onDriverClick]);
  useEffect(() => { onDriverContextMenuRef.current = onDriverContextMenu; }, [onDriverContextMenu]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // Wire click + contextmenu on a driver pin via the latest callback refs.
  const wireDriverEvents = (el: HTMLElement, driverId: string) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onDriverClickRef.current?.(driverId);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onDriverContextMenuRef.current?.(driverId);
    });
  };

  // Wire click + dblclick on a mission/pickup pin (single click is debounced
  // to give dblclick a chance to override it).
  const wireMissionEvents = (el: HTMLElement, deliveryId: string) => {
    bindClickAndDouble(
      el,
      () => {
        const d = deliveriesRef.current[deliveryId];
        if (d) onDeliveryClickRef.current?.(d);
      },
      () => {
        const d = deliveriesRef.current[deliveryId];
        if (d) onDeliveryDoubleClickRef.current?.(d);
      },
    );
  };

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [2.3522, 48.8566],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => {
      mapReadyRef.current = true;

      // Pickup↔delivery hover link — three layers: outer blur glow + faint base + animated snake head.
      // lineMetrics is required so the snake layer can use line-gradient with line-progress.
      map.addSource('hover-link', {
        type: 'geojson',
        lineMetrics: true,
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'hover-link-glow',
        type: 'line',
        source: 'hover-link',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 10,
          'line-blur': 8,
          'line-opacity': 0.18,
        },
      });
      map.addLayer({
        id: 'hover-link-base',
        type: 'line',
        source: 'hover-link',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f97316',
          'line-width': 1.5,
          'line-opacity': 0.35,
          'line-dasharray': [2, 2],
        },
      });
      map.addLayer({
        id: 'hover-link-snake',
        type: 'line',
        source: 'hover-link',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 3,
          'line-opacity': 1,
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0, 'rgba(0,0,0,0)',
            1, 'rgba(0,0,0,0)',
          ],
        },
      });

      // Route polylines — width / opacity / dash come from active config and update live
      // via the config-watching effect below.
      const routeCfg = activeConfig.driverRoute;
      const routeDash = ROUTE_LINE_DASH[routeCfg.style];
      drivers.forEach((driver) => {
        if (driver.routeCoordinates.length < 2) return;
        map.addSource(`route-${driver.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: driver.routeCoordinates },
          },
        });
        map.addLayer({
          id: `route-${driver.id}`,
          type: 'line',
          source: `route-${driver.id}`,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
            visibility: routeCfg.visible ? 'visible' : 'none',
          },
          paint: {
            'line-color': driver.routeColor,
            'line-width': routeCfg.width,
            'line-opacity': routeCfg.opacity,
            ...(routeDash ? { 'line-dasharray': routeDash } : {}),
          },
        });
      });

      const tooltipContainer = map.getContainer();

      // Driver markers
      drivers.forEach((driver) => {
        const el = createDriverMarkerEl(driver);
        const initialPosition: LngLatTuple = [driver.position.lng, driver.position.lat];
        wireDriverEvents(el, driver.id);
        attachDriverTooltip(el, driver.id, tooltipContainer, driversRef, deliveriesRef);
        const marker = enableSubpixelPositioning(new maplibregl.Marker({ element: el, anchor: 'center', offset: DRIVER_MARKER_OFFSET }))
          .setLngLat(initialPosition)
          .addTo(map);
        driverMarkersRef.current[driver.id] = marker;
        driverPositionsRef.current[driver.id] = initialPosition;
      });

      // Delivery + Pickup markers (paired per mission)
      deliveries.forEach((delivery) => {
        const deliveryEl = createDeliveryMarkerEl(delivery);
        wireMissionEvents(deliveryEl, delivery.id);
        attachMissionHoverHandlers(map, deliveryEl, delivery.id, deliveriesRef, deliveryMarkersRef, pickupMarkersRef);
        attachDeliveryTooltip(deliveryEl, delivery.id, 'delivery', tooltipContainer, deliveriesRef, driversRef);

        const deliveryMarker = enableSubpixelPositioning(new maplibregl.Marker({ element: deliveryEl, anchor: 'center', offset: DELIVERY_MARKER_OFFSET }))
          .setLngLat(delivery.location)
          .addTo(map);
        deliveryMarkersRef.current[delivery.id] = deliveryMarker;

        if (delivery.pickupLocation) {
          const pickupEl = createPickupMarkerEl(delivery);
          wireMissionEvents(pickupEl, delivery.id);
          attachMissionHoverHandlers(map, pickupEl, delivery.id, deliveriesRef, deliveryMarkersRef, pickupMarkersRef);
          attachDeliveryTooltip(pickupEl, delivery.id, 'pickup', tooltipContainer, deliveriesRef, driversRef);

          const pickupMarker = enableSubpixelPositioning(new maplibregl.Marker({ element: pickupEl, anchor: 'center', offset: PICKUP_MARKER_OFFSET }))
            .setLngLat(delivery.pickupLocation)
            .addTo(map);
          pickupMarkersRef.current[delivery.id] = pickupMarker;
        }
      });

      // Map background click — used to dismiss quick-assign mode.
      map.on('click', () => onMapClickRef.current?.());
    });

    return () => {
      mapReadyRef.current = false;
      stopSnake();
      Object.values(driverAnimationFramesRef.current).forEach((frameId) => cancelAnimationFrame(frameId));
      driverAnimationFramesRef.current = {};
      driverPositionsRef.current = {};
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync delivery + pickup marker visibility — combines layer toggle (hard hide)
  // with the mission panel filter (also hard hide). A filtered-out marker is fully removed
  // from the visual + interactive layer so the user really controls what's on the map.
  useEffect(() => {
    if (!mapReadyRef.current) return;
    const apply = (deliveryId: string, marker: maplibregl.Marker) => {
      const passesFilter = !visibleDeliveryIds || visibleDeliveryIds.includes(deliveryId);
      const shown = deliveriesLayerVisible && passesFilter;
      const el = marker.getElement();
      el.style.visibility = shown ? 'visible' : 'hidden';
      el.style.pointerEvents = shown ? 'auto' : 'none';
    };
    Object.entries(deliveryMarkersRef.current).forEach(([id, m]) => apply(id, m));
    Object.entries(pickupMarkersRef.current).forEach(([id, m]) => apply(id, m));

    // Also clear any lingering hover-link polyline if the layer is hidden
    const map = mapRef.current;
    if (!deliveriesLayerVisible && map?.getSource('hover-link')) {
      (map.getSource('hover-link') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      stopSnake();
    }
  }, [visibleDeliveryIds, deliveriesLayerVisible]);

  // Live delivery updates — keep mission + pickup markers in sync without recreating the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const nextIds = new Set(deliveries.map((delivery) => delivery.id));

    Object.entries(deliveryMarkersRef.current).forEach(([deliveryId, marker]) => {
      if (nextIds.has(deliveryId)) return;
      marker.remove();
      delete deliveryMarkersRef.current[deliveryId];
    });
    Object.entries(pickupMarkersRef.current).forEach(([deliveryId, marker]) => {
      if (nextIds.has(deliveryId)) return;
      marker.remove();
      delete pickupMarkersRef.current[deliveryId];
    });

    deliveries.forEach((delivery) => {
      const tooltipContainer = map.getContainer();

      const existingDelivery = deliveryMarkersRef.current[delivery.id];
      if (existingDelivery) {
        applyDeliveryMarkerState(existingDelivery, delivery);
      } else {
        const deliveryEl = createDeliveryMarkerEl(delivery);
        wireMissionEvents(deliveryEl, delivery.id);
        attachMissionHoverHandlers(map, deliveryEl, delivery.id, deliveriesRef, deliveryMarkersRef, pickupMarkersRef);
        attachDeliveryTooltip(deliveryEl, delivery.id, 'delivery', tooltipContainer, deliveriesRef, driversRef);

        const deliveryMarker = enableSubpixelPositioning(new maplibregl.Marker({ element: deliveryEl, anchor: 'center', offset: DELIVERY_MARKER_OFFSET }))
          .setLngLat(delivery.location)
          .addTo(map);
        deliveryMarkersRef.current[delivery.id] = deliveryMarker;
      }

      const existingPickup = pickupMarkersRef.current[delivery.id];
      if (existingPickup) {
        if (delivery.pickupLocation) {
          applyPickupMarkerState(existingPickup, delivery);
        } else {
          existingPickup.remove();
          delete pickupMarkersRef.current[delivery.id];
        }
      } else if (delivery.pickupLocation) {
        const pickupEl = createPickupMarkerEl(delivery);
        wireMissionEvents(pickupEl, delivery.id);
        attachMissionHoverHandlers(map, pickupEl, delivery.id, deliveriesRef, deliveryMarkersRef, pickupMarkersRef);
        attachDeliveryTooltip(pickupEl, delivery.id, 'pickup', tooltipContainer, deliveriesRef, driversRef);

        const pickupMarker = enableSubpixelPositioning(new maplibregl.Marker({ element: pickupEl, anchor: 'center', offset: PICKUP_MARKER_OFFSET }))
          .setLngLat(delivery.pickupLocation)
          .addTo(map);
        pickupMarkersRef.current[delivery.id] = pickupMarker;
      }
    });
  }, [deliveries]);

  // Sync driver marker + route visibility — combines layer toggle (hard hide)
  // with the sidebar filter (also hard hide). Routes (polylines) follow the driver layer.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    Object.entries(driverMarkersRef.current).forEach(([driverId, marker]) => {
      const passesFilter = !visibleDriverIds || visibleDriverIds.includes(driverId);
      const shown = driversLayerVisible && passesFilter;
      const el = marker.getElement();
      el.style.visibility = shown ? 'visible' : 'hidden';
      el.style.pointerEvents = shown ? 'auto' : 'none';

      const layerId = `route-${driverId}`;
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', shown ? 'visible' : 'none');
      }
    });
  }, [visibleDriverIds, driversLayerVisible]);

  // Live position + status updates — animate driver movement and keep markers synchronized
  useEffect(() => {
    if (!mapReadyRef.current) return;

    const nextIds = new Set(drivers.map((driver) => driver.id));

    Object.keys(driverMarkersRef.current).forEach((driverId) => {
      if (nextIds.has(driverId)) return;

      const frameId = driverAnimationFramesRef.current[driverId];
      if (frameId) {
        cancelAnimationFrame(frameId);
        delete driverAnimationFramesRef.current[driverId];
      }

      driverMarkersRef.current[driverId]?.remove();
      delete driverMarkersRef.current[driverId];
      delete driverPositionsRef.current[driverId];
    });

    drivers.forEach((driver) => {
      let marker = driverMarkersRef.current[driver.id];
      const targetPosition: LngLatTuple = [driver.position.lng, driver.position.lat];

      if (!marker) {
        const el = createDriverMarkerEl(driver);
        wireDriverEvents(el, driver.id);
        attachDriverTooltip(el, driver.id, mapRef.current!.getContainer(), driversRef, deliveriesRef);
        marker = enableSubpixelPositioning(new maplibregl.Marker({ element: el, anchor: 'center', offset: DRIVER_MARKER_OFFSET }))
          .setLngLat(targetPosition)
          .addTo(mapRef.current!);
        driverMarkersRef.current[driver.id] = marker;
        driverPositionsRef.current[driver.id] = targetPosition;
      }

      const frameId = driverAnimationFramesRef.current[driver.id];
      if (frameId) cancelAnimationFrame(frameId);

      const startPosition = driverPositionsRef.current[driver.id] ?? targetPosition;
      const startTime = performance.now();

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / activeConfig.animations.driverMoveMs, 1);
        const easedProgress = easeInOutCubic(progress);
        const currentPosition = interpolateLngLat(startPosition, targetPosition, easedProgress);

        marker.setLngLat(currentPosition);
        driverPositionsRef.current[driver.id] = currentPosition;

        if (progress < 1) {
          driverAnimationFramesRef.current[driver.id] = requestAnimationFrame(animate);
          return;
        }

        marker.setLngLat(targetPosition);
        driverPositionsRef.current[driver.id] = targetPosition;
        delete driverAnimationFramesRef.current[driver.id];
      };

      if (startPosition[0] === targetPosition[0] && startPosition[1] === targetPosition[1]) {
        marker.setLngLat(targetPosition);
        driverPositionsRef.current[driver.id] = targetPosition;
      } else {
        driverAnimationFramesRef.current[driver.id] = requestAnimationFrame(animate);
      }

      const el = marker.getElement();
      const shell = el.querySelector('.dm-shell') as HTMLElement | null;
      const icon = el.querySelector('.dm-icon') as HTMLElement | null;
      const status = el.querySelector('.dm-status') as HTMLElement | null;
      if (shell) {
        shell.style.background = driverGlassBackground(driver.routeColor);
        shell.style.borderColor = `${driver.routeColor}33`;
        shell.style.boxShadow = driverGlassShadow(driver.routeColor);
      }
      if (icon) {
        icon.innerHTML = vehicleIconSVG(driver.vehicleType, driver.routeColor);
        icon.title = `${driver.name} - ${STATUS_CHIP[driver.status].label}`;
        icon.style.filter = `drop-shadow(0 0 10px ${driver.routeColor}88)`;
      }
      if (status) {
        const chip = STATUS_CHIP[driver.status];
        status.style.background = chip.color;
        status.style.animation = chip.pulse ? 'dm-pulse 1.5s ease-in-out infinite' : '';
        status.title = chip.label;
      }
    });
  }, [drivers]);

  // Update route polylines after optimization
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    drivers.forEach((driver) => {
      const source = map.getSource(`route-${driver.id}`) as maplibregl.GeoJSONSource | undefined;
      if (!source || driver.routeCoordinates.length < 2) return;
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: driver.routeCoordinates },
      });
    });
  }, [drivers]);

  // Quick-assign mode — toggle pulsing ring on the pinned driver and crosshair cursor
  // on the map container so the user knows what the next click will do.
  useEffect(() => {
    if (!mapReadyRef.current) return;
    Object.entries(driverMarkersRef.current).forEach(([id, marker]) => {
      const driver = drivers.find((d) => d.id === id);
      if (!driver) return;
      applyPinnedRing(marker.getElement(), driver.routeColor, id === pinnedDriverId);
    });
    const container = mapRef.current?.getContainer();
    if (container) container.classList.toggle('map-pin-mode', !!pinnedDriverId);
  }, [pinnedDriverId, drivers]);

  // One-shot fly: triggers on each new token so re-clicking the same driver still flies.
  // No persistent focus state — camera is released as soon as flyTo completes.
  useEffect(() => {
    if (!mapRef.current || !flyToDriver) return;
    const driver = drivers.find((d) => d.id === flyToDriver.driverId);
    if (!driver) return;
    mapRef.current.flyTo({
      center: [driver.position.lng, driver.position.lat],
      zoom: 14,
      duration: 800,
    });
    // Watch only the token: position updates from SSE shouldn't re-fly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToDriver?.token]);

  // Quick-assign / unassign celebration — fires every time the token changes so re-firing the same
  // pair re-plays the animation. Reads driver/delivery from refs to handle the case where the
  // parent triggers the burst before the next re-render lands. Dispatches on `kind` to pick
  // either the welcoming or the release sequence.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !assignmentBurst) return;
    const driver = driversRef.current[assignmentBurst.driverId]
      ?? drivers.find((d) => d.id === assignmentBurst.driverId);
    const delivery = deliveriesRef.current[assignmentBurst.deliveryId]
      ?? deliveries.find((d) => d.id === assignmentBurst.deliveryId);
    if (!driver || !delivery) return;
    const driverEl = driverMarkersRef.current[driver.id]?.getElement();
    const deliveryEl = deliveryMarkersRef.current[delivery.id]?.getElement();
    const pickupEl = pickupMarkersRef.current[delivery.id]?.getElement();
    if (assignmentBurst.kind === 'unassign') {
      playUnassignmentAnimation(map, driver, delivery, driverEl, deliveryEl, pickupEl);
    } else {
      playAssignmentAnimation(map, driver, delivery, driverEl, deliveryEl, pickupEl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentBurst?.token]);

  // Live re-style markers when the visual config changes (palette, label, shape,
  // size, opacity). Cheaper than a full DOM rebuild — we re-apply CSS to existing
  // marker elements and let MapLibre keep its translate() transforms intact.
  useEffect(() => {
    if (!mapReadyRef.current || !mapConfig) return;

    // Deliveries: shape, size, opacity, palette, label
    Object.entries(deliveryMarkersRef.current).forEach(([id, marker]) => {
      const delivery = deliveriesRef.current[id];
      if (!delivery) return;
      const el = marker.getElement();
      const spec = mapConfig.markers.delivery;
      el.style.width = `${spec.size}px`;
      el.style.height = `${spec.size}px`;
      el.style.opacity = String(spec.opacity);
      const bubble = el.querySelector('.mission-bubble') as HTMLElement | null;
      if (bubble) {
        bubble.style.fontSize = `${Math.max(9, Math.round(spec.size * 0.32))}px`;
        bubble.textContent = formatMissionLabel(delivery.label, mapConfig.markers.label);
        const color = getStatusColors(mapConfig)[delivery.status];
        bubble.style.background = deliveryBubbleBackground(color);
        bubble.style.boxShadow = deliveryBubbleShadow(color);
        applyBubbleShape(bubble, null, spec.shape);
      }
    });

    // Pickups: same treatment with shape + counter-rotated label
    Object.entries(pickupMarkersRef.current).forEach(([id, marker]) => {
      const delivery = deliveriesRef.current[id];
      if (!delivery) return;
      const el = marker.getElement();
      const spec = mapConfig.markers.pickup;
      el.style.width = `${spec.size}px`;
      el.style.height = `${spec.size}px`;
      el.style.opacity = String(spec.opacity);
      const bubble = el.querySelector('.pickup-bubble') as HTMLElement | null;
      const label = el.querySelector('.pickup-label') as HTMLElement | null;
      if (bubble) {
        bubble.style.width = `${spec.size}px`;
        bubble.style.height = `${spec.size}px`;
        const color = getStatusColors(mapConfig)[delivery.status];
        bubble.style.background = pickupGlassBackground(color);
        bubble.style.boxShadow = pickupGlassShadow(color);
        bubble.style.borderColor = `${color}55`;
        applyBubbleShape(bubble, label, spec.shape);
      }
      if (label) {
        label.style.fontSize = `${Math.max(9, Math.round(spec.size * 0.32))}px`;
        label.textContent = formatMissionLabel(delivery.label, mapConfig.markers.label);
      }
    });

    // Drivers: size + opacity + shape + status dot toggle + pulse + palette
    Object.entries(driverMarkersRef.current).forEach(([id, marker]) => {
      const driver = driversRef.current[id];
      if (!driver) return;
      const el = marker.getElement();
      const spec = mapConfig.markers.driver;
      const shellSize = Math.max(20, Math.round(spec.size * 0.82));
      el.style.width = `${spec.size}px`;
      el.style.height = `${spec.size}px`;
      el.style.opacity = String(spec.opacity);
      const shell = el.querySelector('.dm-shell') as HTMLElement | null;
      if (shell) {
        shell.style.width = `${shellSize}px`;
        shell.style.height = `${shellSize}px`;
        const g = shapeGeometry(spec.shape);
        shell.style.borderRadius = g.borderRadius;
        shell.style.clipPath = g.clipPath;
        // Always include the centering translate, then apply shape transform.
        shell.style.transform = `translate(-50%,-50%) ${g.transform === 'none' ? '' : g.transform}`;
      }
      const status = el.querySelector('.dm-status') as HTMLElement | null;
      if (status) {
        const driverColor = getDriverColors(mapConfig)[driver.status];
        status.style.background = driverColor;
        status.style.display = spec.showStatusDot ? 'block' : 'none';
        const shouldPulse = STATUS_CHIP_META[driver.status].pulse && spec.pulseDelayed;
        status.style.animation = shouldPulse ? 'dm-pulse 1.5s ease-in-out infinite' : '';
      }
    });

    // Driver route polylines: width + opacity + dasharray + visibility
    const map = mapRef.current;
    if (map) {
      const routeCfg = mapConfig.driverRoute;
      const dash = ROUTE_LINE_DASH[routeCfg.style];
      Object.keys(driverMarkersRef.current).forEach((id) => {
        const layerId = `route-${id}`;
        if (!map.getLayer(layerId)) return;
        map.setPaintProperty(layerId, 'line-width', routeCfg.width);
        map.setPaintProperty(layerId, 'line-opacity', routeCfg.opacity);
        // line-dasharray must be set or unset cleanly — passing undefined keeps the previous value,
        // so we explicitly set [1] for "solid" to clear any prior dash pattern.
        map.setPaintProperty(layerId, 'line-dasharray', dash ?? [1]);
        // The toggle multiplies with the global drivers-layer toggle handled elsewhere.
        const layerVisibility = map.getLayoutProperty(layerId, 'visibility');
        if (routeCfg.visible && layerVisibility === 'none') {
          // Only show if the global drivers layer would otherwise be visible — let the
          // global toggle effect handle the actual visibility decision next render.
        }
        if (!routeCfg.visible) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      });
    }
  }, [mapConfig]);

  return <div ref={containerRef} className="w-full h-full" />;
}

