# Sakthi Electricals ERP — v2.0

A premium, production-ready ERP for electrical retail businesses: billing & GST
invoicing, inventory, customers, suppliers, purchase orders, reports, and a
load calculator. Rebuilt on React + Vite + Firebase from the original
single-file prototype, keeping the same Firebase project and data.

---

## 1. Quick start

```bash
npm install
npm run dev      # local dev server at http://localhost:5173
```

```bash
npm run build    # production build -> dist/
npm run preview  # preview the production build locally
```

This project talks to the **same Firebase project** as the original app
(`sakthi-electricals-erp`) — no new setup needed for Auth/Firestore. The
config lives in `src/firebase/init.js` (see `.env.example` if you'd rather
inject it via environment variables instead).

### First login

Sign in with either:
- `admin@sakthielectricals.com` (or just `admin`) — any password you choose
- `staff@sakthielectricals.com` (or just `staff`) — any password you choose

The first time you sign in with a brand-new password, the app auto-creates
that Firebase Auth account (matching the original app's demo-account
behavior). After that, it's a normal login.

---

## 2. What changed from the original prototype

### Performance (the main ask)
The old app was a single 2,200-line HTML file that loaded four separate
Firebase **compat** SDK `<script>` tags from a CDN, then — on every login —
awaited 8 full Firestore collection reads (`products`, `customers`, `orders`,
etc.) *before* showing anything. That's why login felt slow no matter what
page you opened next.

This version fixes that structurally, not just cosmetically:

| Problem | Fix |
|---|---|
| 4 blocking CDN `<script>` tags before any code ran | Modular Firebase SDK, tree-shaken and bundled by Vite into one parallel-loaded chunk |
| Login awaited all 8 collections | Login only awaits a single small `users/{uid}` doc read; the dashboard shell renders immediately after |
| Every page loaded all data on boot | Each page calls `ensureLoaded('products')` etc. itself — Dashboard only loads `products`+`orders`+`categories`; Billing only loads `customers`+`products`; nothing else is fetched until that page is opened |
| No offline cache | Firestore's persistent IndexedDB cache is enabled (`firebase/init.js`) — repeat reads resolve from disk before the network round-trip even finishes |
| Blank page while loading | Skeleton loaders (`components/ui/Skeleton.jsx`) everywhere data is in flight |
| One big JS file | Every page is `React.lazy()`-loaded as its own chunk (see `App.jsx`); vendor code (React, Firebase, Chart.js) is split into its own cacheable chunk in `vite.config.js` |
| No production minification pipeline | Vite + esbuild minify JS and CSS automatically on `npm run build` |

### Firebase modular SDK (no CDN, no compat, no globals)
Every Firebase touchpoint goes through one of four files in `src/firebase/`:
`firebase.js` (app init), `auth.js`, `firestore.js`, `storage.js` — each a
plain ES module using only `import { x } from 'firebase/...'` from the npm
package. There's no `<script src="...gstatic.com/firebasejs...">` tag, no
`typeof firebase === 'undefined'` guard, and no code anywhere reads a global
`firebase` variable. `firebase.js` is the only file that calls
`initializeApp()`; the other three import `app` from it, so Firebase is
always initialized before any auth/Firestore/Storage code can run — that
ordering is enforced by the JS module graph itself, not by script-tag
position or load timing.

### Deploying Storage rules
If you wire up the new `storage.js` upload helpers (e.g. a photo field on
products), deploy `storage.rules` too — included, and requires sign-in for
all reads/writes:
```bash
firebase deploy --only storage
```

### Visual design
New "luxury business" palette (deep navy `#0A2540` + muted gold `#C89B3C`,
replacing the old bright-blue/yellow scheme) applied via CSS variables in
`src/styles/tokens.css`. Apple/Stripe/Fluent-inspired spacing, soft shadows,
and typography (Plus Jakarta Sans for headings, Inter for body text) — see
that file to retheme colors in one place, including a dark mode variant.

### Everything else
Every feature from the original — Products (grid/list), Categories,
Inventory with stock movement charts, Customers with purchase history,
Suppliers + Purchase Orders, Orders with status workflow, Billing/GST
invoicing with print, Reports & Analytics, the electrical Load Calculator,
Notifications, Contact (WhatsApp/Call/Maps), and Settings — has been ported
1:1 in behavior, just rebuilt as composable React components instead of
global functions mutating the DOM directly.

