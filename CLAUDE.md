# 공공기관 지도 프로젝트 — Claude 작업 가이드

> 새 세션에서 이어서 작업할 때 반드시 읽어야 하는 문서입니다.
> 마지막 업데이트: 2026-07-05

---

## ⚠️ 핵심 standing instruction

1. **"커밋해줘" = git commit + git push (GitHub까지 반영)**  
   → 별도로 "푸시해줘"라고 하지 않아도 항상 push까지 수행한다.

2. **연봉 필드는 절대 수정하지 않는다**  
   → `startingSalary`, `avgSalary`, `avgYears` 세 필드는 사용자가 ALIO 공시 기준으로 직접 수정함.  
   → 데이터 업데이트 시 이 세 필드는 기존 값 그대로 유지.

---

## 1. 프로젝트 개요

- **목적**: 공기업·공공기관 취업 준비생을 위한 지도 기반 기관 정보 앱
- **스택**: 단일 HTML SPA (`index.html`) + `data-orgs.js` (기관 데이터) + `orgs/[기관명]/index.html` (기관별 상세 페이지)
- **지도**: Kakao Maps API
- **GitHub**: `https://github.com/hyunck/govmap`
- **주요 파일**:
  - `data-orgs.js` — ORGS 배열, 모든 기관 데이터 (CRLF, ~600KB+)
  - `index.html` — 메인 지도 앱 (~4000줄)
  - `generate-org-pages.js` — 상세 페이지 일괄 생성 스크립트
  - `generate-eval-page.js` — 경영평가 랜딩페이지 생성 스크립트 (세션7 신규)
  - `orgs/[기관명]/index.html` — 기관별 상세 페이지 (generate-org-pages.js로 생성)
  - `eval/index.html` — 경영평가 결과 랜딩페이지 (세션7 신규, generate-eval-page.js로 생성)
  - `MOBILE_UI_NOTES.md` — 모바일 UI 작업 전용 노트

---

## 2. 데이터 스키마 (data-orgs.js)

```js
{
  "id": 숫자,
  "name": "기관 공식명칭",
  "shortName": "약칭 (영문)",
  "type": "공기업" | "준정부" | "기타공공기관",  // ⚠️ 준정부기관은 "준정부"로 저장 (UI 필터 매칭)
  "region": "수도권" | "경상권" | "충청권" | "경기권" 등,
  "industry": "에너지" | "SOC·건설" | "금융" | "보건·의료" | "해양·수산" 등,
  "address": "도로명 주소",
  "lat": 숫자,          // 선택. 설정 시 geocoding 생략 → org HQ 마커 위치 고정
  "lng": 숫자,          // 선택. lat와 함께 사용
  "startingSalary": 만원,   // ⚠️ 수정 금지 (사용자 직접 관리)
  "avgSalary": 만원,        // ⚠️ 수정 금지
  "avgYears": 년,           // ⚠️ 수정 금지
  "startingSalaryHistory": [{"year":2023,"val":4234}, ...],  // 선택. 연도별 초봉 이력 (만원). 알리오 공시 PDF에서 추출
  "avgSalaryHistory": [{"year":2023,"val":6524}, ...],       // 선택. 연도별 평균연봉 이력 (만원). 알리오 공시 PDF에서 추출
  "evalGrade": "S"|"A"|"B"|"C"|"D"|"E",  // 2025년도 경영실적 평가등급 (2026년 발표)
  "evalYear": 2025,                       // 평가 대상 연도 (발표 연도 아님)
  "prevEvalGrade": "A"|"B"|...,           // 2024년도 경영실적 평가등급 (2025년 발표)
  "evalType": "공기업",                   // 선택. type이 변경된 기관의 eval 페이지 표시용 override
                                          // (예: 한국방송광고진흥공사 — 현재 기타공공기관이나 평가 당시 공기업)
  "rotation": {                           // 선택. 순환근무 정보
    "type": "전국순환" | "권역순환" | "비순환",
    "note": "설명 문자열" | ["줄1", "줄2"],  // 배열로 쓰면 CRLF 인코딩 문제 방지
    "source": "출처"
  },
  "homepage": "https://...",
  "recruitUrl": "https://...",
  "description": "2~3문장 설명",
  "mainBusiness": ["사업1", ...],   // 5개 권장
  "welfare": ["복지1", ...],        // 5개 권장
  "branches": [                    // 지도 마커용 (실제 주소 geocoding)
    {"name": "지사명", "address": "도로명 주소"},
    ...
  ],
  "allBranches": [                 // 선택. 리스트 전용 그룹화 표시
    {"groupName": "그룹명", "items": [{"name": "...", "address": "..."}]},
    ...
  ],
  "ncs": ["의사소통능력", ...],     // 실제 평가 모듈
  "ncsOld": {                      // 선택. 직렬별 NCS 세분화
    "직렬명": ["모듈1", ...]
  },
  "ncsNote": "설명 문자열",          // 선택. 표준 NCS 필기시험이 없는 기관 전용 — ncs가 빈 배열([])일 때만 렌더링됨.
                                    // 예: "공간정보 관련 키워드를 통해 보고서 작성 능력 평가" (필기전형 실제 방식 서술)
  "majorSubjects": {               // 직렬별 전공과목
    "직렬명": "과목 설명"
  },
  "examSubjects": ["과목1", ...],
  "examNote": "설명 문자열"          // 선택. 전공 필기시험이 없는 기관 전용 — majorSubjects/examSubjects가 모두 없을 때만 렌더링됨.
                                    // 예: "조직적합성, 가치관, 업무태도 등을 중점적으로 면접 평가" (면접전형 평가기준 서술)
}
```

