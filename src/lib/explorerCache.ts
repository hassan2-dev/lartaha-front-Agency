import Dexie, { type Table } from 'dexie'

const DB_NAME = 'ExplorerCache'
const TTL_MS = 10 * 60 * 1000 // 10 minutes
const TASKS_TTL_MS = 5 * 60 * 1000 // 5 minutes

export interface TasksCacheEntry {
  workspaceId: string // primary key
  tasks: unknown[]
  workspaceUsers: unknown[]
  hasMore: boolean
  nextCursor: string | null
  updatedAt: number
}

export interface ExplorerCacheEntry {
  prefix: string // primary key — the full storage prefix (e.g. "uploads/wsId/folder")
  folders: string[]
  files: unknown[]
  hasMore: boolean
  nextToken: string | null
  updatedAt: number
}

class ExplorerCacheDB extends Dexie {
  folderPages!: Table<ExplorerCacheEntry, string>
  taskPages!: Table<TasksCacheEntry, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      folderPages: 'prefix, updatedAt',
    })
    this.version(2).stores({
      folderPages: 'prefix, updatedAt',
      taskPages: 'workspaceId, updatedAt',
    })
  }
}

const db = new ExplorerCacheDB()

export async function getExplorerCache(prefix: string): Promise<ExplorerCacheEntry | null> {
  try {
    const entry = await db.folderPages.get(prefix)
    if (!entry) return null
    if (Date.now() - entry.updatedAt > TTL_MS) {
      await db.folderPages.delete(prefix)
      return null
    }
    return entry
  } catch {
    return null
  }
}

export async function setExplorerCache(entry: Omit<ExplorerCacheEntry, 'updatedAt'>): Promise<void> {
  try {
    await db.folderPages.put({ ...entry, updatedAt: Date.now() })
  } catch {
    // Non-fatal
  }
}

export async function invalidateExplorerCache(prefix: string): Promise<void> {
  try {
    await db.folderPages.delete(prefix)
  } catch {
    // Non-fatal
  }
}

// --- Tasks cache ---

export async function getTasksCache(workspaceId: string): Promise<TasksCacheEntry | null> {
  try {
    const entry = await db.taskPages.get(workspaceId)
    if (!entry) return null
    if (Date.now() - entry.updatedAt > TASKS_TTL_MS) {
      await db.taskPages.delete(workspaceId)
      return null
    }
    return entry
  } catch {
    return null
  }
}

export async function setTasksCache(
  entry: Omit<TasksCacheEntry, 'updatedAt'>
): Promise<void> {
  try {
    await db.taskPages.put({ ...entry, updatedAt: Date.now() })
  } catch {
    // Non-fatal
  }
}

export async function invalidateTasksCache(workspaceId: string): Promise<void> {
  try {
    await db.taskPages.delete(workspaceId)
  } catch {
    // Non-fatal
  }
}

/** Removes all entries whose prefix starts with the given workspace prefix. */
export async function invalidateAllExplorerCaches(workspacePrefix: string): Promise<void> {
  try {
    const keys = await db.folderPages
      .where('prefix')
      .startsWith(workspacePrefix)
      .primaryKeys()
    await db.folderPages.bulkDelete(keys as string[])
  } catch {
    // Non-fatal
  }
}
