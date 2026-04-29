// ── Map UI configuration — single source of truth for the control-center map.
// All settings are JSON-serializable so we can swap localStorage → backend without
// touching the schema. Bumping `version` triggers a localStorage migration.
//
// Read this from `useMapConfig()` (lib/map-config-context.tsx) — never hardcode
// against the constants here in feature code: import the type, read the live value.

import type { DeliveryPoint, DriverStatus } from '@/types/vrp';

export type DeliveryStatus = DeliveryPoint['status'];

// ── Palette catalog ────────────────────────────────────────────────────────

export type PaletteName = 'default' | 'vivid' | 'pastel' | 'accessible' | 'mono-blue';
export type DriverPaletteName = 'default' | 'vivid' | 'mono';

export const STATUS_PALETTES: Record<PaletteName, Record<DeliveryStatus, string>> = {
  default: {
    pending:     '#38bdf8',
    preassigned: '#a78bfa',
    assigned:    '#3b82f6',
    done:        '#10b981',
    at_risk:     '#ef4444',
  },
  vivid: {
    pending:     '#22d3ee',
    preassigned: '#d946ef',
    assigned:    '#6366f1',
    done:        '#84cc16',
    at_risk:     '#f43f5e',
  },
  pastel: {
    pending:     '#7dd3fc',
    preassigned: '#c4b5fd',
    assigned:    '#93c5fd',
    done:        '#86efac',
    at_risk:     '#fca5a5',
  },
  accessible: {
    pending:     '#56B4E9',
    preassigned: '#CC79A7',
    assigned:    '#0072B2',
    done:        '#009E73',
    at_risk:     '#D55E00',
  },
  'mono-blue': {
    pending:     '#71717a',
    preassigned: '#7dd3fc',
    assigned:    '#3b82f6',
    done:        '#1d4ed8',
    at_risk:     '#ef4444',
  },
};

export const DRIVER_PALETTES: Record<DriverPaletteName, Record<DriverStatus, string>> = {
  default: {
    on_route: '#3b82f6',
    paused:   '#eab308',
    delayed:  '#ef4444',
    idle:     '#22c55e',
    offline:  '#52525b',
  },
  vivid: {
    on_route: '#6366f1',
    paused:   '#f59e0b',
    delayed:  '#f43f5e',
    idle:     '#10b981',
    offline:  '#3f3f46',
  },
  mono: {
    on_route: '#3b82f6',
    paused:   '#94a3b8',
    delayed:  '#ef4444',
    idle:     '#64748b',
    offline:  '#27272a',
  },
};

export const PALETTE_LABELS: Record<PaletteName, string> = {
  default:      'Par défaut',
  vivid:        'Saturée',
  pastel:       'Pastel',
  accessible:   'Accessible (Okabe-Ito)',
  'mono-blue':  'Mono bleu',
};

export const DRIVER_PALETTE_LABELS: Record<DriverPaletteName, string> = {
  default: 'Par défaut',
  vivid:   'Saturée',
  mono:    'Mono',
};

// ── Marker shapes ──────────────────────────────────────────────────────────

export type MarkerShape = 'circle' | 'diamond' | 'rounded-square' | 'hexagon' | 'pin';

export const SHAPE_LABELS: Record<MarkerShape, string> = {
  circle:           'Cercle',
  diamond:          'Losange',
  'rounded-square': 'Carré arrondi',
  hexagon:          'Hexagone',
  pin:              'Goutte',
};

// ── Label format ───────────────────────────────────────────────────────────

export type LabelFormat = 'last-N' | 'first-N' | 'full';

export const LABEL_FORMAT_LABELS: Record<LabelFormat, string> = {
  'last-N':  'N derniers caractères',
  'first-N': 'N premiers caractères',
  full:      'Code complet',
};

// ── Map style ──────────────────────────────────────────────────────────────

export type MapStyle = 'dark' | 'light' | 'satellite';

export const MAP_STYLE_LABELS: Record<MapStyle, string> = {
  dark:      'Sombre',
  light:     'Clair',
  satellite: 'Satellite',
};

