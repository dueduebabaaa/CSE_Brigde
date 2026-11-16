import { useState } from 'react';
import { TECH_CATALOG } from '../constants/technologies';

const normalize = (value: string) => value.trim().normalize('NFKC').toLowerCase();
interface Props { selected: string[]; onToggle: (tech: string) => void; label: string; }

export function TechnologyPicker({ selected, onToggle, label }: Props) {
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const add = () => {
    const value = search.trim().normalize('NFKC');
    if (!value) return;
    const canonical = Object.values(TECH_CATALOG).flat().find((tech) => normalize(tech) === normalize(value)) || value;
    if (selected.some((tech) => normalize(tech) === normalize(canonical))) {
      setNotice('이미 선택한 기술입니다.');
      return;
    }
    onToggle(canonical);
    setSearch('');
    setNotice('');
  };
  return <div className="space-y-4 min-w-0">
    <p className="text-xs text-[#94A3B8]">{label} 검색 또는 직접 추가</p>
    <div className="flex flex-wrap gap-2">
      <input aria-label={`${label} 검색 또는 직접 추가`} value={search}
        onChange={(e) => { setSearch(e.target.value); setNotice(''); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }}
        placeholder="기술 이름 입력 (예: React, Rust)"
        className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-[#14151F] border border-[#242634] text-xs text-white focus:border-[#7D39EB] focus:outline-none" />
      <button type="button" onClick={add} disabled={!search.trim()} className="px-3 py-2 rounded-lg bg-[#181926] border border-[#242634] text-xs text-white disabled:opacity-50">직접 추가</button>
    </div>
    {notice && <p role="status" className="text-xs text-[#94A3B8]">{notice}</p>}
    {Object.entries(TECH_CATALOG).map(([category, items]) => {
      const filtered = items.filter((tech) => normalize(tech).includes(normalize(search)));
      return filtered.length > 0 && <div key={category}>
        <p className="text-[11px] text-[#94A3B8] mb-2">{category}</p>
        <div className="flex flex-wrap gap-2">{filtered.map((tech) => <button type="button" key={tech} aria-pressed={selected.includes(tech)} onClick={() => onToggle(tech)}
          className={`px-2.5 py-1 rounded-md text-xs break-all border ${selected.includes(tech) ? 'bg-[#7D39EB] text-white border-[#7D39EB]' : 'bg-[#14151F] text-[#94A3B8] border-[#242634]'}`}>{tech}</button>)}</div>
      </div>;
    })}
    {selected.length > 0 && <div className="flex flex-wrap gap-2" aria-label={`${label} 선택 목록`}>{selected.map((tech) => <button type="button" key={tech} onClick={() => onToggle(tech)} aria-label={`${tech} 삭제`}
      className="max-w-full px-2.5 py-1 rounded-md bg-[#7D39EB]/15 border border-[#7D39EB]/30 text-xs text-[#C6FF33] break-all">{tech} ×</button>)}</div>}
  </div>;
}
