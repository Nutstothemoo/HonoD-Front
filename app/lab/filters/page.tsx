'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  type Transition,
  type Variants,
} from 'framer-motion';

const MapBackdrop = dynamic(() => import('./MapBackdrop'), { ssr: false });

const SPRING: Transition = { type: 'spring', stiffness: 150, damping: 20 };

type FilterTag = { id: string; label: string; tone: string };

const FILTERS: FilterTag[] = [
  { id: 'urgent',   label: 'Urgent',     tone: '#ef4444' },
  { id: 'cold',     label: 'Cold-chain', tone: '#3b82f6' },
  { id: 'fragile',  label: 'Fragile',    tone: '#a855f7' },
  { id: 'paris',    label: 'Paris 11e',  tone: '#22c55e' },
  { id: 'lyon',     label: 'Lyon',       tone: '#10b981' },
  { id: 'overdue',  label: 'En retard',  tone: '#f59e0b' },
  { id: 'priority', label: 'Priorité',   tone: '#ec4899' },
  { id: 'oversize', label: 'Volumineux', tone: '#06b6d4' },
];

const PANEL_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.25 } },
};

const PANEL_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: SPRING },
};

// Distribute `count` chips along an arc that opens upward from a bottom-anchored center.
// Span is ~120° so chips stay tight even when many are docked.
function arcPosition(index: number, count: number, radius: number) {
  if (count <= 0) return { x: 0, y: 0 };
  const span = Math.PI * 0.66;
  const start = -Math.PI / 2 - span / 2;
  const t = count === 1 ? 0.5 : index / (count - 1);
  const angle = start + span * t;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function dockRadius(count: number) {
  if (count <= 1) return 110;
  return Math.min(230, 96 + count * 22);
}

export default function FiltersLabPage() {
  const [active, setActive] = useState<string[]>([]);

  const toggle = (id: string) => {
    setActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const inactive = FILTERS.filter((f) => !active.includes(f.id));
  const radius = dockRadius(active.length);

  return (
    <div className="fixed inset-0 overflow-hidden bg-zinc-950 text-zinc-100">
      <MapBackdrop />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      <svg className="absolute" style={{ width: 0, height: 0 }} aria-hidden>
        <defs>
          <filter id="gooey-dock">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <header className="pointer-events-none absolute left-6 top-6 z-30 select-none text-[11px] uppercase tracking-[0.22em] text-white/40">
        Lab · Filters
      </header>
      <div className="pointer-events-none absolute right-6 top-6 z-30 select-none text-[11px] uppercase tracking-[0.22em] text-white/40">
        {active.length === 0 ? 'Click a tag to dock it' : `${active.length} active`}
      </div>

      <LayoutGroup>
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-10">
          <QuickCircle label="Drivers" sub="12 actifs" delay={0.15} />
          <QuickCircle label="Missions" sub="84 ouvertes" delay={0.25} />
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...SPRING, delay: 0.1 }}
          className="absolute right-6 top-1/2 z-20 w-72 -translate-y-1/2 rounded-3xl border border-white/[0.08] bg-zinc-900/40 p-5 backdrop-blur-2xl"
          style={{
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 30px 60px -30px rgba(0,0,0,0.7)',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Filters
            </span>
            <span className="text-[11px] tabular-nums text-white/30">
              {active.length}/{FILTERS.length}
            </span>
          </div>

          <motion.ul
            className="flex flex-wrap gap-2"
            variants={PANEL_VARIANTS}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence mode="popLayout">
              {inactive.map((f) => (
                <motion.li
                  key={f.id}
                  layoutId={`chip-${f.id}`}
                  layout
                  variants={PANEL_ITEM_VARIANTS}
                  exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.18 } }}
                  transition={SPRING}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggle(f.id)}
                  className="cursor-pointer select-none rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/85"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: f.tone, boxShadow: `0 0 6px ${f.tone}` }}
                    />
                    {f.label}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>

          <div className="mt-5 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-white/30">
            Click a tag — it morphs into a bubble on the action wheel below.
            Click a bubble to release it back.
          </div>
        </motion.aside>

        <div className="absolute left-1/2 z-20" style={{ bottom: 96 }}>
          <div className="relative" style={{ filter: 'url(#gooey-dock)' }}>
            <AnimatePresence>
              {active.length > 0 && (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0.3, transition: { duration: 0.22 } }}
                  transition={SPRING}
                  className="rounded-full"
                  style={{
                    position: 'absolute',
                    left: -(radius * 0.55),
                    top: -10,
                    width: radius * 1.1,
                    height: 20,
                    background: 'rgba(220,220,235,0.55)',
                  }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {active.map((id, i) => {
                const f = FILTERS.find((x) => x.id === id)!;
                const { x, y } = arcPosition(i, active.length, radius);
                return (
                  <motion.div
                    key={id}
                    layoutId={`chip-${f.id}`}
                    layout
                    style={{
                      position: 'absolute',
                      left: x,
                      top: y,
                      display: 'grid',
                      placeItems: 'center',
                      width: 0,
                      height: 0,
                    }}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.18 } }}
                    transition={SPRING}
                  >
                    <motion.button
                      onClick={() => toggle(id)}
                      whileHover={{ scale: 1.15, y: -10 }}
                      whileTap={{ scale: 0.95 }}
                      transition={SPRING}
                      className="cursor-pointer select-none whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold text-white"
                      style={{
                        background: `linear-gradient(180deg, ${f.tone}, ${f.tone}aa)`,
                        border: '1px solid rgba(255,255,255,0.22)',
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 24px ${f.tone}55`,
                      }}
                    >
                      {f.label}
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </LayoutGroup>
    </div>
  );
}

function QuickCircle({
  label,
  sub,
  delay = 0,
}: {
  label: string;
  sub: string;
  delay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={{ ...SPRING, delay }}
      className="pointer-events-auto flex h-32 w-32 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-full border border-white/10 bg-zinc-900/30 backdrop-blur-2xl"
      style={{
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 60px -20px rgba(0,0,0,0.8), 0 0 80px -20px rgba(255,255,255,0.12)',
      }}
    >
      <span className="text-sm font-semibold text-white/90">{label}</span>
      <span className="text-[10px] uppercase tracking-widest text-white/40">{sub}</span>
    </motion.button>
  );
}
