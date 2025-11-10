import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

interface RoleStrategyCardProps {
  type: 'use-tenant-roles' | 'context-specific';
  selected: boolean;
  onSelect: () => void;
  tenantRolesCount?: number;
}

export default function RoleStrategyCard({
  type,
  selected,
  onSelect,
  tenantRolesCount,
}: RoleStrategyCardProps) {
  const isUseTenantRoles = type === 'use-tenant-roles';

  const title = isUseTenantRoles
    ? 'Utiliser les rôles du tenant'
    : 'Rôles spécifiques au contexte';

  const description = isUseTenantRoles
    ? 'Les extensions de ce contexte utiliseront les rôles partagés du tenant.'
    : 'Créer un ensemble de rôles indépendants uniquement pour ce contexte.';

  const benefits = isUseTenantRoles
    ? [
        'Gestion centralisée des rôles',
        'Cohérence entre les contextes',
        'Pas de duplication',
      ]
    : [
        'Permissions isolées par contexte',
        'Flexibilité organisationnelle',
        'Hiérarchie indépendante',
      ];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:border-primary/50',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border hover:shadow-sm'
      )}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {title}
              {isUseTenantRoles && tenantRolesCount !== undefined && (
                <Badge variant="secondary" className="font-normal">
                  {tenantRolesCount} rôle{tenantRolesCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1.5 text-xs">
              {description}
            </CardDescription>
          </div>
          <div className="ml-2">
            {selected ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ul className="space-y-1.5">
          {benefits.map((benefit, index) => (
            <li key={index} className="text-xs text-muted-foreground flex items-start">
              <span className="mr-2 text-primary">•</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
