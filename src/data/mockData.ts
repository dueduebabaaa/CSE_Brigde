/**
 * BRIDGE — 테스트 및 프로토타입용 가상 데이터셋
 * 
 * [주의 사항]
 * 1. 본 데이터는 UI/UX 레이아웃 검증 및 알고리즘 개발을 위한 순수 가상 목업(Mockup) 데이터입니다.
 * 2. 실제 학부생의 개인정보나 비밀번호를 포함하지 않습니다.
 * 3. 실제 컴퓨터학부 공식 공지를 무단 복제하거나 사칭하지 않으며, 출처(sourceType)를 명확히 구분합니다.
 * 4. 확인되지 않은 마감일은 null로 설정되어 있습니다.
 */

import {
  UserProfile,
  Opportunity,
  Recruitment,
  Team,
  TeamMember,
  Availability,
  Meeting,
  Bookmark,
  ProjectTask,
  CrawlingLog,
} from '../types';

// =============================================================================
// 1. 가상 사용자 프로필 10명 (Mock Users)
// =============================================================================
export const mockUsers: UserProfile[] = [
  {
    id: 'user-01',
    email: 'mock_fe_lead@knu.ac.kr',
    name: '김컴학',
    nickname: '코드장인',
    grade: '3학년',
    track: '플랫폼소프트웨어',
    bio: '사용자 경험과 인터랙션을 중시하는 프론트엔드 개발 지망생입니다.',
    interests: ['웹 플랫폼', '오픈소스', '디자인 시스템', 'UI/UX'],
    techStacks: ['React', 'TypeScript', 'TailwindCSS', 'Next.js', 'Git'],
    wantedTechStacks: ['Supabase', 'Node.js', 'Docker'],
    desiredRoles: ['Frontend Developer', 'UI/UX Lead'],
    experiences: ['2025 교내 해커톤 우수상', '소프트웨어 봉사단 웹사이트 제작'],
    githubUrl: 'https://github.com/example-kim-knu',
    portfolioUrl: 'https://portfolio.example.com/kim',
    isPublic: true,
    createdAt: '2026-09-01T09:00:00+09:00',
    updatedAt: '2026-11-10T14:20:00+09:00',
  },
  {
    id: 'user-02',
    email: 'mock_ai_research@knu.ac.kr',
    name: '이알고',
    nickname: '알고리즘봇',
    grade: '4학년',
    track: '인공지능컴퓨팅',
    bio: '자연어 처리 및 추천 모델 엔지니어링에 관심이 많습니다. 백준 플래티넘.',
    interests: ['머신러닝', 'LLM Agent', '추천 시스템', '자연어 처리'],
    techStacks: ['Python', 'PyTorch', 'FastAPI', 'HuggingFace', 'Pandas'],
    wantedTechStacks: ['MLOps', 'Kubernetes', 'TypeScript'],
    desiredRoles: ['ML Engineer', 'Data Scientist'],
    experiences: ['2025 AI 챌린지 본선 진출', '학부 인공지능 연구실 학부연구생'],
    githubUrl: 'https://github.com/example-lee-ai',
    portfolioUrl: null,
    isPublic: true,
    createdAt: '2026-09-02T10:30:00+09:00',
    updatedAt: '2026-11-12T11:00:00+09:00',
  },
  {
    id: 'user-03',
    email: 'mock_backend_pro@knu.ac.kr',
    name: '박데이터',
    nickname: '쿼리마스터',
    grade: '2학년',
    track: '데이터사이언스',
    bio: '안정적인 분산 데이터베이스 설계와 고성능 API 서버 구축을 좋아합니다.',
    interests: ['백엔드 아키텍처', '빅데이터 처리', '클라우드 인프라'],
    techStacks: ['Java', 'Spring Boot', 'PostgreSQL', 'Redis', 'Docker'],
    wantedTechStacks: ['Kafka', 'AWS', 'Go'],
    desiredRoles: ['Backend Developer', 'DBA'],
    experiences: ['학부 동아리 백엔드 팀장', '데이터베이스 튜닝 프로젝트'],
    githubUrl: 'https://github.com/example-park-data',
    portfolioUrl: 'https://portfolio.example.com/park',
    isPublic: true,
    createdAt: '2026-09-05T13:15:00+09:00',
    updatedAt: '2026-11-14T18:00:00+09:00',
  },
  {
    id: 'user-04',
    email: 'mock_global_sw@knu.ac.kr',
    name: '최글로벌',
    nickname: '스마트앱',
    grade: '3학년',
    track: '글로벌소프트웨어융합',
    bio: '크로스 플랫폼 앱 개발과 글로벌 서비스 기획을 지향합니다.',
    interests: ['모바일 앱', 'Flutter', '해외 해커톤', '제품 기획'],
    techStacks: ['Flutter', 'Dart', 'Firebase', 'React Native', 'Figma'],
    wantedTechStacks: ['Swift', 'Kotlin', 'GraphQL'],
    desiredRoles: ['Mobile App Developer', 'Product Manager'],
    experiences: ['글로벌 IT 연수 프로그램 수료', '교내 생활 편의 앱 배포'],
    githubUrl: 'https://github.com/example-choi-app',
    portfolioUrl: null,
    isPublic: true,
    createdAt: '2026-09-10T16:40:00+09:00',
    updatedAt: '2026-11-08T09:30:00+09:00',
  },
  {
    id: 'user-05',
    email: 'mock_sys_eng@knu.ac.kr',
    name: '정시스템',
    nickname: '커널해커',
    grade: '4학년',
    track: '심화컴퓨터공학',
    bio: '시스템 프로그래밍, 임베디드 및 클라우드 인프라(DevOps)를 공부하고 있습니다.',
    interests: ['DevOps', 'CI/CD', 'Linux 커널', '클라우드 컴퓨팅'],
    techStacks: ['C', 'C++', 'Linux', 'GitHub Actions', 'Terraform'],
    wantedTechStacks: ['Kubernetes', 'Rust', 'Grafana'],
    desiredRoles: ['DevOps Engineer', 'System Programmer'],
    experiences: ['오픈소스 리눅스 드라이버 기여', '동아리 서버 인프라 관리자'],
    githubUrl: 'https://github.com/example-jung-sys',
    portfolioUrl: null,
    isPublic: true,
    createdAt: '2026-09-12T11:20:00+09:00',
    updatedAt: '2026-10-30T17:10:00+09:00',
  },
  {
    id: 'user-06',
    email: 'mock_fresh_coder@knu.ac.kr',
    name: '강새내기',
    nickname: '열정러너',
    grade: '1학년',
    track: '플랫폼소프트웨어',
    bio: '컴퓨터학부 1학년 새내기입니다! 선배님들과 공모전에 참가해 실력을 키우고 싶습니다.',
    interests: ['웹 기초', '알고리즘 기초', '게임 개발'],
    techStacks: ['Python', 'C', 'HTML/CSS', 'JavaScript'],
    wantedTechStacks: ['React', 'TypeScript', 'Node.js'],
    desiredRoles: ['Frontend Junior', 'Research / QA'],
    experiences: ['학부 프로그래밍 기초 과제 우수작 선정'],
    githubUrl: 'https://github.com/example-kang-fresh',
    portfolioUrl: null,
    isPublic: true,
    createdAt: '2026-09-15T15:00:00+09:00',
    updatedAt: '2026-11-01T10:00:00+09:00',
  },
  {
    id: 'user-07',
    email: 'mock_sec_analyst@knu.ac.kr',
    name: '윤보안',
    nickname: '화이트햇',
    grade: '3학년',
    track: '심화컴퓨터공학',
    bio: '웹 취약점 분석, 시큐어 코딩 및 클라우드 보안에 관심이 있습니다.',
    interests: ['정보보안', '웹 모의해킹', '암호학', '보안 인증'],
    techStacks: ['Python', 'Burp Suite', 'Linux', 'Wireshark', 'Go'],
    wantedTechStacks: ['DevSecOps', 'Smart Contract', 'Reverse Engineering'],
    desiredRoles: ['Security Engineer', 'Backend Developer'],
    experiences: ['대학생 정보보호 올림피아드 참가', 'K-Hackathon 보안 점검 지원'],
    githubUrl: 'https://github.com/example-yoon-sec',
    portfolioUrl: null,
    isPublic: true,
    createdAt: '2026-09-18T14:50:00+09:00',
    updatedAt: '2026-11-05T13:40:00+09:00',
  },
  {
    id: 'user-08',
    email: 'mock_design_ux@knu.ac.kr',
    name: '한디자인',
    nickname: '픽셀마스터',
    grade: '2학년',
    track: '글로벌소프트웨어융합',
    bio: '개발과 디자인의 가교 역할을 하는 UX 엔지니어입니다. Figma 컴포넌트 시스템 전문.',
    interests: ['UI/UX 디자인', '디자인 토큰', '인터랙션 디자인', '사용성 테스트'],
    techStacks: ['Figma', 'React', 'HTML/CSS', 'TailwindCSS', 'Adobe XD'],
    wantedTechStacks: ['TypeScript', 'Three.js', 'Framer Motion'],
    desiredRoles: ['UI/UX Designer', 'Frontend Developer'],
    experiences: ['교내 동아리 브랜드 리뉴얼', '앱 디자인 외주 프로젝트 2건'],
    githubUrl: 'https://github.com/example-han-design',
    portfolioUrl: 'https://portfolio.example.com/han',
    isPublic: true,
    createdAt: '2026-09-20T17:30:00+09:00',
    updatedAt: '2026-11-13T16:20:00+09:00',
  },
  {
    id: 'user-09',
    email: 'mock_cloud_fullstack@knu.ac.kr',
    name: '신풀스택',
    nickname: '만능빌더',
    grade: '4학년',
    track: '플랫폼소프트웨어',
    bio: '풀스택 프로토타이핑부터 Vercel/Supabase 배포까지 빠른 제품 런칭을 즐깁니다.',
    interests: ['FullStack', 'SaaS 개발', '린 스타트업', '서버리스'],
    techStacks: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Supabase', 'PostgreSQL'],
    wantedTechStacks: ['GraphQL', 'Rust', 'AI SDK'],
    desiredRoles: ['FullStack Developer', 'Tech Lead'],
    experiences: ['스타트업 인턴 6개월', '대학생 창업 경진대회 장려상'],
    githubUrl: 'https://github.com/example-shin-fullstack',
    portfolioUrl: 'https://portfolio.example.com/shin',
    isPublic: true,
    createdAt: '2026-09-22T19:00:00+09:00',
    updatedAt: '2026-11-14T20:10:00+09:00',
  },
  {
    id: 'user-10',
    email: 'mock_private_user@knu.ac.kr',
    name: '조은둔',
    nickname: '비공개학생',
    grade: '3학년',
    track: '데이터사이언스',
    bio: '현재는 개인 프로젝트에 집중하고 있어 프로필 공개를 비활성화한 상태입니다.',
    interests: ['데이터 분석', '시계열 데이터'],
    techStacks: ['Python', 'SQL', 'R'],
    wantedTechStacks: ['BigQuery', 'Tableau'],
    desiredRoles: ['Data Analyst'],
    experiences: [],
    githubUrl: null,
    portfolioUrl: null,
    isPublic: false, // 프로필 비공개 사용자 (검색 시 노출 제외 대상)
    createdAt: '2026-09-25T11:00:00+09:00',
    updatedAt: '2026-10-15T09:00:00+09:00',
  },
];

