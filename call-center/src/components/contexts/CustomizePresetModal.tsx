import { useState, useEffect } from 'react';
import { Shuffle, RotateCcw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

import type { RolePreset, CustomRole } from '@/api/contexts';

interface CustomizePresetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: RolePreset | null;
  initialCustomRoles?: CustomRole[];
  onApply: (customRoles: CustomRole[]) => void;
}

export default function CustomizePresetModal({
  open,
  onOpenChange,
  preset,
  initialCustomRoles,
  onApply,
}: CustomizePresetModalProps) {
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);

  // Initialize custom roles from preset or initial values
  useEffect(() => {
    if (preset) {
      if (initialCustomRoles && initialCustomRoles.length > 0) {
        setCustomRoles(initialCustomRoles);
      } else {
        // Deep clone preset roles to custom roles
        setCustomRoles(
          preset.roles.map((role) => ({
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            level: role.level,
            canCallSameLevel: role.canCallSameLevel,
            canCallLowerLevel: role.canCallLowerLevel,
            canCallHigherLevel: role.canCallHigherLevel,
          }))
        );
      }
    }
  }, [preset, initialCustomRoles, open]);

  // Reset to preset defaults
  const handleReset = () => {
    if (preset) {
      setCustomRoles(
        preset.roles.map((role) => ({
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          level: role.level,
          canCallSameLevel: role.canCallSameLevel,
          canCallLowerLevel: role.canCallLowerLevel,
          canCallHigherLevel: role.canCallHigherLevel,
        }))
      );
    }
  };

  // Update a specific role
  const updateRole = (index: number, updates: Partial<CustomRole>) => {
    setCustomRoles((prev) =>
      prev.map((role, i) => (i === index ? { ...role, ...updates } : role))
    );
  };

  // Handle apply
  const handleApply = () => {
    onApply(customRoles);
    onOpenChange(false);
  };

  // Get level label
  const getLevelLabel = (level: number): string => {
    if (level <= 3) return 'Junior';
    if (level <= 6) return 'Intermédiaire';
    if (level <= 8) return 'Senior';
    return 'Direction';
  };

  // Get level color
  const getLevelColor = (level: number): string => {
    if (level <= 3) return 'bg-blue-100 text-blue-800';
    if (level <= 6) return 'bg-green-100 text-green-800';
    if (level <= 8) return 'bg-orange-100 text-orange-800';
    return 'bg-purple-100 text-purple-800';
  };

  if (!preset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                Personnaliser le preset
              </DialogTitle>
              <DialogDescription className="mt-2">
                Modifiez les rôles et permissions du preset "{preset.name}" avant de l'appliquer au
                contexte. Ces modifications ne seront appliquées qu'à ce contexte.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="shrink-0"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {customRoles.map((role, index) => (
            <Card key={role.name}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{role.displayName}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Nom technique: <span className="font-mono">{role.name}</span>
                    </CardDescription>
                  </div>
                  <Badge className={getLevelColor(role.level)} variant="secondary">
                    Niveau {role.level} - {getLevelLabel(role.level)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor={`displayName-${index}`} className="text-xs">
                    Nom d'affichage
                  </Label>
                  <Input
                    id={`displayName-${index}`}
                    value={role.displayName}
                    onChange={(e) => updateRole(index, { displayName: e.target.value })}
                    placeholder="Nom d'affichage"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`} className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id={`description-${index}`}
                    value={role.description || ''}
                    onChange={(e) => updateRole(index, { description: e.target.value })}
                    placeholder="Description du rôle"
                    rows={2}
                  />
                </div>

                {/* Level Slider */}
                <div className="space-y-2">
                  <Label htmlFor={`level-${index}`} className="text-xs">
                    Niveau hiérarchique: {role.level}
                  </Label>
                  <Slider
                    id={`level-${index}`}
                    value={[role.level]}
                    onValueChange={([value]) => updateRole(index, { level: value })}
                    min={1}
                    max={10}
                    step={1}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    1 = Niveau le plus bas (Agent) | 10 = Niveau le plus élevé (Direction)
                  </p>
                </div>

                {/* Call Permissions */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-xs font-semibold">Permissions d'appel</Label>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={`canCallSameLevel-${index}`} className="text-sm font-normal">
                        Appeler même niveau
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Peut appeler les collègues du même niveau
                      </p>
                    </div>
                    <Switch
                      id={`canCallSameLevel-${index}`}
                      checked={role.canCallSameLevel}
                      onCheckedChange={(checked) => updateRole(index, { canCallSameLevel: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label
                        htmlFor={`canCallLowerLevel-${index}`}
                        className="text-sm font-normal"
                      >
                        Appeler niveau inférieur
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Peut appeler les niveaux inférieurs
                      </p>
                    </div>
                    <Switch
                      id={`canCallLowerLevel-${index}`}
                      checked={role.canCallLowerLevel}
                      onCheckedChange={(checked) =>
                        updateRole(index, { canCallLowerLevel: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label
                        htmlFor={`canCallHigherLevel-${index}`}
                        className="text-sm font-normal"
                      >
                        Appeler niveau supérieur
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Peut appeler les niveaux supérieurs (escalade)
                      </p>
                    </div>
                    <Switch
                      id={`canCallHigherLevel-${index}`}
                      checked={role.canCallHigherLevel}
                      onCheckedChange={(checked) =>
                        updateRole(index, { canCallHigherLevel: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleApply}>
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
