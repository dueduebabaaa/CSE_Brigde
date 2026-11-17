import React from 'react';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  rows?: number;
  className?: string;
  text?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  rows = 3,
  className = '',
  text,
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-[#F1F5F9] animate-pulse"
            style={{ height: 72, opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 py-16',
        className,
      ].join(' ')}
    >
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-[#E2E8F0]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7D39EB] animate-spin" />
      </div>
      {text && <p className="text-sm text-[#94A3B8]">{text}</p>}
    </div>
  );
};
