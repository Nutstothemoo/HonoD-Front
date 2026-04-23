'use client'

import { useEffect, useState, useCallback } from 'react'
import { autoSolveApi } from '@/lib/veloce-api'
import type { VeloceAutoSolveConfig } from '@/lib/veloce-api'

interface AutoSolveState {
  config: VeloceAutoSolveConfig | null
  secondsLeft: number
  loading: boolean
}

export function useAutoSolve() {
  const [state, setState] = useState<AutoSolveState>({ config: null, secondsLeft: 0, loading: true })

  const updateConfig = useCallback(async (patch: Partial<VeloceAutoSolveConfig>) => {
    const updated = await autoSolveApi.update(patch)
    setState((s) => ({ ...s, config: updated }))
  }, [])

  useEffect(() => {
    autoSolveApi.get().then((cfg) => {
      setState({ config: cfg, secondsLeft: cfg.interval_seconds, loading: false })
    })

    const url = autoSolveApi.streamUrl()
    const es = new EventSource(url)

    es.addEventListener('countdown', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setState((s) => ({
        ...s,
        secondsLeft: data.seconds_left ?? 0,
        config: s.config
          ? { ...s.config, enabled: data.enabled ?? s.config.enabled }
          : s.config,
      }))
    })

    es.onerror = () => es.close()

    return () => es.close()
  }, [])

  return { ...state, updateConfig }
}
