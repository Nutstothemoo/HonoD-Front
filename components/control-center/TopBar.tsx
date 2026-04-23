'use client';

import Link from 'next/link';
import { KPIData } from '@/types/vrp';
import AutoSolveTimer from './AutoSolveTimer';

interface TopBarProps {
  kpi: KPIData;
  isOptimizing: boolean;
  onOptimize: () => void;
}

function KPIChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center px-4 border-r border-zinc-800 last:border-r-0">
      <span className="text-xs text-zinc-500 whitespace-nowrap">{label}</span>
      <span className="text-sm font-bold text-zinc-200">
        {value}
        {sub && <span className="text-xs font-normal text-zinc-500 ml-0.5">{sub}</span>}
      </span>
    </div>
  );
}

export default function TopBar({ kpi, isOptimizing, onOptimize }: TopBarProps) {
  return (
    <header className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-sm font-bold text-zinc-100 tracking-wide">VRP Control</span>
      </div>

      <div className="w-px h-6 bg-zinc-800" />

      {/* Nav */}
      <nav className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
        <Link href="/control-center" className="px-2 py-1 rounded text-zinc-200 bg-zinc-800">Carte</Link>
        <Link href="/planning" className="px-2 py-1 rounded hover:text-zinc-300 hover:bg-zinc-900 transition-colors">Planning</Link>
        <Link href="/orders" className="px-2 py-1 rounded hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
          Commandes
          <span className="ml-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded px-1">
            {kpi.totalCount - kpi.completedCount}
          </span>
        </Link>
      </nav>

      {/* KPIs */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-stretch">
          <KPIChip label="Remplissage" value={`${kpi.fillRate}%`} />
          <KPIChip label="Distance" value={`${kpi.totalDistance}`} sub="km" />
          <KPIChip label="Coût/livraison" value={`${kpi.costPerDelivery.toFixed(2)}€`} />
          <KPIChip label="À l'heure" value={`${kpi.onTimeRate}%`} />
          <KPIChip label="Livré" value={`${kpi.completedCount}/${kpi.totalCount}`} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <AutoSolveTimer />
        {kpi.atRiskCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded px-2.5 py-1 text-xs text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            {kpi.atRiskCount} alerte{kpi.atRiskCount > 1 ? 's' : ''}
          </div>
        )}
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
        >
          {isOptimizing ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              Optimisation…
            </>
          ) : (
            <>⚡ Optimiser</>
          )}
        </button>
      </div>
    </header>
  );
}
