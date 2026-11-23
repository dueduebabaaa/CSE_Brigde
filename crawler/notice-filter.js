const NOTICE_TYPES = [
  { label: '공모전', pattern: /공모전|경진\s*대회|해커톤|아이디어톤|챌린지/ },
  { label: '대외활동', pattern: /대외\s*활동|서포터즈|산학\s*협력/ },
  { label: '교육', pattern: /부트\s*캠프|교육\s*(?:프로그램|과정|생|참가|참여|신청|모집)|특강|세미나/ },
  { label: '현장실습·인턴십', pattern: /현장\s*실습|인턴(?:십)?/ },
  { label: '연구·프로젝트', pattern: /학부\s*생?\s*연구(?:생)?|연구생|프로젝트/ },
];

const ADMIN_TITLE = /수강\s*신청|졸업\s*(?:요건|요구조건)|학사\s*(?:제도|일정|안내)|성적|휴학|복학|전과|등록금|강의실\s*(?:변경|안내)|수업\s*(?:취소|변경|휴강)|휴강|시험|고사|일반\s*행정|행정\s*안내/;
const POLICY_CHANGE = /(?:제도|기준|규정|지침|운영\s*방식).{0,12}(?:변경|개정|변동)|(?:변경|개정|변동).{0,12}(?:제도|기준|규정|지침|운영\s*방식)/;
const HISTORICAL_NOTICE = /수상자?\s*(?:발표|결과)|(?:참여|활동|행사)\s*후기|성료|종료\s*결과|결과\s*발표/;
const PARTICIPATION_CONTEXT = /모집|신청|참가|참여|접수|지원|선발|선정|교육생|실습생|연구생|팀원|참여자|신청자|수강생|참여\s*기회|활동\s*기회|개최\s*(?:예정|안내)/;
const CLEAR_INTAKE = /모집|신청|참가|참여|접수|지원|선발|선정|교육생|실습생|연구생|팀원|참여자|신청자|수강생/;

function normalize(value) {
  return typeof value === 'string' ? value.normalize('NFKC').replace(/\s+/g, ' ').trim() : '';
}

export function isTargetNotice(notice) {
  if (!notice || typeof notice !== 'object') return false;

  const title = normalize(notice.title);
  const content = normalize(notice.content);
  if (!title) return false;

  // Title-level administrative announcements take precedence over incidental
  // opportunity terms that may appear in their body text.
  if (ADMIN_TITLE.test(title)) return false;

  const text = `${title} ${content}`;
  if (HISTORICAL_NOTICE.test(title) && !CLEAR_INTAKE.test(title)) return false;
  if (!NOTICE_TYPES.some(({ pattern }) => pattern.test(text))) return false;
  if (!PARTICIPATION_CONTEXT.test(text)) return false;

  // Mentions of policy changes are not opportunities unless the notice also
  // describes an explicit way for students to apply or participate.
  if (POLICY_CHANGE.test(text) && !CLEAR_INTAKE.test(text)) return false;

  return true;
}

export function getMatchedNoticeTypes(notice) {
  const text = `${normalize(notice?.title)} ${normalize(notice?.content)}`;
  return NOTICE_TYPES.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

export function getCategory(title, content = '') {
  const text = `${normalize(title)} ${normalize(content)}`;
  if (/해커톤/.test(text)) return '해커톤';
  if (/경진\s*대회/.test(text)) return '경진대회';
  if (/서포터즈/.test(text)) return '서포터즈';
  if (/공모전|아이디어톤|챌린지/.test(text)) return '공모전';
  if (/대외\s*활동|산학\s*협력|현장\s*실습|인턴(?:십)?|학부\s*생?\s*연구(?:생)?|연구생|프로젝트/.test(text)) return '대외활동';
  return '교육/특강';
}
