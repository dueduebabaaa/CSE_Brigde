/**
 * BRIDGE — 태그 분류 및 정규화 유틸리티
 * 
 * 공모전의 tags 배열에서 분야(Field), 기술(Tech), 일반(General) 태그를 식별하고,
 * 대소문자, 공백 및 동의어를 정규화합니다.
 */

export type TagCategory = 'field' | 'tech' | 'general';

/**
 * DATA_CONTRACT.md 3.2절: 공통 합의된 관심 분야 표준 15종
 */
export const STANDARD_INTEREST_OPTIONS = [
  '웹 개발',
  '앱 개발',
  '인공지능',
  '데이터 분석',
  '정보보안',
  '게임 개발',
  '임베디드 및 IoT',
  '클라우드',
  'UI/UX 디자인',
  '서비스 기획',
  '마케팅',
  '창업',
  '알고리즘',
  '오픈소스',
  '기타',
] as const;

export type StandardInterest = (typeof STANDARD_INTEREST_OPTIONS)[number];

export interface ClassifiedTags {
  fields: string[];       // 관심 분야 태그 (점수 계산 대상)
  techs: string[];        // 기술 스택 태그 (점수 계산 대상)
  generals: string[];     // 일반 태그 (점수 계산 제외: 해커톤, KNU 등)
  canonicalMap: Map<string, string>; // canonical -> original 태그 매핑
}

/**
 * 1. 동의어(Synonyms) 사전
 * - 정규화된 키(소문자, 공백 정리)를 대표 표준어(Canonical)로 매핑합니다.
 * - '웹 개발'과 '웹 플랫폼' 등 의미가 동일한 표현을 표준화합니다.
 */
