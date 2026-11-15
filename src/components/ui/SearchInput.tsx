import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = '검색...',
  className = '',
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-[#94A3B8] pointer-events-none shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          'w-full h-9 pl-9 pr-9 rounded-lg border border-[#E2E8F0]',
          'bg-white text-sm text-[#0F172A] placeholder:text-[#94A3B8]',
          'hover:border-[#CBD5E1] transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-[#7D39EB] focus:border-[#7D39EB]',
        ].join(' ')}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 text-[#94A3B8] hover:text-[#64748B] transition-colors"
          aria-label="검색어 지우기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
