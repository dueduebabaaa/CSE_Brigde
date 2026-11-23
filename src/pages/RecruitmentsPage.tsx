import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, ArrowRight, Users, Clock } from 'lucide-react';
import { EmptyState, LoadingState, SkillTag } from '../components/ui';
import {
  activityTypeLabels,
  getRecruitmentHeadcount,
  recruitmentStatusLabels,
  type RecruitmentFilters,
  type RecruitmentSource,
} from '../features/recruitments/recruitmentModel';
import type { Recruitment, RecruitmentStatus } from '../types';

export const RecruitmentsPage: React.FC<{ source?: RecruitmentSource | null }> = ({
  source = null,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'recruiting' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!source) {
      setRecruitments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters: RecruitmentFilters = {
        status: filterStatus === 'all' ? undefined : (filterStatus as RecruitmentStatus),
        search: searchTerm.trim() || undefined,
      };
      const data = await source.getRecruitments(filters);
      setRecruitments(data || []);
    } catch {
      setError('모집글 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [source, filterStatus, searchTerm]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 클라이언트 측 검색 보조 (source가 기본 검색을 처리하지 못할 경우를 대비한 안전 장치)
  const filteredRecruitments = recruitments.filter((rec) => {
    if (filterStatus !== 'all' && rec.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const matchTitle = rec.title.toLowerCase().includes(query);
      const matchContent = rec.content.toLowerCase().includes(query);
      const matchRole = rec.roles?.some((r) => r.toLowerCase().includes(query));
      const matchTech = rec.requiredTechStacks?.some((t) => t.toLowerCase().includes(query));
      if (!matchTitle && !matchContent && !matchRole && !matchTech) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">팀원 모집 게시판</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F7FEDF] text-[#5a7a00] border border-[#C6FF33]/40">
              RECRUIT
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            원하는 프로젝트를 위한 팀원을 직접 모집하거나 지원서를 작성해 팀에 합류해 보세요.
          </p>
        </div>
        <Link
          to="/recruitments/new"
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          모집글 작성하기
        </Link>
      </div>

      {/* 검색 & 필터 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="search"
            placeholder="모집글 제목, 본문, 역할, 필요 기술 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={!source}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none focus:ring-1 focus:ring-[#7D39EB] text-xs text-[#111111] placeholder-[#94A3B8] disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'recruiting', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              disabled={!source}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                filterStatus === status
                  ? 'bg-[#7D39EB] text-white shadow-sm'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#111111]'
              }`}
            >
              {status === 'all'
                ? '전체 상태'
                : status === 'recruiting'
                ? '모집중'
                : '모집완료'}
            </button>
          ))}
        </div>
      </div>

      {/* 상태별 화면 */}
      {!source && (
        <EmptyState
          icon={<Users size={24} />}
          title="팀원 모집 서비스 연결 준비 중"
          description="서비스 연결이 완료되면 모집글을 조회하고 지원할 수 있어요."
        />
      )}

      {source && loading && (
        <div role="status">
          <LoadingState text="모집글 목록을 불러오는 중입니다..." />
        </div>
      )}

      {source && !loading && error && (
        <div role="alert">
          <EmptyState
            title="모집글을 불러오지 못했어요"
            description={error}
            action={{ label: '다시 시도', onClick: fetchList }}
          />
        </div>
      )}

      {source && !loading && !error && filteredRecruitments.length === 0 && (
        <EmptyState
          title="등록된 모집글이 없어요"
          description="새로운 팀원을 직접 모집하거나 검색 조건을 변경해 보세요."
        />
      )}

      {source && !loading && !error && filteredRecruitments.length > 0 && (
        <div className="space-y-4">
          {filteredRecruitments.map((rec) => {
            const headcount = getRecruitmentHeadcount(rec);
            const statusMeta = recruitmentStatusLabels[rec.status] || {
              label: rec.status,
              badgeClass: 'bg-slate-100 text-slate-600',
            };
            const oppTitle = rec.customOpportunityTitle || '자유 프로젝트 팀원 모집';
            const deadlineText = rec.deadline ? rec.deadline.split('T')[0] : '상시 모집';
            const authorName = rec.authorProfile?.nickname?.trim() || rec.authorProfile?.name?.trim() || '작성자';

            return (
              <article
                key={rec.id}
                className="bg-white border border-[#E2E8F0] hover:border-[#7D39EB] hover:shadow-md rounded-xl p-5 sm:p-6 transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs text-[#7D39EB] font-bold truncate">
                      {rec.customOpportunityUrl ? (
                        <a
                          href={rec.customOpportunityUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗ {oppTitle}
                        </a>
                      ) : (
                        `↗ ${oppTitle}`
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
                        추가 모집 {headcount.current}/{headcount.target}명
                        {headcount.remaining > 0 ? ` (${headcount.remaining}자리 남음)` : ' (마감)'}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-[#111111] group-hover:text-[#7D39EB] transition-colors break-words">
                    <Link
                      to={`/recruitments/${rec.id}`}
                      className="after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-[#7D39EB]"
                    >
                      {rec.title}
                    </Link>
                  </h2>

                  <p className="mt-2 text-xs text-[#64748B] line-clamp-2 leading-relaxed break-words">
                    {rec.content}
                  </p>

                  {/* 모집 역할 */}
                  {rec.roles?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {rec.roles.map((role) => (
                        <span
                          key={role}
                          className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] font-medium border border-[#E2E8F0]"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 필요 기술 스택 */}
                  {rec.requiredTechStacks?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.requiredTechStacks.map((tech) => (
                        <SkillTag key={tech} skill={tech} className="text-[10px]" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      작성자: <strong className="text-[#334155]">{authorName}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#7D39EB]" />
                      {activityTypeLabels[rec.activityType] || rec.activityType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                      활동 기간: {rec.expectedDuration}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" />
                      마감: {deadlineText}
                    </span>
                  </div>

                  <span
                    aria-hidden="true"
                    className="text-[#7D39EB] font-bold flex items-center gap-1 shrink-0"
                  >
                    자세히 보기 / 지원하기
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