// =============================================================================
// 2. 가상 공모전 및 대외활동 10개 (Mock Opportunities)
// =============================================================================
export const mockOpportunities: Opportunity[] = [
  // [공식 학부 수집 예시 - knu_cse_official] 4개
  {
    id: 'opp-official-01',
    title: '[가상 예시 / 프로토타입] 2026 KNU 컴퓨터학부 SW 해커톤 챌린지',
    description: '경북대학교 컴퓨터학부 재학생을 대상으로 창의적인 실생활 문제 해결 소프트웨어를 개발하는 무박 2일 해커톤입니다.',
    category: '해커톤',
    tags: ['KNU', '해커톤', 'React', 'Node.js', '팀빌딩'],
    organizer: '경북대학교 컴퓨터학부',
    postedAt: '2026-11-01T10:00:00+09:00',
    applicationStart: '2026-11-05T09:00:00+09:00',
    deadline: '2026-11-30T18:00:00+09:00',
    sourceType: 'knu_cse_official',
    sourcePostId: 'cse-notice-8910',
    sourceUrl: 'https://computer.knu.ac.kr/bbs/board.php?bo_table=sub5_1&wr_id=8910',
    applicationUrl: 'https://forms.knu.ac.kr/sw-hackathon-2026',
    collectedAt: '2026-11-01T12:00:00+09:00',
    updatedAt: '2026-11-01T12:00:00+09:00',
    status: 'active',
  },
  {
    id: 'opp-official-02',
    title: '[가상 예시 / 프로토타입] 2026 경북대 오픈소스 SW 산학협력 프로젝트 공모',
    description: '지역 IT 기업과 연계하여 실무 오픈소스 소프트웨어 과제를 해결하고 멘토링을 받는 산학협력 프로그램입니다.',
    category: '공모전',
    tags: ['오픈소스', '산학협력', 'GitHub', '실무멘토링'],
    organizer: '경북대학교 소프트웨어교육원',
    postedAt: '2026-11-03T14:30:00+09:00',
    applicationStart: '2026-11-03T14:30:00+09:00',
    deadline: '2026-12-15T23:59:00+09:00',
    sourceType: 'knu_cse_official',
    sourcePostId: 'cse-notice-8915',
    sourceUrl: 'https://computer.knu.ac.kr/bbs/board.php?bo_table=sub5_1&wr_id=8915',
    applicationUrl: 'https://sw.knu.ac.kr/apply/opensource-2026',
    collectedAt: '2026-11-03T16:00:00+09:00',
    updatedAt: '2026-11-03T16:00:00+09:00',
    status: 'active',
  },
  {
    id: 'opp-official-03',
    title: '[가상 예시 / 프로토타입] 2026 KNU 컴퓨터학부 캡스톤 디자인 페스티벌',
    description: '컴퓨터학부 졸업 과제 및 심화 캡스톤 프로젝트 성과물을 발표하고 외부 기업 심사를 받는 학부 공식 행사입니다.',
    category: '경진대회',
    tags: ['캡스톤', '졸업작품', '전시회', '성과발표'],
    organizer: '경북대학교 컴퓨터학부',
    postedAt: '2026-11-08T09:00:00+09:00',
    applicationStart: '2026-11-10T09:00:00+09:00',
    deadline: '2026-12-20T18:00:00+09:00',
    sourceType: 'knu_cse_official',
    sourcePostId: 'cse-notice-8922',
    sourceUrl: 'https://computer.knu.ac.kr/bbs/board.php?bo_table=sub5_1&wr_id=8922',
    applicationUrl: null,
    collectedAt: '2026-11-08T11:00:00+09:00',
    updatedAt: '2026-11-08T11:00:00+09:00',
    status: 'active',
  },
  {
    id: 'opp-official-04',
    title: '[가상 예시 / 프로토타입] 겨울방학 첨단 AI/클라우드 집중 교육 부트캠프',
    description: '방학 기간 동안 AWS 클라우드 및 생성형 AI 모델 파인튜닝을 실습하는 학부 무료 지원 교육 과정입니다.',
    category: '교육/특강',
    tags: ['AWS', '생성형AI', '부트캠프', '방학특강'],
    organizer: '경북대학교 IT대학',
    postedAt: '2026-11-12T11:00:00+09:00',
    applicationStart: null, // 일정 확인 필요 (null 처리 조건)
    deadline: null,         // 확인되지 않은 날짜 null 처리
    sourceType: 'knu_cse_official',
    sourcePostId: 'cse-notice-8930',
    sourceUrl: 'https://computer.knu.ac.kr/bbs/board.php?bo_table=sub5_1&wr_id=8930',
    applicationUrl: null,
    collectedAt: '2026-11-12T13:00:00+09:00',
    updatedAt: '2026-11-12T13:00:00+09:00',
    status: 'needs_confirmation',
  },

  // [관리자 직접 등록 예시 - admin_manual] 3개
  {
    id: 'opp-admin-01',
    title: '[가상 예시 / 프로토타입] 제14회 대한민국 SW융합 해커톤 대회',
    description: '과학기술정보통신부가 주최하는 전국 대학생 연합 SW 융합 해커톤입니다. 우수작 대상 상금 및 장관상 수여.',
    category: '해커톤',
    tags: ['전국대회', '과기정통부', 'SW융합', '상금'],
    organizer: '정보통신산업진흥원 (NIPA)',
    postedAt: '2026-10-20T09:00:00+09:00',
    applicationStart: '2026-10-25T09:00:00+09:00',
    deadline: '2026-11-25T18:00:00+09:00',
    sourceType: 'admin_manual',
    sourcePostId: null,
    sourceUrl: null,
    applicationUrl: 'https://sw-hackathon.kr',
    collectedAt: '2026-10-20T10:00:00+09:00',
    updatedAt: '2026-10-20T10:00:00+09:00',
    status: 'active',
  },
  {
    id: 'opp-admin-02',
    title: '[가상 예시 / 프로토타입] 대구·경북 공공데이터 활용 창업경진대회',
    description: '대구광역시 및 경상북도 공공데이터 포털의 API를 연계하여 사회적 문제를 해결하는 앱/웹 프로덕트 경진대회입니다.',
    category: '경진대회',
    tags: ['공공데이터', '지역창업', 'API', '대구경북'],
    organizer: '대구디지털혁신진흥원 (DIP)',
    postedAt: '2026-10-25T14:00:00+09:00',
    applicationStart: '2026-11-01T09:00:00+09:00',
    deadline: '2026-12-05T17:00:00+09:00',
    sourceType: 'admin_manual',
    sourcePostId: null,
    sourceUrl: null,
    applicationUrl: 'https://dip.or.kr/contest/data-2026',
    collectedAt: '2026-10-25T15:00:00+09:00',
    updatedAt: '2026-10-25T15:00:00+09:00',
    status: 'active',
  },
  {
    id: 'opp-admin-03',
    title: '[가상 예시 / 프로토타입] 2026 글로벌 대학생 AI 에이전트 챌린지',
    description: '대규모 언어 모델(LLM) 기반 자율 에이전트 워크플로를 구현하고 벤치마크 평가를 거치는 글로벌 챌린지입니다.',
    category: '공모전',
    tags: ['AI Agent', 'LLM', 'Python', '글로벌'],
    organizer: '한국인공지능학회',
    postedAt: '2026-11-05T13:00:00+09:00',
    applicationStart: '2026-11-05T13:00:00+09:00',
    deadline: null, // 마감 일정 미정
    sourceType: 'admin_manual',
    sourcePostId: null,
    sourceUrl: null,
    applicationUrl: 'https://ai-challenge.org',
    collectedAt: '2026-11-05T13:30:00+09:00',
    updatedAt: '2026-11-05T13:30:00+09:00',
    status: 'needs_confirmation',
  },

  // [사용자 직접 등록 예시 - user_manual] 3개
  {
    id: 'opp-user-01',
    title: '[가상 예시 / 프로토타입] 2026 소셜 임팩트 청년 IT 개발자 공모전',
    description: '장애인 및 취약계층의 디지털 접근성을 개선하는 기술 솔루션을 모집하는 민간 청년 공모전입니다.',
    category: '대외활동',
    tags: ['소셜임팩트', '접근성', '웹표준', '비영리'],
    organizer: '사단법인 청년소프트웨어포럼',
    postedAt: '2026-10-15T16:00:00+09:00',
    applicationStart: '2026-10-15T16:00:00+09:00',
    deadline: '2026-11-20T23:59:00+09:00',
    sourceType: 'user_manual',
    sourcePostId: null,
    sourceUrl: null,
    applicationUrl: 'https://youth-impact.org/contest',
    collectedAt: '2026-10-15T16:20:00+09:00',
    updatedAt: '2026-10-15T16:20:00+09:00',
    status: 'active',
  },
  {
    id: 'opp-user-02',
    title: '[가상 예시 / 프로토타입] 2026 대학생 금융 핀테크 알고리즘 아이디어톤',
    description: '금융 빅데이터 및 대안신용평가 알고리즘 모델링을 주제로 진행되는 주말 온라인 아이디어톤입니다.',
    category: '경진대회',
    tags: ['핀테크', '금융데이터', '알고리즘', '아이디어톤'],
    organizer: '핀테크혁신연합',
    postedAt: '2026-10-18T10:00:00+09:00',
    applicationStart: '2026-10-20T09:00:00+09:00',
    deadline: '2026-11-18T18:00:00+09:00',
    sourceType: 'user_manual',
    sourcePostId: null,
    sourceUrl: null,
    applicationUrl: 'https://fintech-challenge.kr',
    collectedAt: '2026-10-18T10:30:00+09:00',
    updatedAt: '2026-10-18T10:30:00+09:00',
    status: 'active',
  },
  {
    id: 'opp-user-03',
    title: '[가상 예시 / 프로토타입] 대학생 개발자 클라우드 서포터즈 5기',
    description: '클라우드 아키텍처 기술 블로그 작성 및 스터디 프로젝트를 진행하는 6개월 대외활동 서포터즈 프로그램입니다.',
    category: '서포터즈',
    tags: ['서포터즈', '기술블로그', '클라우드', '대외활동'],
    organizer: '클라우드개발자협회',
    postedAt: '2026-11-02T15:00:00+09:00',
    applicationStart: '2026-11-02T15:00:00+09:00',
    deadline: '2026-11-28T23:59:00+09:00',
    sourceType: 'user_manual',
    sourcePostId: null,
    sourceUrl: null,
    applicationUrl: 'https://cloud-supporters.com',
    collectedAt: '2026-11-02T15:10:00+09:00',
    updatedAt: '2026-11-02T15:10:00+09:00',
    status: 'active',
  },
];

