import React from 'react';

type BadgeVariant = 'violet' | 'lime' | 'gray' | 'amber' | 'green' | 'red' | 'blue';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  violet: 'bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20',
  lime: 'bg-[#F7FEDF] text-[#5a7a00] border border-[#C6FF33]/40',
  gray: 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  green: 'bg-green-50 text-green-700 border border-green-200',
  red: 'bg-red-50 text-red-600 border border-red-200',
  blue: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  size = 'sm',
  dot = false,
  className = '',
  children,
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-md font-semibold tracking-wide whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            variant === 'violet'
              ? 'bg-[#7D39EB]'
              : variant === 'lime'
              ? 'bg-[#93C418]'
              : variant === 'green'
              ? 'bg-green-500'
              : variant === 'red'
              ? 'bg-red-500'
              : variant === 'amber'
              ? 'bg-amber-500'
              : 'bg-[#94A3B8]'
          }`}
        />
      )}
      {children}
    </span>
  );
};
