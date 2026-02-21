/**
 * Hook that auto-syncs offline QR scans when the device comes back online.
 * Handles conflict resolution: server is always the source of truth.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineStatus } from './useOfflineStatus';
import {
  getUnsyncedScans,
  markScanSynced,
  markScanConflict,
  markSyncFailed,
  cleanOldScans,
  getPendingScanCount,
  type OfflineScan,
} from '@/lib/offlineScanQueue';
import { toast } from 'sonner';

interface SyncStats {
  synced: number;
  conflicts: number;
  failed: number;
}

export function useOfflineScanSync(language: 'el' | 'en' = 'el') {
  const { isOnline } = useOfflineStatus();
  const syncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const t = {
    el: {
      syncing: 'Συγχρονισμός offline σαρώσεων...',
      syncComplete: (s: SyncStats) =>
        `Συγχρονισμός: ${s.synced} επιτυχείς${s.conflicts ? `, ${s.conflicts} conflicts` : ''}${s.failed ? `, ${s.failed} αποτυχίες` : ''}`,
      alreadyUsed: 'Ήδη χρησιμοποιημένο (offline conflict)',
    },
    en: {
      syncing: 'Syncing offline scans...',
      syncComplete: (s: SyncStats) =>
        `Sync: ${s.synced} success${s.conflicts ? `, ${s.conflicts} conflicts` : ''}${s.failed ? `, ${s.failed} failed` : ''}`,
      alreadyUsed: 'Already used (offline conflict)',
    },
  };

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingScanCount();
    setPendingCount(count);
  }, []);

  const syncScan = async (scan: OfflineScan): Promise<'synced' | 'conflict' | 'failed'> => {
    try {
      if (scan.scanType === 'ticket') {
        const { data, error } = await supabase.functions.invoke('validate-ticket', {
          body: { qrToken: scan.qrData, action: 'checkin' },
        });
        if (error) throw error;

        if (data?.valid && data?.checkedIn) {
          await markScanSynced(scan.id, data);
          // Record in offline_scan_results for audit
          await supabase.from('offline_scan_results').insert({
            scan_type: scan.scanType,
            qr_data: scan.qrData,
            business_id: scan.businessId,
            scanned_by: (await supabase.auth.getUser()).data.user?.id,
            scanned_at: scan.scannedAt,
            sync_status: 'synced',
            server_result: data,
          });
          return 'synced';
        } else {
          // Ticket was already used or invalid - conflict
          await markScanConflict(scan.id, data?.error || 'already_used', data);
          await supabase.from('offline_scan_results').insert({
            scan_type: scan.scanType,
            qr_data: scan.qrData,
            business_id: scan.businessId,
            scanned_by: (await supabase.auth.getUser()).data.user?.id,
            scanned_at: scan.scannedAt,
            sync_status: 'conflict',
            conflict_reason: data?.error || 'already_used',
            server_result: data,
          });
          return 'conflict';
        }
      }

      if (scan.scanType === 'reservation' || scan.scanType === 'offer') {
        const { data, error } = await supabase.functions.invoke('validate-qr', {
          body: { qrData: scan.qrData, businessId: scan.businessId, language },
        });
        if (error) throw error;

        if (data?.success) {
          await markScanSynced(scan.id, data);
          await supabase.from('offline_scan_results').insert({
            scan_type: scan.scanType,
            qr_data: scan.qrData,
            business_id: scan.businessId,
            scanned_by: (await supabase.auth.getUser()).data.user?.id,
            scanned_at: scan.scannedAt,
            sync_status: 'synced',
            server_result: data,
          });
          return 'synced';
        } else {
          await markScanConflict(scan.id, data?.message || 'invalid', data);
          await supabase.from('offline_scan_results').insert({
            scan_type: scan.scanType,
            qr_data: scan.qrData,
            business_id: scan.businessId,
            scanned_by: (await supabase.auth.getUser()).data.user?.id,
            scanned_at: scan.scannedAt,
            sync_status: 'conflict',
            conflict_reason: data?.message || 'invalid',
            server_result: data,
          });
          return 'conflict';
        }
      }

      // Fallback: unsupported type
      await markSyncFailed(scan.id, 'unsupported_scan_type');
      return 'failed';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markSyncFailed(scan.id, msg);
      return 'failed';
    }
  };

  const syncAllPending = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    const pending = await getUnsyncedScans();
    if (pending.length === 0) {
      syncingRef.current = false;
      setIsSyncing(false);
      return;
    }

    toast.info(t[language].syncing);

    const stats: SyncStats = { synced: 0, conflicts: 0, failed: 0 };

    // Process sequentially to avoid race conditions
    for (const scan of pending) {
      const result = await syncScan(scan);
      stats[result === 'synced' ? 'synced' : result === 'conflict' ? 'conflicts' : 'failed']++;
    }

    toast.info(t[language].syncComplete(stats));

    // Clean up old synced scans
    await cleanOldScans();
    await refreshPendingCount();

    syncingRef.current = false;
    setIsSyncing(false);
  }, [language]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncAllPending();
    }
  }, [isOnline, syncAllPending]);

  // Refresh pending count periodically
  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  return {
    pendingCount,
    isSyncing,
    syncAllPending,
    refreshPendingCount,
  };
}