export const SYNONYM_MAP: Record<string, string> = {
  // 분야 태그 동의어
  '웹개발': '웹 개발',
  '웹 개발': '웹 개발',
  '웹 플랫폼': '웹 개발',
  '웹플랫폼': '웹 개발',
  '웹': '웹 개발',
  'web': '웹 개발',
  'web development': '웹 개발',
  'web dev': '웹 개발',

  'ai': 'AI',
  '인공지능': 'AI',
  'artificial intelligence': 'AI',
  '생성형ai': 'AI',
  '생성형 ai': 'AI',
  'generative ai': 'AI',

  '머신러닝': '머신러닝',
  '기계학습': '머신러닝',
  'machine learning': '머신러닝',
  'ml': '머신러닝',

  '딥러닝': '딥러닝',
  '심층학습': '딥러닝',
  'deep learning': '딥러닝',
  'dl': '딥러닝',

  '자연어 처리': '자연어 처리',
  '자연어처리': '자연어 처리',
  'nlp': '자연어 처리',

  '추천 시스템': '추천 시스템',
  '추천시스템': '추천 시스템',

  'llm': 'LLM',
  'llm agent': 'LLM Agent',
  'ai agent': 'AI Agent',

  '데이터 분석': '데이터 분석',
  '데이터분석': '데이터 분석',
  'data analysis': '데이터 분석',
  '빅데이터': '데이터 분석',
  '빅데이터 처리': '데이터 분석',
  '빅데이터처리': '데이터 분석',

  '정보보안': '정보보안',
  '정보 보안': '정보보안',
  '보안': '정보보안',
  'security': '정보보안',
  'cyber security': '정보보안',
  '웹 모의해킹': '정보보안',
  '모의해킹': '정보보안',
  '암호학': '정보보안',
  '보안 인증': '정보보안',

  '클라우드': '클라우드',
  '클라우드 컴퓨팅': '클라우드',
  '클라우드 인프라': '클라우드',
  'cloud': '클라우드',

  'devops': 'DevOps',
  '데브옵스': 'DevOps',
  'ci/cd': 'DevOps',
  'devsecops': 'DevOps',

  '모바일 앱': '모바일 앱',
  '모바일': '모바일 앱',
  '앱 개발': '모바일 앱',
  'mobile': '모바일 앱',

  '오픈소스': '오픈소스',
  '오픈소스 sw': '오픈소스',
  'open source': '오픈소스',

  'ui/ux': 'UI/UX',
  'ui/ux 디자인': 'UI/UX',
  '디자인 시스템': 'UI/UX',
  '디자인 토큰': 'UI/UX',
  '인터랙션 디자인': 'UI/UX',
  '사용성 테스트': 'UI/UX',

  '게임 개발': '게임 개발',
  '게임': '게임 개발',
  'game dev': '게임 개발',

  '핀테크': '핀테크',
  '금융데이터': '금융데이터',
  '공공데이터': '공공데이터',
  '알고리즘': '알고리즘',
  '알고리즘 기초': '알고리즘',
  'sw융합': 'SW융합',
  '소프트웨어 융합': 'SW융합',
  '웹표준': '웹표준',
  '시계열 데이터': '데이터 분석',
  '백엔드 아키텍처': '웹 개발',
  '웹 기초': '웹 개발',
  '풀스택': '웹 개발',
  'fullstack': '웹 개발',
  'saas 개발': '웹 개발',
  '서버리스': '클라우드',
  'linux 커널': 'DevOps',

  // 기술 태그 동의어
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',

  'vue': 'Vue',
  'vue.js': 'Vue',
  'vuejs': 'Vue',

  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'next': 'Next.js',

  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'node': 'Node.js',

  'typescript': 'TypeScript',
  'ts': 'TypeScript',

  'javascript': 'JavaScript',
  'js': 'JavaScript',

  'python': 'Python',
  'py': 'Python',

  'fastapi': 'FastAPI',
  'fast api': 'FastAPI',

  'spring': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'springboot': 'Spring Boot',

  'java': 'Java',

  'c++': 'C++',
  'cpp': 'C++',
  'c': 'C',

  'pytorch': 'PyTorch',
  'torch': 'PyTorch',

  'tensorflow': 'TensorFlow',

  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',

  'mlops': 'MLOps',

  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',

  'mysql': 'MySQL',
  'redis': 'Redis',
  'supabase': 'Supabase',
  'firebase': 'Firebase',

  'aws': 'AWS',
  'git': 'Git',
  'github': 'GitHub',
  'github actions': 'GitHub Actions',
  'linux': 'Linux',
  'flutter': 'Flutter',
  'dart': 'Dart',
  'react native': 'React Native',
  'figma': 'Figma',
  'tailwindcss': 'TailwindCSS',
  'tailwind': 'TailwindCSS',
  'html/css': 'HTML/CSS',
  'html': 'HTML/CSS',
  'css': 'HTML/CSS',
  'graphql': 'GraphQL',
  'kafka': 'Kafka',
  'api': 'API',
  'huggingface': 'HuggingFace',
  'pandas': 'Pandas',
  'terraform': 'Terraform',
  'rust': 'Rust',
  'go': 'Go',
  'golang': 'Go',
  'sql': 'SQL',
  'r': 'R',
  'tableau': 'Tableau',
  'bigquery': 'BigQuery',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'grafana': 'Grafana',
  'adobe xd': 'Adobe XD',
  'three.js': 'Three.js',
  'framer motion': 'Framer Motion',
  'burp suite': 'Burp Suite',
  'wireshark': 'Wireshark',
  'ai sdk': 'AI SDK',

  // 관심 분야 15종 보완 동의어
  '임베디드': '임베디드 및 IoT',
  '임베디드 및 iot': '임베디드 및 IoT',
  '임베디드및iot': '임베디드 및 IoT',
  'iot': '임베디드 및 IoT',
  'embedded': '임베디드 및 IoT',
  '서비스 기획': '서비스 기획',
  '서비스기획': '서비스 기획',
  '기획': '서비스 기획',
  '마케팅': '마케팅',
  'marketing': '마케팅',
  '홍보': '마케팅',
  '창업': '창업',
  'startup': '창업',
  '창업/스타트업': '창업',
  '앱개발': '앱 개발',
  'ui/ux디자인': 'UI/UX 디자인',
};

