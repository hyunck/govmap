# 모바일 UI 개선 작업 노트 (네이버 지도 스타일)

> 새 세션에서 이어서 작업할 때 참고할 문서입니다.
> 대상 파일: `index.html` (단일 파일, ~3900줄, `<style>`/`<script>` 임베드)
> 모바일 분기 기준: `@media (max-width: 768px)` / JS의 `isMobile()` (`window.matchMedia('(max-width: 768px)').matches`)

## 최근 커밋 이력 (최신 → 과거)

1. `bc64900` 데스크탑 설명창 닫기(축소) 버튼이 사라지는 버그 수정
2. `ddfecc9` 모바일 설명창 사진 영역을 컬러 띠 형태로 축소
3. `a454b39` 모바일 설명창 드래그·버튼 스타일 개선, 크롬 스타일 검색 자동완성 추가
4. `4b06a51` 모바일 검색 결과 노출, 실기기 여백, 지사 클릭 시 패널 크기 개선
5. `de3924b` 모바일 UI를 네이버 지도 스타일로 개선 (필터 통합 스크롤, 상단 검색바, 상세패널 바텀시트)

---

## 1. 핵심 구조 / 패턴

### 바텀시트(Bottom Sheet) 패턴
- 사이드바(`#sidebar`)와 설명창(`#detailPanel`)은 모바일에서 화면 하단에서 올라오는 바텀시트로 동작
- 상태 클래스: `sheet-expanded`(전체화면) / `sheet-collapsed`(미리보기) / `sheet-hidden`(화면 밖)
- `setSheetState(panel, stateName)` — 클래스 토글 + 인라인 transform 초기화
- `initBottomSheet(panel, handle, defaultState)` — 드래그 제스처(포인터다운/무브/업), 핸들 탭 토글, 기본 상태 설정
- `getPeekPx(panel)` — 미리보기 상태에서 드러나는 높이(px). 사이드바는 고정 120px, 설명창은 `--sheet-peek-height` CSS 변수(동적 측정값)
- `updateDetailPreviewHeight()` — '기본 정보'(사진·제목·태그·버튼) 영역의 실제 높이를 `requestAnimationFrame`으로 측정해 `--sheet-peek-height`에 반영 (네이버 지도처럼 핵심 정보만 보이는 미리보기 구현)
- `--sheet-peek-height` 기본값 320px, 실측 시 `actionsBottom - panelTop + 10`

### 설명창 상태 전이
- 닫힘 → `translateY(100%)`
- 미리보기(`sheet-collapsed`) → `translateY(calc(100% - var(--sheet-peek-height)))`
- 전체화면(`sheet-expanded`) → `translateY(0); top:0; height:100dvh; border-radius:0`
- **신규** `sheet-half` → 화면 절반(`50dvh`)만 채움. 지사/본사 클릭으로 지도 이동 시 전체화면이던 패널을 이 상태로 전환 (`shrinkDetailPanelOnBranchSelect()`)
  - ⚠️ `setSheetState`는 `expanded/collapsed/hidden` 3개 클래스만 알고 있음. `sheet-half`는 프로그래밍적으로만 설정되며, 사용자가 드래그하면 onPointerUp 로직에 의해 3개 상태 중 하나로 스냅됨 (의도된 동작)

### 모바일 상단 바 (네이버 지도 스타일)
- `.mobile-topbar` — 화면 상단 고정, 검색창을 사이드바에서 분리해 배치
- `.mobile-search-slot` (`company-slot`/`gov-slot`) — 기존 `.search-box`/`.gov-search-box` DOM을 **reparent**(appendChild)하여 이벤트 리스너 보존한 채로 이동
- 디자인은 통일(테두리·그림자·radius 동일), `:focus` 시 색상만 다름 (`--primary` vs `--gov-accent`)
- `.map-legend`(범례)는 상단바 아래 좌측으로 위치 이동 + 축소

### 검색 자동완성 (크롬 주소창 스타일) — `a454b39`에서 신규 구현
- `setupMobileSearchSuggest(input, box, getMatches, onPick)` — 검색창 바로 아래 `<ul class="mobile-search-suggest">` 드롭다운
- `getMatches(query)`로 ORGS/GOVS를 이름 기준 필터링 → 최대 8개 표시
- 클릭 시 `selectOrgFromSearch(orgId)` / `selectGov(id)` 호출 → 지도 이동 + 설명창 오픈 + 드롭다운 닫힘
- **주의**: 처음엔 "검색어 입력 시 사이드바를 펼치는" 방식으로 구현했다가, 사용자가 "검색창 바로 아래에 표시"를 원한다고 명확히 해서 그 코드를 **제거하고** 드롭다운 방식으로 교체함 (커밋 `4b06a51` → `a454b39`)

---

## 2. 자주 마주친 문제 & 해결 패턴