---

## 3. 핵심 기술 패턴

### branches[] vs allBranches[]

| 구분 | 용도 | 특징 |
|------|------|------|
| `branches[]` | **지도 마커** + 리스트 표시 | Kakao Maps geocoding 대상. 실제 주소 필수. |
| `allBranches[]` | **리스트 전용** 그룹화 | 그룹헤더로 묶어서 표시. 5개↑ 그룹은 기본 접힘. branches[]와 name+address 일치 시 📍 아이콘 + 지도 클릭 연동. |

⚠️ **중요(세션10에서 재확인)**: `allBranches[]`에만 있고 `branches[]`에는 없는 지사는 **지도에 마커가 전혀 찍히지 않는다** (리스트에만 보임). 지사가 많아 `allBranches[]`로 그룹화하더라도, 지도 마커가 필요하면 **동일한 항목을 `branches[]`에도 반드시 중복 기재**해야 한다. 근로복지공단(84개), 한국산업인력공단(26개 지사, 커밋 `624ab93`) 등 대형 기관은 전부 이 방식(두 배열에 동일 name으로 전량 중복)을 사용 중. "지사가 지도에 안 나온다"는 사용자 지적을 받으면 이것부터 확인할 것.

### HQ 마커 dedup 로직 (index.html ~line 2338)

```js
if (Math.abs(br.lat - org.lat) < 0.001 &&
    Math.abs(br.lng - org.lng) < 0.001 &&
    br.name.includes('본')) { return null; }
```
- branches 중 org HQ 좌표와 0.001° 이내이고 이름에 '본'이 포함된 항목 → 지도 마커 제거, 리스트에서 **(본사)** 표시
- **주의**: geocoding이 기관명으로 검색해 엉뚱한 좌표를 잡으면 dedup이 오작동할 수 있음
- **해결**: org에 `lat`/`lng` 직접 지정 + 2사옥·별관 등의 이름에서 '본' 제거

### org-level lat/lng 직접 지정

```js
"lat": 37.5645,
"lng": 126.9762,
```
→ geocoding 건너뜀, HQ 마커 위치 완전 고정.

### 단일 기관 페이지 생성 패턴

```js
// _gen_xxx.js 파일로 만들어서 실행하는 방식 권장 (인라인 -e는 한글 파싱 오류 위험)
const fs = require('fs'), path = require('path');
let src = fs.readFileSync('generate-org-pages.js','utf8');
let dataSrc = fs.readFileSync('data-orgs.js','utf8')
  .replace(/^const ORGS\s*=/, 'var ORGS =')
  .replace(/window\.ORGS\s*=/, 'var ORGS =');  // ⚠️ ^ 없이 써야 함 (파일 중간에 위치)
eval(dataSrc);
const ORGS_DIR = path.join(__dirname, 'orgs');
const cut = src.indexOf('\n// ── 페이지 생성 루프');
const helperCode = src.slice(0, cut) + `
const target = ORGS.find(o => o.name === "기관명");
const html = buildPage(target);
const dir = path.join(ORGS_DIR, target.name);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
fs.writeFileSync(path.join(dir, "index.html"), html);
console.log("Generated:", target.name);`;
eval(helperCode);
// → node _gen_xxx.js && rm _gen_xxx.js
```

### 경영평가 랜딩페이지 재생성

```bash
node generate-eval-page.js
# → eval/index.html 재생성
```
- `generate-eval-page.js`가 `data-orgs.js`에서 evalGrade 있는 기관을 자동 집계
- evalGrade, prevEvalGrade, startingSalary, avgSalary, evalType 모두 반영

### rotation.note 배열 패턴 (CRLF 파일 인코딩 주의)

```json
"rotation": {
  "type": "전국순환",
  "note": ["• 줄1 내용", "• 줄2 내용"],
  "source": "출처"
}
```
- `note`를 단일 문자열에 `\n` 넣으면 CRLF 파일에서 파싱 오류 → **배열로 저장**
- 템플릿: `(Array.isArray(org.rotation.note) ? org.rotation.note : [org.rotation.note]).map(escHtml).join('<br>')`

### 연봉 히스토리 패턴 (알리오 공시 PDF 기반)

```json
"startingSalaryHistory": [
  {"year":2023,"val":4234},
  {"year":2024,"val":4289},
  {"year":2025,"val":4466},
  {"year":2026,"val":4601}
],
"avgSalaryHistory": [
  {"year":2023,"val":6524},
  {"year":2024,"val":6774},
  {"year":2025,"val":7018},
  {"year":2026,"val":7423}
]
```
- 사용자가 알리오 공시 PDF 또는 스크린샷을 제공하면 Claude가 읽고 추가
- 단위: **만원** (PDF 값이 천원 단위이면 ÷10)
- `startingSalary`/`avgSalary`/`avgYears`는 여전히 수정 금지 — 히스토리만 추가
- generate-org-pages.js의 연봉 탭에서 4개년 이력 그래프/표로 렌더링됨

### 오류 신고·정보 추가 요청 기능 (Google Forms 백그라운드 submit)

- **구현 위치**: `generate-org-pages.js` footer 직전
- **Google Forms URL**: `https://docs.google.com/forms/d/e/1FAIpQLSfMsbC-vS8JdVa9CPVwo0LXrQ1Hl2uGvwG99KI-z0pPvEfWTw/formResponse`
- **entry IDs**:
  - `entry.762690459` = 기관명 (자동 입력)
  - `entry.211514498` = 신고유형 (라디오: "오류 신고" | "정보 추가 요청" | "기타")
  - `entry.211514498_sentinel` = hidden 보조 필드 (빈 문자열)
  - `entry.1534037353` = 내용
