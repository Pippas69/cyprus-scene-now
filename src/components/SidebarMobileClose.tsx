import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Auto-closes the mobile sidebar drawer whenever the route changes.
 * Must be rendered inside a SidebarProvider.
 */
export function SidebarMobileClose() {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, location.search, isMobile, setOpenMobile]);

  return null;
}
