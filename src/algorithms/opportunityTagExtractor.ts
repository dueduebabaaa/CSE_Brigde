/**
 * BRIDGE — 공고 제목·본문 기반 분야 및 기술 태그 자동 추출 유틸리티
 * 
 * 공고의 제목(title)과 본문(description) 텍스트를 분석하여
 * 실제 본문에 근거가 있는 관심 분야(field) 및 기술 스택(tech) 태그를 추출하고 정규화합니다.
 * 
 * [원칙 - DATA_CONTRACT.md 8.1절 준수]
 * 1. 실제 문장에 명시적으로 등장한 키워드만 추출합니다.
 * 2. 원문에 없는 기술을 임의로 추정하거나 일반 태그를 기술로 점수화하지 않습니다.
 * 3. 단어 경계(Boundary) 검사를 적용하여 부분 문자열 매칭으로 인한 오탐(False Positive)을 방지합니다.
 * 4. 기존 getCanonicalTag 및 normalizeInterest 규칙을 재사용하여 표준명으로 일원화합니다.
 * 5. 원본 공고 데이터 및 텍스트 불변성을 보장합니다.
 */

import {
  getCanonicalTag,
  normalizeInterest,
  classifyTag,
} from './tagClassification';

export interface ExtractedOpportunityTags {
  fields: string[];       // 추출된 관심 분야 태그 목록 (표준 명칭)
  techs: string[];        // 추출된 기술 스택 태그 목록 (Canonical 명칭)
  allTags: string[];      // 중복 제거된 전체 태그 목록 (fields + techs + 원본 보존)
}

/**
 * 텍스트에서 안전하게 탐색할 기술 키워드 후보 및 정규화 매핑 목록
 * (특수문자 포함 키워드는 긴 단어부터 우선 매칭하여 Next.js -> Next 오탐 방지)
 */
interface KeywordMatcher {
  pattern: RegExp;
  rawTag: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 영문 및 특수문자 기술명을 위한 독립 단어 경계 정규식 생성
 * - 앞뒤에 알파벳/숫자가 붙어있는 부분 문자열은 제외 (예: 'react' in 'reaction' 제외)
 */
function createWordBoundaryRegex(keyword: string): RegExp {
  const escaped = escapeRegExp(keyword);
  // 영문/숫자 경계: 앞뒤에 [a-zA-Z0-9]가 없어야 함
  return new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, 'i');
}

/**
 * 한글 키워드를 위한 정규식 생성 (조사 결합 허용)
 */
function createKoreanKeywordRegex(keyword: string): RegExp {
  const escaped = escapeRegExp(keyword);
  // 앞뒤에 한글/영문/숫자가 붙어서 다른 단어의 일부가 되는 것 방지
  // (예: '웹' in '웹사이트'는 허용하되, '게임' in '게임을' 조사 결합 허용)
  return new RegExp(`(?<![가-힣a-zA-Z0-9])${escaped}(?=[\\s,./!?;:()[\\]{}~_과와을를이가은는에서도로며]|$|[a-zA-Z0-9])`, 'i');
}

/**
 * 탐색 대상 주요 기술 스택 사전 (길이 내림차순 정렬로 부분 매칭 방지)
 */
const TECH_CANDIDATE_KEYWORDS = [
  'Spring Boot',
  'Spring',
  'React Native',
  'Next.js',
  'Vue.js',
  'Node.js',
  'React',
  'Vue',
  'TypeScript',
  'JavaScript',
  'Python',
  'FastAPI',
  'Django',
  'PyTorch',
  'TensorFlow',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Docker',
  'Kubernetes',
  'GraphQL',
  'Kafka',
  'TailwindCSS',
  'Tailwind CSS',
  'Tailwind',
  'HTML/CSS',
  'HTML5',
  'CSS3',
  'HTML',
  'CSS',
  'Flutter',
  'Dart',
  'Kotlin',
  'Swift',
  'Rust',
  'Golang',
  'Java',
  'Linux',
  'Git',
  'GitHub',
  'GitHub Actions',
  'AWS',
  'Figma',
  'Supabase',
  'Firebase',
  'Pandas',
  'Tableau',
  'BigQuery',
  'Three.js',
  'Terraform',
  'HuggingFace',
];