/**
 * 관심 분야 15종 전용 정규화 매핑 사전 (소문자/공백 정리 키 -> A의 15개 표준 문자열)
 */
export const INTEREST_SYNONYM_MAP: Record<string, StandardInterest> = {
  '웹 개발': '웹 개발',
  '웹개발': '웹 개발',
  '웹': '웹 개발',
  '웹 서비스': '웹 개발',
  '웹서비스': '웹 개발',
  'web': '웹 개발',
  'web development': '웹 개발',
  'web dev': '웹 개발',

  '앱 개발': '앱 개발',
  '앱개발': '앱 개발',
  '모바일 앱': '앱 개발',
  '모바일': '앱 개발',
  'mobile': '앱 개발',
  'ios': '앱 개발',
  'android': '앱 개발',

  '인공지능': '인공지능',
  'ai': '인공지능',
  'artificial intelligence': '인공지능',
  '머신러닝': '인공지능',
  '딥러닝': '인공지능',
  '생성형 ai': '인공지능',
  '생성형ai': '인공지능',
  'llm': '인공지능',

  '데이터 분석': '데이터 분석',
  '데이터분석': '데이터 분석',
  '빅데이터': '데이터 분석',
  'bigdata': '데이터 분석',
  'big data': '데이터 분석',
  'data analysis': '데이터 분석',
  '데이터사이언스': '데이터 분석',

  '정보보안': '정보보안',
  '보안': '정보보안',
  'security': '정보보안',
  '사이버보안': '정보보안',

  '게임 개발': '게임 개발',
  '게임개발': '게임 개발',
  '게임': '게임 개발',
  'game': '게임 개발',

  '임베디드 및 iot': '임베디드 및 IoT',
  '임베디드및iot': '임베디드 및 IoT',
  '임베디드': '임베디드 및 IoT',
  'iot': '임베디드 및 IoT',
  'embedded': '임베디드 및 IoT',

  '클라우드': '클라우드',
  'cloud': '클라우드',
  '인프라': '클라우드',

  'ui/ux 디자인': 'UI/UX 디자인',
  'ui/ux디자인': 'UI/UX 디자인',
  'ui/ux': 'UI/UX 디자인',
  'uiux': 'UI/UX 디자인',
  '디자인': 'UI/UX 디자인',

  '서비스 기획': '서비스 기획',
  '서비스기획': '서비스 기획',
  '기획': '서비스 기획',
  'pm': '서비스 기획',

  '마케팅': '마케팅',
  'marketing': '마케팅',
  '홍보': '마케팅',

  '창업': '창업',
  'startup': '창업',

  '알고리즘': '알고리즘',
  'algorithm': '알고리즘',
  'ps': '알고리즘',

  '오픈소스': '오픈소스',
  'open source': '오픈소스',
  '오픈소스 sw': '오픈소스',

  '기타': '기타',
  'other': '기타',
  'etc': '기타',
};

/**
 * 2. 명시적 분야(Field) 태그 세트 (표준어 소문자 기준)
 */
export const KNOWN_FIELD_CANONICALS = new Set<string>([
  '웹 개발',
  'AI',
  '인공지능',
  '머신러닝',
  '딥러닝',
  '자연어 처리',
  '추천 시스템',
  'LLM',
  'LLM Agent',
  'AI Agent',
  '데이터 분석',
  '정보보안',
  '클라우드',
  'DevOps',
  '모바일 앱',
  '앱 개발',
  '오픈소스',
  'UI/UX',
  'UI/UX 디자인',
  '게임 개발',
  '임베디드 및 IoT',
  '서비스 기획',
  '마케팅',
  '창업',
  '핀테크',
  '금융데이터',
  '공공데이터',
  '알고리즘',
  'SW융합',
  '웹표준',
  '기타',
].map(s => s.toLowerCase()));

