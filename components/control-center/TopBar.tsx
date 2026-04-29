'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronUpIcon, LightningBoltIcon, GearIcon } from '@radix-ui/react-icons';
import { KPIData } from '@/types/vrp';
import AutoSolveTimer from './AutoSolveTimer';
import { AnimatedNumber, springs } from '@/components/atoms/motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TopBarProps {
  /** When omitted, the KPI strip + alert + autosolve + optimize button are hidden ("slim" mode). */
  kpi?: KPIData;
  isOptimizing?: boolean;
  onOptimize?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

function KPIChip({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col items-center px-4 border-r border-zinc-800/60 last:border-r-0">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 whitespace-nowrap">{label}</span>
      <span className="text-sm font-bold text-zinc-200 tabular-nums">
        {value}
        {sub && <span className="text-xs font-normal text-zinc-500 ml-0.5">{sub}</span>}
      </span>
    </div>
  );
}

function VeloceMark() {
  return (
    <div className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    bg-gradient-to-br from-violet-500/25 via-zinc-900 to-blue-500/15
                    border border-violet-400/30
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_14px_rgba(139,92,246,0.18)]">
      {/* Stylized V — overlapping angles suggesting velocity */}
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5l7 14 7-14" className="text-zinc-100" />
        <path d="M9 5l3 6 3-6" className="text-violet-300/70" />
      </svg>
      {/* Live indicator */}
      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950
                       shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse" />
    </div>
  );
}

export default function TopBar({ kpi, isOptimizing, onOptimize }: TopBarProps) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);

  const navItems: NavItem[] = [
    { href: '/control-center', label: 'Carte' },
    { href: '/planning',       label: 'Planning' },
    { href: '/orders',         label: 'Commandes', badge: kpi ? kpi.totalCount - kpi.completedCount : undefined },
  ];

  return (
    <header
      className={cn(
        'relative bg-zinc-950 border-b border-zinc-800/80 flex items-center px-4 gap-4 shrink-0 z-10',
        'transition-[height] duration-300 ease-out',
        compact ? 'h-11' : 'h-16',
      )}
    >
      {/* ── Brand section ───────────────────────────────────────────── */}
      <Link href="/control-center" className="flex items-center gap-2.5 group shrink-0" title="Veloce — VRP Control">
        <VeloceMark />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-zinc-100 tracking-tight">Veloce</span>
          <span className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] mt-0.5">Control</span>
        </div>
      </Link>

      <div className="w-px h-7 bg-zinc-800/70 shrink-0" />

      {/* ── Navigation section — pill tabs (shadcn-style) ───────────── */}
      <nav className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900/50 border border-zinc-800/60 shrink-0">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                active
                  ? 'bg-zinc-800 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.3)]'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40',
              )}
            >
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <Badge
                  className={cn(
                    'h-4 min-w-[18px] px-1 text-[10px] font-semibold border-0 tabular-nums justify-center',
                    active
                      ? 'bg-violet-500/25 text-violet-200'
                      : 'bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-300',
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── KPIs (hidden in compact mode and on slim pages) ─────────── */}
      <div
        className={cn(
          'flex-1 flex items-center justify-center min-w-0 overflow-hidden',
          'transition-[opacity,transform] duration-200',
          compact || !kpi ? 'opacity-0 -translate-y-1 pointer-events-none' : 'opacity-100 translate-y-0',
        )}
        aria-hidden={compact || !kpi}
      >
        {kpi && (
          <div className="flex items-stretch">
            <KPIChip label="Remplissage" value={<><AnimatedNumber value={kpi.fillRate} />%</>} />
            <KPIChip label="Distance" value={<AnimatedNumber value={kpi.totalDistance} />} sub="km" />
            <KPIChip label="Coût/livr." value={<><AnimatedNumber value={kpi.costPerDelivery} decimals={2} />€</>} />
            <KPIChip label="À l'heure" value={<><AnimatedNumber value={kpi.onTimeRate} />%</>} />
            <KPIChip label="Livré" value={<><AnimatedNumber value={kpi.completedCount} />/<AnimatedNumber value={kpi.totalCount} /></>} />
          </div>
        )}
      </div>
      {!kpi && <div className="flex-1" aria-hidden />}

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {!compact && kpi && kpi.atRiskCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-2.5 py-1 text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            {kpi.atRiskCount} alerte{kpi.atRiskCount > 1 ? 's' : ''}
          </div>
        )}

        {onOptimize && <AutoSolveTimer size={compact ? 'compact' : 'default'} />}

        {/* Manual optimize — round, icon-only, matching black DA */}
        {onOptimize && (
          <motion.button
            onClick={onOptimize}
            disabled={isOptimizing}
            whileHover={!isOptimizing ? { scale: 1.06, y: -1 } : undefined}
            whileTap={!isOptimizing ? { scale: 0.94 } : undefined}
            transition={springs.snappy}
            title={isOptimizing ? 'Optimisation en cours…' : 'Optimiser maintenant'}
            className={cn(
              'relative rounded-full flex items-center justify-center',
              'bg-zinc-900 border border-zinc-700/60 text-zinc-100',
              'hover:bg-zinc-800 hover:border-zinc-600 hover:text-white',
              'disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.3)]',
              'transition-colors',
              compact ? 'w-9 h-9' : 'w-11 h-11',
            )}
          >
            {isOptimizing ? (
              <span className={cn('border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            ) : (
              <LightningBoltIcon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            )}
          </motion.button>
        )}

        {/* Settings — opens map configuration tab */}
        <Link
          href="/control-center/settings"
          title="Réglages de la carte"
          className={cn(
            'flex items-center justify-center rounded-md',
            'bg-zinc-900/60 border border-zinc-800/70 text-zinc-400',
            'hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-700',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40',
            'transition-colors',
            pathname?.startsWith('/control-center/settings') && 'bg-zinc-800 text-zinc-100 border-zinc-700',
            compact ? 'h-7 w-7' : 'h-8 w-8',
          )}
        >
          <GearIcon className="w-3.5 h-3.5" />
        </Link>

        {/* Compact toggle — discrete chevron tab */}
        <motion.button
          onClick={() => setCompact((v) => !v)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={springs.snappy}
          title={compact ? 'Afficher les statistiques' : 'Réduire la barre'}
          className={cn(
            'flex items-center justify-center w-6 rounded-md',
            'bg-zinc-900/60 border border-zinc-800/70 text-zinc-500',
            'hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40',
            'transition-colors',
            compact ? 'h-7' : 'h-8',
          )}
        >
          <motion.span
            animate={{ rotate: compact ? 180 : 0 }}
            transition={springs.snappy}
            className="inline-flex"
          >
            <ChevronUpIcon className="w-3.5 h-3.5" />
          </motion.span>
        </motion.button>
      </div>
    </header>
  );
}
