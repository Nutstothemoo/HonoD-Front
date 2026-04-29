'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { springs } from '@/components/atoms/motion';
import { DeliveryPoint } from '@/types/vrp';

interface NewOrderAlert {
  id: string;
  address: string;
  timeWindow: string;
}

interface AlertBannerProps {
  atRiskDeliveries: DeliveryPoint[];
  pendingAlert: NewOrderAlert | null;
  onReroute: () => void;
  onDismissAlert: () => void;
}

// Each alert slides up + fades in, stacks via `layout` so adding/removing one
// reflows the rest smoothly instead of jumping.
const alertVariants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: 12, scale: 0.96 },
};

export default function AlertBanner({
  atRiskDeliveries,
  pendingAlert,
  onReroute,
  onDismissAlert,
}: AlertBannerProps) {
  const [dismissedRisk, setDismissedRisk] = useState<string[]>([]);

  const visibleRisk = atRiskDeliveries.filter((d) => !dismissedRisk.includes(d.id));

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 w-full max-w-xl px-4 pointer-events-none">
      <AnimatePresence initial={false}>
        {pendingAlert && (
          <motion.div
            key="pending-alert"
            layout
            variants={alertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.default}
            className="pointer-events-auto bg-zinc-900 border border-blue-500/40 rounded-lg px-4 py-3 flex items-center gap-3 shadow-xl"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-blue-400">Nouvelle commande entrante</div>
              <div className="text-xs text-zinc-400 truncate">{pendingAlert.address}</div>
              <div className="text-xs text-zinc-600">{pendingAlert.timeWindow}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onReroute}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded font-medium transition-colors"
              >
                Re-router
              </button>
              <button
                onClick={onDismissAlert}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded transition-colors"
              >
                Ignorer
              </button>
            </div>
          </motion.div>
        )}

        {visibleRisk.map((d) => (
          <motion.div
            key={d.id}
            layout
            variants={alertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.default}
            className="pointer-events-auto bg-zinc-900 border border-red-500/40 rounded-lg px-4 py-3 flex items-center gap-3 shadow-xl"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-red-400">Risque de retard</div>
              <div className="text-xs text-zinc-400 truncate">{d.address}</div>
              <div className="text-xs text-zinc-600">
                Créneau : {d.timeWindowStart} – {d.timeWindowEnd}
              </div>
            </div>
            <button
              onClick={() => setDismissedRisk((prev) => [...prev, d.id])}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded transition-colors shrink-0"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
