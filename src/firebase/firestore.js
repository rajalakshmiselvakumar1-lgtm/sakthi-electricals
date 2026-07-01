// ============================================================
// firestore.js — Cloud Firestore (modular SDK ONLY)
//
// PERFORMANCE NOTES (carried over from the original compat-SDK app):
// The old app loaded firebase-firestore-compat.js from a CDN and called
// db.collection('x').get() with the v8 chained API. This file uses the
// tree-shakeable v9+ modular functions instead (collection(), getDocs(),
// etc. as free functions, not methods on a `db` object), and turns on
// Firestore's persistent IndexedDB cache so repeat reads resolve from disk
// before the network round trip even finishes.
// ============================================================
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  query,
  orderBy as fsOrderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { app } from './firebase';

// persistentMultipleTabManager lets the ERP stay in sync if the shop keeps
// the app open in two browser tabs (e.g. billing counter + back-office PC)
// without throwing "failed-precondition" errors, which the old
// db.enablePersistence() compat call was prone to.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// ---- Generic collection/document helpers used across the app ----

export const col = (name) => collection(db, name);

export async function fetchCollection(name, { order } = {}) {
  const q = order ? query(col(name), fsOrderBy(order)) : col(name);
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchDoc(name, id) {
  const snap = await getDoc(doc(db, name, String(id)));
  return snap.exists() ? snap.data() : null;
}

export async function setDocMerge(name, id, data) {
  return setDoc(doc(db, name, String(id)), data, { merge: true });
}

export async function removeDoc(name, id) {
  return deleteDoc(doc(db, name, String(id)));
}

export async function addAutoDoc(name, data) {
  const ref = await addDoc(col(name), data);
  return ref.id;
}

export async function updateDocFields(name, id, fields) {
  return updateDoc(doc(db, name, String(id)), fields);
}

export function listenCollection(name, onChange, onError) {
  return onSnapshot(col(name), onChange, onError);
}

export function batchWrite() {
  return writeBatch(db);
}

export const ts = () => serverTimestamp();

// Re-export `doc` itself since a few pages (Settings, Notifications) need
// direct doc() references for batch deletes/updates.
export { doc };
