import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderCardProps {
  title: string;
  description: string;
  plannedFeatures?: string[];
  assignedRole?: string;
  badge?: string;
}

export const PlaceholderCard: React.FC<PlaceholderCardProps> = ({
  title,
  description,
  plannedFeatures = [],
  assignedRole,
  badge = '개발 예정 프로토타입',
}) => {
  return (
    <div className="bg-[#13141C] border border-[#242634] rounded-xl p-6 sm:p-8 relative overflow-hidden">
      {/* 장식용 글로우 효과 */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#7D39EB]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#7D39EB]/15 text-[#7D39EB] border border-[#7D39EB]/30">
            <Construction className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#C6FF33]/15 text-[#C6FF33] border border-[#C6FF33]/30">
                {badge}
              </span>
            </div>
            {assignedRole && (
              <p className="text-xs text-slate-400 mt-0.5">
                담당 영역: <span className="text-slate-200 font-medium">{assignedRole}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-slate-300 text-sm leading-relaxed mb-6">{description}</p>

      {plannedFeatures.length > 0 && (
        <div className="bg-[#0B0C10] border border-[#242634] rounded-lg p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            구현 예정 기능 명세
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plannedFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF33]" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
