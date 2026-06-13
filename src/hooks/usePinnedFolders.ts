import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY_PREFIX = 'larthaa_pinned_folders'

type PinnedFolderStore = {
  paths: string[]
}

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}_${userId}`
}

function readStore(userId: string | undefined): PinnedFolderStore {
  if (!userId) return { paths: [] }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { paths: [] }
    const parsed = JSON.parse(raw) as PinnedFolderStore
    if (!Array.isArray(parsed.paths)) return { paths: [] }
    return { paths: parsed.paths.filter(p => typeof p === 'string' && p.trim()) }
  } catch {
    return { paths: [] }
  }
}

function writeStore(userId: string, store: PinnedFolderStore) {
  localStorage.setItem(storageKey(userId), JSON.stringify(store))
}

export function folderRelativePath(folderKey: string): string {
  return folderKey.endsWith('/') ? folderKey.slice(0, -1) : folderKey
}

export function folderFullPath(relativeFolderKey: string, currentPath: string): string {
  const cleaned = folderRelativePath(relativeFolderKey)
  return currentPath ? `${currentPath}/${cleaned}` : cleaned
}

export function sortFoldersWithPins(
  folders: string[],
  pinnedPaths: string[],
  currentPath: string
): string[] {
  if (pinnedPaths.length === 0) return folders

  const pinRank = new Map(pinnedPaths.map((path, index) => [path, index]))
  const getFullPath = (folderKey: string) => folderFullPath(folderKey, currentPath)

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

export function usePinnedFolders(userId: string | undefined) {
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => readStore(userId).paths)

  useEffect(() => {
    setPinnedPaths(readStore(userId).paths)
  }, [userId])

  const persist = useCallback(
    (nextPaths: string[]) => {
      if (!userId) return
      setPinnedPaths(nextPaths)
      writeStore(userId, { paths: nextPaths })
    },
    [userId]
  )

  const isPinned = useCallback(
    (fullPath: string) => pinnedPaths.includes(fullPath),
    [pinnedPaths]
  )

  const togglePin = useCallback(
    (fullPath: string) => {
      if (!userId) return
      const normalized = fullPath.replace(/^\/+/, '')
      if (pinnedPaths.includes(normalized)) {
        persist(pinnedPaths.filter(p => p !== normalized))
        return
      }
      persist([...pinnedPaths, normalized])
    },
    [userId, pinnedPaths, persist]
  )

  const movePin = useCallback(
    (fullPath: string, direction: 'up' | 'down') => {
      if (!userId) return
      const normalized = fullPath.replace(/^\/+/, '')
      const index = pinnedPaths.indexOf(normalized)
      if (index === -1) return

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= pinnedPaths.length) return

      const next = [...pinnedPaths]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      persist(next)
    },
    [userId, pinnedPaths, persist]
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
  }
}