- **submit 방식**: `fetch(URL, {method:'POST', mode:'no-cors', body: URLSearchParams})` — 사이트 이탈 없이 접수, 사용자에게는 완료 모달 표시
- **전체 344개 기관 페이지** generate-org-pages.js 재실행으로 일괄 반영됨 (세션9 완료)

### evalType 오버라이드 패턴

기관의 `type`이 바뀌었지만 경영평가 시점에는 다른 분류였을 때:
```json
"type": "기타공공기관",
"evalType": "공기업"
```
- `generate-eval-page.js`에서 `(o.evalType || o.type) === '공기업'`으로 그룹핑
- 적용 사례: 한국방송광고진흥공사 (현재 기타공공기관, 평가 당시 공기업)

### ncsNote/examNote 패턴 (NCS·전공필기 없는 기관, 세션10 신규)

일부 기관은 표준 NCS 객관식 필기시험이나 전공 필기시험 없이 서류·면접(보고서 작성, 조직적합성 평가 등)으로만 채용한다. 이 경우 `ncs`/`examSubjects`를 빈 배열로 두면 카드 자체가 사라지는데, 실제 평가방식을 알려주려면:

```json
"ncs": [],
"ncsNote": "공간정보 관련 키워드를 통해 보고서 작성 능력 평가",
"examNote": "조직적합성, 가치관, 업무태도 등을 중점적으로 면접 평가"
```

- `ncsNote`: `ncs`가 빈 배열일 때만 렌더링됨. 상세페이지 카드 제목이 "NCS 직업기초능력 시험과목" 대신 **"필기전형"**으로 바뀜
- `examNote`: `majorSubjects`/`examSubjects`가 모두 없을 때만 렌더링됨. 카드 제목이 "전공 시험과목" 대신 **"면접전형 평가방식"**으로 바뀜
- `generate-org-pages.js`(상세페이지)와 `index.html`의 `renderTabExam()`(지도 팝업 시험과목 탭) 양쪽에 모두 반영해야 함
- 적용 사례: 공간정보산업진흥원 — NCS 필기 없이 "보고서 작성 능력 평가", 전공 필기 없이 "면접 중심 평가"

### 안내 문구 (전체 기관 공통)

```
⚠️ 국가중요시설 및 기관 사정으로 지도에 표시되지 않거나 불명확하게 표시되는 사업장·지사가 있을 수 있어요.
```
→ `generate-org-pages.js` line ~113, ~357 / `index.html` line ~2615, ~2685 / 모든 `orgs/*/index.html`에 반영됨

---

## 4. 데이터 전면 업데이트 완료 기관 (누적)

### 세션 1~2 (초기)

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| 한전원자력연료 | KNFC | `4055405` | 주소 정정(대덕대로989번길 242), TSA/NSA Plant 추가 |
| 한국수산자원공단 | FIRA | `54199f7` | 주소 정정(일광읍), 9개 지사·센터, 5개 권역 그룹화 |
| 한국보건의료정보원 | KHIS | `10fd2f8` | 주소 정정(세종대로 39), lat/lng 추가, dedup 버그 수정 |
| 한국마사회 | KRA | `d3edc23` | 경마공원3+장외발매소25+목장2 = 30개 지사, 5그룹 |
| 한국조폐공사 | KOMSCO | `c66cf3f` | 주소 정정(테크노10로 7), 제지본부 추가, 4개 지사 |
| 한국토지주택공사 | LH | `08bfece` | 지역본부16+사업본부18 = 34개 지사, 7권역 그룹 |
| 한국석유공사 | KNOC | `6f305e5` | 주소 정정(종가로 305), 9개 비축기지, 3그룹 |
| 한국수력원자력 | KHNP | `b50c706` | allBranches 4그룹 추가 (원자력/양수발전소 등) |
| 인천국제공항공사 | IIAC | `9c38e8a` | 마커 중복 버그 수정, lat/lng 직접 지정 |
| 한국공항공사 | KAC | `0f85bdf` | 17개 공항, NCS 5개, examSubjects 10개 |

### 세션 3 (준정부 1차)

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| 한전KPS | KPS | `1fc1cc4`+`9a23e07` | branches 25개, allBranches 5그룹, 양수·화력 주소 검증 |
| 한전KDN | KDN | `ea69bc9` | 주소 정정(빛가람로 661), branches 25개, allBranches 6그룹 |
| 주택도시보증공사 | HUG | `5a4f8b0`+`09b8c61` | branches 21개, allBranches 6그룹, 관리센터 4개 마커 추가 |
| 한국전력기술 | KEPCO E&C | `e0981fa` | 원자로설계개발본부 추가, 용인사무소 삭제 |
| 한국가스기술공사 | KOGAS-Tech | `2e67728` | 주소 정정(대덕대로 1227), homepage 정정, branches 14개 |
| 해양환경공단 | KOEM | `eacd649` | branches 13개, allBranches 4그룹 |

### 세션 4 (준정부 2차)

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| 국민연금공단 | NPS | `d349734` | branches 4→97개 (7개 지역본부+90개 지사), allBranches 9그룹 |
| 공무원연금공단 | GEPS | `4568ef6` | 본사 주소 정정(서호중앙로 63), 지부 7개, allBranches 6그룹 |
| 서울올림픽기념국민체육진흥공단 | KSPO | `551234a` | branches 3→18개, allBranches 5그룹, 경륜지사 전체 추가 |
| 한국무역보험공사 | K-SURE | `cbb73df` | branches 3→18개, allBranches 5그룹, 부산·대구 주소 정정 |
| 신용보증기금 | KODIT | `b84e4c6` | branches 4→86개, allBranches 10그룹, 영업본부 8개+전국 영업점 |
| 예금보험공사 | KDIC | `70bff64` | 국내 지사 없음 확인, NCS 3개로 정정, 직렬별 전공범위 상세화 |

