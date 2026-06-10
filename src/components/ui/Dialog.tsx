import React, { useEffect } from 'react';
import { Button } from './Button';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  default: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
  full: 'max-w-[95vw]',
};

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, size = 'default' }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Dialog Body */}
      <div className={`relative z-10 w-full ${sizeClasses[size]} overflow-hidden rounded-lg border border-border-custom bg-surface-card p-6 shadow-lg transition-all animate-slide-up max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-custom/40 mb-4">
          <h2 className="text-lg font-semibold text-section-heading font-sans">{title}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 rounded-full hover:bg-border-custom/50 text-text-muted hover:text-text-primary" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content (Scrollable) */}
        <div className="overflow-y-auto pr-1 flex-1 text-text-primary">
          {children}
        </div>
      </div>
    </div>
  );
};
