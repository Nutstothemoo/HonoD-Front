'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentsApi, type VeloceShipment, type VeloceShipmentStatus } from '@/lib/veloce-api'
import { queryKeys } from '@/lib/query-keys'
import { handleApiError, notify } from '@/lib/api-error'

type Context = { previous?: VeloceShipment[] }

/**
 * Centralised shipments mutations with optimistic cache updates and automatic
 * invalidation. Consumers get a simple imperative API and the live query
 * reflects the change immediately, then reconciles against the server response.
 */
export function useShipmentMutations() {
  const queryClient = useQueryClient()

  const snapshot = async (): Promise<Context> => {
    await queryClient.cancelQueries({ queryKey: queryKeys.shipments() })
    return { previous: queryClient.getQueryData<VeloceShipment[]>(queryKeys.shipments()) }
  }

  const rollback = (ctx: Context | undefined) => {
    if (ctx?.previous) queryClient.setQueryData(queryKeys.shipments(), ctx.previous)
  }

  const settle = () => {
    // Match every shipment-scoped query (list, filtered, by-id) so every screen
    // that depends on shipment data sees the reconciled state.
    queryClient.invalidateQueries({ queryKey: ['shipments'] })
  }

  const patchCache = (updater: (s: VeloceShipment) => VeloceShipment | null) => {
    queryClient.setQueryData<VeloceShipment[]>(queryKeys.shipments(), (old) => {
      if (!old) return old
      return old.map((s) => {
        const next = updater(s)
        return next ?? s
      })
    })
  }

  const assign = useMutation<VeloceShipment, Error, { id: string; driverId: string }, Context>({
    mutationFn: ({ id, driverId }) => shipmentsApi.assign(id, driverId),
    onMutate: async ({ id, driverId }) => {
      const ctx = await snapshot()
      patchCache((s) => s.id === id ? { ...s, driver_id: driverId, status: 'assigned' } : null)
      return ctx
    },
    onError: (err, _vars, ctx) => { rollback(ctx); handleApiError(err, 'Attribution') },
    onSettled: settle,
  })

  const unassign = useMutation<VeloceShipment, Error, string, Context>({
    mutationFn: (id) => shipmentsApi.unassign(id),
    onMutate: async (id) => {
      const ctx = await snapshot()
      patchCache((s) => s.id === id ? { ...s, driver_id: null, status: 'to_assign' } : null)
      return ctx
    },
    onError: (err, _vars, ctx) => { rollback(ctx); handleApiError(err, 'Desattribution') },
    onSettled: settle,
  })

  const transition = useMutation<
    VeloceShipment,
    Error,
    { id: string; status: VeloceShipmentStatus; driverId?: string },
    Context
  >({
    mutationFn: ({ id, status, driverId }) => shipmentsApi.transition(id, status, driverId),
    onMutate: async ({ id, status }) => {
      const ctx = await snapshot()
      patchCache((s) => s.id === id ? { ...s, status } : null)
      return ctx
    },
    onError: (err, _vars, ctx) => { rollback(ctx); handleApiError(err, 'Changement de statut') },
    onSettled: settle,
  })

  const bulkAssign = useMutation<
    { count: number; shipments: VeloceShipment[] },
    Error,
    { ids: string[]; driverId: string },
    Context
  >({
    mutationFn: ({ ids, driverId }) =>
      shipmentsApi.bulkAssign({ shipment_ids: ids, driver_id: driverId, status: 'assigned' }),
    onMutate: async ({ ids, driverId }) => {
      const ctx = await snapshot()
      const idSet = new Set(ids)
      patchCache((s) => idSet.has(s.id) ? { ...s, driver_id: driverId, status: 'assigned' } : null)
      return ctx
    },
    onSuccess: (res) => {
      notify.success(`${res.count} mission${res.count > 1 ? 's' : ''} attribuée${res.count > 1 ? 's' : ''}`)
    },
    onError: (err, _vars, ctx) => { rollback(ctx); handleApiError(err, 'Attribution en masse') },
    onSettled: settle,
  })

  const bulkUnassign = useMutation<
    { count: number; shipments: VeloceShipment[] },
    Error,
    string[],
    Context
  >({
    mutationFn: (ids) => shipmentsApi.bulkUnassign(ids),
    onMutate: async (ids) => {
      const ctx = await snapshot()
      const idSet = new Set(ids)
      patchCache((s) => idSet.has(s.id) ? { ...s, driver_id: null, status: 'to_assign' } : null)
      return ctx
    },
    onSuccess: (res) => {
      notify.success(`${res.count} mission${res.count > 1 ? 's' : ''} désattribuée${res.count > 1 ? 's' : ''}`)
    },
    onError: (err, _vars, ctx) => { rollback(ctx); handleApiError(err, 'Desattribution en masse') },
    onSettled: settle,
  })

  return { assign, unassign, transition, bulkAssign, bulkUnassign }
}