// ── Route line styles ──────────────────────────────────────────────────────

export type RouteLineStyle = 'solid' | 'dashed' | 'dotted';

export const ROUTE_LINE_STYLE_LABELS: Record<RouteLineStyle, string> = {
  solid:  'Continu',
  dashed: 'Pointillé',
  dotted: 'Pointillé fin',
};

// MapLibre dasharray patterns for each style.
export const ROUTE_LINE_DASH: Record<RouteLineStyle, [number, number] | undefined> = {
  solid:  undefined,
  dashed: [2, 1],
  dotted: [0.4, 1.6],
};

// ── Schema ────────────────────────────────────────────────────────────────
// Every field must have a default. Adding a field = bump the version + migrate.

export interface MapConfig {
  version: 1;
  appearance: {
    statusPalette: PaletteName;
    driverPalette: DriverPaletteName;
    mapStyle: MapStyle;
  };
  markers: {
    delivery: { shape: MarkerShape; size: number; opacity: number };
    pickup:   { shape: MarkerShape; size: number; opacity: number };
    driver:   {
      shape: MarkerShape;
      size: number;
      opacity: number;
      showStatusDot: boolean;
      pulseDelayed: boolean;
    };
    label: { format: LabelFormat; charCount: number };
  };
  driverRoute: {
    visible: boolean;
    width: number;     // 1-8
    opacity: number;   // 0-1
    style: RouteLineStyle;
  };
  animations: {
    driverMoveMs: number;
    snakeCycleMs: number;
    reduced: boolean;
  };
  behaviors: {
    doubleClickUnassigns: boolean;
    escClearsPin: boolean;
    rightClickOpensModal: boolean;
  };
  tooltip: {
    showLegs: boolean;
    showAssignmentBreakdown: boolean;
    delayMs: number;
  };
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
  version: 1,
  appearance: {
    statusPalette: 'default',
    driverPalette: 'default',
    mapStyle: 'dark',
  },
  markers: {
    delivery: { shape: 'circle',  size: 34, opacity: 1 },
    pickup:   { shape: 'diamond', size: 32, opacity: 1 },
    driver: {
      shape: 'circle',
      size: 34,
      opacity: 1,
      showStatusDot: true,
      pulseDelayed: true,
    },
    label: { format: 'last-N', charCount: 4 },
  },
  driverRoute: {
    visible: true,
    width: 3,
    opacity: 0.75,
    style: 'dashed',
  },
  animations: {
    driverMoveMs: 2200,
    snakeCycleMs: 1800,
    reduced: false,
  },
  behaviors: {
    doubleClickUnassigns: true,
    escClearsPin: true,
    rightClickOpensModal: true,
  },
  tooltip: {
    showLegs: true,
    showAssignmentBreakdown: true,
    delayMs: 0,
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function formatMissionLabel(label: string, cfg: MapConfig['markers']['label']): string {
  if (cfg.format === 'full') return label;
  const n = Math.max(1, Math.min(12, cfg.charCount));
  if (label.length <= n) return label;
  return cfg.format === 'last-N' ? label.slice(-n) : label.slice(0, n);
}

export function getStatusColors(cfg: MapConfig): Record<DeliveryStatus, string> {
  return STATUS_PALETTES[cfg.appearance.statusPalette];
}

export function getDriverColors(cfg: MapConfig): Record<DriverStatus, string> {
  return DRIVER_PALETTES[cfg.appearance.driverPalette];
}

// ── Migration ──────────────────────────────────────────────────────────────
// Reads a possibly-stale stored config, fills missing fields with defaults,
// drops unknown fields. Always returns a current-shape config.
export function migrateMapConfig(raw: unknown): MapConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_MAP_CONFIG;
  const r = raw as Partial<MapConfig> & Record<string, unknown>;
  // Future-proofing: when version bumps, add `if (r.version === 1) { ... }` etc.
  return {
    version: 1,
    appearance: {
      statusPalette: r.appearance?.statusPalette ?? DEFAULT_MAP_CONFIG.appearance.statusPalette,
      driverPalette: r.appearance?.driverPalette ?? DEFAULT_MAP_CONFIG.appearance.driverPalette,
      mapStyle:      r.appearance?.mapStyle      ?? DEFAULT_MAP_CONFIG.appearance.mapStyle,
    },
    markers: {
      delivery: {
        shape:   r.markers?.delivery?.shape   ?? DEFAULT_MAP_CONFIG.markers.delivery.shape,
        size:    r.markers?.delivery?.size    ?? DEFAULT_MAP_CONFIG.markers.delivery.size,
        opacity: r.markers?.delivery?.opacity ?? DEFAULT_MAP_CONFIG.markers.delivery.opacity,
      },
      pickup: {
        shape:   r.markers?.pickup?.shape   ?? DEFAULT_MAP_CONFIG.markers.pickup.shape,
        size:    r.markers?.pickup?.size    ?? DEFAULT_MAP_CONFIG.markers.pickup.size,
        opacity: r.markers?.pickup?.opacity ?? DEFAULT_MAP_CONFIG.markers.pickup.opacity,
      },
      driver: {
        shape:         r.markers?.driver?.shape         ?? DEFAULT_MAP_CONFIG.markers.driver.shape,
        size:          r.markers?.driver?.size          ?? DEFAULT_MAP_CONFIG.markers.driver.size,
        opacity:       r.markers?.driver?.opacity       ?? DEFAULT_MAP_CONFIG.markers.driver.opacity,
        showStatusDot: r.markers?.driver?.showStatusDot ?? DEFAULT_MAP_CONFIG.markers.driver.showStatusDot,
        pulseDelayed:  r.markers?.driver?.pulseDelayed  ?? DEFAULT_MAP_CONFIG.markers.driver.pulseDelayed,
      },
      label: {
        format:    r.markers?.label?.format    ?? DEFAULT_MAP_CONFIG.markers.label.format,
        charCount: r.markers?.label?.charCount ?? DEFAULT_MAP_CONFIG.markers.label.charCount,
      },
    },
    driverRoute: {
      visible: r.driverRoute?.visible ?? DEFAULT_MAP_CONFIG.driverRoute.visible,
      width:   r.driverRoute?.width   ?? DEFAULT_MAP_CONFIG.driverRoute.width,
      opacity: r.driverRoute?.opacity ?? DEFAULT_MAP_CONFIG.driverRoute.opacity,
      style:   r.driverRoute?.style   ?? DEFAULT_MAP_CONFIG.driverRoute.style,
    },
    animations: {
      driverMoveMs: r.animations?.driverMoveMs ?? DEFAULT_MAP_CONFIG.animations.driverMoveMs,
      snakeCycleMs: r.animations?.snakeCycleMs ?? DEFAULT_MAP_CONFIG.animations.snakeCycleMs,
      reduced:      r.animations?.reduced      ?? DEFAULT_MAP_CONFIG.animations.reduced,
    },
    behaviors: {
      doubleClickUnassigns: r.behaviors?.doubleClickUnassigns ?? DEFAULT_MAP_CONFIG.behaviors.doubleClickUnassigns,
      escClearsPin:         r.behaviors?.escClearsPin         ?? DEFAULT_MAP_CONFIG.behaviors.escClearsPin,
      rightClickOpensModal: r.behaviors?.rightClickOpensModal ?? DEFAULT_MAP_CONFIG.behaviors.rightClickOpensModal,
    },
    tooltip: {
      showLegs:                r.tooltip?.showLegs                ?? DEFAULT_MAP_CONFIG.tooltip.showLegs,
      showAssignmentBreakdown: r.tooltip?.showAssignmentBreakdown ?? DEFAULT_MAP_CONFIG.tooltip.showAssignmentBreakdown,
      delayMs:                 r.tooltip?.delayMs                 ?? DEFAULT_MAP_CONFIG.tooltip.delayMs,
    },
  };
}
