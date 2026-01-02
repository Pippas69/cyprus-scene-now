import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

/**
 * Admin layout with sidebar navigation
 */
export const AdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
        <AdminSidebar />
        <div className="flex flex-1 min-w-0 max-w-full flex-col">
          <AdminHeader />
          <main className="flex-1 min-w-0 max-w-full overflow-x-hidden px-3 py-4 sm:p-6 bg-muted/10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
