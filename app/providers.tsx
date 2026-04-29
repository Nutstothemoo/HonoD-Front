'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { MotionConfig } from 'framer-motion'
import { useEffect, useState } from 'react'
import { springs } from '@/components/atoms/motion'
import { MapConfigProvider } from '@/lib/map-config-context'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        // Keep cached data for the whole session so navigating away & back never re-triggers isLoading.
        gcTime: Infinity,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  }))

  useEffect(() => {
    const persister = createSyncStoragePersister({
      storage: window.sessionStorage,
      key: 'veloce-query-cache',
    })
    const [unsubscribe] = persistQueryClient({ queryClient: client, persister })
    return unsubscribe
  }, [client])

  return (
    // `reducedMotion="user"` makes every animation honor the OS-level setting
    // (prefers-reduced-motion). The default spring is inherited by every <motion.*>
    // and <Reveal> in the tree unless they pass an explicit `transition`.
    <MotionConfig transition={springs.default} reducedMotion="user">
      <QueryClientProvider client={client}>
        <MapConfigProvider>{children}</MapConfigProvider>
      </QueryClientProvider>
    </MotionConfig>
  )
}
