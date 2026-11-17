import React from 'react';

type CardVariant = 'default' | 'flat' | 'bordered';

interface CardProps {
  variant?: CardVariant;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-[#E2E8F0] shadow-sm',
  flat: 'bg-[#F8FAFC] border border-[#E2E8F0]',
  bordered: 'bg-white border-2 border-[#E2E8F0]',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hover = false,
  padding = 'md',
  className = '',
  children,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl',
        variantStyles[variant],
        paddingStyles[padding],
        hover
          ? 'transition-all duration-150 hover:border-[#CBD5E1] hover:shadow-md cursor-pointer'
          : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
};
