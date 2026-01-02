import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import LanguageToggle from '@/components/LanguageToggle';
import { NotificationBell } from './NotificationBell';
import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AdminHeader = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const t = adminTranslations[language];

  // Generate breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  const getBreadcrumbLabel = (segment: string) => {
    const labels: Record<string, string> = {
      admin: t.dashboard.title,
      verification: t.sidebar.verification,
      users: t.sidebar.users,
      analytics: t.sidebar.analytics,
      reports: t.sidebar.reports,
      settings: t.sidebar.settings,
      geocoding: t.sidebar.geocoding,
    };
    return labels[segment] || segment;
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 max-w-full overflow-x-hidden">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap">
            {pathSegments.map((segment, index) => {
              const isLast = index === pathSegments.length - 1;
              const href = '/' + pathSegments.slice(0, index + 1).join('/');

              return (
                <div key={segment} className="flex items-center gap-2 min-w-0">
                  <BreadcrumbItem className="min-w-0">
                    {isLast ? (
                      <BreadcrumbPage className="truncate max-w-[150px] sm:max-w-none">{getBreadcrumbLabel(segment)}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={href} className="truncate">{getBreadcrumbLabel(segment)}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="shrink-0" />}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <NotificationBell />
        <Separator orientation="vertical" className="h-4" />
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
};