/**
 * 3. 명시적 기술(Tech) 태그 세트 (표준어 소문자 기준)
 */
export const KNOWN_TECH_CANONICALS = new Set<string>([
  'React',
  'Vue',
  'Next.js',
  'Node.js',
  'TypeScript',
  'JavaScript',
  'Python',
  'FastAPI',
  'Spring Boot',
  'Java',
  'C',
  'C++',
  'PyTorch',
  'TensorFlow',
  'Docker',
  'Kubernetes',
  'MLOps',
  'PostgreSQL',
  'MySQL',
  'Redis',
  'Supabase',
  'Firebase',
  'AWS',
  'Git',
  'GitHub',
  'GitHub Actions',
  'Linux',
  'Flutter',
  'Dart',
  'React Native',
  'Figma',
  'TailwindCSS',
  'HTML/CSS',
  'GraphQL',
  'Kafka',
  'API',
  'HuggingFace',
  'Pandas',
  'Terraform',
  'Rust',
  'Go',
  'SQL',
  'R',
  'Tableau',
  'BigQuery',
  'Swift',
  'Kotlin',
  'Grafana',
  'Adobe XD',
  'Three.js',
  'Framer Motion',
  'Burp Suite',
  'Wireshark',
  'AI SDK',
].map(s => s.toLowerCase()));

/**
 * 4. 명시적 일반(General) 태그 세트 (점수 계산 제외)
 */
export const KNOWN_GENERAL_TAGS = new Set<string>([
  'knu',
  '해커톤',
  '팀빌딩',
  '산학협력',
  '실무멘토링',
  '캡스톤',
  '졸업작품',
  '전시회',
  '성과발표',
  '부트캠프',
  '방학특강',
  '전국대회',
  '과기정통부',
  '상금',
  '지역창업',
  '대구경북',
  '글로벌',
  '소셜임팩트',
  '접근성',
  '비영리',
  '아이디어톤',
  '서포터즈',
  '기술블로그',
  '대외활동',
  '공모전',
  '경진대회',
  '특강',
  '세미나',
  '동아리',
  '스터디',
  '네트워킹',
  '멘토링',
]);

/**
 * 문자열 태그를 유니코드 정규화(NFKC), 공백 정리 및 소문자화하여 기본 정규화합니다.
 */
