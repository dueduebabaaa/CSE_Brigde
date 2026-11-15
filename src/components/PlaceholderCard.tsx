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
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
            <Construction className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#111111] tracking-tight">{title}</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
                {badge}
              </span>
            </div>
            {assignedRole && (
              <p className="text-xs text-[#64748B] mt-0.5">
                담당 영역: <span className="text-[#111111] font-medium">{assignedRole}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-[#334155] text-sm leading-relaxed mb-6">{description}</p>

      {plannedFeatures.length > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2.5">
            구현 예정 기능 명세
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plannedFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-[#334155]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7D39EB]" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
