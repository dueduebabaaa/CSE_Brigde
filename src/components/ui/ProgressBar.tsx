import React from 'react';

type ProgressColor = 'violet' | 'lime' | 'gray';

interface ProgressBarProps {
  value: number; // 0 ~ 100
  color?: ProgressColor;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const colorStyles: Record<ProgressColor, string> = {
  violet: 'bg-[#7D39EB]',
  lime: 'bg-[#C6FF33]',
  gray: 'bg-[#94A3B8]',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'violet',
  size = 'md',
  showLabel = false,
  label,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={className}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-[#64748B]">{label}</span>}
          {showLabel && (
            <span className="text-xs font-semibold text-[#0F172A]">{clamped}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full rounded-full bg-[#F1F5F9] ${size === 'sm' ? 'h-1' : 'h-2'}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorStyles[color]}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
