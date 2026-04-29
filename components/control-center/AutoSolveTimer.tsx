'use client'

import { useId } from 'react'
import { useAutoSolve } from '@/hooks/useAutoSolve'
import { PauseIcon, PlayIcon } from '@radix-ui/react-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface AutoSolveTimerProps {
  size?: 'default' | 'compact'
}

const SIZE_MAP = {
  default: { box: 44, ringRadius: 18, btn: 'w-11 h-11', label: 'text-[10px]', icon: 'w-4 h-4' },
  compact: { box: 36, ringRadius: 14, btn: 'w-9 h-9',   label: 'text-[9px]',  icon: 'w-3.5 h-3.5' },
} as const

function fmtCountdown(s: number): string {
  if (s <= 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

const PRESETS = [1, 2, 5, 10, 15, 20, 30] as const

export default function AutoSolveTimer({ size = 'default' }: AutoSolveTimerProps) {
  const { config, secondsLeft, loading, updateConfig } = useAutoSolve()
  const dims = SIZE_MAP[size]
  const ringCircumference = 2 * Math.PI * dims.ringRadius
  const glowFilterId = `timer-glow-${useId().replace(/:/g, '')}`

  if (loading || !config) {
    return <div className={cn('rounded-full bg-zinc-900/60 border border-zinc-800/50 animate-pulse', dims.btn)} />
  }

  const enabled = config.enabled
  const intervalMin = Math.round(config.interval_seconds / 60)
  const progress = config.interval_seconds > 0 ? Math.max(0, Math.min(1, secondsLeft / config.interval_seconds)) : 0
  const dashOffset = ringCircumference * (1 - progress)
  const isUrgent = enabled && secondsLeft <= 10 && secondsLeft > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={enabled ? `Auto-attribution toutes les ${intervalMin} min` : 'Auto-attribution désactivée'}
          className={cn(
            'group relative rounded-full flex items-center justify-center',
            'bg-zinc-900 border border-zinc-700/60 text-zinc-200',
            'hover:bg-zinc-800 hover:border-zinc-600 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.3)]',
            dims.btn,
          )}
        >
          {/* Outer halo — radial violet glow softly breathing when enabled */}
          {enabled && (
            <span
              aria-hidden
              className={cn(
                'absolute -inset-1 rounded-full pointer-events-none',
                isUrgent ? 'animate-[timer-urgent_0.9s_ease-in-out_infinite]' : 'animate-[timer-breathe_3.2s_ease-in-out_infinite]',
              )}
              style={{
                background: isUrgent
                  ? 'radial-gradient(circle, rgba(244,114,182,0.55) 0%, rgba(244,114,182,0) 70%)'
                  : 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(139,92,246,0) 70%)',
                filter: 'blur(8px)',
              }}
            />
          )}

          {/* Progress ring (with glow filter) */}
          <svg
            viewBox={`0 0 ${dims.box} ${dims.box}`}
            className="absolute inset-0 -rotate-90"
            aria-hidden
          >
            <defs>
              <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Track */}
            <circle
              cx={dims.box / 2}
              cy={dims.box / 2}
              r={dims.ringRadius}
              fill="none"
              stroke="rgb(63 63 70 / 0.6)"
              strokeWidth="2"
            />

            {enabled && (
              <>
                {/* Soft glow underlay (blurred wider stroke) */}
                <circle
                  cx={dims.box / 2}
                  cy={dims.box / 2}
                  r={dims.ringRadius}
                  fill="none"
                  stroke={isUrgent ? 'rgb(244 114 182)' : 'rgb(139 92 246)'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={dashOffset}
                  opacity="0.55"
                  filter={`url(#${glowFilterId})`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                />
                {/* Crisp arc on top */}
                <circle
                  cx={dims.box / 2}
                  cy={dims.box / 2}
                  r={dims.ringRadius}
                  fill="none"
                  stroke={isUrgent ? 'rgb(251 207 232)' : 'rgb(196 181 253)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                />
              </>
            )}
          </svg>

          {/* Center label */}
          {enabled ? (
            <span
              className={cn(
                'relative font-mono font-semibold tabular-nums leading-none transition-colors',
                isUrgent ? 'text-pink-100' : 'text-zinc-100',
                dims.label,
              )}
              style={{
                textShadow: isUrgent
                  ? '0 0 8px rgba(244,114,182,0.7), 0 0 14px rgba(244,114,182,0.4)'
                  : '0 0 6px rgba(167,139,250,0.55), 0 0 12px rgba(139,92,246,0.25)',
              }}
            >
              {fmtCountdown(secondsLeft)}
            </span>
          ) : (
            <PauseIcon className={cn('relative text-zinc-500 group-hover:text-zinc-300 transition-colors', dims.icon)} />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/60 text-zinc-200"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
          Auto-attribution
        </DropdownMenuLabel>

        <DropdownMenuItem
          onSelect={() => updateConfig({ enabled: !enabled })}
          className="text-xs cursor-pointer focus:bg-zinc-800/80 focus:text-zinc-100"
        >
          {enabled ? <PauseIcon className="w-3.5 h-3.5 mr-2" /> : <PlayIcon className="w-3.5 h-3.5 mr-2" />}
          {enabled ? 'Désactiver' : 'Activer'}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800/60" />

        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
          Intervalle
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(intervalMin)}
          onValueChange={(v) => updateConfig({ interval_seconds: Number(v) * 60 })}
        >
          {PRESETS.map((m) => (
            <DropdownMenuRadioItem
              key={m}
              value={String(m)}
              className="text-xs cursor-pointer focus:bg-zinc-800/80 focus:text-zinc-100"
            >
              Toutes les {m} min
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
