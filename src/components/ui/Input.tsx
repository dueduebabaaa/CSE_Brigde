import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-[#0F172A]"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftElement && (
          <div className="absolute left-3 text-[#94A3B8] pointer-events-none">
            {leftElement}
          </div>
        )}
        <input
          id={inputId}
          className={[
            'w-full h-9 rounded-lg border bg-white text-sm text-[#0F172A]',
            'placeholder:text-[#94A3B8]',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#7D39EB] focus:ring-offset-0 focus:border-[#7D39EB]',
            'disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-[#E2E8F0] hover:border-[#CBD5E1]',
            leftElement ? 'pl-9' : 'pl-3',
            rightElement ? 'pr-9' : 'pr-3',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 text-[#94A3B8]">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-[#94A3B8]">{hint}</p>}
    </div>
  );
};
