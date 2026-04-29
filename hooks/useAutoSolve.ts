'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { autoSolveApi, type VeloceAutoSolveConfig } from '@/lib/veloce-api'
import { queryKeys } from '@/lib/query-keys'
import { handleApiError } from '@/lib/api-error'

function parseFutureRun(payload: VeloceAutoSolveConfig | null | undefined): number | null {
  if (!payload?.next_run_at) return null
  const t = new Date(payload.next_run_at).getTime()
  if (!Number.isFinite(t) || t <= Date.now()) return null
  return t
}

export function useAutoSolve() {
  const queryClient = useQueryClient()
  const [secondsLeft, setSecondsLeft] = useState(0)
  // Wall-clock instant of next expected run. Ticked locally so the ring stays smooth
  // between SSE frames. Only refreshed when the back sends a strictly-future next_run_at.
  const anchorRef = useRef<number | null>(null)

  const { data: config, isLoading: loading } = useQuery({
    queryKey: queryKeys.autoSolveConfig,
    queryFn: autoSolveApi.get,
    // SSE stream is the authoritative source after the initial fetch.
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })

  const applyPayload = useCallback(
    (payload: VeloceAutoSolveConfig, opts: { resetIfMissing: boolean }) => {
      const future = parseFutureRun(payload)
      if (future !== null) {
        anchorRef.current = future
      } else if (opts.resetIfMissing && payload.enabled) {
        anchorRef.current = Date.now() + (payload.interval_seconds ?? 0) * 1000
      } else if (!payload.enabled) {
        anchorRef.current = null
      }
      queryClient.setQueryData(queryKeys.autoSolveConfig, payload)
      setSecondsLeft(
        anchorRef.current !== null
          ? Math.max(0, Math.round((anchorRef.current - Date.now()) / 1000))
          : 0,
      )
    },
    [queryClient],
  )

  // Initialise anchor once the first config lands.
  const initialisedRef = useRef(false)
  useEffect(() => {
    if (!config || initialisedRef.current) return
    initialisedRef.current = true
    applyPayload(config, { resetIfMissing: true })
  }, [config, applyPayload])

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<VeloceAutoSolveConfig>) => autoSolveApi.update(patch),
    onSuccess: (updated) => applyPayload(updated, { resetIfMissing: true }),
    onError: (err) => handleApiError(err, 'Auto-attribution'),
  })

  const updateConfig = useCallback(
    async (patch: Partial<VeloceAutoSolveConfig>) => {
      await updateMutation.mutateAsync(patch)
    },
    [updateMutation],
  )

  // SSE subscription — patches the query cache with each countdown tick.
  useEffect(() => {
    const es = new EventSource(autoSolveApi.streamUrl())
    es.addEventListener('countdown', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as VeloceAutoSolveConfig
      applyPayload(data, { resetIfMissing: false })
    })
    es.addEventListener('config', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as VeloceAutoSolveConfig
      applyPayload(data, { resetIfMissing: true })
    })
    es.onerror = () => es.close()
    return () => es.close()
  }, [applyPayload])

  // Local 1 Hz tick so the progress ring decays smoothly between SSE frames.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!config?.enabled || anchorRef.current === null) {
        setSecondsLeft((prev) => (prev === 0 ? prev : 0))
        return
      }
      const next = Math.max(0, Math.round((anchorRef.current - Date.now()) / 1000))
      setSecondsLeft((prev) => (prev === next ? prev : next))
    }, 1000)
    return () => window.clearInterval(id)
  }, [config?.enabled])

  return {
    config: config ?? null,
    secondsLeft,
    loading,
    updateConfig,
  }
}
