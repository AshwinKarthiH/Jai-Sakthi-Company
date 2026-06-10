import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={twMerge(
          "text-sm font-medium leading-none text-text-primary/90 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-sans",
          className
        )}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";
