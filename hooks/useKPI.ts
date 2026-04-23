'use client';

import { useMemo } from 'react';
import { computeKPI } from '@/lib/kpi';
import { LiveDriver, DeliveryPoint, KPIData } from '@/types/vrp';
import { VeloceResponse } from '@/types/veloce';

export function useKPI(
  drivers: LiveDriver[],
  deliveries: DeliveryPoint[],
  lastSolution?: VeloceResponse | null,
): KPIData {
  return useMemo(
    () => computeKPI(drivers, deliveries, lastSolution),
    [drivers, deliveries, lastSolution],
  );
}
