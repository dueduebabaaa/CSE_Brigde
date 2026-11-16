import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      ].join(' ')}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[#0F172A] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#64748B] max-w-xs leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
