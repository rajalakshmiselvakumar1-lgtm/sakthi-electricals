// ============================================================
// analytics.js — Firebase Analytics (modular SDK, OPTIONAL)
//
// Kept separate from firebase.js/auth.js/firestore.js/storage.js because
// Analytics is not part of the core data path — it must be feature-detected
// (fails in SSR / some privacy browser modes) and must never block app boot
// or be a hard dependency of login/data loading. Every call here is a
// no-op until/unless isSupported() resolves true.
// ============================================================
import { getAnalytics, isSupported, logEvent as firebaseLogEvent } from 'firebase/analytics';
import { app } from './firebase';

let analyticsInstance = null;

isSupported()
  .then((ok) => {
    if (ok) analyticsInstance = getAnalytics(app);
  })
  .catch(() => {
    /* analytics unsupported in this browser/context — non-fatal */
  });

export function logEvent(name, params) {
  if (!analyticsInstance) return;
  firebaseLogEvent(analyticsInstance, name, params);
}
