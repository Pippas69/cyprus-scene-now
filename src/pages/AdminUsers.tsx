import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { useAdminUsers, useExportUsers } from '@/hooks/useAdminUsers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Download, Users, UserCheck, UserX, Building2 } from 'lucide-react';
import { UsersTable } from '@/components/admin/UsersTable';
import { useDebounce } from '@/hooks/useDebounce';

export const AdminUsers = () => {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [suspended, setSuspended] = useState<string>('');
  const [page, setPage] = useState(1);
  
  const debouncedSearch = useDebounce(search, 300);
  
  const { 
    users, 
    total, 
    totalPages, 
    isLoading, 
    cities 
  } = useAdminUsers({
    search: debouncedSearch,
    role,
    city,
    suspended: suspended === '' ? null : suspended === 'true',
    page,
    pageSize: 20,
  });

  const exportUsers = useExportUsers();

  // Calculate quick stats
  const totalUsers = total;
  const suspendedCount = users.filter(u => u.suspended).length;
  const businessUsers = users.filter(u => u.has_business).length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  const handleClearFilters = () => {
    setSearch('');
    setRole('');
    setCity('');
    setSuspended('');
    setPage(1);
  };

  const hasFilters = search || role || city || suspended;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.users.title}</h1>
          <p className="text-muted-foreground mt-1">
            {total} {language === 'el' ? 'χρήστες' : 'users'} {language === 'el' ? 'συνολικά' : 'total'}
          </p>
        </div>
        <Button 
          onClick={() => exportUsers.mutate()} 
          disabled={exportUsers.isPending}
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          {t.users.actions.export}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">{t.dashboard.metrics.totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{adminCount}</p>
              <p className="text-xs text-muted-foreground">{t.users.roles.admin}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{businessUsers}</p>
              <p className="text-xs text-muted-foreground">{t.users.roles.business}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{suspendedCount}</p>
              <p className="text-xs text-muted-foreground">{language === 'el' ? 'Σε Αναστολή' : 'Suspended'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t.common.filter}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.users.search}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t.users.filters.allRoles} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.users.filters.allRoles}</SelectItem>
                <SelectItem value="user">{t.users.roles.user}</SelectItem>
                <SelectItem value="business">{t.users.roles.business}</SelectItem>
                <SelectItem value="admin">{t.users.roles.admin}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={(v) => { setCity(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={t.users.filters.allCities} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.users.filters.allCities}</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={suspended} onValueChange={(v) => { setSuspended(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={language === 'el' ? 'Κατάσταση' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'el' ? 'Όλοι' : 'All'}</SelectItem>
                <SelectItem value="false">{language === 'el' ? 'Ενεργοί' : 'Active'}</SelectItem>
                <SelectItem value="true">{language === 'el' ? 'Σε Αναστολή' : 'Suspended'}</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" onClick={handleClearFilters} className="shrink-0">
                {language === 'el' ? 'Καθαρισμός' : 'Clear'}
              </Button>
            )}
          </div>
          
          {/* Active Filters */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {search && (
                <Badge variant="secondary">
                  Search: {search}
                </Badge>
              )}
              {role && role !== 'all' && (
                <Badge variant="secondary">
                  Role: {t.users.roles[role as keyof typeof t.users.roles] || role}
                </Badge>
              )}
              {city && city !== 'all' && (
                <Badge variant="secondary">
                  City: {city}
                </Badge>
              )}
              {suspended && suspended !== 'all' && (
                <Badge variant="secondary">
                  {suspended === 'true' ? 'Suspended' : 'Active'}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <UsersTable users={users} isLoading={isLoading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setPage(pageNum)}
                    isActive={page === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default AdminUsers;
