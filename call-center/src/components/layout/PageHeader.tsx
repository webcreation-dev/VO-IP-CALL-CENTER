import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  status?: {
    state: 'connected' | 'connecting' | 'disconnected';
    label: string;
  };
}

export default function PageHeader({ title, description, actions, status }: PageHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {status && (
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    status.state === 'connected'
                      ? 'bg-green-500'
                      : status.state === 'connecting'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-muted-foreground">
                  {status.label}
                </span>
              </div>
            )}
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}
