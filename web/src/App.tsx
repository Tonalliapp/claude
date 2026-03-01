import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ProtectedRoute from '@/auth/ProtectedRoute';
import PublicLayout from '@/layouts/PublicLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import LandingPage from '@/pages/landing/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import OrdersPage from '@/pages/dashboard/OrdersPage';
import MenuPage from '@/pages/dashboard/MenuPage';
import TablesPage from '@/pages/dashboard/TablesPage';
import KitchenPage from '@/pages/dashboard/KitchenPage';
import PosPage from '@/pages/dashboard/PosPage';
import InventoryPage from '@/pages/dashboard/InventoryPage';
import ReportsPage from '@/pages/dashboard/ReportsPage';
import UsersPage from '@/pages/dashboard/UsersPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';
import OnboardingPage from '@/pages/onboarding/OnboardingPage';

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
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="dashboard/orders" element={<OrdersPage />} />
            <Route path="dashboard/menu" element={<MenuPage />} />
            <Route path="dashboard/tables" element={<TablesPage />} />
            <Route path="dashboard/kitchen" element={<KitchenPage />} />
            <Route path="dashboard/pos" element={<PosPage />} />
            <Route path="dashboard/inventory" element={<InventoryPage />} />
            <Route path="dashboard/reports" element={<ReportsPage />} />
            <Route path="dashboard/users" element={<UsersPage />} />
            <Route path="dashboard/settings" element={<SettingsPage />} />
            <Route path="dashboard/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