// =============================================================================
// 3. 가상 팀원 모집 게시글 5개 (Mock Recruitments)
// =============================================================================
export const mockRecruitments: Recruitment[] = [
  // 공고 1(학부 해커톤) 연계 모집글
  {
    id: 'rec-01',
    opportunityId: 'opp-official-01',
    customOpportunityTitle: null,
    customOpportunityUrl: null,
    title: '[컴학 해커톤] React 프론트 1명, Node/PostgreSQL 백엔드 1명 모십니다!',
    content:
      '안녕하세요! 학부 해커톤 출전을 위해 팀을 꾸리고 있습니다. 현재 프론트 1명(본인), 기획 1명이 있으며 완주를 목표로 성실하게 임해주실 동료를 환영합니다.',
    targetMemberCount: 4,
    currentMemberCount: 2,
    roles: ['Frontend Developer', 'Backend Developer'],
    requiredTechStacks: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    deadline: '2026-11-20T23:59:00+09:00',
    expectedDuration: '무박 2일 해커톤 대비 2주 준비',
    activityType: 'hybrid',
    status: 'recruiting',
    authorId: 'user-01', // 김컴학
    createdAt: '2026-11-05T14:00:00+09:00',
    updatedAt: '2026-11-05T14:00:00+09:00',
  },
  // 공고 2(산학협력 오픈소스) 연계 모집글
  {
    id: 'rec-02',
    opportunityId: 'opp-official-02',
    customOpportunityTitle: null,
    customOpportunityUrl: null,
    title: '[오픈소스 산학협력] Spring Boot 백엔드 및 Docker 인프라 팀원 구합니다',
    content:
      '산학협력 프로젝트에서 지역 IT 기업 실무진과 협업할 팀원을 모집합니다. 백엔드 아키텍처에 관심 있는 학우분들의 많은 지원 바랍니다.',
    targetMemberCount: 4,
    currentMemberCount: 3,
    roles: ['Backend Developer', 'DevOps / Infra'],
    requiredTechStacks: ['Java', 'Spring Boot', 'Docker', 'AWS'],
    deadline: '2026-11-25T18:00:00+09:00',
    expectedDuration: '약 3개월',
    activityType: 'hybrid',
    status: 'recruiting',
    authorId: 'user-03', // 박데이터
    createdAt: '2026-11-06T11:00:00+09:00',
    updatedAt: '2026-11-06T11:00:00+09:00',
  },
  // 공고 5(전국 SW융합 해커톤) 연계 모집글
  {
    id: 'rec-03',
    opportunityId: 'opp-admin-01',
    customOpportunityTitle: null,
    customOpportunityUrl: null,
    title: '[전국 SW융합 해커톤] PyTorch 기반 머신러닝 & 데이터 시각화 팀원 모집',
    content:
      '전국 SW 융합 해커톤 본선 수상을 목표로 AI 기반 솔루션을 기획 중입니다. 머신러닝 파이프라인과 프론트엔드 시각화를 함께할 팀원을 찾습니다.',
    targetMemberCount: 4,
    currentMemberCount: 2,
    roles: ['ML Engineer', 'Frontend Developer'],
    requiredTechStacks: ['Python', 'PyTorch', 'React', 'FastAPI'],
    deadline: '2026-11-18T18:00:00+09:00',
    expectedDuration: '약 1개월',
    activityType: 'online',
    status: 'recruiting',
    authorId: 'user-02', // 이알고
    createdAt: '2026-11-07T16:30:00+09:00',
    updatedAt: '2026-11-07T16:30:00+09:00',
  },
  // 공고 미등록 자율 입력 모집글 1
  {
    id: 'rec-04',
    opportunityId: null,
    customOpportunityTitle: '2026 대학생 모바일 앱 아이디어 공모전 (자율 입력)',
    customOpportunityUrl: 'https://example-app-contest.com',
    title: '[자율 공모전] Flutter 기반 캠퍼스 생활 개선 앱 제작 팀원 모집',
    content:
      '수집되지 않은 외부 모바일 공모전입니다. Flutter와 Figma 디자인이 가능한 학우분과 함께 출시까지 이어가고 싶습니다.',
    targetMemberCount: 3,
    currentMemberCount: 2,
    roles: ['UI/UX Designer', 'Mobile Developer'],
    requiredTechStacks: ['Flutter', 'Figma', 'Firebase'],
    deadline: '2026-11-22T23:59:00+09:00',
    expectedDuration: '방학 포함 2개월',
    activityType: 'hybrid',
    status: 'recruiting',
    authorId: 'user-04', // 최글로벌
    createdAt: '2026-11-09T13:20:00+09:00',
    updatedAt: '2026-11-09T13:20:00+09:00',
  },
  // 공고 미등록 자율 입력 모집글 2 (모집 완료 예시)
  {
    id: 'rec-05',
    opportunityId: null,
    customOpportunityTitle: '웹 보안 취약점 분석 및 시큐어 코딩 스터디 프로젝트',
    customOpportunityUrl: null,
    title: '[스터디/프로젝트] 모의해킹 및 보안 점검 도구 제작 팀 (모집 완료)',
    content:
      '웹 취약점 분석 도구를 자체 개발하고 테스트하는 스터디 겸 프로젝트입니다. 인원 충원이 완료되어 조기 마감합니다.',
    targetMemberCount: 3,
    currentMemberCount: 3,
    roles: ['Security Analyst', 'Backend Developer'],
    requiredTechStacks: ['Python', 'Go', 'Linux'],
    deadline: '2026-11-10T18:00:00+09:00',
    expectedDuration: '1학기',
    activityType: 'offline',
    status: 'completed',
    authorId: 'user-07', // 윤보안
    createdAt: '2026-11-02T10:00:00+09:00',
    updatedAt: '2026-11-10T18:00:00+09:00',
  },
];

