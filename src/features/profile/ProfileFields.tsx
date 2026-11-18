import { useId, useState, type ReactNode } from 'react';
export const fieldClass = 'w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#7D39EB] disabled:opacity-60';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[#64748B]"><span>{label}</span>{children}</label>;
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-8"><h2 className="border-b border-[#E2E8F0] pb-3 text-sm font-bold text-[#111111]">{title}</h2>{children}</section>;
}
export function MultiChoice({ label, options, selected, onChange, custom = false }: { label: string; options: string[]; selected: string[] | null; onChange: (values: string[]) => void; custom?: boolean }) {
  const [entry, setEntry] = useState('');
  const id = useId();
  const values = selected ?? [];
  const choices = [...new Set([...options, ...values])];
  const add = () => {
    const value = entry.trim();
    if (!value) return;
    if (!values.some(item => item.normalize('NFKC').toLowerCase() === value.normalize('NFKC').toLowerCase())) onChange([...values, value]);
    setEntry('');
  };
  return <div className="min-w-0 space-y-3" role="group" aria-labelledby={id}>
    <p id={id} className="text-xs font-semibold text-[#64748B]">{label}</p>
    <div className="flex flex-wrap gap-2">{choices.map(value => <button key={value} type="button" aria-pressed={values.includes(value)} onClick={() => onChange(values.includes(value) ? values.filter(item => item !== value) : [...values, value])} className={'max-w-full break-words rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ' + (values.includes(value) ? 'border-[#7D39EB] bg-[#F4EFFE] text-[#7D39EB]' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]')}>{value}</button>)}</div>
    {custom && <div className="flex min-w-0 gap-2"><input aria-label={`${label} 직접 입력`} placeholder="목록에 없는 값 직접 입력" value={entry} className={fieldClass + ' flex-1'} onChange={event => setEntry(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); add(); } }} /><button type="button" onClick={add} disabled={!entry.trim()} className="shrink-0 rounded-lg bg-[#7D39EB] px-3 py-2 text-xs font-bold text-white disabled:opacity-50" aria-label={`${label} 추가`}>추가</button></div>}
    {!values.length && <p className="text-xs text-[#94A3B8]">미등록</p>}
  </div>;
}
