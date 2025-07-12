'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface GlowInputProps extends React.ComponentProps<typeof Input> {
  glowColor?: string;
}

export const GlowInput = forwardRef<HTMLInputElement, GlowInputProps>(
  ({ className, glowColor = '#F38020', ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn(
          'transition-all duration-300 focus:shadow-lg focus:shadow-orange-500/25 focus:ring-orange-500 focus:border-orange-500',
          className
        )}
        {...props}
      />
    );
  }
);

GlowInput.displayName = 'GlowInput';