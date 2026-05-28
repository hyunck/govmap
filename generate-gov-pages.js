// generate-gov-pages.js
// data-govs.js를 읽어 정부기관별 정적 HTML 페이지 생성 + sitemap.xml 업데이트 (기존 orgs URL 유지)
// 실행: node generate-gov-pages.js

const fs   = require('fs');
const path = require('path');

// ── 데이터 로드 ───────────────────────────────────────────────
const filePath = path.join(__dirname, 'data-govs.js');
const content  = fs.readFileSync(filePath, 'utf8');
eval(content.replace('const GOVS = ', 'global.GOVS = '));
const GOVS = global.GOVS;

// ── 출력 디렉터리 ─────────────────────────────────────────────
const GOVS_DIR = path.join(__dirname, 'govs');
const BASE_URL = 'https://govmap.kr';
const TODAY    = new Date().toISOString().split('T')[0];

if (!fs.existsSync(GOVS_DIR)) fs.mkdirSync(GOVS_DIR);

// ── 유틸 ─────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// rank에 따른 소속기관 표현
const rankLabel = {
  '부': '소속·직속기관',
  '처': '소속·직속기관',
  '청': '지방청·소속기관',
  '위원회': '소속기관',
};

// rank에 따른 SEO 키워드 힌트
const rankKeyword = {
  '부': '소속기관 직속기관 발령지',
  '처': '소속기관 발령지',
  '청': '지방청 소속기관 근무지 발령지',
  '위원회': '소속기관 발령지',
};

// 기관별 추가 키워드 (SEO 강화)
const extraKeywords = {
  '국세청': '세무서 지방국세청 세무직 발령지 근무지 전국 세무서 목록 주소',
  '관세청': '세관 지방세관 관세직 근무지 발령지',
  '고용노동부': '지청 고용센터 노동청 근로감독관 근무지 발령지',
  '검찰청': '지방검찰청 지청 검사 근무지 발령지',
  '경찰청': '지방경찰청 경찰서 경찰직 근무지 발령지',
  '법무부': '교도소 구치소 교정시설 법무직 근무지',
  '국방부': '군부대 근무지 군무원',
  '행정안전부': '지방자치단체 행정직 근무지',
  '환경부': '지방환경청 환경직 근무지 발령지',
  '국토교통부': '지방국토관리청 국토직 근무지 발령지',
  '해양수산부': '해양수산청 지방청 해양직 근무지',
  '산림청': '지방산림청 국유림관리소 산림직 근무지 발령지',
  '기상청': '지방기상청 기상대 기상직 근무지 발령지',
  '특허청': '특허직 심사관 근무지',
  '조달청': '조달직 근무지 발령지',
  '통계청': '통계직 지방사무소 근무지',
  '소방청': '소방서 소방직 근무지 발령지',
  '해양경찰청': '해양경찰서 해경직 근무지 발령지',
};

// 전체 allBranches 아이템 수 계산
function countAllItems(gov) {
  return (gov.allBranches || []).reduce((s, g) => s + g.items.length, 0);
}

// 관련 정부기관 (같은 카테고리 or rank)
function getRelatedGovs(gov) {
  return GOVS
    .filter(g => g.id !== gov.id && (g.category === gov.category || g.rank === gov.rank))
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);
}

