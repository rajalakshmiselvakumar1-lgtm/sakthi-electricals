// ============================================================
// firebase.js — Firebase App initialization (modular SDK ONLY)
//
// This is the ONLY file that calls initializeApp(). Every other Firebase
// file (auth.js, firestore.js, storage.js) imports `app` FROM HERE rather
// than calling initializeApp() itself — that's what guarantees Firebase is
// always initialized before any auth/firestore/storage code can run,
// without relying on <script> tag order, CDN load timing, or a global
// `firebase` variable existing on `window`.
//
// There is NO Firebase CDN <script> tag anywhere in this project (check
// index.html) and NO reference to a global `firebase` object anywhere in
// the source — every Firebase symbol used in this app is an explicit
// `import { ... } from 'firebase/...'` from the npm package, which Vite
// bundles, tree-shakes, and code-splits (see vite.config.js manualChunks).
// ============================================================
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyD1uYGTvwmkGGinmmOw9B8f2wacbL_gjVk',
  authDomain: 'sakthi-electricals-erp.firebaseapp.com',
  projectId: 'sakthi-electricals-erp',
  storageBucket: 'sakthi-electricals-erp.firebasestorage.app',
  messagingSenderId: '966115710000',
  appId: '1:966115710000:web:4f9da166c47de81a5e09f5',
  measurementId: 'G-GJ3PYGJRT3'
};

// getApps().length guard: makes this file safe to import multiple times
// (Vite/HMR, or any future SSR/test setup) without the "Firebase App named
// '[DEFAULT]' already exists" crash you get from calling initializeApp()
// twice — the modular-SDK equivalent of the old try/catch around
// firebase.app() / firebase.initializeApp().
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
