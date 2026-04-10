import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  ...props
}) => {
  const variants = {
    primary: 'bg-brand-500 text-white rounded-lg servify-shadow hover:bg-brand-400 hover:-translate-y-0.5 active:scale-95',
    secondary: 'bg-[#c7e5e6] text-[#4c6868] rounded-lg hover:bg-[#b9ddde] active:scale-95',
    outline: 'border border-[#bec9c8] text-brand-500 rounded-lg bg-white hover:bg-brand-50 active:scale-95',
    ghost: 'text-[#6f7979] rounded-lg hover:bg-[#f3f3f6]',
    danger: 'bg-[#ba1a1a] text-white rounded-lg hover:bg-red-700 active:scale-95',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-10 py-4 text-lg font-bold',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};
