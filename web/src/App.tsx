import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ProtectedRoute from '@/auth/ProtectedRoute';
import PublicLayout from '@/layouts/PublicLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import LandingPage from '@/pages/landing/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Lazy-loaded pages
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const OrdersPage = lazy(() => import('@/pages/dashboard/OrdersPage'));
const MenuPage = lazy(() => import('@/pages/dashboard/MenuPage'));
const TablesPage = lazy(() => import('@/pages/dashboard/TablesPage'));
const KitchenPage = lazy(() => import('@/pages/dashboard/KitchenPage'));
const PosPage = lazy(() => import('@/pages/dashboard/PosPage'));
const InventoryPage = lazy(() => import('@/pages/dashboard/InventoryPage'));
const ReportsPage = lazy(() => import('@/pages/dashboard/ReportsPage'));
const UsersPage = lazy(() => import('@/pages/dashboard/UsersPage'));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'));
const BillingPage = lazy(() => import('@/pages/dashboard/BillingPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const DeliveryDebtsPage = lazy(() => import('@/pages/dashboard/DeliveryDebtsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#fff',
            border: '1px solid rgba(201, 168, 76, 0.15)',
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route element={<DashboardLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="dashboard/orders" element={<OrdersPage />} />
              <Route path="dashboard/menu" element={<MenuPage />} />
              <Route path="dashboard/tables" element={<TablesPage />} />
              <Route path="dashboard/kitchen" element={<KitchenPage />} />
              <Route path="dashboard/pos" element={<PosPage />} />
              <Route path="dashboard/inventory" element={<InventoryPage />} />
              <Route path="dashboard/delivery-debts" element={<DeliveryDebtsPage />} />
              <Route path="dashboard/reports" element={<ReportsPage />} />
              <Route path="dashboard/users" element={<UsersPage />} />
              <Route path="dashboard/settings" element={<SettingsPage />} />
              <Route path="dashboard/billing" element={<BillingPage />} />
              <Route path="dashboard/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
