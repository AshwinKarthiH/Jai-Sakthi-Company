import { createRootRoute, Outlet } from '@tanstack/react-router';
import { StoreProvider } from '../store/StoreContext';
import { Toaster } from 'sonner';

export const Route = createRootRoute({
  component: () => (
    <StoreProvider>
      <div className="bg-bg-page min-h-screen text-text-primary">
        <Outlet />
      </div>
      <Toaster 
        theme="light" 
        position="top-right" 
        richColors
        toastOptions={{
          style: {
            backgroundColor: '#EFF6FF',
            borderColor: '#BFDBFE',
            color: '#1E293B',
            borderRadius: '12px',
          }
        }}
      />
    </StoreProvider>
  ),
});
