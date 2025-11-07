import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EndpointCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentNumber: number;
  generatedUsername: string;
  password: string;
}

export function EndpointCredentialsDialog({
  open,
  onOpenChange,
  agentNumber,
  generatedUsername,
  password,
}: EndpointCredentialsDialogProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);

      toast({
        title: 'Copié',
        description: `${fieldName} copié dans le presse-papier`,
        duration: 2000,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier dans le presse-papier',
        variant: 'destructive',
      });
    }
  };

  const copyAllCredentials = async () => {
    const credentials = `Identifiants de l'agent créé
========================
Numéro d'agent: ${agentNumber}
Nom d'utilisateur SIP: ${generatedUsername}
Mot de passe: ${password}
========================
⚠️ Sauvegardez ces informations en lieu sûr!`;

    try {
      await navigator.clipboard.writeText(credentials);
      toast({
        title: 'Copié',
        description: 'Tous les identifiants ont été copiés',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de copier dans le presse-papier',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Agent créé avec succès
          </AlertDialogTitle>
          <AlertDialogDescription>
            Voici les identifiants de l'agent. <strong>Sauvegardez-les en lieu sûr</strong>, ils ne seront plus accessibles après fermeture.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-900">
                Important : Conservez ces informations
              </p>
              <p className="text-amber-700">
                Le nom d'utilisateur SIP ne sera plus accessible après la fermeture de cette fenêtre.
                Assurez-vous de le copier ou de le noter.
              </p>
            </div>
          </div>

          {/* Agent Number */}
          <div className="space-y-2">
            <Label htmlFor="agentNumber" className="text-sm font-medium">
              Numéro d'agent
            </Label>
            <div className="flex gap-2">
              <Input
                id="agentNumber"
                value={agentNumber}
                readOnly
                className="font-mono bg-gray-50"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(agentNumber.toString(), 'Numéro d\'agent')}
              >
                {copiedField === 'Numéro d\'agent' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Numéro d'extension de l'agent pour les appels internes
            </p>
          </div>

          {/* Generated Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Nom d'utilisateur SIP (authentification)
            </Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={generatedUsername}
                readOnly
                className="font-mono text-sm bg-gray-50"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(generatedUsername, 'Nom d\'utilisateur SIP')}
              >
                {copiedField === 'Nom d\'utilisateur SIP' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              À utiliser pour la configuration du téléphone SIP (compte utilisateur)
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </Label>
            <div className="flex gap-2">
              <Input
                id="password"
                value={password}
                type="text"
                readOnly
                className="font-mono bg-gray-50"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(password, 'Mot de passe')}
              >
                {copiedField === 'Mot de passe' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mot de passe pour l'authentification SIP
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={copyAllCredentials}
            className="w-full sm:w-auto"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copier tout
          </Button>
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            J'ai sauvegardé les identifiants
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