### 세션 5 (준정부 3차 + coords-cache 업데이트)

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| (전체) | — | `65c3999` | coords-cache.js 전체 좌표 2336개 업데이트, const→window 버그 수정 |
| 한국자산관리공사 | KAMCO | `144e3f6`+fixes | 부산 본사, 전국 40개 지사, allBranches 7그룹 |
| 한국주택금융공사 | HF | `7319441` | 부산 본사, 전국 지사 업데이트 |
| 한국전력거래소 | KPX | `5f02139` | 중앙급전소 포함 branches 업데이트 |

### 세션 6 (준정부 4차 + 외부기관)

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| 한국소비자원 | KCA | `85fdec8` | 본사(음성), 지원 8개, allBranches 2그룹, NCS 4모듈, 논술시험 |
| 한국연구재단 | NRF | `74f2380` | 대전·세종 2개 청사, allBranches 2그룹, NCS 7모듈, 전공시험 없음 |
| 한국사회보장정보원 | SSiS | `eb1946b` | 주소 정정(광진구 능동로 400), branches 1→4, allBranches 2그룹 |
| 대한무역투자진흥공사 | KOTRA | `ea57e01`+`30708ac`+`76a8511` | 지방지원본부 명칭 정정, branches 4→17, allBranches 2그룹 |
| 한국은행 | BOK | `86b1889` | branches 5→17, allBranches 5그룹, NCS 없음·논술/전공 시험구조 |
| 금융감독원 | FSS | `d81db40` | branches 4→12, allBranches 2그룹, NCS 1차+전공주관식 2차 |
| 근로복지공단 | COMWEL | `511abf5`+`4991720` | branches 18→84개, allBranches 11그룹, 서울·강원 본부 주소 정정 |

### 세션 7 (경영평가·순환근무·KOBACO)

| 기관/작업 | 커밋 | 주요 변경 |
|-----------|------|-----------|
| 한국가스공사(KOGAS) | — | rotation 순환근무 필드 추가 (전국순환) |
| 한국전력공사(KEPCO) | `d7a8e19` | rotation 2트랙 분리: 전국권(전국순환) + 지역전문사원(권역순환), 신설규정(2026.6.5) 포함 |
| 경영평가 등급 전체 | — | evalGrade + evalYear(2025) → 88개 기관 일괄 적용 (공기업31+준정부57) |
| 전년도 경영평가 | — | prevEvalGrade → 86개 기관 적용 (2024년도 실적, 2025년 발표) |
| eval 랜딩페이지 | `5d9f236`~`a821497` | `/eval/` 신규 생성, 등급별 목록+초봉·평균연봉+전년비교 |
| 한국방송광고진흥공사 | `79e3979`+`cedf66b` | 주소 정정(중구 세종대로 124), branches 2→9개, evalType 공기업 override |

### 전체 기관 일괄 수정

| 변경 | 커밋 |
|------|------|
| 지사 안내 문구: "국가보안시설" → "국가중요시설 및 기관 사정으로... 불명확하게 표시되는" (346개 파일) | `268a8f7` |
| evalYear 2026→2025 정정 + 개별 페이지 표시 "2025년도 실적 (2026년 발표)" (88개) | `9305e92` |

### 세션 9 (시험과목 정정·오류신고 기능·기타공공기관 업데이트·연봉 히스토리)

| 기관/작업 | 커밋 | 주요 변경 |
|-----------|------|-----------|
| 농업정책보험금융원 (APFS) | — | NCS 4개 정정(자원관리능력 포함), 전공없음 안내, 연봉 히스토리 4개년(23~26) 추가 |
| 한전KDN | `5973200` | 26년 채용공고 기준: NCS 10개 전 직렬 공통, 직렬별 전공 8개, 코딩테스트 추가, ncsOld 제거 |
| 한전KPS | `a37153c` | 26년 채용공고 기준: G4/G3/G2 등급별 전공 세분화(10개 항목), 중기실기 추가, ncsOld 제거 |
| 오류신고 기능 (전체) | `3a867d6` | generate-org-pages.js에 Google Forms 백그라운드 submit 모달 추가, 344개 기관 일괄 재생성 |
| 국방기술품질원 (DTaQ) | `fb20e05` | 주소 정정, branches 2→8개, NCS 5개, 전공없음 |
| 한국보건복지인재원 (KOHI) | `bb5d94c` | 주소 정정(오송생명2로 187), branches 2→8개, NCS 5개, 전공논술 |
| 국방과학연구소 (ADD) | — | 주소 정정(북유성대로488번길 160), branches 1→8개, ncs:[], 전공없음, 연봉 히스토리 4개년(23~26) |

### 세션 8 (기타공공기관 전면 업데이트 + 한전KPS·한국농어촌공사 지사 확장)

| 기관/작업 | 커밋 | 주요 변경 |
|-----------|------|-----------|
| 한국농어촌공사 (KRC) | `96fb3e5`+`b1c2941` | branches 21→116개 (본사+115 지사·시설), allBranches 12그룹, 본사 📍 추가 |
| 국가유산진흥원 | `f8af68b`+`37f217c` | 주소·homepage·recrutiUrl 정정, mainBusiness/welfare 전면 개편, branches 1→7개, NCS 4개 정정 (자원관리능력), examSubjects 3개 추가 (한국사·관련법령·문화예술상식) |
| 한전KPS (KPS) | `1e19c2e` | branches 25→97개, allBranches 5→11그룹: 화력30·원자력15·양수7·전력지사6권역45·집단에너지14 전수 수집. 보령·삼천포·양양·예천 주소 정정 |

