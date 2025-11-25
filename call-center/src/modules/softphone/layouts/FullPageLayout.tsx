/**
 * FullPageLayout Component
 *
 * Full-page layout for standalone softphone application
 */

import { Phone, History, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullPageLayoutProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  onNavigate?: (page: 'dialer' | 'history' | 'settings') => void;
  currentPage?: 'dialer' | 'history' | 'settings';
}

export function FullPageLayout({
  children,
  theme: _theme = 'light',
  onNavigate,
  currentPage = 'dialer',
}: FullPageLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Phone className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Softphone</h1>
                <p className="text-sm text-muted-foreground">
                  WebRTC VoIP Client
                </p>
              </div>
            </div>

            {/* Navigation */}
            {onNavigate && (
              <nav className="flex items-center gap-2">
                <Button
                  variant={currentPage === 'dialer' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('dialer')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Clavier
                </Button>
                <Button
                  variant={currentPage === 'history' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('history')}
                >
                  <History className="h-4 w-4 mr-2" />
                  Historique
                </Button>
                <Button
                  variant={currentPage === 'settings' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('settings')}
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Paramètres
                </Button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-3">
        <div className="container mx-auto px-4">
          <p className="text-xs text-center text-muted-foreground">
            Powered by JsSIP WebRTC • Connected to Asterisk
          </p>
        </div>
      </footer>
    </div>
  );
}
