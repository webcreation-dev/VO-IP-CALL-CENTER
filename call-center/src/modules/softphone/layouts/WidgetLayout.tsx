/**
 * WidgetLayout Component
 *
 * Floating widget layout for embedding the softphone in admin interface
 */

import { useState, useRef, useEffect } from 'react';
import { X, Minus, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WidgetLayoutProps {
  children: React.ReactNode;
  onClose?: () => void;
  theme?: 'light' | 'dark' | 'admin';
  isMinimized?: boolean;
  onMinimize?: (minimized: boolean) => void;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export function WidgetLayout({
  children,
  onClose,
  theme: _theme = 'light',
  isMinimized = false,
  onMinimize,
  position = { x: 20, y: 20 },
  onPositionChange,
}: WidgetLayoutProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return; // Don't drag if clicking buttons
    }

    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!widgetRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep widget within viewport
      const maxX = window.innerWidth - widgetRef.current.offsetWidth;
      const maxY = window.innerHeight - widgetRef.current.offsetHeight;

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      onPositionChange?.({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onPositionChange]);

  // Minimized state
  if (isMinimized) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-50 bg-card border rounded-full shadow-lg cursor-pointer"
        style={{
          right: `${position.x}px`,
          bottom: `${position.y}px`,
        }}
        onClick={() => onMinimize?.(false)}
      >
        <div className="w-14 h-14 flex items-center justify-center">
          <Phone className="h-6 w-6 text-primary" />
        </div>
      </div>
    );
  }

  // Full widget
  return (
    <div
      ref={widgetRef}
      className={`fixed z-50 w-80 bg-card border rounded-lg shadow-2xl ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Softphone</h3>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onMinimize?.(!isMinimized)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto">{children}</div>
    </div>
  );
}
