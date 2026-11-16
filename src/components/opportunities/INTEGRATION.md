# 공고 탐색·상세 연동 지점

- `OpportunityExplorer`는 `OpportunitySource` props로 목록, `MatchResult[]`, 조회 상태, 북마크 액션을 받는다. `OpportunityDetail`은 단일 `Opportunity | null | undefined`와 관련 모집글을 받는다. `null`은 조회 완료 후 미존재, `undefined`는 미연동이다.
- 현재 라우트의 `useOpportunitySource`만 B의 `getOpportunities`, `getOpportunityById`, `getRecruitments` 호출 결과로 교체한다. `ApiResponse.error`를 `error`, 재호출을 `onRetry`에 연결하고 로딩을 명시한다. 목록 전체를 공급하는 현재 클라이언트 필터 방식이며, 서버 페이지네이션 도입 시 전체 건수·서버 필터·추천 범위에 대한 합의가 필요하다.
- C의 문서상 `OpportunityMatchResult.opportunityId`는 공통 `MatchResult.targetId`로 명시적으로 매핑한다. 점수·태그·추천 이유는 그대로 전달하고 여기서 추천 점수를 생성하지 않는다. 유효한 대상 ID와 0~100 유한 점수가 있는 결과만 추천 기능에 사용한다. 추천이 없으면 정렬·필터를 비활성화한다.
- `Opportunity`에는 관심 분야 전용 필드가 없어 현재 필터는 `tags`의 정확한 값 기준이다. 관심 분야와 기술 태그의 분리·분야 매핑은 B·C 합의가 필요하다. 카테고리는 기존 `OpportunityCategory` 6종을 사용한다.
- 표시 상태는 기존 status와 실제 접수 시작/마감 시각으로 도출한다. 모집 예정은 화면 표시값이며 공통 타입을 확장하지 않는다. 임시저장·미래 게시 공고는 노출하지 않는다. 마감 임박은 서울 날짜 기준 7일 이내이며 이미 마감된 공고는 제외한다.
- 지원 자격·활동 기간은 기존 공통 타입에 없다. 임의 생성하지 않고 미제공으로 표시한다. B와 합의된 경우에만 상세 화면 전용 `details` props로 제공한다.
- 홈의 `Tags`, `ConnectionGraphic`, 날짜·D-Day·외부 URL 검증을 재사용한다. 기존 홈 컴포넌트는 수정하지 않는다.
- 북마크는 controlled `bookmarkIds`와 비동기 `onBookmark`로 전달한다. DB 저장이 성공한 뒤 제공자가 IDs를 갱신해야 한다. 개발용은 `import.meta.env.DEV`에서만 현재 탭의 sessionStorage를 사용한다. 저장 실패 시 상태를 갱신하지 않고 오류를 표시한다. 기존 홈의 임시 북마크와는 별도이며 운영 연동 시 공통 저장 공급자로 통합해야 한다.
- 개발 데이터와 추천 예시는 DEV 조건의 동적 import로만 불러온다. 가상 외부 원본·접수 URL은 열지 않는다. 운영 기본값은 데이터 없음이며 mock을 대체 데이터로 사용하지 않는다.
- 상세 페이지의 모집글 작성 링크는 `/recruitments/new?opportunityId=<id>`다. 기존 작성 화면은 이 쿼리를 아직 소비하지 않으므로 자동 선택·저장 연결은 후속 작업이다. 이번 단계에서는 해당 화면을 수정하지 않는다. 관련 모집글은 `opportunityId`로 연결한다.
- 탐색 조건·보기 방식을 URL 쿼리로 유지하며 상세 페이지의 목록 복귀 링크로 복원한다.
