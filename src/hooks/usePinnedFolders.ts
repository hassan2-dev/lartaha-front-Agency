import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY_PREFIX = 'larthaa_pinned_folders_v2'
const LEGACY_STORAGE_KEY_PREFIX = 'larthaa_pinned_folders'

type PinnedFolderStore = {
  paths: string[]
  updatedAt: string
}

export function normalizeFolderPath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '').trim()
}

function storageKey(userId: string, workspaceId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}:${workspaceId}`
}

function legacyStorageKey(userId: string) {
  return `${LEGACY_STORAGE_KEY_PREFIX}_${userId}`
}

function parseStore(raw: string | null): PinnedFolderStore {
  if (!raw) return { paths: [], updatedAt: '' }
  try {
    const parsed = JSON.parse(raw) as PinnedFolderStore
    if (!Array.isArray(parsed.paths)) return { paths: [], updatedAt: '' }
    return {
      paths: [...new Set(parsed.paths.map(normalizeFolderPath).filter(Boolean))],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return { paths: [], updatedAt: '' }
  }
}

function readStore(userId: string | undefined, workspaceId: string | undefined): PinnedFolderStore {
  if (!userId || !workspaceId) return { paths: [], updatedAt: '' }
  try {
    const current = parseStore(localStorage.getItem(storageKey(userId, workspaceId)))
    if (current.paths.length > 0) return current

    const legacy = parseStore(localStorage.getItem(legacyStorageKey(userId)))
    if (legacy.paths.length > 0) {
      writeStore(userId, workspaceId, legacy.paths)
      return legacy
    }
    return { paths: [], updatedAt: '' }
  } catch {
    return { paths: [], updatedAt: '' }
  }
}

function writeStore(userId: string, workspaceId: string, paths: string[]) {
  const normalized = [...new Set(paths.map(normalizeFolderPath).filter(Boolean))]
  const payload: PinnedFolderStore = {
    paths: normalized,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(storageKey(userId, workspaceId), JSON.stringify(payload))
}

export function folderRelativePath(folderKey: string): string {
  return folderKey.endsWith('/') ? folderKey.slice(0, -1) : folderKey
}

export function folderFullPath(relativeFolderKey: string, currentPath: string): string {
  const cleaned = folderRelativePath(relativeFolderKey)
  const parent = normalizeFolderPath(currentPath)
  return parent ? `${parent}/${cleaned}` : cleaned
}

export function sortFoldersWithPins(
  folders: string[],
  pinnedPaths: string[],
  currentPath: string
): string[] {
  if (pinnedPaths.length === 0) return folders

  const pinRank = new Map(
    pinnedPaths.map((path, index) => [normalizeFolderPath(path), index])
  )
  const getFullPath = (folderKey: string) => normalizeFolderPath(folderFullPath(folderKey, currentPath))

  return [...folders].sort((a, b) => {
    const fullA = getFullPath(a)
    const fullB = getFullPath(b)
    const rankA = pinRank.get(fullA)
    const rankB = pinRank.get(fullB)
    const aPinned = rankA !== undefined
    const bPinned = rankB !== undefined

    if (aPinned && bPinned) return rankA - rankB
    if (aPinned) return -1
    if (bPinned) return 1

    const nameA = folderRelativePath(a)
    const nameB = folderRelativePath(b)
    return nameA.localeCompare(nameB)
  })
}

export function usePinnedFolders(
  userId: string | undefined,
  workspaceId: string | undefined
) {
  const canPersist = Boolean(userId && workspaceId)
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() =>
    readStore(userId, workspaceId).paths
  )

  useEffect(() => {
    setPinnedPaths(readStore(userId, workspaceId).paths)
  }, [userId, workspaceId])

  useEffect(() => {
    if (!canPersist) return

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey(userId!, workspaceId!)) return
      setPinnedPaths(readStore(userId, workspaceId).paths)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [canPersist, userId, workspaceId])

  const persist = useCallback(
    (nextPaths: string[]) => {
      if (!userId || !workspaceId) return
      const normalized = [...new Set(nextPaths.map(normalizeFolderPath).filter(Boolean))]
      setPinnedPaths(normalized)
      writeStore(userId, workspaceId, normalized)
    },
    [userId, workspaceId]
  )

  const isPinned = useCallback(
    (fullPath: string) => pinnedPaths.includes(normalizeFolderPath(fullPath)),
    [pinnedPaths]
  )

  const togglePin = useCallback(
    (fullPath: string) => {
      if (!canPersist) return
      const normalized = normalizeFolderPath(fullPath)
      if (pinnedPaths.includes(normalized)) {
        persist(pinnedPaths.filter(p => p !== normalized))
        return
      }
      persist([...pinnedPaths, normalized])
    },
    [canPersist, pinnedPaths, persist]
  )

  const movePin = useCallback(
    (fullPath: string, direction: 'up' | 'down') => {
      if (!canPersist) return
      const normalized = normalizeFolderPath(fullPath)
      const index = pinnedPaths.indexOf(normalized)
      if (index === -1) return

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= pinnedPaths.length) return

      const next = [...pinnedPaths]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      persist(next)
    },
    [canPersist, pinnedPaths, persist]
  )

  const sortFolders = useCallback(
    (folders: string[], currentPath: string) =>
      sortFoldersWithPins(folders, pinnedPaths, currentPath),
    [pinnedPaths]
  )

  return {
    pinnedPaths,
    isPinned,
    togglePin,
    movePin,
    sortFolders,
    canPersist,
  }
}
