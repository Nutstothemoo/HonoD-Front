'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { driversApi, shipmentsApi } from '@/lib/veloce-api'
import { driversToLive, shipmentsToDeliveries } from '@/lib/mappers'
import type { LiveDriver, DeliveryPoint } from '@/types/vrp'

const DRIVER_INTERVAL_VISIBLE = 3000
const DRIVER_INTERVAL_HIDDEN = 15000
const SHIPMENT_INTERVAL_VISIBLE = 10000
const SHIPMENT_INTERVAL_HIDDEN = 30000

export function useVeloceData() {
  const [drivers, setDrivers] = useState<LiveDriver[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const loadingRef = useRef(true)
  const driversInFlightRef = useRef(false)
  const shipmentsInFlightRef = useRef(false)
  const driverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shipmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const driverAbortRef = useRef<AbortController | null>(null)
  const shipmentAbortRef = useRef<AbortController | null>(null)

  const clearDriverTimer = useCallback(() => {
    if (!driverTimerRef.current) return
    clearTimeout(driverTimerRef.current)
    driverTimerRef.current = null
  }, [])

  const clearShipmentTimer = useCallback(() => {
    if (!shipmentTimerRef.current) return
    clearTimeout(shipmentTimerRef.current)
    shipmentTimerRef.current = null
  }, [])

  const getDriverDelay = useCallback(
    () => (document.hidden ? DRIVER_INTERVAL_HIDDEN : DRIVER_INTERVAL_VISIBLE),
    [],
  )

  const getShipmentDelay = useCallback(
    () => (document.hidden ? SHIPMENT_INTERVAL_HIDDEN : SHIPMENT_INTERVAL_VISIBLE),
    [],
  )

  const fetchDrivers = useCallback(async (signal?: AbortSignal) => {
    if (driversInFlightRef.current) return
    driversInFlightRef.current = true
    try {
      const data = await driversApi.list({ signal })
      if (signal?.aborted || !mountedRef.current) return
      setError((current) => (current === 'Erreur drivers' ? null : current))
      setDrivers(driversToLive(data))
    } catch (e) {
      if (signal?.aborted || !mountedRef.current) return
      setError(e instanceof Error ? e.message : 'Erreur drivers')
    } finally {
      driversInFlightRef.current = false
    }
  }, [])

  const fetchShipments = useCallback(async (signal?: AbortSignal) => {
    if (shipmentsInFlightRef.current) return
    shipmentsInFlightRef.current = true
    try {
      const data = await shipmentsApi.list({ signal })
      if (signal?.aborted || !mountedRef.current) return
      setError((current) => (current === 'Erreur shipments' ? null : current))
      setDeliveries(shipmentsToDeliveries(data))
    } catch (e) {
      if (signal?.aborted || !mountedRef.current) return
      setError(e instanceof Error ? e.message : 'Erreur shipments')
    } finally {
      shipmentsInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    mountedRef.current = true

    const scheduleDrivers = (delay: number) => {
      clearDriverTimer()
      driverTimerRef.current = setTimeout(async () => {
        driverAbortRef.current?.abort()
        const controller = new AbortController()
        driverAbortRef.current = controller
        await fetchDrivers(controller.signal)
        if (!controller.signal.aborted && mountedRef.current) {
          scheduleDrivers(getDriverDelay())
        }
      }, delay)
    }

    const scheduleShipments = (delay: number) => {
      clearShipmentTimer()
      shipmentTimerRef.current = setTimeout(async () => {
        shipmentAbortRef.current?.abort()
        const controller = new AbortController()
        shipmentAbortRef.current = controller
        await fetchShipments(controller.signal)
        if (!controller.signal.aborted && mountedRef.current) {
          scheduleShipments(getShipmentDelay())
        }
      }, delay)
    }

    const bootstrap = async () => {
      setError(null)
      const driversController = new AbortController()
      const shipmentsController = new AbortController()
      driverAbortRef.current = driversController
      shipmentAbortRef.current = shipmentsController

      await Promise.allSettled([
        fetchDrivers(driversController.signal),
        fetchShipments(shipmentsController.signal),
      ])

      if (!mountedRef.current) return
      setLoading(false)
      scheduleDrivers(getDriverDelay())
      scheduleShipments(getShipmentDelay())
    }

    const handleVisibilityChange = () => {
      if (!mountedRef.current || loadingRef.current) return
      scheduleDrivers(0)
      scheduleShipments(0)
    }

    void bootstrap()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearDriverTimer()
      clearShipmentTimer()
      driverAbortRef.current?.abort()
      shipmentAbortRef.current?.abort()
    }
  }, [clearDriverTimer, clearShipmentTimer, fetchDrivers, fetchShipments, getDriverDelay, getShipmentDelay])

  return { drivers, deliveries, loading, error, refetchShipments: fetchShipments }
}
