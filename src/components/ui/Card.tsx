import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = true, glass = false }) => {
  return (
    <div
      className={cn(
        'rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-all duration-300',
        hover && 'hover:shadow-xl hover:-translate-y-1',
        glass && 'glass',
        className
      )}
    >
      {children}
    </div>
  );
};
