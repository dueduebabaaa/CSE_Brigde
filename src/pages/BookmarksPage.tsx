
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Compass, LoaderCircle } from 'lucide-react';
import { useSharedOpportunitySource } from '../components/opportunities/OpportunitySourceLayout';
import { publicOpportunities } from '../components/opportunities/opportunityModel';

export const BookmarksPage: React.FC = () => {
  const {
    opportunities,
    bookmarkIds = [],
    onBookmark,
    loading,
    error,
    onRetry,
    now,
  } = useSharedOpportunitySource();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const savedOpportunities = publicOpportunities(
    opportunities ?? [],
    now ?? new Date()
  ).filter((opportunity) => bookmarkIds.includes(opportunity.id));

  const handleRemove = async (id: string) => {
    if (!onBookmark || removingId) return;

    setRemovingId(id);
    setActionError('');

    try {
      await onBookmark(id, false);
    } catch {
      setActionError('북마크를 해제하지 못했습니다.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            저장한 공모전
          </h1>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F4EFFE] text-[#7D39EB]">
            SAVED
          </span>
        </div>
        <p className="mt-2 text-sm text-[#64748B]">
          관심 있는 공모전과 대외활동을 모아 확인하세요.
        </p>
        <p className="mt-1 text-xs text-[#94A3B8]">
          북마크는 현재 사용 중인 브라우저에 저장되며, 다른 기기와 동기화되지 않습니다.
        </p>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-red-600">
          {actionError}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-[#64748B]">
          <LoaderCircle className="w-5 h-5 animate-spin" />
          공고를 불러오는 중입니다.
        </div>
      ) : error ? (
        <div className="p-10 rounded-2xl bg-white border border-[#E2E8F0] text-center space-y-3">
          <p className="font-bold text-[#111111]">
            저장한 공고를 불러오지 못했어요.
          </p>
          <p className="text-sm text-[#64748B]">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-[#7D39EB] text-white text-sm font-semibold"
            >
              다시 시도
            </button>
          )}
        </div>
      ) : savedOpportunities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E2E8F0] space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center mx-auto text-[#94A3B8]">
            <Bookmark className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-[#111111]">
            아직 저장한 공모전이 없습니다
          </h3>

          <p className="text-xs text-[#64748B]">
            관심 있는 공고를 북마크해 보세요.
          </p>

          <Link
            to="/opportunities"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-sm font-bold"
          >
            <Compass className="w-4 h-4" />
            공모전 둘러보기
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#64748B]">
            저장한 공고 {savedOpportunities.length}개
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedOpportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-4"
              >
                <div className="space-y-2">
                  <span className="inline-block px-2 py-1 rounded-md bg-[#F4EFFE] text-[#7D39EB] text-xs font-semibold">
                    {opportunity.category}
                  </span>

                  <h2 className="text-base font-bold text-[#111111]">
                    {opportunity.title}
                  </h2>

                  <p className="text-sm text-[#64748B]">
                    {opportunity.organizer}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/opportunities/${encodeURIComponent(opportunity.id)}`}
                    className="px-4 py-2 rounded-lg bg-[#7D39EB] text-white text-xs font-bold hover:bg-[#6025C5]"
                  >
                    공고 상세보기
                  </Link>

                  <button
                    type="button"
                    onClick={() => void handleRemove(opportunity.id)}
                    disabled={!onBookmark || removingId !== null}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#64748B] text-xs font-semibold disabled:opacity-50"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                    {removingId === opportunity.id
                      ? '해제 중...'
                      : '저장 해제'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
