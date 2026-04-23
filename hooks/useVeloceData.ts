'use client'

import { useEffect, useState, useCallback } from 'react'
import { driversApi, shipmentsApi } from '@/lib/veloce-api'
import { driversToLive, shipmentsToDeliveries } from '@/lib/mappers'
import type { LiveDriver, DeliveryPoint } from '@/types/vrp'

export function useVeloceData() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDrivers = useCallback(async () => {
    try {
      const data = await driversApi.list()
      setDrivers(driversToLive(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur drivers')
    }
  }, [])

  const fetchShipments = useCallback(async () => {
    try {
      const data = await shipmentsApi.list()
      setDeliveries(shipmentsToDeliveries(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur shipments')
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchDrivers(), fetchShipments()]).finally(() => setLoading(false))

    const posInterval = setInterval(fetchDrivers, 3000)
    const shipInterval = setInterval(fetchShipments, 10000)

    return () => {
      clearInterval(posInterval)
      clearInterval(shipInterval)
    }
  }, [fetchDrivers, fetchShipments])

  return { drivers, deliveries, loading, error, refetchShipments: fetchShipments }
}
