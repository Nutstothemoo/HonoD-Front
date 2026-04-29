'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { driversApi, shipmentsApi } from '@/lib/veloce-api'
import { driversToLive, shipmentsToDeliveries } from '@/lib/mappers'
import { queryKeys } from '@/lib/query-keys'

// Adaptive intervals vs the tab focus state are handled by react-query itself:
// refetchIntervalInBackground=false halts polling when the tab is hidden,
// and refetchOnWindowFocus (set in Providers) refetches on focus regain.
const DRIVER_INTERVAL = 3_000
const SHIPMENT_INTERVAL = 10_000

export function useVeloceData() {
  const driversQuery = useQuery({
    queryKey: queryKeys.drivers,
    queryFn: ({ signal }) => driversApi.list({ signal }),
    refetchInterval: DRIVER_INTERVAL,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    select: driversToLive,
  })

  const shipmentsQuery = useQuery({
    queryKey: queryKeys.shipments(),
    queryFn: ({ signal }) => shipmentsApi.list(undefined, { signal }),
    refetchInterval: SHIPMENT_INTERVAL,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    select: shipmentsToDeliveries,
  })

  const error =
    driversQuery.error instanceof Error ? driversQuery.error.message
    : shipmentsQuery.error instanceof Error ? shipmentsQuery.error.message
    : null

  return {
    drivers: driversQuery.data ?? [],
    deliveries: shipmentsQuery.data ?? [],
    error,
    refetchShipments: () => shipmentsQuery.refetch(),
  }
}
