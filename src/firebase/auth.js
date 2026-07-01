// ============================================================
// auth.js — Firebase Authentication (modular SDK ONLY)
//
// Imports `app` from firebase.js, NOT a global. Firebase is guaranteed to
// already be initialized by the time this module's top-level code runs,
// because ES module imports are resolved and executed before any code in
// THIS file executes — there is no race with CDN script loading because
// there is no CDN script at all.
// ============================================================
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);

// Persist the session across browser restarts so staff don't have to log
// in every morning — this is the single biggest perceived "speed" win for
// returning users, since they skip the login screen entirely.
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Persistence can fail in private/incognito contexts (Safari ITP, some
  // locked-down corporate browsers) — auth still works via in-memory
  // persistence, so this is intentionally non-fatal.
});
