import React from 'react';

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

interface SkillTagProps {
  skill: string;
  level?: SkillLevel;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const levelStyles: Record<SkillLevel, { dot: string; label: string }> = {
  beginner: { dot: 'bg-[#94A3B8]', label: '입문' },
  intermediate: { dot: 'bg-[#7D39EB]', label: '활용' },
  advanced: { dot: 'bg-[#C6FF33]', label: '숙련' },
};

export const SkillTag: React.FC<SkillTagProps> = ({
  skill,
  level,
  removable = false,
  onRemove,
  className = '',
}) => {
  const levelInfo = level ? levelStyles[level] : null;

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-medium text-[#0F172A]',
        'whitespace-nowrap',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {levelInfo && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${levelInfo.dot}`}
          title={levelInfo.label}
        />
      )}
      <span>{skill}</span>
      {level && (
        <span className="text-[10px] text-[#94A3B8] font-normal">
          {levelInfo?.label}
        </span>
      )}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-[#94A3B8] hover:text-red-500 transition-colors leading-none"
          aria-label={`${skill} 제거`}
        >
          ×
        </button>
      )}
    </span>
  );
};