### 세션10 (SEO·애드센스·기타공공기관+준정부 혼합 업데이트+배포 인프라 정비)

**사이트 운영/수익화 작업:**

| 작업 | 커밋 | 주요 변경 |
|------|------|-----------|
| GA 이벤트 계측 4종 | `28526d9` | recruit_click·homepage_click·map_click·report_submit — 344개 기관 페이지 일괄 반영 |
| 타이틀 SEO 개선 | `073c7ca` | 전체 페이지 타이틀에 초봉 수치 삽입, "근무지" 키워드 반영 (서치어드바이저 분석 기반) |
| 구글 애드센스 신청 | `7c30b51`+`d046a72`+`2412df7` | 인증 스크립트·메타태그·ads.txt 전체 페이지 삽입 (`ca-pub-4864032615853020`) |
| 개인정보처리방침 페이지 | `2a7c63d` | `/privacy/` 신설, 전체 페이지 footer에 링크+문의 이메일 추가 |
| ncsNote/examNote 필드 신설 | `2bf14e4` | NCS·전공필기 없는 기관용 (§3 참고) |
| 배포 워크플로우 자체 구축 | `e718e2d`+`3204148`+`48dc0fd` | GitHub 자동관리 Jekyll 배포 → 자체 GitHub Actions 워크플로우로 전환. 상세는 **§11 배포 트러블슈팅** 참고 |

**기관 데이터 업데이트 (연봉 3필드 제외):**

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| 공간정보산업진흥원 | Spacen | `bc0527f` | 본사 이전 확인(성남 분당→안양 동안구), 단일조직(지사없음) 확인, ncsNote/examNote 최초 적용 |
| 한국에너지공단 | KEA | `416e6c5` | branches 3→13개(본사+12개 지역본부), ncs 6개 전면교체, majorSubjects 11개 세부직무로 세분화, 서울·부산 구주소 정정 |
| 한국상하수도협회 | KWWA | `192cd62`+`16546fd`+`11c9dd5` | **본사 주소 오류 발견**(송파구→영등포구 대림로244, 완전히 다른 지역), 단일조직 확인, 연봉 히스토리 4개년, 2026년 실제 채용공고로 NCS 5개·majorSubjects 재정정 |
| 코레일유통 | Korail Retail | `11b7488`+`c2830da` | **본사 주소 오류**(용산구→영등포구 국회대로612), branches 2→14개(9개본부+4개지사), description 기관유형 오류 정정(준정부→기타공공기관), 연봉 히스토리 4개년, 실제 공고 기준 전공과목 정밀화 |
| 한국산업인력공단 | HRDK | `5b8d901`+`624ab93` | branches 3→33개(본사+6개지역본부+26개지사, allBranches 6그룹), ncs 6개 전면교체, majorSubjects 4개 실제 모집분야로 교체, **지사 지도마커 누락 버그 수정**(allBranches만으론 마커 안 뜸) |
| 한국산업기술기획평가원 | KEIT | `e3d5203`+`8c7b83e` | **서울사무소 주소가 실은 다른 기관(KIAT) 주소였던 오류 발견 및 정정**, branches 2→4개, description 기관유형 오류 정정(기타공공기관→준정부), NCS·전공과목 실제 채용공고 원문 대조로 정밀 재확정, **coords-cache.js 본사 좌표 캐시 오류 수정**(§11 참고) |

**리서치 방법 관련 교훈**: Agent로 조사를 맡겼을 때, 에이전트가 스스로 하위 서브에이전트에 위임만 하고 "진행 중"이라며 결과 없이 끝내는 경우가 있었다(한국산업기술기획평가원 조사 시 발생). 이 경우 SendMessage로 같은 에이전트에 "직접 조사해라, 위임 금지"를 명시해 재요청하거나, 아예 새 Agent를 그 지시와 함께 다시 띄우는 게 빠르다. 또한 조사 결과가 여러 서브에이전트에서 나뉘어 도착할 수 있으니 취합 후 교차검증할 것 — 실제로 이번 세션에서 주소·기관유형·NCS를 각각 다른 에이전트가 조사해 서로 보완/검증되었다.

### 세션11 (국립공원공단 전면 업데이트)

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| 국립공원공단 | KNPS | `9fc7313` | **본사 주소 오류 발견 및 정정**(단구로 76 → 혁신로 22, 산하 국립공원연구원 주소와 혼동돼 있었음 — KEIT와 동일 패턴), **한라산국립공원사무소를 branches에서 제거**(한라산은 국립공원공단이 아닌 제주특별자치도가 직접 관리하는 유일한 국립공원), branches 4→35개(전국 23개 국립공원 사무소·분소 전량 + 국립공원연구원·야생생물보전원 3개 센터·해양생태보전원), allBranches 5그룹(동부/서부/중부/북부지역본부+산하연구기관) 신설, 2025년 실제 채용공고 기준 직렬 세분화(재난안전·자원조사 생물/해양 분리 등) 반영, coords-cache.js 잘못된 본사 좌표 캐시 삭제 |

**교훈**: 채용공고 첨부파일(PDF, 예: "필기전형 시험 과목.pdf")은 WebFetch/WebSearch로 직접 열람 불가능한 경우가 많다 — ALIO·나라일터·잡플랫폼 상세페이지에 첨부파일 "목록"은 나오지만 내용은 안 나옴. 이럴 땐 채용공고 본문에 명시된 "모집분야 목록"만으로 majorSubjects/examSubjects의 직렬 구분을 갱신하고, NCS 모듈 자체는 확정 근거 없이 바꾸지 않는 것이 안전하다(무리하게 추정해서 덮어쓰지 말 것). 또한 "한라산"처럼 특정 국립공원이 공단 관할이 아닌 경우가 있으므로, 기존 branches에 있던 항목이라도 관할권 자체를 재검증해야 한다.

