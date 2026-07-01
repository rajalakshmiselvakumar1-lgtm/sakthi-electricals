import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import PageLoader from './components/ui/PageLoader';

// PERFORMANCE: every feature page is its own lazy chunk. The login bundle
// (and the dashboard, the most common first page) load first; Billing,
// Reports, the Load Calculator etc. are only fetched the moment a user
// actually clicks into them. Combined with Vite's vendor chunk splitting
// (see vite.config.js) this keeps the initial JS payload small.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Categories = lazy(() => import('./pages/Categories'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Orders = lazy(() => import('./pages/Orders'));
const Billing = lazy(() => import('./pages/Billing'));
const Reports = lazy(() => import('./pages/Reports'));
const LoadCalculator = lazy(() => import('./pages/LoadCalculator'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Contact = lazy(() => import('./pages/Contact'));
const Settings = lazy(() => import('./pages/Settings'));

function AuthedRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/categories" element={<Categories />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/billing" element={<Billing />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/load-calculator" element={<LoadCalculator />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/settings" element={<Settings />} />
                    </Route>
                  </Route>

                  <Route path="/" element={<AuthedRedirect />} />
                  <Route path="*" element={<AuthedRedirect />} />
                </Routes>
              </Suspense>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
