import { useState } from 'react';
import { Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

import extensionsService, { type Extension } from '@/api/extensions';
import useAuthStore from '@/store/authStore';
import { UserRole } from '@/api/auth';

interface ExtensionsListProps {
  extensions: Extension[];
  onEdit?: (extension: Extension) => void;
  onRefresh?: () => void;
  groupByContext?: boolean;
}

export default function ExtensionsList({
  extensions,
  onEdit,
  onRefresh,
  groupByContext = true,
}: ExtensionsListProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [extensionToDelete, setExtensionToDelete] = useState<Extension | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedContexts, setExpandedContexts] = useState<Set<string>>(new Set());

  // Check if user can edit/delete
  const canModify = user && (
    user.role === UserRole.ADMIN ||
    user.role === UserRole.TENANT_ADMIN
  );

  // Group extensions by context
  const groupedExtensions = groupByContext
    ? extensionsService.groupByContext(extensions)
    : { '': extensions };

  // Toggle context expansion
  const toggleContext = (context: string) => {
    const newExpanded = new Set(expandedContexts);
    if (newExpanded.has(context)) {
      newExpanded.delete(context);
    } else {
      newExpanded.add(context);
    }
    setExpandedContexts(newExpanded);
  };

  // Expand all contexts by default
  if (groupByContext && expandedContexts.size === 0 && Object.keys(groupedExtensions).length > 0) {
    setExpandedContexts(new Set(Object.keys(groupedExtensions)));
  }

  // Get app color badge
  const getAppBadgeVariant = (app: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const color = extensionsService.getAppColor(app);
    switch (color) {
      case 'blue':
      case 'green':
      case 'cyan':
        return 'default';
      case 'red':
        return 'destructive';
      case 'purple':
      case 'orange':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (extension: Extension) => {
    setExtensionToDelete(extension);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!extensionToDelete) return;

    setIsDeleting(true);

    try {
      await extensionsService.delete(extensionToDelete.id);

      toast({
        title: 'Extension supprimée',
        description: `L'extension "${extensionToDelete.exten}" a été supprimée avec succès.`,
      });

      setDeleteDialogOpen(false);
      setExtensionToDelete(null);
      onRefresh?.();
    } catch (error: any) {
      console.error('Error deleting extension:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Une erreur est survenue lors de la suppression de l\'extension.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Group extensions by exten pattern
  const groupByExten = (extensions: Extension[]) => {
    const grouped: Record<string, Extension[]> = {};
    extensions.forEach((ext) => {
      if (!grouped[ext.exten]) {
        grouped[ext.exten] = [];
      }
      grouped[ext.exten].push(ext);
    });

    // Sort each group by priority
    Object.keys(grouped).forEach((exten) => {
      grouped[exten].sort((a, b) => a.priority - b.priority);
    });

    return grouped;
  };

  // Render extensions table
  const renderExtensionsTable = (contextExtensions: Extension[]) => {
    if (contextExtensions.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Aucune extension dans ce contexte
        </div>
      );
    }

    const groupedByExten = groupByExten(contextExtensions);

    return (
      <div className="space-y-4">
        {Object.entries(groupedByExten).map(([exten, extensions]) => (
          <div key={exten} className="border rounded-lg overflow-hidden">
            {/* Exten Header */}
            <div className="bg-muted px-4 py-2 flex items-center gap-2">
              <span className="font-mono font-bold text-sm">Extension: {exten}</span>
              <Badge variant="outline">{extensions.length} priorité(s)</Badge>
            </div>

            {/* Priorities Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">Priority</TableHead>
                  <TableHead className="w-[150px]">Application</TableHead>
                  <TableHead>Arguments</TableHead>
                  {canModify && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {extensions.map((extension) => (
                  <TableRow key={extension.id}>
                    {/* Priority */}
                    <TableCell className="text-center">
                      <Badge variant="secondary">{extension.priority}</Badge>
                    </TableCell>

                    {/* Application */}
                    <TableCell>
                      <Badge variant={getAppBadgeVariant(extension.app)}>
                        {extension.app}
                      </Badge>
                    </TableCell>

                    {/* AppData */}
                    <TableCell>
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {extension.appdata || '-'}
                      </code>
                    </TableCell>

                    {/* Actions */}
                    {canModify && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit?.(extension)}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(extension)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {groupByContext ? (
          // Grouped by context
          Object.entries(groupedExtensions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([context, contextExtensions]) => {
              const isExpanded = expandedContexts.has(context);

              return (
                <div key={context} className="border rounded-lg overflow-hidden">
                  {/* Context Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => toggleContext(context)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <h3 className="text-lg font-semibold">
                        Contexte: <span className="font-mono text-primary">{context}</span>
                      </h3>
                      <Badge variant="secondary">
                        {contextExtensions.length} extension(s)
                      </Badge>
                    </div>
                  </div>

                  {/* Context Extensions */}
                  {isExpanded && (
                    <div className="border-t">
                      {renderExtensionsTable(contextExtensions)}
                    </div>
                  )}
                </div>
              );
            })
        ) : (
          // Ungrouped table
          <div className="border rounded-lg overflow-hidden">
            {renderExtensionsTable(extensions)}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette extension ?
              {extensionToDelete && (
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                  <p className="font-semibold">
                    Extension: <span className="font-mono">{extensionToDelete.exten}</span>
                  </p>
                  <p className="text-sm">
                    Contexte: <span className="font-mono">{extensionToDelete.context}</span>
                  </p>
                  <p className="text-sm">
                    Application: <span className="font-mono">{extensionToDelete.app}</span>
                  </p>
                </div>
              )}
              <p className="mt-4 text-destructive font-semibold">
                Cette action est irréversible.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