---

## 5. 경영평가(evalGrade) 관련 데이터

### 2025년도 경영실적 평가 (2026.06.19 기획재정부 발표)

- **공기업 31개 + 준정부기관 57개 = 88개** 모두 `evalGrade` + `evalYear: 2025` 적용 완료
- `prevEvalGrade`: 2024년도 경영실적 (2025년 발표) — 86개 적용 (대한석탄공사는 evalGrade 없어서 제외)
- 등급: S(탁월)·A(우수)·B(양호)·C(보통)·D(미흡)·E(아주미흡)
- 성과급: D·E = 미지급 / A·B·C = 지급 (공기업 최대 250%, 준정부 최대 100%)

### evalType 적용 기관

| 기관 | type | evalType | 이유 |
|------|------|----------|------|
| 한국방송광고진흥공사 | 기타공공기관 | 공기업 | 평가 당시 공기업이었다가 기타공공기관으로 강등됨 |

### eval 랜딩페이지 재생성 시 필수

```bash
node generate-eval-page.js   # eval/index.html 재생성
# 이후 반드시 커밋·푸시
git add eval/index.html generate-eval-page.js
```

---

## 6. 기관 데이터 업데이트 표준 절차

### 한 기관을 완벽하게 업데이트하는 체크리스트

1. **조사** (Agent 서브에이전트 활용):
   - 공식 사이트 + 알리오(alio.go.kr) + 채용공고 기준
   - 반드시 확인: 본사 주소(도로명), 지사 전체 목록+주소, NCS 모듈, 직렬별 전공과목
   - **연봉(startingSalary/avgSalary/avgYears)은 조사·수정 제외**

2. **data-orgs.js 수정**:
   - 기존 엔트리 Read → Edit (또는 업데이트 스크립트 작성)
   - mainBusiness 5개, welfare 5개, branches 전체 (주소 검증 필수)
   - allBranches 그룹화 (5개 이상 항목이 있는 그룹은 기본 접힘)
   - recruitUrl: ALIO 링크 → 공식 채용페이지로 교체

3. **상세 페이지 재생성** (위 "단일 기관 페이지 생성 패턴" 참고)

4. **커밋 & 푸시**:
   ```bash
   git add data-orgs.js "orgs/[기관명]/index.html"
   git commit -m "feat: [기관명] 데이터 전면 업데이트..."
   git push
   ```

### 주소 검증 원칙
- 조사된 주소가 기존 데이터와 다르면 무조건 공식 사이트 기준으로 정정
- 사업본부/사업단/센터 등 하위 기관 주소는 별도 서브에이전트로 재검증 후 반영
- 지번 주소 × → 도로명 주소 ○

---

## 7. 다음 작업 예정 기관

> 사용자가 "이어서 [기관명]의 모든 정보를..." 패턴으로 요청함.
> 연봉은 사용자가 ALIO 공시 기준으로 직접 수정하므로 **연봉 제외하고 수정**.

### 현재 작업 위치
- **마지막 완료**: 국립공원공단 전면 업데이트 (세션11) — 준정부·기타공공기관 구분 없이 사용자가 개별 지목하는 기관을 그때그때 처리하는 방식으로 진행 중
- **다음**: 사용자가 "이어서 [기관명]의 모든 정보를..." 형태로 계속 지목할 예정. 아래 준정부 목록은 참고용 후보일 뿐, 실제 순서는 사용자 지목을 따를 것

### 아직 수정 안 된 주요 준정부기관 (data-orgs.js 순, 참고용)

| 기관 | shortName | 본사 위치 | 비고 |
|------|-----------|---------|------|
| 사립학교교직원연금공단 | TP | 서울 | 세션4에서 건너뜀 |
| 기술보증기금 | KIBO | 부산 | — |
| 중소벤처기업진흥공단 | KOSME | 진주 | — |
| 한국벤처투자 | KVIC | 서울 | — |
| 소상공인시장진흥공단 | SEMAS | 대전 | — |
| 한국장학재단 | KOSAF | 대구 | — |
| 한국고용정보원 | KEIS | 음성 | — |
| ~~한국산업인력공단 (HRD, 울산)~~ | — | — | ✅ 세션10에서 완료 |
| 이후 계속 | — | — | 사용자 요청에 따라 결정 |

### 기타공공기관 현황 메모
- 사용자가 ALIO 공시 기준으로 기타공공기관 연봉(startingSalary·avgSalary·avgYears)을 직접 수정 중
- 국가유산진흥원까지 반영 완료 (커밋 `a84b3e8`·`f212789`)
- 국가유산진흥원의 시험과목은 **2025 하반기 채용공고** 기준으로 정정됨 (NCS 4개, 직무수행: 한국사·관련법령·문화예술상식)
- 세션10에서 공간정보산업진흥원·한국상하수도협회·코레일유통·한국산업기술기획평가원(기타공공기관/준정부 섞여 있음) 추가 완료 — §4 세션10 표 참고

### ⚠️ 주소 오류가 매우 흔하다 (세션10 발견)
이번 세션에서 업데이트한 5개 기관 중 **3개에서 본사 주소 자체가 틀려 있었다** (한국상하수도협회: 완전히 다른 구, 코레일유통: 완전히 다른 구, 한국산업기술기획평가원: 아예 다른 기관(KIAT)의 주소가 들어가 있었음). 기존 data-orgs.js의 주소를 무조건 신뢰하지 말고, **조사 단계에서 공식 사이트 footer/오시는길 페이지로 반드시 재검증**할 것. 의심스러우면 2개 이상 독립 출처로 교차확인 (에이전트 재파견 활용).

