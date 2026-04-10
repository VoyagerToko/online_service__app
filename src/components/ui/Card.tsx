import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = true, glass = false, ...props }) => {
  return (
    <div
      {...props}
      className={cn(
        'rounded-xl bg-white border border-brand-200/20 p-6 servify-shadow transition-all duration-300',
        hover && 'hover:-translate-y-1',
        glass && 'glass',
        className
      )}
    >
      {children}
    </div>
  );
};
