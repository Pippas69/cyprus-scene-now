import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminTranslations } from '@/translations/adminTranslations';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Ban, Building2 } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { UserDetailDialog } from './UserDetailDialog';

interface UsersTableProps {
  users: AdminUser[];
  isLoading: boolean;
}

export const UsersTable = ({ users, isLoading }: UsersTableProps) => {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      admin: 'destructive',
      business: 'default',
      user: 'secondary',
    };
    return <Badge variant={variants[role] || 'secondary'}>{t.users.roles[role as keyof typeof t.users.roles] || role}</Badge>;
  };

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.common.noData}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">{t.users.table.name}</TableHead>
              <TableHead className="min-w-[200px]">{t.users.table.email}</TableHead>
              <TableHead>{t.users.table.city}</TableHead>
              <TableHead>{t.users.table.role}</TableHead>
              <TableHead>{t.users.table.joined}</TableHead>
              <TableHead className="text-right">{t.users.table.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const fullName = user.first_name || user.last_name 
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : user.name || 'Unknown';
              const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <TableRow key={user.id} className={user.suspended ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{fullName}</span>
                        <div className="flex items-center gap-1.5">
                          {user.suspended && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              <Ban className="h-3 w-3 mr-0.5" />
                              Suspended
                            </Badge>
                          )}
                          {user.has_business && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Building2 className="h-3 w-3" />
                              {user.business_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                  <TableCell>{user.city || '-'}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewUser(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t.users.actions.viewProfile}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <UserDetailDialog
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
};
