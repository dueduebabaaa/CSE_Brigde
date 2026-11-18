import React, { useState } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { wrapper: string; text: string }> = {
  xs: { wrapper: 'w-6 h-6', text: 'text-[10px]' },
  sm: { wrapper: 'w-8 h-8', text: 'text-xs' },
  md: { wrapper: 'w-10 h-10', text: 'text-sm' },
  lg: { wrapper: 'w-12 h-12', text: 'text-base' },
  xl: { wrapper: 'w-16 h-16', text: 'text-xl' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-[#7D39EB] text-white',
    'bg-[#C6FF33] text-black',
    'bg-blue-500 text-white',
    'bg-emerald-500 text-white',
    'bg-orange-500 text-white',
    'bg-pink-500 text-white',
    'bg-indigo-500 text-white',
    'bg-teal-500 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  className = '',
}) => {
  const imageSrc = src?.trim() || null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { wrapper, text } = sizeStyles[size];
  const initials = getInitials(name || '?');
  const colorClass = getColorFromName(name || '?');

  if (imageSrc && failedSrc !== imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        role="img"
        aria-label={name || '프로필'}
        referrerPolicy="no-referrer"
        onError={event => { event.currentTarget.style.visibility = 'hidden'; setFailedSrc(imageSrc); }}
        className={`${wrapper} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${wrapper} rounded-full flex items-center justify-center font-bold shrink-0 ${colorClass} ${text} ${className}`}
      aria-label={name || '프로필'}
    >
      {initials}
    </div>
  );
};