### (1) CSS 우선순위/명시도 함정
- **베이스 규칙을 `@media` 블록 *뒤*에 두면** 미디어쿼리 매치 여부와 무관하게 베이스 규칙이 이김 (소스 순서 + 동일 명시도). → 베이스(데스크탑/숨김) 규칙은 항상 `@media` 블록 **앞**에 배치
- **JS가 인라인 `style="display:flex"` 등으로 그려넣는 요소**는 외부 CSS로 덮어쓸 수 없음 → `!important` 필요
  - 예: `.detail-image > div { display: none !important; }` (모바일에서 사진 아이콘/텍스트 숨김)
- **요소를 다른 wrapper div로 감싼 뒤 그 wrapper를 `display: none`으로 숨기면 자식까지 같이 사라짐**
  - 실제 발생한 버그: `.detail-close`를 모바일용 `.detail-sheet-toolbar` 안으로 옮겼는데, 데스크탑에서 `.detail-sheet-toolbar { display: none }`이 자식 닫기 버튼까지 숨김
  - 해결: `display: contents`로 변경 — wrapper는 박스를 생성하지 않고 자식이 마치 부모(`.detail-panel`)의 직계 자식인 것처럼 렌더링됨. 자식 자신의 위치/표시 규칙(`position: absolute`, `display: none` 등)이 그대로 적용됨

### (2) `vh` vs `dvh` (실기기 여백 문제)
- 실제 모바일 브라우저(주소창/하단 바 등)에서는 `100vh`가 실제 보이는 영역보다 큼 → 레이아웃 갭이 사라지는 문제 발생
- **해결**: `height: 80vh; height: 80dvh;` 처럼 `dvh`(동적 뷰포트 단위)를 추가 선언 — 지원 브라우저에서 자동으로 실제 보이는 영역 기준으로 계산됨 (구형 브라우저는 `vh`로 폴백)
- 적용 위치: `.sidebar, .detail-panel { height/max-height }`, `.detail-panel.open.sheet-expanded`, `.detail-panel.open.sheet-half`

### (3) 함수 호이스팅 / TDZ
- `function` 선언은 호이스팅되므로 소스 순서와 무관하게 호출 가능 (`isMobile()`, `setSheetState()` 등)
- 단, `const`/`let` 선언은 TDZ(Temporal Dead Zone) → 선언 전에 참조하면 `ReferenceError`
  - 예: `govSearchInput`은 스크립트 후반부(~3661줄)에 `const`로 선언됨. 그보다 앞에서 참조하려면 `document.getElementById('govSearchInput')`로 직접 조회해야 함

### (4) 샌드박스 한계 (Claude Preview 환경)
- `kakao.maps.load(...)`가 `kakao is not defined`로 실패 → 최상위 스크립트 실행이 중단되어 `initBottomSheet`, 검색 리스너, 마커 클릭 핸들러 등 자동 등록 안 됨
- **검증 워크어라운드**: `preview_eval`에서 운영 코드와 동일한 로직을 수동으로 재호출해 검증
  - `initBottomSheet(document.getElementById('sidebar'), ...)`
  - 검색 리스너/자동완성 setup 함수를 그대로 복붙해 재실행
  - `applyFilters()`/지도 관련 호출은 try/catch로 감싸거나 생략 (markers, kakao.maps 객체 없음)
- 페이지 새로고침(`location.reload()`)으로 테스트 후 상태 초기화

---

## 3. 지금까지 반영된 모바일 개선 사항 요약

| # | 내용 | 커밋 |
|---|------|------|
| 1 | 공기업 탭 사이드바 스크롤을 정부기관 탭처럼 필터+리스트 통합 스크롤로 통일 | de3924b |
| 2 | 검색창을 사이드바에서 분리해 상단 고정 바(`.mobile-topbar`)로 이동, 디자인 통일 | de3924b |
| 3 | 지도 범례 위치 좌측 상단으로 이동·축소, 확대/축소 컨트롤 모바일에서 숨김 | de3924b |
| 4 | 하단 탭 재탭 시 숨겨진 시트 복원 | de3924b |
| 5 | 마커 클릭 → '기본 정보' 미리보기로 시작 → 드래그로 전체화면 확장, 확장 시에만 뒤로가기 버튼 노출(X와 동일 동작) | de3924b |
| 6 | 사진과 시트 사이 흰색 여백(toolbar) 영역 추가, 닫기/뒤로가기 버튼 배치 | de3924b |
| 7 | 비교 탭 전환 시 열려있던 설명창 닫기 + 오버레이 전체화면 처리 | de3924b |
| 8 | 검색 결과가 안 보이던 문제 (최초엔 사이드바 펼침으로 해결 → 이후 자동완성 드롭다운으로 교체) | 4b06a51 → a454b39 |
| 9 | `vh`→`dvh` 적용해 실기기 여백 유지 | 4b06a51 |
| 10 | 지사/본사 클릭 시 전체화면 패널을 절반(`sheet-half`)으로 축소 | 4b06a51 |
| 11 | 설명창을 핸들 외 패널 어디서든 드래그 가능 (상호작용 요소 제외) | a454b39 |
| 12 | 확장 시 뒤로가기/닫기 버튼의 원형 배경·테두리 제거, 크기 통일 | a454b39 |
| 13 | 검색창 바로 아래 크롬 스타일 자동완성 드롭다운 (클릭 시 즉시 선택·이동) | a454b39 |
| 14 | 설명창 사진 영역을 컬러 띠(28px)로 축소, 아이콘/텍스트 숨김 (모바일 전용) | ddfecc9 |
| 15 | 데스크탑 설명창 닫기 버튼 복구 (`display:contents` 적용) | bc64900 |