// =============================================================================
// 4. 가상 팀 구성 예시 3개 (Mock Teams & Team Members)
// =============================================================================
export const mockTeams: Team[] = [
  {
    id: 'team-01',
    recruitmentId: 'rec-01',
    opportunityId: 'opp-official-01',
    name: 'BRIDGE 개발팀 (KNU 해커톤)',
    description: '경북대 컴퓨터학부 학생을 위한 맞춤형 팀 빌딩 플랫폼 BRIDGE 프로젝트 팀입니다.',
    leaderId: 'user-01', // 김컴학
    githubRepoUrl: 'https://github.com/example-knu/bridge-project',
    figmaUrl: 'https://figma.com/file/example-bridge-design',
    status: 'active',
    createdAt: '2026-11-06T10:00:00+09:00',
    updatedAt: '2026-11-14T15:00:00+09:00',
  },
  {
    id: 'team-02',
    recruitmentId: 'rec-03',
    opportunityId: 'opp-admin-01',
    name: '알고파인더스 (AI 해커톤)',
    description: '소프트웨어 융합 해커톤에서 자연어 기반 검색 및 요약 솔루션을 개발하는 팀입니다.',
    leaderId: 'user-02', // 이알고
    githubRepoUrl: 'https://github.com/example-knu/algo-finders',
    figmaUrl: null,
    status: 'active',
    createdAt: '2026-11-08T18:00:00+09:00',
    updatedAt: '2026-11-13T11:20:00+09:00',
  },
  {
    id: 'team-03',
    recruitmentId: 'rec-05',
    opportunityId: null,
    name: '화이트쉴드 (시큐어 프로젝트)',
    description: '학부 보안 연구 및 웹 모의해킹 자동화 스크립트 개발 팀입니다.',
    leaderId: 'user-07', // 윤보안
    githubRepoUrl: 'https://github.com/example-knu/white-shield-sec',
    figmaUrl: null,
    status: 'completed',
    createdAt: '2026-10-25T14:00:00+09:00',
    updatedAt: '2026-11-10T18:00:00+09:00',
  },
];

