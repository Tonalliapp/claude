import { BrowserRouter, Routes, Route, useParams, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { CartProvider } from '@/context/CartContext';
import { SocketProvider } from '@/context/SocketContext';
import { useCart } from '@/context/CartContext';
import WelcomePage from '@/pages/WelcomePage';
import MenuPage from '@/pages/MenuPage';
import CartPage from '@/pages/CartPage';
import OrderTrackingPage from '@/pages/OrderTrackingPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function SocketWrapper({ children }: { children: React.ReactNode }) {
  const { restaurant, table } = useCart();
  return (
    <SocketProvider tenantId={restaurant?.id ?? null} tableId={table?.id ?? null}>
      {children}
    </SocketProvider>
  );
}

function SlugLayout() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const mesa = parseInt(searchParams.get('mesa') || '0', 10);

  if (!slug) return <NotFoundPage />;

  return (
    <CartProvider slug={slug} mesa={mesa}>
      <SocketWrapper>
        <Routes>
          <Route index element={<WelcomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="order/:id" element={<OrderTrackingPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SocketWrapper>
    </CartProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/:slug/*" element={<SlugLayout />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#1A1A1A', color: '#fff', border: '1px solid rgba(255,255,255,0.04)' },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
