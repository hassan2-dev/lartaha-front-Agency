import { createContext, useContext, useCallback, type ReactNode } from 'react'
import {
  getExplorerCache,
  setExplorerCache,
  invalidateExplorerCache,
  invalidateAllExplorerCaches,
  type ExplorerCacheEntry,
} from '../lib/explorerCache'

type CachePayload = Omit<ExplorerCacheEntry, 'updatedAt'>

interface ExplorerCacheContextValue {
  getCache: (prefix: string) => Promise<ExplorerCacheEntry | null>
  setCache: (entry: CachePayload) => Promise<void>
  invalidate: (prefix: string) => Promise<void>
  invalidateAll: (workspacePrefix: string) => Promise<void>
}

const ExplorerCacheContext = createContext<ExplorerCacheContextValue | null>(null)

export function ExplorerCacheProvider({ children }: { children: ReactNode }) {
  const getCache = useCallback((prefix: string) => getExplorerCache(prefix), [])
  const setCache = useCallback((entry: CachePayload) => setExplorerCache(entry), [])
  const invalidate = useCallback((prefix: string) => invalidateExplorerCache(prefix), [])
  const invalidateAll = useCallback(
    (workspacePrefix: string) => invalidateAllExplorerCaches(workspacePrefix),
    []
  )

  return (
    <ExplorerCacheContext.Provider value={{ getCache, setCache, invalidate, invalidateAll }}>
      {children}
    </ExplorerCacheContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useExplorerCache() {
  const ctx = useContext(ExplorerCacheContext)
  if (!ctx) throw new Error('useExplorerCache must be used within ExplorerCacheProvider')
  return ctx
}
