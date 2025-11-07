import { Badge } from '@/components/ui/badge';
import { Circle, Phone, Pause, AlertCircle } from 'lucide-react';
import { type QueueMember } from '@/api/queues';

interface MemberStatusBadgeProps {
  member: QueueMember;
}

export default function MemberStatusBadge({ member }: MemberStatusBadgeProps) {
  // Determine status based on member state
  const getStatus = () => {
    if (member.paused) {
      return {
        label: 'En pause',
        variant: 'destructive' as const,
        icon: <Pause className="h-3 w-3" />,
      };
    }

    if (member.in_call) {
      return {
        label: 'En appel',
        variant: 'secondary' as const,
        icon: <Phone className="h-3 w-3" />,
      };
    }

    // Check device status
    if (member.status === 'AVAILABLE' || member.status === 'NOT_INUSE') {
      return {
        label: 'Disponible',
        variant: 'default' as const,
        icon: <Circle className="h-3 w-3 fill-current" />,
      };
    }

    if (member.status === 'INUSE' || member.status === 'BUSY') {
      return {
        label: 'Occupé',
        variant: 'secondary' as const,
        icon: <Phone className="h-3 w-3" />,
      };
    }

    return {
      label: 'Indisponible',
      variant: 'outline' as const,
      icon: <AlertCircle className="h-3 w-3" />,
    };
  };

  const status = getStatus();

  return (
    <Badge variant={status.variant} className="gap-1">
      {status.icon}
      {status.label}
    </Badge>
  );
}
