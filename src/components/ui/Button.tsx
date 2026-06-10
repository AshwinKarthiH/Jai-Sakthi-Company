import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-custom disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-98 font-sans",
          {
            'primary': "bg-primary-custom text-white hover:bg-primary-hover shadow-sm",
            'secondary': "bg-white text-primary-custom border border-primary-custom hover:bg-primary-custom/5",
            'outline': "bg-white text-primary-custom border border-primary-custom hover:bg-primary-custom/5",
            'destructive': "bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-600 hover:text-white",
            'ghost': "text-text-muted hover:text-text-primary hover:bg-surface-card"
          }[variant],
          {
            'sm': "h-8 px-3 text-xs",
            'md': "h-10 px-4 py-2 text-sm",
            'lg': "h-12 px-6 text-base"
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
