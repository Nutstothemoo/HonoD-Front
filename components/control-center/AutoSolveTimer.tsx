'use client'

import { useAutoSolve } from '@/hooks/useAutoSolve'

function fmtCountdown(s: number): string {
  if (s <= 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function AutoSolveTimer() {
  const { config, secondsLeft, loading, updateConfig } = useAutoSolve()

  if (loading || !config) return null

  const intervalMin = Math.round(config.interval_seconds / 60)

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          className={`relative w-8 h-4 rounded-full transition-colors ${
            config.enabled ? 'bg-violet-600' : 'bg-gray-600'
          }`}
          title={config.enabled ? 'Désactiver auto-attribution' : 'Activer auto-attribution'}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              config.enabled ? 'left-4' : 'left-0.5'
            }`}
          />
        </button>
        <span className="text-xs text-gray-400">Auto</span>
      </div>

      {config.enabled && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-violet-300 tabular-nums w-10 text-center">
            {fmtCountdown(secondsLeft)}
          </span>
          <span className="text-gray-600">|</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">toutes les</span>
        <select
          value={intervalMin}
          onChange={(e) => updateConfig({ interval_seconds: Number(e.target.value) * 60 })}
          className="bg-transparent text-xs text-gray-300 border border-gray-700 rounded px-1 py-0.5 focus:outline-none focus:border-violet-500"
        >
          {[1, 2, 5, 10, 15, 20, 30].map((m) => (
            <option key={m} value={m} className="bg-gray-900">
              {m} min
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
