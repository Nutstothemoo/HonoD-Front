import type { ShipmentListFilter } from './veloce-api'

export const queryKeys = {
  drivers:          ['drivers'] as const,
  driver:           (id: string) => ['drivers', id] as const,
  livePositions:    ['drivers', 'positions'] as const,
  shipments:        (filter?: ShipmentListFilter) =>
                      filter && Object.keys(filter).length > 0
                        ? (['shipments', filter] as const)
                        : (['shipments'] as const),
  shipment:         (id: string) => ['shipments', id] as const,
  skills:           ['skills'] as const,
  plans:            ['plans'] as const,
  plan:             (id: string) => ['plans', id] as const,
  autoSolveConfig:  ['auto-solve'] as const,
}
