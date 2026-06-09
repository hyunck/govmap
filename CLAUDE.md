# 공공기관 지도 프로젝트 — Claude 작업 가이드

> 새 세션에서 이어서 작업할 때 반드시 읽어야 하는 문서입니다.
> 마지막 업데이트: 2026-06-09

---

## ⚠️ 핵심 standing instruction

**"커밋해줘" = git commit + git push (GitHub까지 반영)**
→ 별도로 "푸시해줘"라고 하지 않아도 항상 push까지 수행한다.

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
  - `orgs/[기관명]/index.html` — 기관별 상세 페이지 (generate-org-pages.js로 생성)
  - `MOBILE_UI_NOTES.md` — 모바일 UI 작업 전용 노트

---

## 2. 데이터 스키마 (data-orgs.js)

```js
{
  "id": 숫자,
  "name": "기관 공식명칭",
  "shortName": "약칭 (영문)",
  "type": "공기업" | "준정부기관" | "기타공공기관",
  "region": "수도권" | "경상권" | "충청권" | "경기권" 등,
  "industry": "에너지" | "SOC·건설" | "금융" | "보건·의료" | "해양·수산" 등,
  "address": "도로명 주소",
  "lat": 숫자,          // 선택. 설정 시 geocoding 생략 → org HQ 마커 위치 고정
  "lng": 숫자,          // 선택. lat와 함께 사용
  "startingSalary": 만원,
  "avgSalary": 만원,
  "avgYears": 년,
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
  "majorSubjects": {               // 직렬별 전공과목
    "직렬명": "과목 설명"
  },
  "examSubjects": ["과목1", ...],
  "industry": "분류"
}
```

---

## 3. 핵심 기술 패턴

### branches[] vs allBranches[]

| 구분 | 용도 | 특징 |
|------|------|------|
| `branches[]` | **지도 마커** + 리스트 표시 | Kakao Maps geocoding 대상. 실제 주소 필수. |
| `allBranches[]` | **리스트 전용** 그룹화 | 그룹헤더로 묶어서 표시. 5개↑ 그룹은 기본 접힘. branches[]와 name+address 일치 시 📍 아이콘 + 지도 클릭 연동. |

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
// data-orgs.js에서 org 객체에 추가
"lat": 37.5645,
"lng": 126.9762,
```
→ geocoding 건너뜀, HQ 마커 위치 완전 고정. 2사옥이 HQ로 잘못 잡히는 등의 문제 해결 시 사용.

### 단일 기관 페이지 생성 패턴

```bash
node -e "const fs=require('fs');let src=fs.readFileSync('generate-org-pages.js','utf8');
const cut=src.indexOf('\n// ── 페이지 생성 루프');
const code=src.slice(0,cut)+'\nconst target=ORGS.find(o=>o.shortName===\"XXX\");
const html=buildPage(target);const dir=path.join(ORGS_DIR,target.name);
if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,\"index.html\"),html);
console.log(\"Generated:\",target.name);';
fs.writeFileSync('_gen_xxx.js',code);" && node _gen_xxx.js && rm _gen_xxx.js
```

### 안내 문구 (전체 기관 공통)

```
⚠️ 국가중요시설 및 기관 사정으로 지도에 표시되지 않거나 불명확하게 표시되는 사업장·지사가 있을 수 있어요.
```
→ `generate-org-pages.js` line ~113, ~357 / `index.html` line ~2615, ~2685 / 모든 `orgs/*/index.html`에 반영됨

---

## 4. 이번 세션 주요 작업 내역 (최신순)

### 데이터 전면 업데이트 완료 기관

| 기관 | shortName | 커밋 | 주요 변경 |
|------|-----------|------|-----------|
| 한전원자력연료 | KNFC | `e81877b` | 주소 정정(대덕대로989번길 242), 초봉 4100, 평균 8200, TSA/NSA Plant 추가 |
| 한국수산자원공단 | FIRA | `54199f7` | 주소 정정(일광읍), 9개 지사·센터, 5개 권역 그룹화 |
| 한국보건의료정보원 | KHIS | `17b8526`+`10fd2f8` | 주소 정정(세종대로 39), lat/lng 추가, 1사옥 HQ 고정 버그 수정 |
| 한국마사회 | KRA | `e46b156`+`d3edc23` | 경마공원3+장외발매소25+목장2 = 30개 지사, 5그룹 |
| 한국조폐공사 | KOMSCO | `c66cf3f` | 주소 정정(테크노10로 7), 제지본부 추가, 4개 지사 |
| 한국토지주택공사 | LH | `03975d1`+`08bfece` | 지역본부16+사업본부18 = 34개 지사, 7권역 그룹, 주소 11개 정정 |
| 한국석유공사 | KNOC | `6f305e5` | 주소 정정(종가로 305), 9개 비축기지, 3그룹 |
| 한국수력원자력 | KHNP | `b50c706` | allBranches 4그룹 추가 (원자력/양수발전소 등) |
| 인천국제공항공사 | IIAC | `9c38e8a` | 마커 중복 버그 수정, lat/lng 직접 지정 |
| 한국공항공사 | KAC | `0f85bdf` | 17개 공항, NCS 5개, examSubjects 10개 |

### 전체 기관 일괄 수정

| 변경 | 커밋 |
|------|------|
| 지사 안내 문구: "국가보안시설" → "국가중요시설 및 기관 사정으로... 불명확하게 표시되는" (346개 파일) | `268a8f7` |

---

## 5. 기관 데이터 업데이트 표준 절차

### 한 기관을 완벽하게 업데이트하는 체크리스트

1. **조사** (Agent 서브에이전트 활용):
   - 공식 사이트 + 알리오(alio.go.kr) + 채용공고 기준
   - 반드시 확인: 본사 주소(도로명), 연봉(초봉/평균/근속), 지사 전체 목록+주소, NCS 모듈, 직렬별 전공과목

2. **data-orgs.js 수정**:
   - 기존 엔트리 Read → Edit
   - mainBusiness 5개, welfare 5개, branches 전체 (주소 검증 필수)
   - allBranches 그룹화 (5개 이상 항목이 있는 그룹은 기본 접힘)

3. **상세 페이지 재생성**:
   ```bash
   node _gen_xxx.js  # 위 단일 기관 생성 패턴 사용
   ```

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

## 6. 다음 작업 예정 기관 (우선순위 순)

> 사용자가 "마찬가지로 [기관명]의 모든 정보를..." 패턴으로 요청함

| 순위 | 기관 | shortName | 특이사항 |
|------|------|-----------|----------|
| 1 | **강원랜드** | KANGWONLAND | 이전 세션에서 요청 중 중단됨 (최우선) |
| 2 | 이후 사용자 요청에 따라 결정 | - | - |

### 강원랜드 사전 정보 (조사 전 알고 있는 것)
- 본사: 강원 정선군 사북읍 하이원길 265 (하이원리조트)
- 카지노·리조트·스키·골프·컨벤션 운영
- 준시장형 공기업, 산업통상자원부 산하
- 지사: 본사(하이원) 단일 사업장 + 서울사무소 정도로 예상
- 채용: kangwonland.saramin.co.kr 또는 careerlink

---

## 7. 알려진 버그 / 주의사항

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

---

## 8. 관련 MD 파일

- **`CLAUDE.md`** (이 파일): 전체 프로젝트 맥락·데이터 업데이트 가이드
- **`MOBILE_UI_NOTES.md`**: 모바일 UI 개선 작업 전용 노트 (바텀시트, 검색 자동완성 등)