// ── HTML 생성 ─────────────────────────────────────────────────
function buildPage(gov) {
  const related      = getRelatedGovs(gov);
  const totalItems   = countAllItems(gov);
  const subLabel     = rankLabel[gov.rank] || '소속기관';
  const extraKw      = extraKeywords[gov.name] || '';
  const mainBiz      = (gov.mainBusiness || []).join(' · ');
  const examStr      = (gov.examTrack || []).join(', ');

  // 메타 description
  const desc = `${gov.name} 소속기관·지방청 전국 목록과 주소. `
    + `${gov.rank} 단위 ${gov.category} 정부기관. `
    + `본청: ${gov.address}. `
    + (totalItems > 1 ? `소속·산하기관 ${totalItems}개 위치 정보.` : '');

  // allBranches 그룹 → 섹션 HTML
  const branchSections = (gov.allBranches || []).map(group => {
    const rows = group.items.map(item => {
      if (item.address === '—' || item.address === '-') {
        return `<tr class="note-row"><td colspan="2">${escHtml(item.name)}</td></tr>`;
      }
      return `<tr>
        <td class="branch-name">${escHtml(item.name)}</td>
        <td class="branch-addr">${escHtml(item.address)}</td>
      </tr>`;
    }).join('');

    return `<div class="group-section">
      <div class="group-title">${escHtml(group.groupName)} <span class="group-count">${group.items.filter(i=>i.address!=='—'&&i.address!=='-').length}개</span></div>
      <table class="branch-table">
        <thead><tr><th>기관명</th><th>주소</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  // 관련 기관 카드
  const relatedCards = related.map(r =>
    `<a href="${BASE_URL}/govs/${encodeURIComponent(r.name)}/" class="rel-card">
       <span class="rel-badge">${escHtml(r.rank)}</span>
       <span class="rel-name">${escHtml(r.name)}</span>
       <span class="rel-cat">${escHtml(r.category)}</span>
     </a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-5Y011TCG81"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-5Y011TCG81');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(gov.name)} ${subLabel} 전국 목록·주소 | GovMap 공공기관 지도</title>
  <meta name="description" content="${escHtml(desc)}">
  <meta name="keywords" content="${escHtml(gov.name)}, ${escHtml(gov.name)} 소속기관, ${escHtml(gov.name)} 위치, ${escHtml(gov.name)} 주소, ${escHtml(gov.name)} 발령지, ${escHtml(gov.name)} 근무지, ${escHtml(gov.name)} 채용, ${escHtml(extraKw)}, 정부기관 발령지, 공무원 발령지">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE_URL}/govs/${encodeURIComponent(gov.name)}/">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/govs/${encodeURIComponent(gov.name)}/">
  <meta property="og:title" content="${escHtml(gov.name)} ${subLabel} 전국 목록 | GovMap">
  <meta property="og:description" content="${escHtml(desc)}">
  <meta property="og:locale" content="ko_KR">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "name": "${escHtml(gov.name)}",
    "url": "${escHtml(gov.homepage||'')}",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "${escHtml(gov.address)}",
      "addressCountry": "KR"
    },
    "description": "${escHtml(gov.description||'')}",
    "numberOfEmployees": { "@type": "QuantitativeValue", "value": ${totalItems} }
  }
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Pretendard', -apple-system, 'Malgun Gothic', sans-serif;
           background: #f9fafb; color: #1f2937; line-height: 1.6; }
    a { color: inherit; text-decoration: none; }
    .site-header { background: #fff; border-bottom: 1px solid #e5e7eb;
                   padding: 0 24px; height: 56px; display: flex;
                   align-items: center; justify-content: space-between;
                   position: sticky; top: 0; z-index: 10; }
    .logo { font-size: 18px; font-weight: 700; color: #7c3aed; }
    .logo span { color: #1f2937; }
    .back-btn { font-size: 13px; color: #6b7280; background: #f3f4f6;
                padding: 6px 14px; border-radius: 20px; transition: background .2s; }
    .back-btn:hover { background: #e5e7eb; }
    .container { max-width: 900px; margin: 32px auto; padding: 0 16px 80px; }
    .breadcrumb { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
    .breadcrumb a { color: #6b7280; }
    .breadcrumb a:hover { color: #7c3aed; }
    /* 타이틀 카드 */
    .title-card { background: #fff; border-radius: 16px; padding: 28px 28px 24px;
                  border: 1px solid #e5e7eb; margin-bottom: 16px; }
    .rank-badge { display: inline-block; font-size: 11px; font-weight: 700;
                  background: #7c3aed; color: #fff; padding: 3px 10px;
                  border-radius: 20px; margin-right: 6px; margin-bottom: 10px; }
    .cat-badge  { display: inline-block; font-size: 11px; font-weight: 600;
                  background: #ede9fe; color: #6d28d9; padding: 3px 10px;
                  border-radius: 20px; margin-bottom: 10px; }
    .gov-name   { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
    .gov-desc   { font-size: 14px; color: #374151; line-height: 1.7; margin-bottom: 20px; }
    .map-btn    { display: inline-flex; align-items: center; gap: 6px;
                  background: #7c3aed; color: #fff; font-size: 14px; font-weight: 600;
                  padding: 10px 22px; border-radius: 8px; transition: background .2s; }
    .map-btn:hover { background: #6d28d9; }
    /* 정보 카드 */
    .card { background: #fff; border-radius: 16px; padding: 24px 28px;
            border: 1px solid #e5e7eb; margin-bottom: 16px; }
    .card-title { font-size: 13px; font-weight: 700; color: #6b7280;
                  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
    @media(max-width:500px){ .info-grid { grid-template-columns: 1fr; } }
    .info-item label { font-size: 12px; color: #9ca3af; display: block; margin-bottom: 3px; }
    .info-item span  { font-size: 15px; font-weight: 600; color: #111827; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag { background: #f3f4f6; color: #374151; font-size: 13px;
           padding: 5px 12px; border-radius: 20px; }
    .tag-purple { background: #f5f3ff; color: #6d28d9; }
    /* 소속기관 섹션 */
    .group-section { margin-bottom: 24px; }
    .group-section:last-child { margin-bottom: 0; }
    .group-title { font-size: 14px; font-weight: 700; color: #374151;
                   padding: 8px 0; margin-bottom: 8px;
                   border-bottom: 2px solid #ede9fe; display: flex;
                   align-items: center; gap: 8px; }
    .group-count { font-size: 12px; font-weight: 600; background: #7c3aed;
                   color: #fff; padding: 2px 8px; border-radius: 20px; }
    .branch-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .branch-table thead th { background: #f9fafb; color: #9ca3af; font-size: 12px;
                             font-weight: 600; padding: 8px 12px; text-align: left;
                             border-bottom: 1px solid #e5e7eb; }
    .branch-table td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .branch-table tr:last-child td { border-bottom: none; }
    .branch-name { font-weight: 600; color: #111827; min-width: 160px; }
    .branch-addr { color: #6b7280; }
    .note-row td { color: #9ca3af; font-style: italic; font-size: 12px; padding: 6px 12px; }
    /* 요약 바 */
    .summary-bar { display: flex; gap: 24px; flex-wrap: wrap;
                   background: #f5f3ff; border-radius: 12px;
                   padding: 16px 20px; margin-bottom: 16px; }
    .summary-item { text-align: center; }
    .summary-num  { font-size: 24px; font-weight: 800; color: #7c3aed; line-height: 1; }
    .summary-lbl  { font-size: 12px; color: #6b7280; margin-top: 2px; }
    /* 관련 기관 */
    .related-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
    @media(max-width:540px){ .related-grid { grid-template-columns: repeat(2,1fr); } }
    .rel-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
                padding: 12px; display: flex; flex-direction: column; gap: 4px;
                transition: box-shadow .15s; }
    .rel-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); background: #fff; }
    .rel-badge { font-size: 10px; font-weight: 700; background: #7c3aed; color: #fff;
                 padding: 2px 8px; border-radius: 20px; width: fit-content; }
    .rel-name  { font-size: 13px; font-weight: 700; color: #111827; }
    .rel-cat   { font-size: 11px; color: #9ca3af; }
    .site-footer { text-align: center; font-size: 12px; color: #9ca3af;
                   padding: 32px 16px; border-top: 1px solid #e5e7eb; margin-top: 40px; }
    .site-footer a { color: #7c3aed; }
    @media(max-width:600px){ .branch-name { min-width: 120px; } }
  </style>
</head>
<body>

<header class="site-header">
  <a class="logo" href="${BASE_URL}">Gov<span>Map</span></a>
  <a class="back-btn" href="${BASE_URL}">← 지도로 돌아가기</a>
</header>

<div class="container">

  <nav class="breadcrumb">
    <a href="${BASE_URL}">공공기관 지도</a> &rsaquo; <a href="${BASE_URL}">정부기관</a> &rsaquo; ${escHtml(gov.name)}
  </nav>

  <!-- 타이틀 카드 -->
  <div class="title-card">
    <div>
      <span class="rank-badge">${escHtml(gov.rank)}</span>
      <span class="cat-badge">${escHtml(gov.category)}</span>
    </div>
    <div class="gov-name">${escHtml(gov.name)}</div>
    ${gov.description ? `<p class="gov-desc">${escHtml(gov.description)}</p>` : ''}
    <a class="map-btn" href="${BASE_URL}">🗺 지도에서 위치 보기</a>
  </div>

  <!-- 요약 수치 -->
  <div class="summary-bar">
    <div class="summary-item">
      <div class="summary-num">${totalItems}</div>
      <div class="summary-lbl">전국 ${subLabel} 수</div>
    </div>
    ${gov.allBranches ? gov.allBranches.map(g => `
    <div class="summary-item">
      <div class="summary-num">${g.items.filter(i=>i.address!=='—'&&i.address!=='-').length}</div>
      <div class="summary-lbl">${escHtml(g.groupName.replace(/ \(\d+개\)/,''))}</div>
    </div>`).join('') : ''}
  </div>

  <!-- 기본 정보 -->
  <div class="card">
    <div class="card-title">기관 기본 정보</div>
    <div class="info-grid">
      <div class="info-item">
        <label>본청 주소</label>
        <span>${escHtml(gov.address)}</span>
      </div>
      <div class="info-item">
        <label>지역</label>
        <span>${escHtml(gov.region)}</span>
      </div>
    </div>
  </div>

  <!-- 주요 업무 -->
  ${mainBiz ? `<div class="card">
    <div class="card-title">주요 업무</div>
    <div class="tags">
      ${(gov.mainBusiness||[]).map(b=>`<span class="tag">${escHtml(b)}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- 채용 시험 트랙 -->
  ${examStr ? `<div class="card">
    <div class="card-title">공무원 채용 시험 직렬</div>
    <div class="tags">
      ${(gov.examTrack||[]).map(e=>`<span class="tag tag-purple">${escHtml(e)}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- 전국 소속기관 전체 목록 (핵심 SEO 콘텐츠) -->
  ${gov.allBranches && gov.allBranches.length ? `
  <div class="card">
    <div class="card-title">${escHtml(gov.name)} ${subLabel} 전국 목록·주소</div>
    ${branchSections}
  </div>` : ''}

  <!-- 관련 정부기관 -->
  ${related.length ? `<div class="card">
    <div class="card-title">관련 정부기관</div>
    <div class="related-grid">${relatedCards}</div>
  </div>` : ''}

  <!-- 바로가기 -->
  <div class="card">
    <div class="card-title">바로가기</div>
    <div class="tags">
      ${gov.homepage ? `<a href="${escHtml(gov.homepage)}" target="_blank" rel="noopener" class="tag">🏛 공식 홈페이지</a>` : ''}
      <a href="${BASE_URL}" class="tag">🗺 GovMap 지도</a>
    </div>
  </div>

</div>

<footer class="site-footer">
  <p>© 2026 <a href="${BASE_URL}">GovMap 공공기관 지도</a> — 공무원·공기업 취준생을 위한 기관 정보 서비스</p>
  <p style="margin-top:6px">데이터 기준: 2026년 / 오류 제보 환영</p>
</footer>

</body>
</html>`;
}

// ── 페이지 생성 루프 ─────────────────────────────────────────
let created = 0;
const newUrls = [];

for (const gov of GOVS) {
  const dirPath  = path.join(GOVS_DIR, gov.name);
  const htmlPath = path.join(dirPath, 'index.html');
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(htmlPath, buildPage(gov), 'utf8');
  created++;
  newUrls.push(`  <url>
    <loc>${BASE_URL}/govs/${encodeURIComponent(gov.name)}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
}

// ── sitemap.xml 에 정부기관 URL 추가 (기존 orgs URL 유지) ───
const sitemapPath = path.join(__dirname, 'sitemap.xml');
const existingSitemap = fs.readFileSync(sitemapPath, 'utf8');
const updatedSitemap  = existingSitemap.replace(
  '</urlset>',
  newUrls.join('\n') + '\n</urlset>'
);
fs.writeFileSync(sitemapPath, updatedSitemap, 'utf8');

console.log(`✅ 생성 완료: ${created}개 정부기관 페이지`);
console.log(`📍 경로: govs/[기관명]/index.html`);
console.log(`🗺 sitemap.xml에 ${newUrls.length}개 URL 추가`);
