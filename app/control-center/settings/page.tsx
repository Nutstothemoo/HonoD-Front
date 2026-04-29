'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ResetIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import TopBar from '@/components/control-center/TopBar';
import { useMapConfig } from '@/lib/map-config-context';
import {
  STATUS_PALETTES, DRIVER_PALETTES, PALETTE_LABELS, DRIVER_PALETTE_LABELS,
  SHAPE_LABELS, LABEL_FORMAT_LABELS, MAP_STYLE_LABELS, ROUTE_LINE_STYLE_LABELS,
  MarkerShape, LabelFormat, MapStyle, PaletteName, DriverPaletteName, RouteLineStyle,
  formatMissionLabel, getStatusColors,
} from '@/lib/map-config';
import { cn } from '@/lib/utils';
import type { DeliveryStatus } from '@/lib/map-config';

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending:     'En attente',
  preassigned: 'Préatt.',
  assigned:    'Assignée',
  done:        'Livrée',
  at_risk:     'À risque',
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-bold text-zinc-100 tracking-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-4">
      <div className="pt-1.5">
        <div className="text-xs font-semibold text-zinc-300">{label}</div>
        {hint && <div className="mt-0.5 text-[10px] text-zinc-500">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function PaletteOption({
  active, onClick, swatches, label,
}: { active: boolean; onClick: () => void; swatches: string[]; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-stretch gap-2 rounded-lg border p-2.5 text-left transition-all',
        active
          ? 'border-violet-400/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(167,139,250,0.25)]'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70',
      )}
    >
      <div className="flex gap-1">
        {swatches.map((c, i) => (
          <span
            key={i}
            className="h-5 flex-1 rounded-sm"
            style={{ background: c, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <span className={cn('text-[11px] font-semibold', active ? 'text-violet-200' : 'text-zinc-400 group-hover:text-zinc-200')}>{label}</span>
    </button>
  );
}

function ShapePreview({ shape, color, size = 28 }: { shape: MarkerShape; color: string; size?: number }) {
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    background: `linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.04)), ${color}30`,
    border: `1px solid ${color}55`,
    boxShadow: `0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${color}22`,
  };
  if (shape === 'circle') return <span style={{ ...baseStyle, borderRadius: '50%' }} />;
  if (shape === 'diamond') return <span style={{ ...baseStyle, borderRadius: 4, transform: 'rotate(45deg) scale(0.72)' }} />;
  if (shape === 'rounded-square') return <span style={{ ...baseStyle, borderRadius: 8 }} />;
  if (shape === 'hexagon') return <span style={{ ...baseStyle, borderRadius: 4, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />;
  return <span style={{ ...baseStyle, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }} />;
}

function ShapePicker({
  value, onChange, color,
}: { value: MarkerShape; onChange: (s: MarkerShape) => void; color: string }) {
  const shapes: MarkerShape[] = ['circle', 'diamond', 'rounded-square', 'hexagon', 'pin'];
  return (
    <div className="flex flex-wrap gap-2">
      {shapes.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            title={SHAPE_LABELS[s]}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-2 text-[10px] font-medium transition-all min-w-[64px]',
              active
                ? 'border-violet-400/60 bg-violet-500/10 text-violet-200'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-300',
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center">
              <ShapePreview shape={s} color={color} size={24} />
            </span>
            {SHAPE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

function Slider({
  value, min, max, step = 1, onChange, suffix,
}: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-violet-400 h-1 cursor-pointer"
      />
      <span className="w-14 text-right text-xs font-semibold text-zinc-300 tabular-nums">
        {value}{suffix && <span className="text-zinc-500 ml-0.5">{suffix}</span>}
      </span>
    </div>
  );
}

function RadioPills<T extends string>({
  value, options, labels, onChange,
}: { value: T; options: T[]; labels: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
              active
                ? 'border-violet-400/60 bg-violet-500/15 text-violet-200'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200',
            )}
          >
            {labels[o]}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
    >
      <span
        className={cn(
          'relative h-4 w-7 rounded-full transition-colors',
          checked ? 'bg-violet-500' : 'bg-zinc-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all',
            checked ? 'left-3.5' : 'left-0.5',
          )}
        />
      </span>
      <span className="text-xs text-zinc-300">{label}</span>
    </button>
  );
}

// ── Live preview blocks ───────────────────────────────────────────────────

function MissionMarkerPreview({
  shape, size, opacity, color, label,
}: { shape: MarkerShape; size: number; opacity: number; color: string; label: string }) {
  const fontSize = Math.max(9, Math.round(size * 0.32));
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    opacity,
    background: `linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.04)), ${color}30`,
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: `0 10px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.24), 0 0 0 1px ${color}22`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize,
    letterSpacing: '-0.5px', lineHeight: 1, fontFamily: 'sans-serif',
  };
  if (shape === 'circle') return <span style={{ ...baseStyle, borderRadius: '50%' }}>{label}</span>;
  if (shape === 'rounded-square') return <span style={{ ...baseStyle, borderRadius: '22%' }}>{label}</span>;
  if (shape === 'hexagon') return <span style={{ ...baseStyle, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>{label}</span>;
  if (shape === 'diamond') return (
    <span style={{ ...baseStyle, borderRadius: 4, transform: 'rotate(45deg) scale(0.72)' }}>
      <span style={{ transform: 'rotate(-45deg)' }}>{label}</span>
    </span>
  );
  return (
    <span style={{ ...baseStyle, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }}>
      <span style={{ transform: 'rotate(45deg)' }}>{label}</span>
    </span>
  );
}

function PreviewCanvas({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-[radial-gradient(circle_at_top_left,#0a0a18,#020205)] p-6">
      <span className="absolute top-2 left-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{title}</span>
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(167,139,250,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative flex items-center justify-center gap-8 py-4">
        {children}
      </div>
    </div>
  );
}

export default function MapSettingsPage() {
  const { applied, draft, setDraft, validate, cancel, reset, hasChanges } = useMapConfig();
  const palette = getStatusColors(draft);
  const driverPalette = DRIVER_PALETTES[draft.appearance.driverPalette];
  const sampleLabel = formatMissionLabel('MIS-2026-0184756', draft.markers.label);

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <TopBar />

      {/* Pending changes ribbon */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-violet-500/30 bg-gradient-to-r from-violet-500/5 via-violet-500/10 to-violet-500/5"
          >
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200">
                Modifications en attente
              </span>
              <span className="text-[11px] text-zinc-400">
                Les changements n&apos;affectent pas encore le cockpit. Validez pour appliquer.
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={cancel}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <Cross2Icon className="w-3 h-3" />
                Annuler
              </button>
              <button
                type="button"
                onClick={validate}
                className="flex items-center gap-1.5 rounded-md border border-violet-400/50 bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/30 transition-colors"
              >
                <CheckIcon className="w-3 h-3" />
                Valider
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6"
        >
          {/* Title bar */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100">Réglages de la carte</h1>
              <p className="mt-0.5 text-xs text-zinc-500">
                Personnalisez l&apos;apparence et le comportement du cockpit. Tout changement reste en brouillon
                jusqu&apos;à validation.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
            >
              <ResetIcon className="w-3.5 h-3.5" />
              Réinitialiser tout
            </button>
          </header>

          {/* ── Apparence ─────────────────────────────────────────── */}
          <Section title="Apparence" hint="Palette de couleurs des statuts mission et conducteur, style de carte.">
            <Field label="Palette mission" hint="5 couleurs : en attente → à risque">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(STATUS_PALETTES) as PaletteName[]).map((p) => (
                  <PaletteOption
                    key={p}
                    active={draft.appearance.statusPalette === p}
                    onClick={() => setDraft((prev) => ({ ...prev, appearance: { ...prev.appearance, statusPalette: p } }))}
                    swatches={Object.values(STATUS_PALETTES[p])}
                    label={PALETTE_LABELS[p]}
                  />
                ))}
              </div>
            </Field>

            <Field label="Aperçu palette mission">
              <PreviewCanvas title="Statuts mission">
                {(Object.keys(palette) as DeliveryStatus[]).map((s) => (
                  <div key={s} className="flex flex-col items-center gap-1.5">
                    <MissionMarkerPreview
                      shape={draft.markers.delivery.shape}
                      size={draft.markers.delivery.size}
                      opacity={draft.markers.delivery.opacity}
                      color={palette[s]}
                      label={sampleLabel}
                    />
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500">{STATUS_LABELS[s]}</span>
                  </div>
                ))}
              </PreviewCanvas>
            </Field>

            <Field label="Palette conducteur" hint="5 statuts : en route → hors ligne">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(DRIVER_PALETTES) as DriverPaletteName[]).map((p) => (
                  <PaletteOption
                    key={p}
                    active={draft.appearance.driverPalette === p}
                    onClick={() => setDraft((prev) => ({ ...prev, appearance: { ...prev.appearance, driverPalette: p } }))}
                    swatches={Object.values(DRIVER_PALETTES[p])}
                    label={DRIVER_PALETTE_LABELS[p]}
                  />
                ))}
              </div>
            </Field>

            <Field label="Aperçu palette conducteur">
              <PreviewCanvas title="Statuts conducteur">
                {Object.entries(driverPalette).map(([status, color]) => (
                  <div key={status} className="flex flex-col items-center gap-1.5">
                    <span
                      className="h-9 w-9 rounded-full"
                      style={{
                        background: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04)), ${color}24`,
                        border: `1px solid ${color}33`,
                        boxShadow: `0 6px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${color}33`,
                      }}
                    />
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500">{status}</span>
                  </div>
                ))}
              </PreviewCanvas>
            </Field>

            <Field label="Style de carte" hint="Tuiles de fond">
              <RadioPills<MapStyle>
                value={draft.appearance.mapStyle}
                options={['dark', 'light', 'satellite']}
                labels={MAP_STYLE_LABELS}
                onChange={(v) => setDraft((prev) => ({ ...prev, appearance: { ...prev.appearance, mapStyle: v } }))}
              />
            </Field>
          </Section>

          {/* ── Marqueurs ─────────────────────────────────────────── */}
          <Section title="Marqueurs" hint="Forme, taille et opacité des pastilles sur la carte.">
            <Field label="Aperçu live des pastilles">
              <PreviewCanvas title="Livraison · Enlèvement · Conducteur">
                <MissionMarkerPreview
                  shape={draft.markers.delivery.shape}
                  size={draft.markers.delivery.size}
                  opacity={draft.markers.delivery.opacity}
                  color={palette.assigned}
                  label={sampleLabel}
                />
                <MissionMarkerPreview
                  shape={draft.markers.pickup.shape}
                  size={draft.markers.pickup.size}
                  opacity={draft.markers.pickup.opacity}
                  color={palette.preassigned}
                  label={sampleLabel}
                />
                <span
                  style={{
                    width: draft.markers.driver.size,
                    height: draft.markers.driver.size,
                    opacity: draft.markers.driver.opacity,
                    borderRadius: '50%',
                    background: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04)), ${driverPalette.on_route}24`,
                    border: `1px solid ${driverPalette.on_route}33`,
                    boxShadow: `0 6px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${driverPalette.on_route}33`,
                  }}
                />
              </PreviewCanvas>
            </Field>

            <Field label="Forme livraison">
              <ShapePicker
                value={draft.markers.delivery.shape}
                onChange={(s) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, delivery: { ...prev.markers.delivery, shape: s } } }))}
                color={palette.assigned}
              />
            </Field>
            <Field label="Taille livraison" hint="24-48 px">
              <Slider
                value={draft.markers.delivery.size} min={24} max={48}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, delivery: { ...prev.markers.delivery, size: v } } }))}
                suffix="px"
              />
            </Field>
            <Field label="Opacité livraison">
              <Slider
                value={Math.round(draft.markers.delivery.opacity * 100)} min={30} max={100}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, delivery: { ...prev.markers.delivery, opacity: v / 100 } } }))}
                suffix="%"
              />
            </Field>

            <div className="my-1 h-px w-full bg-zinc-800/60" />

            <Field label="Forme enlèvement">
              <ShapePicker
                value={draft.markers.pickup.shape}
                onChange={(s) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, pickup: { ...prev.markers.pickup, shape: s } } }))}
                color={palette.preassigned}
              />
            </Field>
            <Field label="Taille enlèvement">
              <Slider
                value={draft.markers.pickup.size} min={24} max={48}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, pickup: { ...prev.markers.pickup, size: v } } }))}
                suffix="px"
              />
            </Field>
            <Field label="Opacité enlèvement">
              <Slider
                value={Math.round(draft.markers.pickup.opacity * 100)} min={30} max={100}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, pickup: { ...prev.markers.pickup, opacity: v / 100 } } }))}
                suffix="%"
              />
            </Field>

            <div className="my-1 h-px w-full bg-zinc-800/60" />

            <Field label="Taille conducteur" hint="La forme du conducteur sera paramétrable ultérieurement.">
              <Slider
                value={draft.markers.driver.size} min={24} max={48}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, driver: { ...prev.markers.driver, size: v } } }))}
                suffix="px"
              />
            </Field>
            <Field label="Opacité conducteur">
              <Slider
                value={Math.round(draft.markers.driver.opacity * 100)} min={30} max={100}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, driver: { ...prev.markers.driver, opacity: v / 100 } } }))}
                suffix="%"
              />
            </Field>

            <div className="my-1 h-px w-full bg-zinc-800/60" />

            <Field label="Format du label" hint="Texte affiché dans la pastille de mission.">
              <RadioPills<LabelFormat>
                value={draft.markers.label.format}
                options={['last-N', 'first-N', 'full']}
                labels={LABEL_FORMAT_LABELS}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, label: { ...prev.markers.label, format: v } } }))}
              />
            </Field>
            <Field label="Nombre de caractères" hint="Ignoré si « code complet ».">
              <div className="flex items-center gap-3">
                <Slider
                  value={draft.markers.label.charCount} min={1} max={12}
                  onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, label: { ...prev.markers.label, charCount: v } } }))}
                />
                <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500">Aperçu</span>
                  <code className="text-[11px] font-bold text-zinc-200">{sampleLabel}</code>
                </div>
              </div>
            </Field>
          </Section>

          {/* ── Conducteurs ───────────────────────────────────────── */}
          <Section title="Conducteurs" hint="Apparence des pastilles conducteur et de leur tracé de tournée.">
            <Field label="Aperçu live conducteur">
              <PreviewCanvas title="Pastille + tracé">
                <div className="flex items-center gap-6">
                  {/* Mock route segment */}
                  <svg width="120" height="60" className="overflow-visible">
                    <line
                      x1="10" y1="50" x2="110" y2="20"
                      stroke={driverPalette.on_route}
                      strokeWidth={draft.driverRoute.width}
                      strokeOpacity={draft.driverRoute.opacity}
                      strokeLinecap="round"
                      strokeDasharray={
                        draft.driverRoute.style === 'solid' ? undefined
                        : draft.driverRoute.style === 'dashed' ? `${draft.driverRoute.width * 2} ${draft.driverRoute.width}`
                        : `${draft.driverRoute.width * 0.4} ${draft.driverRoute.width * 1.6}`
                      }
                    />
                    <circle cx="10" cy="50" r="2.5" fill={driverPalette.on_route} />
                    <circle cx="110" cy="20" r="2.5" fill={driverPalette.on_route} />
                  </svg>
                  {/* Driver pin */}
                  <div className="relative">
                    {(() => {
                      const c = driverPalette.on_route;
                      const size = draft.markers.driver.size;
                      const shellSize = Math.max(20, Math.round(size * 0.82));
                      const shell: React.CSSProperties = {
                        width: shellSize,
                        height: shellSize,
                        background: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04)), ${c}24`,
                        border: `1px solid ${c}33`,
                        boxShadow: `0 10px 20px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px ${c}20`,
                      };
                      const wrapStyle: React.CSSProperties = {
                        width: size,
                        height: size,
                        opacity: draft.markers.driver.opacity,
                        position: 'relative',
                      };
                      const shape = draft.markers.driver.shape;
                      let shellShaped: React.CSSProperties = { ...shell };
                      if (shape === 'circle') shellShaped.borderRadius = '50%';
                      else if (shape === 'rounded-square') shellShaped.borderRadius = '22%';
                      else if (shape === 'hexagon') {
                        shellShaped.borderRadius = '4px';
                        shellShaped.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
                      } else if (shape === 'diamond') {
                        shellShaped.borderRadius = '4px';
                        shellShaped.transform = 'rotate(45deg) scale(0.72)';
                      } else if (shape === 'pin') {
                        shellShaped.borderRadius = '50% 50% 50% 0';
                        shellShaped.transform = 'rotate(-45deg)';
                      }
                      return (
                        <div style={wrapStyle}>
                          <span style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%,-50%)',
                            ...shellShaped,
                          }} />
                          {draft.markers.driver.showStatusDot && (
                            <span style={{
                              position: 'absolute', right: 1, bottom: 2,
                              width: 10, height: 10, borderRadius: '50%',
                              background: driverPalette.on_route,
                              border: '1.5px solid rgba(24,24,27,0.95)',
                            }} />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </PreviewCanvas>
            </Field>

            <Field label="Forme du conducteur">
              <ShapePicker
                value={draft.markers.driver.shape}
                onChange={(s) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, driver: { ...prev.markers.driver, shape: s } } }))}
                color={driverPalette.on_route}
              />
            </Field>

            <Field label="Pastille de statut" hint="Petit cercle coloré en bas à droite.">
              <Toggle
                checked={draft.markers.driver.showStatusDot}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, driver: { ...prev.markers.driver, showStatusDot: v } } }))}
                label="Afficher le point de statut"
              />
            </Field>

            <Field label="Pulse retard" hint="Animation pour les conducteurs en statut « delayed ».">
              <Toggle
                checked={draft.markers.driver.pulseDelayed}
                onChange={(v) => setDraft((prev) => ({ ...prev, markers: { ...prev.markers, driver: { ...prev.markers.driver, pulseDelayed: v } } }))}
                label="Faire pulser la pastille en cas de retard"
              />
            </Field>

            <div className="my-1 h-px w-full bg-zinc-800/60" />

            <Field label="Tracé de tournée" hint="Polyligne reliant les arrêts du conducteur.">
              <Toggle
                checked={draft.driverRoute.visible}
                onChange={(v) => setDraft((prev) => ({ ...prev, driverRoute: { ...prev.driverRoute, visible: v } }))}
                label="Afficher le tracé sur la carte"
              />
            </Field>

            <Field label="Style du tracé">
              <RadioPills<RouteLineStyle>
                value={draft.driverRoute.style}
                options={['solid', 'dashed', 'dotted']}
                labels={ROUTE_LINE_STYLE_LABELS}
                onChange={(v) => setDraft((prev) => ({ ...prev, driverRoute: { ...prev.driverRoute, style: v } }))}
              />
            </Field>

            <Field label="Épaisseur" hint="1-8 px">
              <Slider
                value={draft.driverRoute.width} min={1} max={8}
                onChange={(v) => setDraft((prev) => ({ ...prev, driverRoute: { ...prev.driverRoute, width: v } }))}
                suffix="px"
              />
            </Field>

            <Field label="Opacité du tracé">
              <Slider
                value={Math.round(draft.driverRoute.opacity * 100)} min={20} max={100}
                onChange={(v) => setDraft((prev) => ({ ...prev, driverRoute: { ...prev.driverRoute, opacity: v / 100 } }))}
                suffix="%"
              />
            </Field>
          </Section>

          {/* ── Animations ────────────────────────────────────────── */}
          <Section title="Animations" hint="Vitesse et intensité des effets visuels.">
            <Field label="Déplacement conducteur" hint="800–4000 ms">
              <Slider
                value={draft.animations.driverMoveMs} min={800} max={4000} step={100}
                onChange={(v) => setDraft((prev) => ({ ...prev, animations: { ...prev.animations, driverMoveMs: v } }))}
                suffix="ms"
              />
            </Field>
            <Field label="Cycle du serpent" hint="Lien orange enlèvement → livraison au survol.">
              <Slider
                value={draft.animations.snakeCycleMs} min={800} max={3000} step={100}
                onChange={(v) => setDraft((prev) => ({ ...prev, animations: { ...prev.animations, snakeCycleMs: v } }))}
                suffix="ms"
              />
            </Field>
            <Field label="Animations réduites">
              <Toggle
                checked={draft.animations.reduced}
                onChange={(v) => setDraft((prev) => ({ ...prev, animations: { ...prev.animations, reduced: v } }))}
                label="Couper pulses, scales et bursts non essentiels"
              />
            </Field>
          </Section>

          {/* ── Comportements ─────────────────────────────────────── */}
          <Section title="Comportements" hint="Interactions souris/clavier sur la carte.">
            <Field label="Double-clic">
              <Toggle
                checked={draft.behaviors.doubleClickUnassigns}
                onChange={(v) => setDraft((prev) => ({ ...prev, behaviors: { ...prev.behaviors, doubleClickUnassigns: v } }))}
                label="Double-cliquer une mission la désassigne"
              />
            </Field>
            <Field label="Touche Échap">
              <Toggle
                checked={draft.behaviors.escClearsPin}
                onChange={(v) => setDraft((prev) => ({ ...prev, behaviors: { ...prev.behaviors, escClearsPin: v } }))}
                label="Échap annule l'attribution rapide"
              />
            </Field>
            <Field label="Clic droit">
              <Toggle
                checked={draft.behaviors.rightClickOpensModal}
                onChange={(v) => setDraft((prev) => ({ ...prev, behaviors: { ...prev.behaviors, rightClickOpensModal: v } }))}
                label="Clic droit conducteur ouvre le modal d'attribution"
              />
            </Field>
          </Section>

          {/* ── Tooltips ──────────────────────────────────────────── */}
          <Section title="Tooltips" hint="Niveau de détail des info-bulles au survol.">
            <Field label="Trajet enlèvement-livraison">
              <Toggle
                checked={draft.tooltip.showLegs}
                onChange={(v) => setDraft((prev) => ({ ...prev, tooltip: { ...prev.tooltip, showLegs: v } }))}
                label="Afficher les deux jambes (pickup + dropoff)"
              />
            </Field>
            <Field label="Détail conducteur">
              <Toggle
                checked={draft.tooltip.showAssignmentBreakdown}
                onChange={(v) => setDraft((prev) => ({ ...prev, tooltip: { ...prev.tooltip, showAssignmentBreakdown: v } }))}
                label="Afficher la ventilation par statut des missions"
              />
            </Field>
            <Field label="Délai d'apparition" hint="0–500 ms">
              <Slider
                value={draft.tooltip.delayMs} min={0} max={500} step={50}
                onChange={(v) => setDraft((prev) => ({ ...prev, tooltip: { ...prev.tooltip, delayMs: v } }))}
                suffix="ms"
              />
            </Field>
          </Section>

          {/* Sticky bottom action bar — always reachable */}
          <div className="sticky bottom-0 -mx-6 mt-4 border-t border-zinc-800/80 bg-zinc-950/90 px-6 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              {hasChanges ? (
                <span className="flex items-center gap-2 text-[11px] font-semibold text-violet-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Brouillon non validé
                </span>
              ) : (
                <span className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Configuration synchronisée
                </span>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={cancel}
                disabled={!hasChanges}
                className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors disabled:opacity-40 disabled:hover:text-zinc-400 disabled:cursor-not-allowed"
              >
                <Cross2Icon className="w-3.5 h-3.5" />
                Annuler les modifications
              </button>
              <button
                type="button"
                onClick={validate}
                disabled={!hasChanges}
                className="flex items-center gap-1.5 rounded-md border border-violet-400/50 bg-violet-500/20 px-4 py-1.5 text-[11px] font-bold text-violet-100 hover:bg-violet-500/30 transition-colors disabled:border-zinc-800 disabled:bg-zinc-900/40 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Valider et appliquer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
