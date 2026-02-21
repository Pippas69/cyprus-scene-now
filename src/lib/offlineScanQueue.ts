/**
 * Offline QR Scan Queue using IndexedDB
 * Stores scans locally when offline, syncs when back online.
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflineScan {
  id: string;
  scanType: 'ticket' | 'reservation' | 'offer' | 'student';
  qrData: string;
  businessId: string;
  scannedAt: string; // ISO timestamp
  synced: boolean;
  syncAttempts: number;
  lastSyncError?: string;
  serverResult?: any;
  conflictReason?: string;
}

interface ScanQueueDB extends DBSchema {
  'offline-scans': {
    key: string;
    value: OfflineScan;
    indexes: {
      'by-synced': number; // 0 = not synced, 1 = synced
      'by-business': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ScanQueueDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ScanQueueDB>('fomo-scan-queue', 1, {
      upgrade(db) {
        const store = db.createObjectStore('offline-scans', { keyPath: 'id' });
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-business', 'businessId');
      },
    });
  }
  return dbPromise;
}

/** Add a scan to the offline queue */
export async function queueOfflineScan(scan: Omit<OfflineScan, 'id' | 'synced' | 'syncAttempts'>): Promise<OfflineScan> {
  const db = await getDB();
  const entry: OfflineScan = {
    ...scan,
    id: crypto.randomUUID(),
    synced: false,
    syncAttempts: 0,
  };
  await db.put('offline-scans', entry);
  return entry;
}

/** Get all unsynced scans */
export async function getUnsyncedScans(): Promise<OfflineScan[]> {
  const db = await getDB();
  const all = await db.getAll('offline-scans');
  return all.filter(s => !s.synced && s.syncAttempts < 10);
}

/** Mark a scan as synced */
export async function markScanSynced(id: string, serverResult: any): Promise<void> {
  const db = await getDB();
  const scan = await db.get('offline-scans', id);
  if (scan) {
    scan.synced = true;
    scan.serverResult = serverResult;
    await db.put('offline-scans', scan);
  }
}

/** Mark a scan as conflicted */
export async function markScanConflict(id: string, reason: string, serverResult: any): Promise<void> {
  const db = await getDB();
  const scan = await db.get('offline-scans', id);
  if (scan) {
    scan.synced = true; // Don't retry
    scan.conflictReason = reason;
    scan.serverResult = serverResult;
    await db.put('offline-scans', scan);
  }
}

/** Increment sync attempt on failure */
export async function markSyncFailed(id: string, error: string): Promise<void> {
  const db = await getDB();
  const scan = await db.get('offline-scans', id);
  if (scan) {
    scan.syncAttempts += 1;
    scan.lastSyncError = error;
    await db.put('offline-scans', scan);
  }
}

/** Get pending count for UI badge */
export async function getPendingScanCount(): Promise<number> {
  const scans = await getUnsyncedScans();
  return scans.length;
}

/** Get all scans for a business (for viewing history) */
export async function getBusinessScans(businessId: string): Promise<OfflineScan[]> {
  const db = await getDB();
  return db.getAllFromIndex('offline-scans', 'by-business', businessId);
}

/** Clean up old synced scans (keep last 24h) */
export async function cleanOldScans(): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('offline-scans');
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  for (const scan of all) {
    if (scan.synced && scan.scannedAt < cutoff) {
      await db.delete('offline-scans', scan.id);
    }
  }
}
