import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const pathToLabel: Record<string, { el: string; en: string }> = {
  '/feed': { el: 'Αρχική', en: 'Feed' },
  '/ekdiloseis': { el: 'Εκδηλώσεις', en: 'Events' },
  '/xartis': { el: 'Χάρτης', en: 'Map' },
  '/dashboard-user': { el: 'Προφίλ', en: 'Dashboard' },
  '/dashboard-business': { el: 'Επιχείρηση', en: 'Business' },
};

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Generate breadcrumb items from path if not provided
  const breadcrumbItems = items || pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = pathToLabel[path]?.en || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    return {
      label,
      href: path
    };
  });

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav 
      className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)}
      aria-label="Breadcrumb"
    >
      <Link 
        to="/feed" 
        className="hover:text-foreground transition-colors flex items-center"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {index === breadcrumbItems.length - 1 ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link 
              to={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};