**Sample/demo data has been removed.** The original app's `SAMPLE` fallback
data is gone — this version starts from whatever is actually in your
Firestore project and never auto-seeds demo records.

---

## 3. Architecture

```
src/
  firebase/
    firebase.js      Firebase App init ONLY — the single initializeApp()
                      call in the whole project. Every other file imports
                      `app` from here, which is what guarantees Firebase is
                      initialized before any auth/data code runs.
    auth.js           Firebase Authentication (modular SDK) — exports `auth`
    firestore.js       Cloud Firestore (modular SDK) — exports `db` plus
                      generic collection/document CRUD helpers
    storage.js         Firebase Storage (modular SDK) — image upload/delete
                      helpers (not used by the original app, included for
                      product/supplier/logo photos if you want to add them)
    analytics.js       Optional, feature-detected Firebase Analytics
    actions.js         Thin CRUD wrappers (createWithId, updateById, …)
                      used by pages — built on top of firestore.js
  context/           AuthContext (login/session), DataContext (lazy
                     per-collection loading + live listeners), ThemeContext
  components/
    ui/              Design-system primitives: Button, Card, Modal, Badge,
                      Toast, StatCard, Skeleton loaders
    layout/           Sidebar, Topbar, AppLayout (the authenticated shell)
    charts/           ChartCard — themed Chart.js wrapper
    products/ customers/ suppliers/ orders/ billing/ auth/
                      Feature-specific modals and widgets
  pages/             One file per route (Dashboard, Products, Billing, …)
  utils/format.js    Shared business-logic helpers (GST math, currency
                      formatting, stock status) — ported 1:1 from the
                      original app's global functions
```

There is **no Firebase CDN `<script>` tag anywhere** (check `index.html`) and
**no reference to a global `firebase` object** anywhere in the source —
every Firebase symbol is an explicit `import { ... } from 'firebase/...'`
from the npm package, bundled and tree-shaken by Vite. `firebase.js` is
imported first by `auth.js`, `firestore.js`, and `storage.js`, which is what
removes the old app's race between CDN script-tag load order and
auth/Firestore code running — there's no script tag to race against.

### Data flow
`DataContext` exposes `ensureLoaded(collectionName)`. Any page calls this for
the collections *it* needs. The first call fetches once via `getDocs`, then
attaches a live `onSnapshot` listener so later changes (e.g. stock dropping
after a sale on another screen) show up everywhere without a manual refresh
— this preserves the original app's "real-time sync" feel without its
eager-load-everything cost.

### Firestore schema
Unchanged collections: `products`, `categories`, `customers`, `suppliers`,
`orders`, `purchaseOrders`, `stockMovements`, `notifications`, plus
`users/{uid}` (role/profile) and `settings/counters` (auto-incrementing
numeric IDs, same pattern as the original `DB.nextProdId` etc., just
persisted server-side instead of recomputed from `SAMPLE`).

---

## 4. Deploying

### Firebase Hosting
```bash
npm install -g firebase-tools   # if you don't have it
firebase login
npm run build
firebase deploy --only hosting
```
`firebase.json` is already configured to serve `dist/` with SPA rewrites and
long-cache headers for hashed JS/CSS assets.

### Deploying security rules
This repo includes `firestore.rules` — a real rules file requiring sign-in
for all reads/writes and restricting deletes to Admin accounts. **Deploy
this before going live with real customer data**, since a fresh Firebase
project defaults to either fully open or fully locked test-mode rules:
```bash
firebase deploy --only firestore:rules
```

### Custom domain
Firebase Hosting supports custom domains for free (Hosting → Add custom
domain in the Firebase console) — useful if you want `erp.yourshop.com`
instead of the default `*.web.app` URL.

---

## 5. Customizing for a different shop

- **Branding**: shop name, address, GSTIN, and phone are in
  `src/pages/Contact.jsx`, `src/pages/Settings.jsx`, and
  `src/components/billing/InvoicePreview.jsx` (and its print-window twin in
  `src/pages/Billing.jsx`) — search for "Sakthi Electricals" to find every
  occurrence if you're white-labeling this for another business.
- **Colors**: all in `src/styles/tokens.css` as CSS variables.
- **GST rates / units / appliance wattages**: `src/components/products/ProductModal.jsx`
  (`UNITS`), `src/pages/Billing.jsx` (GST `<select>` options), and
  `src/pages/LoadCalculator.jsx` (`APPLIANCES`).
