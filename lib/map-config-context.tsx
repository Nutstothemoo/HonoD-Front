'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { DEFAULT_MAP_CONFIG, MapConfig, migrateMapConfig } from './map-config';

const STORAGE_KEY = 'veloce.map-config.v1';

type DraftUpdater = MapConfig | ((prev: MapConfig) => MapConfig);

interface MapConfigContextValue {
  /** Live config used by the map across the app. Persists to localStorage. */
  applied: MapConfig;
  /** In-flight edits made from the settings page. Discarded if the user cancels. */
  draft: MapConfig;
  /** Update the draft. The cockpit is unaffected until validate() is called. */
  setDraft: (updater: DraftUpdater) => void;
  /** Commit draft → applied, persists to localStorage. */
  validate: () => void;
  /** Discard draft, restore from applied. */
  cancel: () => void;
  /** Reset draft AND applied to defaults. */
  reset: () => void;
  /** True if draft differs from applied. */
  hasChanges: boolean;
  /** True once localStorage hydration has completed. */
  hydrated: boolean;
}

const MapConfigContext = createContext<MapConfigContextValue | null>(null);

function deepEqual(a: unknown, b: unknown): boolean {
  // Fine for our flat-ish JSON config — fast enough at <100 fields.
  return JSON.stringify(a) === JSON.stringify(b);
}

export function MapConfigProvider({ children }: { children: ReactNode }) {
  const [applied, setApplied] = useState<MapConfig>(DEFAULT_MAP_CONFIG);
  const [draft, setDraftState] = useState<MapConfig>(DEFAULT_MAP_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = migrateMapConfig(parsed);
        setApplied(migrated);
        setDraftState(migrated);
      }
    } catch {
      // Corrupted storage — ignore, defaults stay.
    }
    setHydrated(true);
  }, []);

  // Persist `applied` (not draft). Debounced so rapid validates don't hammer storage.
  useEffect(() => {
    if (!hydrated) return;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applied));
      } catch {
        // Quota / private mode — fail silently.
      }
    }, 250);
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [applied, hydrated]);

  const setDraft = useCallback((updater: DraftUpdater) => {
    setDraftState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const validate = useCallback(() => {
    setApplied(draft);
  }, [draft]);

  const cancel = useCallback(() => {
    setDraftState(applied);
  }, [applied]);

  const reset = useCallback(() => {
    setApplied(DEFAULT_MAP_CONFIG);
    setDraftState(DEFAULT_MAP_CONFIG);
  }, []);

  const hasChanges = useMemo(() => !deepEqual(applied, draft), [applied, draft]);

  const value = useMemo<MapConfigContextValue>(
    () => ({ applied, draft, setDraft, validate, cancel, reset, hasChanges, hydrated }),
    [applied, draft, setDraft, validate, cancel, reset, hasChanges, hydrated],
  );

  return <MapConfigContext.Provider value={value}>{children}</MapConfigContext.Provider>;
}

export function useMapConfig(): MapConfigContextValue {
  const ctx = useContext(MapConfigContext);
  if (!ctx) {
    throw new Error('useMapConfig must be used inside a <MapConfigProvider>');
  }
  return ctx;
}