---

## 8. 알려진 버그 / 주의사항

### Dedup 오작동 패턴
- **증상**: 본사가 아닌 2사옥/별관이 파란 HQ 마커로 표시됨
- **원인**: geocoding이 기관명 검색으로 2사옥 근처 좌표를 잡고, 2사옥 이름에 '본'이 포함되어 dedup됨
- **해결**: org에 `lat`/`lng` 직접 지정 + 2사옥 이름에서 '본' 제거
- **적용 사례**: KHIS (한국보건의료정보원) — `10fd2f8`

### 지도 마커 중복 패턴
- **증상**: 지도에 같은 기관 마커가 2개 표시됨
- **원인**: org.lat/lng 미설정 시 geocoding이 branches[0]과 다른 좌표를 잡음
- **해결**: org에 lat/lng 직접 지정 + branches에서 '본사' 중복 항목 제거
- **적용 사례**: IIAC (인천국제공항공사) — `9c38e8a`

### coords-cache.js 캐시 좌표 오류 → 본사 마커가 엉뚱한 지사에 표시 (세션10 신규)
- **증상**: 리스트에서 본사가 아닌 다른 지사(예: 분원)에 "(본사)" 태그가 붙고, 진짜 본사에는 안 붙음
- **원인**: `coords-cache.js`는 `{id}_hq_{기관명}` 키로 org의 HQ 좌표를 캐싱하는데, 이 캐시값이 (과거 잘못된 지오코딩 등으로) 실제 본사 위치가 아닌 엉뚱한 곳으로 저장돼 있었음. HQ 판정 로직(`Math.abs(br.lat-org.lat)<0.001 && Math.abs(br.lng-org.lng)<0.001`)은 좌표 근접성만 보므로, 캐시된 org 좌표가 우연히 다른 지사 좌표와 가까우면 그 지사가 "본사"로 오판정됨
- **해결**: ~~data-orgs.js에 branch별 lat/lng를 직접 지정하는 것은 근본 해결이 아니다~~ (세션10에서 실제로 이렇게 했다가 삽질 — 원복함, 커밋 `dc1e7da`). **진짜 해결책은 `coords-cache.js`에서 `{id}_hq_{기관명}` 키를 찾아, 실제 본사 지사(`branches[0]`)의 캐시 키(`{id}_br0_...`)와 **정확히 동일한 값**으로 맞추는 것** — 조회 순서가 좌표 캐시(1순위) → 라이브 지오코딩이므로, 캐시부터 고쳐야 함
- **점검 순서**: (1) 문제 기관의 `{id}_hq_...`와 `{id}_br0_...`(진짜 본사 지사) 캐시값을 coords-cache.js에서 grep으로 비교 → (2) 다르면 hq값을 br0값으로 교체 → (3) 절대 data-orgs.js의 branches[]에 개별 lat/lng를 넣지 말 것 (그건 다른 문제의 해결책이지 이 문제의 해결책이 아님)
- **적용 사례**: KEIT (한국산업기술기획평가원) — 대전분원이 본사로 오표시, 커밋 `8c7b83e`에서 캐시 수정으로 해결, `c75dfec`(branch lat/lng 직접지정 시도)는 `dc1e7da`로 원복

### allBranches 동일 주소 중복 마커 패턴
- **증상**: 영업본부와 해당 건물 지점이 동일 주소일 때 지도 마커 2개 생성
- **원인**: branches[]에 둘 다 포함
- **해결**: branches[]에는 하나만 포함, allBranches[]에는 둘 다 표시
- **적용 사례**: KODIT (신용보증기금) — 영업본부+지점 동일 주소 처리

### data-orgs.js 업데이트 스크립트 주의
- JSON 블록 교체 시 regex가 중첩 `}`를 잘못 매칭해 이전 데이터 잔재가 남을 수 있음
- **배열 교체는 반드시 bracket-matching 방식 사용** (regex `\[[\s\S]*?\]` 는 첫 `]`에서 멈춰 오작동):

```js
function findArrayEnd(str, start) {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') { depth--; if (depth === 0) return i; }
  }
  throw new Error('Unmatched bracket');
}
// 사용: end-to-start 순서로 교체해야 index 밀림 없음
const arrKey = content.indexOf('"branches":', entryStart);
const arrStart = content.indexOf('[', arrKey);
const arrEnd = findArrayEnd(content, arrStart);
result = content.substring(0, arrStart) + newArrayStr + content.substring(arrEnd + 1);
```

- **data-orgs.js는 CRLF 파일**: 다중행 문자열 패턴 매칭 시 `\r\n` 사용 (단순 `\n` 불일치 주의)
- 스크립트 실행 후 반드시 파싱 검증:
  ```bash
  node -e "const fs=require('fs'); let src=fs.readFileSync('data-orgs.js','utf8').replace(/^const ORGS\s*=/,'var ORGS =').replace(/window\.ORGS\s*=/,'var ORGS ='); eval(src); console.log(ORGS.find(o=>o.name==='기관명').branches.length);"
  ```
- 오류 시 잔재 블록을 Edit 도구로 직접 제거

---

## 9. Google Analytics / Search Console 데이터 검토

### 접근 방법
- **Google Analytics**: https://analytics.google.com/ → 속성: govmap (GA4)
- **Google Search Console**: https://search.google.com/search-console/ → 속성: govmap.kr
- **네이버 서치어드바이저**: searchadvisor.naver.com → 웹마스터 도구