export function normalizeTag(tag: string): string {
  if (!tag) return '';
  return tag.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * 정규화된 태그에 동의어 매핑을 적용하여 대표 표준어(Canonical)를 반환합니다.
 * 매핑이 없으면 원래 정규화된 문자열을 반환합니다.
 */
export function getCanonicalTag(tag: string): string {
  const normalized = normalizeTag(tag);
  if (!normalized) return '';
  return SYNONYM_MAP[normalized] ?? tag.trim();
}

/**
 * 관심 분야 문자열을 A의 15종 표준 명칭으로 정규화합니다.
 * 
 * [원칙 - DATA_CONTRACT.md 3.2, 3.4 준수]
 * 1. 영문·약어·동의어(ai -> 인공지능, mobile -> 앱 개발 등)는 15종 표준으로 통일합니다.
 * 2. 사용자가 '기타'를 통해 직접 입력한 자유 문자열은 임의로 다른 분야로 바꾸거나 삭제하지 않고,
 *    공백만 정리하여 원본 문자열을 그대로 보존합니다.
 */
export function normalizeInterest(interest: string): string {
  if (!interest) return '';
  const trimmed = interest.normalize('NFKC').trim();
  if (!trimmed) return '';

  const key = trimmed.replace(/\s+/g, ' ').toLowerCase();
  const matched = INTEREST_SYNONYM_MAP[key];
  if (matched) {
    return matched;
  }

  // 매핑되지 않는 직접 입력값(예: '블록체인', '양자컴퓨팅')은 원본 보존
  return trimmed;
}

/**
 * 단일 태그의 카테고리를 분류합니다.
 * 분류 기준이 불분명한 태그는 임의로 기술이나 분야로 분류하지 않고 'general'로 처리합니다.
 */
export function classifyTag(rawTag: string): {
  category: TagCategory;
  canonical: string;
  original: string;
} {
  const original = rawTag.trim();
  const canonical = getCanonicalTag(original);
  const lowerCanonical = canonical.toLowerCase();

  if (KNOWN_FIELD_CANONICALS.has(lowerCanonical)) {
    return { category: 'field', canonical, original };
  }

  if (KNOWN_TECH_CANONICALS.has(lowerCanonical)) {
    return { category: 'tech', canonical, original };
  }

  // 일반 태그 세트에 있거나, 알려지지 않은 불분명한 태그는 모두 general로 분류하여 점수 산출 제외
  return { category: 'general', canonical, original };
}

/**
 * 여러 태그 목록을 분류하고 중복을 제거하여 반환합니다.
 */
export function classifyTags(tags: string[]): ClassifiedTags {
  const fieldSet = new Set<string>();
  const techSet = new Set<string>();
  const generalSet = new Set<string>();
  const canonicalMap = new Map<string, string>();

  for (const rawTag of tags) {
    if (!rawTag || !rawTag.trim()) continue;
    const { category, canonical } = classifyTag(rawTag);
    canonicalMap.set(canonical.toLowerCase(), canonical);

    if (category === 'field') {
      fieldSet.add(canonical);
    } else if (category === 'tech') {
      techSet.add(canonical);
    } else {
      generalSet.add(canonical);
    }
  }

  return {
    fields: Array.from(fieldSet),
    techs: Array.from(techSet),
    generals: Array.from(generalSet),
    canonicalMap,
  };
}

/**
 * 한국어 조사(과/와, 을/를)를 단어 끝소리(받침)에 맞게 자연스럽게 부착합니다.
 */
export function formatWithJosa(word: string, josaType: '과/와' | '을/를'): string {
  if (!word) return word;

  const trimmed = word.trim();
  const lastChar = trimmed[trimmed.length - 1];
  const charCode = lastChar.charCodeAt(0);

  let hasBatchim = false;

  // 한글 완성형 유니코드 범위: 0xAC00 ~ 0xD7A3
  if (charCode >= 0xac00 && charCode <= 0xd7a3) {
    hasBatchim = (charCode - 0xac00) % 28 > 0;
  } else {
    // 영문이나 숫자/기호인 경우의 음성적 받침 처리
    const lower = trimmed.toLowerCase();
    if (
      lower.endsWith('n') ||
      lower.endsWith('m') ||
      lower.endsWith('l') ||
      lower.endsWith('r') ||
      lower.endsWith('g') ||
      lower.endsWith('k') ||
      lower.endsWith('p') ||
      lower.endsWith('t') === false && false
    ) {
      if (lower.endsWith('n') || lower.endsWith('m') || lower.endsWith('l')) {
        hasBatchim = true;
      }
    }
    // 예외적인 기술 이름 하드코딩 지원
    if (lower === 'python' || lower === 'kotlin' || lower === 'sql' || lower === 'spring' || lower === 'spring boot') {
      hasBatchim = true;
    }
    if (lower === 'react' || lower === 'ai' || lower === 'fastapi' || lower === 'typescript' || lower === 'javascript') {
      hasBatchim = false;
    }
  }

  if (josaType === '과/와') {
    return hasBatchim ? `${trimmed}과` : `${trimmed}와`;
  }
  if (josaType === '을/를') {
    return hasBatchim ? `${trimmed}을` : `${trimmed}를`;
  }

  return trimmed;
}
