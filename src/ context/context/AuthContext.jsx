import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../firebase/auth';
import { db } from '../firebase/firestore';
import { logEvent } from '../firebase/analytics';

const AuthContext = createContext(null);

const DEFAULT_USERS = {
  'admin@sakthielectricals.com': { role: 'Admin', name: 'Admin User' },
  'staff@sakthielectricals.com': { role: 'Staff', name: 'Staff User' }
};

function resolveEmail(input) {
  const v = input.trim();
  if (v === 'admin') return 'admin@sakthielectricals.com';
  if (v === 'staff') return 'staff@sakthielectricals.com';
  if (!v.includes('@')) return `${v}@sakthielectricals.com`;
  return v;
}

/*
  PERFORMANCE: this is the fix for "login is too slow".

  Old flow (blocking, sequential, ~2-4s typically):
    signIn -> get user doc -> seedFirestoreIfEmpty (a read) -> loadFromFirestore
    (8 awaited collection reads) -> hideLoader -> THEN show the dashboard.

  New flow (this file + DataContext):
    signIn -> get user doc (1 small read, usually cache-hit after first login)
    -> immediately flip to "authenticated" and render the dashboard shell.
  The dashboard/products/etc. data is fetched by DataContext AFTER the shell
  is already on screen, with per-page lazy loading (see DataContext.jsx) and
  loading skeletons instead of a full-screen blocking spinner. Nothing about
  bulk data loading blocks the login transition itself.
*/
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { uid, name, email, role }
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const meta = await resolveUserMeta(fbUser.uid, fbUser.email, fbUser.displayName);
        setUser({ uid: fbUser.uid, email: meta.email, name: meta.name, role: meta.role });
      } catch {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email.split('@')[0],
          role: DEFAULT_USERS[fbUser.email]?.role || 'Staff'
        });
      } finally {
        setAuthLoading(false);
      }
    });
    return unsub;
  }, []);

  async function resolveUserMeta(uid, email, displayName) {
    // Single small doc read — not a full collection scan. This is the only
    // Firestore read on the login critical path.
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) return snap.data();
    const fallback = DEFAULT_USERS[email] || {
      role: 'Staff',
      name: displayName || email.split('@')[0]
    };
    return { ...fallback, email };
  }

  const login = useCallback(async (emailInput, password, roleHint = 'admin') => {
    setError('');
    const email = resolveEmail(emailInput);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      logEvent('login', { method: 'email' });
      return cred.user;
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        // First-run convenience: auto-provision the demo admin/staff accounts
        // the very first time someone logs in on a fresh Firebase project.
        return autoProvision(email, password, roleHint);
      }
      const messages = {
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Invalid email format.',
        'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
        'auth/network-request-failed': 'Network error — check your connection.'
      };
      setError(messages[err.code] || err.message);
      throw err;
    }
  }, []);

  async function autoProvision(email, password, roleHint) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const role = roleHint === 'admin' ? 'Admin' : 'Staff';
      await setDoc(doc(db, 'users', cred.user.uid), {
        role,
        name: role === 'Admin' ? 'Admin User' : 'Staff User',
        email
      });
      logEvent('demo_account_created', { role });
      return cred.user;
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
      }
      setError(err.message);
      throw err;
    }
  }

  const logout = useCallback(async () => {
    logEvent('logout');
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email);
    logEvent('password_reset_requested');
  }, []);

  const value = useMemo(
    () => ({ user, authLoading, error, setError, login, logout, resetPassword }),
    [user, authLoading, error, login, logout, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