---

## 4. 앞으로의 작업 전략 (제안)

### 작업 순서 권장
1. **사용자 피드백을 받으면 항상 스크린샷/설명을 먼저 정확히 분해**
   - "어떤 탭/상태/디바이스에서" + "기대 동작" + "현재 동작"을 명확히 구분
   - 특히 "어디에서 표시되길 원하는가"(예: 사이드바 vs 검색창 바로 아래)는 오해하기 쉬우므로 재확인 필요할 수 있음 (이번 세션에서 1차 시도가 어긋나 재작업한 사례 있음)

2. **수정 전 관련 코드 위치 파악**
   - `grep -n` 으로 관련 클래스명/함수명/주석 검색 (이 문서의 "핵심 구조" 섹션 참고)
   - CSS는 베이스 규칙과 `@media (max-width: 768px)` 블록 양쪽을 모두 확인 — 모바일 전용 수정은 반드시 미디어쿼리 안에서

3. **데스크탑 영향 여부 항상 확인**
   - 모바일 전용 변경이 의도와 달리 데스크탑에 영향을 주는 대표 패턴:
     - wrapper에 `display:none` 적용 → 자식까지 숨겨짐
     - 베이스 규칙 위치가 미디어쿼리 뒤에 있어 캐스케이드 역전
   - 수정 후 반드시 `preview_resize`로 모바일(360x740 등)과 데스크탑(1280x800) 양쪽 모두 검증

4. **검증은 운영 코드 재현 방식으로**
   - `kakao` 로드 실패로 자동 등록 안 되는 리스너/초기화 함수는 `preview_eval`에서 운영 코드 그대로 재호출
   - `location.reload()`로 매 테스트 전 상태 초기화 권장

5. **커밋은 사용자가 명시적으로 요청할 때만**
   - "커밋해줘" = 로컬 커밋, "깃허브 커밋해줘"/"푸시해줘" = `git push`까지 (이번 세션 패턴)
   - 커밋 메시지에 "왜"(배경/문제) 중심으로 1~3문장 정리

### 잠재적으로 더 살펴볼 만한 영역 (사용자가 언급하지 않았지만 후속 피드백 가능성 있는 부분)
- `sheet-half` 상태에서 사용자가 드래그를 시작하면 `expanded/collapsed/hidden` 중 하나로 스냅되는데, 자연스러운지 추가 확인 필요
- 검색 자동완성에서 결과가 매우 많을 때(예: 8개 초과) "더보기" 또는 스크롤 동작이 매끄러운지
- 정부기관 탭의 자동완성/검색 흐름이 공기업 탭과 100% 동일하게 동작하는지 (디자인은 통일했으나 일부 데이터 필드명이 다를 수 있음 — `g.category` vs `o.region` 등으로 메타 표시 방식이 다름)
- 실기기(다양한 화면 비율, 노치, 제스처 네비게이션 바 등)에서 `dvh`/`safe-area-inset-*` 관련 추가 미세조정 가능성

---

## 5. 빠른 참조 — 주요 함수/선택자 위치 (대략적인 줄 번호, 변동 가능)

- `isMobile()`, `setSheetState()`, `getPeekPx()`, `updateDetailPreviewHeight()`, `initBottomSheet()` — 2900~3080줄 부근
- `shrinkDetailPanelOnBranchSelect()` — `setSheetState` 근처에 정의
- 모바일 검색창 reparenting + 자동완성 setup — `if (isMobile()) {...}` 블록, `initBottomSheet` 호출 직후
- `.mobile-topbar`/`.mobile-search-slot`/`.mobile-search-suggest` CSS — `@media (max-width: 768px)` 블록 내, 1590~1700줄 부근
- `.detail-panel`/`.sidebar` 바텀시트 상태 CSS — `@media` 블록 내 1500~1610줄 부근
- `.detail-image`, `.detail-sheet-toolbar`, `.detail-back`, `.detail-close` — 베이스 스타일 470~510줄, 모바일 오버라이드 1565~1615줄 부근