export const mockTeamMembers: TeamMember[] = [
  // 팀 1 멤버들 (4명)
  {
    id: 'tm-01',
    teamId: 'team-01',
    userId: 'user-01', // 김컴학
    role: '팀장 / Frontend Lead',
    joinedAt: '2026-11-06T10:00:00+09:00',
  },
  {
    id: 'tm-02',
    teamId: 'team-01',
    userId: 'user-03', // 박데이터
    role: 'Backend & Database',
    joinedAt: '2026-11-07T11:30:00+09:00',
  },
  {
    id: 'tm-03',
    teamId: 'team-01',
    userId: 'user-08', // 한디자인
    role: 'UI/UX Designer',
    joinedAt: '2026-11-08T14:00:00+09:00',
  },
  {
    id: 'tm-04',
    teamId: 'team-01',
    userId: 'user-09', // 신풀스택
    role: 'FullStack / DevOps',
    joinedAt: '2026-11-09T16:00:00+09:00',
  },

  // 팀 2 멤버들 (2명)
  {
    id: 'tm-05',
    teamId: 'team-02',
    userId: 'user-02', // 이알고
    role: '팀장 / ML Lead',
    joinedAt: '2026-11-08T18:00:00+09:00',
  },
  {
    id: 'tm-06',
    teamId: 'team-02',
    userId: 'user-06', // 강새내기
    role: 'Data Collector & QA',
    joinedAt: '2026-11-10T09:30:00+09:00',
  },

  // 팀 3 멤버들 (2명)
  {
    id: 'tm-07',
    teamId: 'team-03',
    userId: 'user-07', // 윤보안
    role: '팀장 / Security Lead',
    joinedAt: '2026-10-25T14:00:00+09:00',
  },
  {
    id: 'tm-08',
    teamId: 'team-03',
    userId: 'user-05', // 정시스템
    role: 'System / Linux Engineer',
    joinedAt: '2026-10-26T10:00:00+09:00',
  },
];

