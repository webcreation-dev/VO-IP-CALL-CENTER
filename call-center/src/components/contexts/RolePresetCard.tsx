import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronDown, Circle, Info } from 'lucide-react';
import type { RolePreset } from '@/api/contexts';

interface RolePresetCardProps {
  preset: RolePreset;
  selected: boolean;
  onSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function RolePresetCard({
  preset,
  selected,
  onSelect,
  expanded,
  onToggleExpand,
}: RolePresetCardProps) {
  // Sort roles by level (highest to lowest)
  const sortedRoles = [...preset.roles].sort((a, b) => b.level - a.level);

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border hover:border-primary/30'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSelect}
                className={cn(
                  'flex items-center gap-2 text-left transition-colors',
                  'hover:text-primary focus:outline-none focus:text-primary'
                )}
                role="radio"
                aria-checked={selected}
              >
                {selected ? (
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <CardTitle className="text-base">{preset.name}</CardTitle>
              </button>
              <Badge variant="outline" className="ml-auto">
                {preset.roles.length} rôle{preset.roles.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <CardDescription className="mt-1.5 text-xs">
              {preset.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Collapsible open={expanded} onOpenChange={onToggleExpand}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Voir la hiérarchie</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  expanded && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3">
            <div className="space-y-2">
              {sortedRoles.map((role) => (
                <div
                  key={role.name}
                  className="rounded-md border bg-muted/30 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {role.displayName}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Niveau {role.level}
                        </Badge>
                      </div>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Call Permissions */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {role.canCallSameLevel && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Même niveau
                      </Badge>
                    )}
                    {role.canCallLowerLevel && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Niveaux inférieurs
                      </Badge>
                    )}
                    {role.canCallHigherLevel && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Niveaux supérieurs
                      </Badge>
                    )}
                    {!role.canCallSameLevel &&
                      !role.canCallLowerLevel &&
                      !role.canCallHigherLevel && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                          Aucune permission
                        </Badge>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Légende des permissions :</p>
              <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    Même niveau
                  </Badge>
                  <span>Peut appeler les rôles de même niveau</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    Niveaux inférieurs
                  </Badge>
                  <span>Peut appeler les niveaux hiérarchiques inférieurs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                    Niveaux supérieurs
                  </Badge>
                  <span>Peut appeler les niveaux hiérarchiques supérieurs</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
