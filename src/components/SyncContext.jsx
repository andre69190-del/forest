/**
 * Sync-Zustand für die ganze App: Konto, letzter Abgleich, ausstehende Nachweise.
 * Automatischer Abgleich (wenn angemeldet, online und „Automatisch abgleichen“ an):
 * beim Start, beim Wiederverbinden und ein paar Sekunden nach jedem neuen Nachweis.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cloudConfigured, currentUser, api } from '../lib/cloud.js';
import { syncNow as runSync, pendingRecords } from '../lib/sync.js';
import { getSetting } from '../lib/db.js';
import { useSettings, useOnline } from '../App.jsx';

const SyncContext = createContext(null);
export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }) {
  const settings = useSettings();
  const online = useOnline();
  const [user, setUser] = useState(null);
  const [state, setState] = useState({ busy: false, lastSync: null, pending: 0, error: null, result: null });
  const timer = useRef(null);
  const configured = cloudConfigured();

  const refresh = useCallback(async () => {
    const [u, last, pend] = await Promise.all([currentUser().catch(() => null), getSetting('lastSync', null), pendingRecords()]);
    setUser(u);
    setState((s) => ({ ...s, lastSync: last, pending: pend.length }));
    return u;
  }, []);

  const syncNow = useCallback(async () => {
    const u = await refresh();
    if (!u || !navigator.onLine) return null;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const res = await runSync(await api(), { userId: u.id, groupId: settings.shareGroupId || null });
      setState((s) => ({ ...s, busy: false, lastSync: res.at, result: res, pending: 0 }));
      return res;
    } catch (e) {
      setState((s) => ({ ...s, busy: false, error: e.message || String(e) }));
      return null;
    }
  }, [refresh, settings.shareGroupId]);

  useEffect(() => { if (configured) refresh(); }, [configured, refresh]);
  useEffect(() => {
    if (!configured || !settings.loaded || !settings.autoSync || !online) return undefined;
    syncNow();
    const onRecord = () => { clearTimeout(timer.current); timer.current = setTimeout(syncNow, 4000); };
    window.addEventListener('forest:record', onRecord);
    return () => { window.removeEventListener('forest:record', onRecord); clearTimeout(timer.current); };
  }, [configured, settings.loaded, settings.autoSync, online, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SyncContext.Provider value={{ configured, user, ...state, syncNow, refresh }}>{children}</SyncContext.Provider>;
}