// =============================================================================
// 5. 사용자별 활동 가능 시간표 (Mock Availability - Asia/Seoul 기준 30분 슬롯)
// =============================================================================
// 슬롯 번호 안내 (0 ~ 47):
// 18 = 09:00, 20 = 10:00, 26 = 13:00, 36 = 18:00, 38 = 19:00, 42 = 21:00
// 화요일 저녁(38~41, 19:00~21:00)에 팀 1 멤버 전원이 가능한 공통 슬롯을 형성하도록 설계.
export const mockAvailabilities: Availability[] = [
  // user-01 (김컴학): 화요일 18:00 ~ 22:00, 토요일 13:00 ~ 18:00 가능
  { id: 'av-01-01', userId: 'user-01', dayOfWeek: 2, slot: 36, isAvailable: true, updatedAt: '2026-11-10T10:00:00+09:00' },
  { id: 'av-01-02', userId: 'user-01', dayOfWeek: 2, slot: 37, isAvailable: true, updatedAt: '2026-11-10T10:00:00+09:00' },
  { id: 'av-01-03', userId: 'user-01', dayOfWeek: 2, slot: 38, isAvailable: true, updatedAt: '2026-11-10T10:00:00+09:00' },
  { id: 'av-01-04', userId: 'user-01', dayOfWeek: 2, slot: 39, isAvailable: true, updatedAt: '2026-11-10T10:00:00+09:00' },
  { id: 'av-01-05', userId: 'user-01', dayOfWeek: 2, slot: 40, isAvailable: true, updatedAt: '2026-11-10T10:00:00+09:00' },
  { id: 'av-01-06', userId: 'user-01', dayOfWeek: 2, slot: 41, isAvailable: true, updatedAt: '2026-11-10T10:00:00+09:00' },

  // user-03 (박데이터): 화요일 19:00 ~ 23:00 가능 (38 ~ 45)
  { id: 'av-03-01', userId: 'user-03', dayOfWeek: 2, slot: 38, isAvailable: true, updatedAt: '2026-11-11T12:00:00+09:00' },
  { id: 'av-03-02', userId: 'user-03', dayOfWeek: 2, slot: 39, isAvailable: true, updatedAt: '2026-11-11T12:00:00+09:00' },
  { id: 'av-03-03', userId: 'user-03', dayOfWeek: 2, slot: 40, isAvailable: true, updatedAt: '2026-11-11T12:00:00+09:00' },
  { id: 'av-03-04', userId: 'user-03', dayOfWeek: 2, slot: 41, isAvailable: true, updatedAt: '2026-11-11T12:00:00+09:00' },

  // user-08 (한디자인): 화요일 19:00 ~ 21:00 가능 (38 ~ 41)
  { id: 'av-08-01', userId: 'user-08', dayOfWeek: 2, slot: 38, isAvailable: true, updatedAt: '2026-11-12T15:00:00+09:00' },
  { id: 'av-08-02', userId: 'user-08', dayOfWeek: 2, slot: 39, isAvailable: true, updatedAt: '2026-11-12T15:00:00+09:00' },
  { id: 'av-08-03', userId: 'user-08', dayOfWeek: 2, slot: 40, isAvailable: true, updatedAt: '2026-11-12T15:00:00+09:00' },
  { id: 'av-08-04', userId: 'user-08', dayOfWeek: 2, slot: 41, isAvailable: true, updatedAt: '2026-11-12T15:00:00+09:00' },

  // user-09 (신풀스택): 화요일 18:30 ~ 21:30 가능 (37 ~ 42)
  { id: 'av-09-01', userId: 'user-09', dayOfWeek: 2, slot: 38, isAvailable: true, updatedAt: '2026-11-13T09:00:00+09:00' },
  { id: 'av-09-02', userId: 'user-09', dayOfWeek: 2, slot: 39, isAvailable: true, updatedAt: '2026-11-13T09:00:00+09:00' },
  { id: 'av-09-03', userId: 'user-09', dayOfWeek: 2, slot: 40, isAvailable: true, updatedAt: '2026-11-13T09:00:00+09:00' },
  { id: 'av-09-04', userId: 'user-09', dayOfWeek: 2, slot: 41, isAvailable: true, updatedAt: '2026-11-13T09:00:00+09:00' },
];