/**
 * 탐색 대상 주요 분야 키워드 사전
 */
const FIELD_CANDIDATE_KEYWORDS = [
  '인공지능',
  '머신러닝',
  '딥러닝',
  '빅데이터',
  '데이터 분석',
  '데이터사이언스',
  '정보보안',
  '사이버보안',
  '모의해킹',
  '클라우드',
  '데브옵스',
  'DevOps',
  '임베디드 및 IoT',
  '임베디드',
  'IoT',
  '모바일 앱',
  '앱 개발',
  '웹 서비스',
  '웹 개발',
  '웹',
  '게임 개발',
  '서비스 기획',
  'UI/UX 디자인',
  'UI/UX',
  '오픈소스',
  '알고리즘',
  '마케팅',
  '창업',
  '블록체인',
  '생성형 AI',
  '생성형AI',
  'LLM',
  '자연어 처리',
  '컴퓨터 비전',
];

// 정적 캐싱된 매처 배열 생성
const BUILT_TECH_MATCHERS: KeywordMatcher[] = TECH_CANDIDATE_KEYWORDS.map((k) => ({
  pattern: createWordBoundaryRegex(k),
  rawTag: k,
}));

const BUILT_FIELD_MATCHERS: KeywordMatcher[] = FIELD_CANDIDATE_KEYWORDS.map((k) => ({
  pattern: /[가-힣]/.test(k) ? createKoreanKeywordRegex(k) : createWordBoundaryRegex(k),
  rawTag: k,
}));

/**
 * 공고의 제목과 본문에서 실제 언급된 분야 및 기술 태그를 추출합니다.
 * 
 * @param title 공고 제목
 * @param description 공고 본문 내용
 * @returns 추출된 fields, techs 및 중복 제거된 allTags
 */
export function extractTagsFromOpportunity(
  title?: string | null,
  description?: string | null
): ExtractedOpportunityTags {
  const titleText = (title ?? '').normalize('NFKC').trim();
  const descText = (description ?? '').normalize('NFKC').trim();
  const fullText = `${titleText} ${descText}`.trim();

  if (!fullText) {
    return {
      fields: [],
      techs: [],
      allTags: [],
    };
  }

  const foundFieldCanonicals = new Set<string>();
  const foundTechCanonicals = new Set<string>();
  const allTagSet = new Set<string>();

  // 1. 분야 키워드 탐색
  for (const matcher of BUILT_FIELD_MATCHERS) {
    if (matcher.pattern.test(fullText)) {
      const canonicalField = normalizeInterest(matcher.rawTag);
      if (canonicalField) {
        foundFieldCanonicals.add(canonicalField);
        allTagSet.add(canonicalField);
      }
    }
  }

  // 2. 기술 스택 키워드 탐색
  for (const matcher of BUILT_TECH_MATCHERS) {
    if (matcher.pattern.test(fullText)) {
      const canonicalTech = getCanonicalTag(matcher.rawTag);
      if (canonicalTech) {
        const { category } = classifyTag(canonicalTech);
        if (category === 'tech') {
          foundTechCanonicals.add(canonicalTech);
          allTagSet.add(canonicalTech);
        } else if (category === 'field') {
          foundFieldCanonicals.add(canonicalTech);
          allTagSet.add(canonicalTech);
        } else {
          allTagSet.add(canonicalTech);
        }
      }
    }
  }

  return {
    fields: Array.from(foundFieldCanonicals),
    techs: Array.from(foundTechCanonicals),
    allTags: Array.from(allTagSet),
  };
}
