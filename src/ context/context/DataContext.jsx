import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, fetchCollection, listenCollection } from '../firebase/firestore';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const COLLECTIONS = [
  'categories',
  'products',
  'customers',
  'suppliers',
  'orders',
  'purchaseOrders',
  'stockMovements',
  'notifications'
];

const emptyState = () =>
  COLLECTIONS.reduce((acc, c) => ({ ...acc, [c]: [], [`${c}Loaded`]: false, [`${c}Loading`]: false }), {});

/*
  Each collection is loaded lazily via ensureLoaded('products'), which:
   1. Returns immediately (no-op) if already loaded this session.
   2. Marks `${name}Loading` true so the calling page can show a skeleton.
   3. Fetches once, then sets up a live onSnapshot listener for incremental
      updates (so stock/orders/notifications stay "real time" exactly like
      the original app, but WITHOUT every page eagerly subscribing at boot).

  This is the structural fix for "dashboard/products page should open
  instantly": neither page is gated behind the other's data anymore.
*/
export function DataProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(emptyState);
  const [counters, setCounters] = useState({
    nextProdId: 1,
    nextCustId: 1,
    nextOrdId: 1001,
    nextCatId: 1,
    nextSupId: 1,
    nextPOId: 1
  });
  const listeners = useRef({});
  // Synchronous (non-state) tracking of which collections have already been
  // fetched or are currently being fetched. This is what actually prevents
  // double-fetching when, e.g., Dashboard and a fast page-switch to Products
  // both call ensureLoaded('products') in the same tick — React state
  // updates are batched/async, so checking `prev` inside setState is racy;
  // a plain ref is checked-and-set synchronously instead.
  const requested = useRef(new Set());

  // Reset everything on logout so a different staff login doesn't see stale data.
  useEffect(() => {
    if (!user) {
      Object.values(listeners.current).forEach((unsub) => unsub && unsub());
      listeners.current = {};
      requested.current = new Set();
      setState(emptyState());
    }
  }, [user]);

  const ensureLoaded = useCallback(
    async (name) => {
      if (!COLLECTIONS.includes(name)) return;
      if (requested.current.has(name)) return; // already fetched or in-flight
      requested.current.add(name);

      setState((prev) => ({ ...prev, [`${name}Loading`]: true }));

      try {
        const initial = await fetchCollection(name, { order: name === 'purchaseOrders' ? undefined : 'id' });
        setState((prev) => ({ ...prev, [name]: initial, [`${name}Loaded`]: true, [`${name}Loading`]: false }));

        // Live updates after the first load — keeps stock/orders/notifications fresh.
        const unsub = listenCollection(
          name,
          (snap) => {
            setState((prev) => ({ ...prev, [name]: snap.docs.map((d) => d.data()) }));
          },
          () => {}
        );
        listeners.current[name] = unsub;
      } catch (err) {
        console.error(`Failed to load ${name}:`, err);
        requested.current.delete(name); // allow a retry on next ensureLoaded call
        setState((prev) => ({ ...prev, [`${name}Loading`]: false }));
      }
    },
    []
  );

  // Counters doc — tiny single read, safe to fetch eagerly right after login.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'counters'));
        if (snap.exists()) setCounters((prev) => ({ ...prev, ...snap.data() }));
      } catch {
        /* fall back to in-memory defaults; non-fatal */
      }
    })();
  }, [user]);

  const bumpCounter = useCallback((key, currentValue) => {
    const next = currentValue + 1;
    setCounters((prev) => ({ ...prev, [key]: next }));
    setDoc(doc(db, 'settings', 'counters'), { [key]: next }, { merge: true }).catch(() => {});
    return currentValue;
  }, []);

  useEffect(() => () => Object.values(listeners.current).forEach((u) => u && u()), []);

  const value = useMemo(
    () => ({ ...state, counters, ensureLoaded, bumpCounter }),
    [state, counters, ensureLoaded, bumpCounter]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

/** Convenience hook: ensures a collection is loaded as soon as a page mounts. */
export function useCollection(name) {
  const data = useData();
  useEffect(() => {
    data.ensureLoaded(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  return {
    items: data[name] || [],
    loading: data[`${name}Loading`] && !data[`${name}Loaded`]
  };
}