// =============================================================================
// 6. 가상 회의 일정, 북마크, 체크리스트, 크롤링 로그
// =============================================================================
export const mockMeetings: Meeting[] = [
  {
    id: 'meet-01',
    teamId: 'team-01',
    title: 'BRIDGE 프로젝트 1차 정기 기획 회의',
    scheduledAt: '2026-11-18T19:00:00+09:00', // 화요일 19:00 (전원 공통 슬롯)
    durationMinutes: 120,
    location: 'IT대학 융복합관 301호 및 Google Meet',
    isOnline: true,
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    notes: '컴포넌트 설계 및 Supabase 테이블 스키마 확정',
    createdAt: '2026-11-14T10:00:00+09:00',
  },
];

export const mockBookmarks: Bookmark[] = [
  {
    id: 'bm-01',
    userId: 'user-01',
    opportunityId: 'opp-official-01',
    createdAt: '2026-11-05T09:30:00+09:00',
  },
  {
    id: 'bm-02',
    userId: 'user-01',
    opportunityId: 'opp-admin-01',
    createdAt: '2026-11-06T15:00:00+09:00',
  },
];

export const mockProjectTasks: ProjectTask[] = [
  {
    id: 'task-01',
    teamId: 'team-01',
    title: '해커톤 참가 신청서 제출 및 팀 등록 완료',
    isCompleted: true,
    assignedTo: 'user-01',
    dueDate: '2026-11-15T18:00:00+09:00',
    createdAt: '2026-11-06T11:00:00+09:00',
  },
  {
    id: 'task-02',
    teamId: 'team-01',
    title: 'React + Vite 초기 프론트엔드 라우팅 및 레이아웃 구성',
    isCompleted: true,
    assignedTo: 'user-01',
    dueDate: '2026-11-16T18:00:00+09:00',
    createdAt: '2026-11-06T11:00:00+09:00',
  },
  {
    id: 'task-03',
    teamId: 'team-01',
    title: 'PostgreSQL DDL 및 Supabase RLS 정책 초안 수립',
    isCompleted: false,
    assignedTo: 'user-03',
    dueDate: '2026-11-20T18:00:00+09:00',
    createdAt: '2026-11-07T14:00:00+09:00',
  },
];

export const mockCrawlingLogs: CrawlingLog[] = [
  {
    id: 'log-01',
    executedAt: '2026-11-15T00:00:15+09:00',
    status: 'success',
    newItemsCount: 4,
    updatedItemsCount: 0,
    errorMessage: null,
    triggeredBy: 'github_actions',
  },
  {
    id: 'log-02',
    executedAt: '2026-11-14T15:30:00+09:00',
    status: 'success',
    newItemsCount: 0,
    updatedItemsCount: 1,
    errorMessage: null,
    triggeredBy: 'admin_manual',
  },
];
