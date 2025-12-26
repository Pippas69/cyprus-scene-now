import { useConnectionStatus, useSendConnectionRequest, useRespondToConnection, useRemoveConnection } from '@/hooks/useConnections';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, UserX, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ConnectionButtonProps {
  currentUserId: string;
  targetUserId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export const ConnectionButton = ({ 
  currentUserId, 
  targetUserId, 
  variant = 'outline',
  size = 'sm' 
}: ConnectionButtonProps) => {
  const { language } = useLanguage();
  const { data: connectionData, isLoading } = useConnectionStatus(currentUserId, targetUserId);
  const sendRequest = useSendConnectionRequest();
  const respondToConnection = useRespondToConnection();
  const removeConnection = useRemoveConnection();

  if (currentUserId === targetUserId) return null;
  
  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // No connection exists - show Connect button
  if (!connectionData) {
    return (
      <Button 
        variant={variant} 
        size={size}
        onClick={() => sendRequest.mutate({ requesterId: currentUserId, receiverId: targetUserId })}
        disabled={sendRequest.isPending}
        className="gap-1.5"
      >
        {sendRequest.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {size !== 'icon' && (language === 'el' ? 'Σύνδεση' : 'Connect')}
      </Button>
    );
  }

  const { status, isRequester, connection } = connectionData;

  // Already connected
  if (status === 'accepted') {
    return (
      <Button 
        variant="secondary" 
        size={size}
        onClick={() => removeConnection.mutate(connection.id)}
        disabled={removeConnection.isPending}
        className="gap-1.5"
      >
        {removeConnection.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserCheck className="h-4 w-4 text-green-500" />
        )}
        {size !== 'icon' && (language === 'el' ? 'Συνδεδεμένοι' : 'Connected')}
      </Button>
    );
  }

  // Pending request sent by current user
  if (status === 'pending' && isRequester) {
    return (
      <Button 
        variant="secondary" 
        size={size}
        onClick={() => removeConnection.mutate(connection.id)}
        disabled={removeConnection.isPending}
        className="gap-1.5"
      >
        {removeConnection.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Clock className="h-4 w-4 text-yellow-500" />
        )}
        {size !== 'icon' && (language === 'el' ? 'Σε αναμονή' : 'Pending')}
      </Button>
    );
  }

  // Pending request received - show Accept/Decline
  if (status === 'pending' && !isRequester) {
    return (
      <div className="flex items-center gap-1">
        <Button 
          variant="default" 
          size={size}
          onClick={() => respondToConnection.mutate({ connectionId: connection.id, response: 'accepted' })}
          disabled={respondToConnection.isPending}
          className="gap-1"
        >
          {respondToConnection.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
          {size !== 'icon' && (language === 'el' ? 'Αποδοχή' : 'Accept')}
        </Button>
        <Button 
          variant="ghost" 
          size={size}
          onClick={() => respondToConnection.mutate({ connectionId: connection.id, response: 'declined' })}
          disabled={respondToConnection.isPending}
        >
          <UserX className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Declined - allow resending
  if (status === 'declined') {
    return (
      <Button 
        variant={variant} 
        size={size}
        onClick={() => removeConnection.mutate(connection.id)}
        disabled={removeConnection.isPending}
        className="gap-1.5 opacity-50"
      >
        <UserX className="h-4 w-4" />
        {size !== 'icon' && (language === 'el' ? 'Απορρίφθηκε' : 'Declined')}
      </Button>
    );
  }

  return null;
};