### SEO 현황 (2026-06-20 기준)
- `eval/index.html` — 구글 색인 요청 완료, 네이버 색인 완료 (네이버 검색 3페이지 노출 확인)
- sitemap.xml — 346개 페이지, 구글·네이버 모두 제출 완료
- 메인 페이지 사이드바에 `/eval/` 배너 링크 추가 (내부 링크 신호)

---

## 10. 관련 MD 파일

- **`CLAUDE.md`** (이 파일): 전체 프로젝트 맥락·데이터 업데이트 가이드
- **`MOBILE_UI_NOTES.md`**: 모바일 UI 개선 작업 전용 노트 (바텀시트, 검색 자동완성 등)
- **`ADSENSE_PLAN.md`**: 구글 애드센스 광고 슬롯 배치 계획 (세션10, 승인 후 적용 예정)

---

## 11. 배포 (GitHub Pages / Actions) 가이드 — 세션10 신규

### 배포 구조 (세션10에서 전면 교체됨)

과거엔 GitHub Pages "Deploy from a branch" 설정으로 GitHub가 자동관리하는 Jekyll 빌드 파이프라인을 썼으나, **2026.07.02경부터 이 자동 워크플로우가 반복적으로 배포 실패**하기 시작했음(추정 원인: GitHub의 Node.js 20→24 강제전환 롤아웃이 `actions/deploy-pages` 등 내부 액션에 영향). 이를 우회하기 위해 **자체 GitHub Actions 워크플로우로 전환** (`e718e2d`):

- **Settings → Pages → Source = "GitHub Actions"** (Deploy from a branch 아님)
- 워크플로우 파일: **`.github/workflows/deploy.yml`**
- 구조: `build`(checkout→configure-pages→upload-pages-artifact) / `deploy`(deploy-pages) **2개 job으로 분리** (`3204148`)
  - ⚠️ 처음엔 build+deploy를 단일 job으로 합쳐놨었는데, 이 상태에서 "Re-run jobs"를 누르면 아티팩트 업로드가 중복 실행되어 `Multiple artifacts named "github-pages"` 에러가 남 → job을 분리해서 해결. **앞으로도 절대 build+deploy를 한 job에 합치지 말 것.**
- 사용 액션 버전: `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` (v3으로 다운그레이드 시도했으나 효과 없어서 v4로 복원 — 버전 문제가 아니었음)
- `.nojekyll` 파일 루트에 존재 — Jekyll 처리 완전 비활성화 (순수 정적 HTML 사이트이므로)
- `ads.txt` 루트에 존재 — 애드센스 게시자 인증용

### 배포 실패 시 대응 순서

1. **`build` job이 성공하고 `deploy` job만 실패**하는 경우가 대부분 — GitHub Pages 백엔드의 간헐적 문제로 보이며, 저장소 설정 문제가 아님
2. **재시도 전에 Settings → Pages 화면에서 Custom domain의 "DNS Check" 상태를 확인**할 것
   - "DNS Check in Progress"(진행 중)일 때 재시도하면 또 실패하는 경향이 관찰됨 (정확한 인과관계는 불확실하나 상관관계는 뚜렷함)
   - **"✓ DNS check successful"(완료)로 바뀔 때까지 기다렸다가 재시도**
3. **재시도 방법 — 경과 시간에 따라 다르게 선택**:
   - 실패 직후 바로 재시도 → "Re-run jobs" 드롭다운 → **"Re-run failed jobs"**로 충분 (build 아티팩트를 재사용, 안전함— job 분리 덕분에 중복 문제 없음)
   - **시간이 좀 지난 뒤(DNS 재검증 기다린 후 등) 재시도할 때는 반드시 "Re-run all jobs"(전체 재시도)** 사용. "Re-run failed jobs"만 누르면 `Cannot find any run with github.run_id ...` 에러로 또 실패함 — 오래된 빌드 아티팩트 참조가 GitHub Pages 쪽에서 무효화되는 것으로 추정
   - 그래도 안 되면: 빈 커밋이라도 새로 푸시해서 완전히 새 워크플로우 run을 만드는 게 가장 확실함
4. **절대 하지 말 것**: 배포가 안 된다고 Pages 설정(Source, Custom domain)을 임의로 바꾸지 말 것. 오늘 확인한 실패들은 전부 설정이 아니라 위 1~3번 절차로 해결됨
5. **안심 포인트**: 배포가 실패해도 커밋·푸시된 코드/데이터 자체는 GitHub에 안전하게 있고, 라이브 사이트는 마지막 성공 배포 상태로 계속 정상 서비스됨 — 데이터 유실 위험 없음

### 배포 상태 확인 (API, 인증 불필요 — public repo)

```bash
# 최신 워크플로우 run 상태
curl -s "https://api.github.com/repos/hyunck/govmap/actions/runs?per_page=1" | python -c "
import json,sys; d=json.load(sys.stdin); r=d['workflow_runs'][0]
print(r['status'], r['conclusion'], r['head_sha'][:7])"

# 라이브 반영 여부 직접 확인 (캐시 우회용 쿼리스트링 필수)
curl -s "https://govmap.kr/orgs/[기관명 URL인코딩]/?_cb=$(date +%s)" | grep -c "확인할 텍스트"
```
- job별 성공/실패는 `/actions/runs/{id}/jobs` 엔드포인트로 확인
- 정확한 실패 사유는 `/check-runs/{job_id}/annotations`로 확인 가능 (예: "Deployment failed, try again later.", "Multiple artifacts...", "Cannot find any run with github.run_id...")
