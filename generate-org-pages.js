// generate-org-pages.js
// data-orgs.js를 읽어 기관별 정적 HTML 페이지 생성 + sitemap.xml 업데이트
// 실행: node generate-org-pages.js

const fs   = require('fs');
const path = require('path');

// ── 데이터 로드 ───────────────────────────────────────────────
const filePath = path.join(__dirname, 'data-orgs.js');
const content  = fs.readFileSync(filePath, 'utf8');
eval(content.replace('const ORGS = ', 'global.ORGS = '));
const ORGS = global.ORGS;

// ── 출력 디렉터리 ─────────────────────────────────────────────
const ORGS_DIR  = path.join(__dirname, 'orgs');
const BASE_URL  = 'https://govmap.kr';
const TODAY     = new Date().toISOString().split('T')[0];

if (!fs.existsSync(ORGS_DIR)) fs.mkdirSync(ORGS_DIR);

// ── 유틸 ─────────────────────────────────────────────────────
const regionLabel = {
  '수도권':'수도권', '경상권':'경상권', '충청권':'충청권',
  '전라권':'전라권', '강원권':'강원권', '제주권':'제주권'
};
const typeColor = {
  '공기업':   '#2563eb',
  '준정부':   '#7c3aed',
  '기타공공기관': '#059669',
  '비공공기관': '#6b7280'
};
const typeBadge = {
  '공기업':   '공기업',
  '준정부':   '준정부',
  '기타공공기관': '기타공공기관',
  '비공공기관': '비공공기관'
};

function escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function salary(n) { return n ? n.toLocaleString('ko-KR') + '만원' : '-'; }

// ── 관련 기관 (같은 type 중 무작위 6개) ─────────────────────
function getRelated(org) {
  return ORGS
    .filter(o => o.id !== org.id && o.type === org.type)
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);
}

// ── HTML 생성 ─────────────────────────────────────────────────
function buildPage(org) {
  const color   = typeColor[org.type] || '#2563eb';
  const badge   = typeBadge[org.type] || org.type;
  const related = getRelated(org);

  const ncsStr      = (org.ncs || []).join(', ');
  const examStr     = (org.examSubjects || []).join(', ');
  const majorDirs   = Object.keys(org.majorSubjects || {});
  const mainBiz     = (org.mainBusiness || []).join(' · ');
  const welStr      = (org.welfare || []).join(' · ');

  // NCS 직업기초능력 섹션: ncsOld(직렬별 구분) 우선, 없으면 ncs 단일 목록 — 본페이지(index.html)와 동일한 우선순위
  let ncsHtml = '';
  if (org.ncsOld && Object.keys(org.ncsOld).length > 0) {
    const sectorRows = Object.entries(org.ncsOld).map(([sector, items]) => `
      <div style="margin-bottom:10px;">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:6px;">${escHtml(sector)}</div>
        <div class="tags">${items.map(n=>`<span class="tag tag-blue">${escHtml(n)}</span>`).join('')}</div>
      </div>`).join('');
    ncsHtml = `<div class="card">
    <div class="card-title">NCS 직업기초능력 시험과목 (직렬별)</div>
    ${sectorRows}
  </div>`;
  } else if (ncsStr) {
    ncsHtml = `<div class="card">
    <div class="card-title">NCS 직업기초능력 시험과목</div>
    <div class="tags">
      ${(org.ncs||[]).map(n=>`<span class="tag tag-blue">${escHtml(n)}</span>`).join('')}
    </div>
  </div>`;
  }

  // 메타 description — "OOO 연봉", "OOO 위치" 검색 의도에 맞춰 핵심 수치를 앞쪽에 명시
  const desc = `${org.name} 평균연봉 ${salary(org.avgSalary)}(초임 ${salary(org.startingSalary)}), `
    + `위치: ${org.region} · ${org.address}. `
    + `${org.type} 기관 정보와 `
    + (examStr ? `시험과목(${examStr.substring(0, 40).replace(/,\s*$/, '')} 등), ` : '')
    + `채용·발령지 정보를 한눈에 확인하세요.`;

  // 직렬 + 전공 테이블 행
  const majorRows = majorDirs.map(dir =>
    `<tr><td>${escHtml(dir)}</td><td>${escHtml((org.majorSubjects||{})[dir])}</td></tr>`
  ).join('');

  // 지점 목록 (allBranches 그룹 우선, 없으면 branches flat)
  const allBranches = org.allBranches || [];
  const branchItems = (org.branches || []).map(b =>
    `<li><strong>${escHtml(b.name)}</strong> — ${escHtml(b.address)}</li>`
  ).join('');

  // 그룹화된 전국 근무지 HTML
  const allBranchesHtml = allBranches.length > 0 ? (() => {
    const totalItems = allBranches.reduce((s, g) => s + g.items.length, 0);
    return `
    <div class="branch-intro">
      💡 <strong>${escHtml(org.name)}</strong>의 전국 근무지 (총 <strong>${totalItems}곳</strong>)<br>
      📍 표시된 항목은 지도에서 위치 확인 가능, 그 외는 목록 참고용<br>
      ⚠️ 국가보안시설 등 기관 사정으로 지도에 표시되지 않은 사업장·지점이 있을 수 있어요.
    </div>
    ${allBranches.map(group => `
      <div class="allbranch-group">
        <div class="allbranch-group-title">${escHtml(group.groupName)} <span class="allbranch-count">(${group.items.length})</span></div>
        <ul class="allbranch-list">
          ${group.items.map(item => `
            <li class="allbranch-item">
              <div class="allbranch-name">${escHtml(item.name)}</div>
              ${item.address ? `<div class="allbranch-addr">${escHtml(item.address)}</div>` : ''}
            </li>`).join('')}
        </ul>
      </div>`).join('')}`;
  })() : '';

  // 관련 기관 카드
  const relatedCards = related.map(r =>
    `<a href="${BASE_URL}/orgs/${encodeURIComponent(r.name)}/" class="rel-card">
       <span class="rel-badge" style="background:${typeColor[r.type]||'#2563eb'}">${escHtml(typeBadge[r.type]||r.type)}</span>
       <span class="rel-name">${escHtml(r.name)}</span>
       <span class="rel-region">${escHtml(r.region)}</span>
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
  <title>${escHtml(org.name)} 연봉 ${salary(org.avgSalary)}·위치(${escHtml(org.region)}) | GovMap</title>
  <meta name="description" content="${escHtml(desc)}">
  <meta name="keywords" content="${escHtml(org.name)}, ${escHtml(org.name)} 연봉, ${escHtml(org.name)} 위치, ${escHtml(org.name)} 주소, ${escHtml(org.name)} 초임, ${escHtml(org.name)} 시험과목, ${escHtml(org.name)} NCS, ${escHtml(org.name)} 채용, ${escHtml(org.name)} 발령지, ${escHtml(org.shortName||'')}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE_URL}/orgs/${encodeURIComponent(org.name)}/">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/orgs/${encodeURIComponent(org.name)}/">
  <meta property="og:title" content="${escHtml(org.name)} 연봉 ${salary(org.avgSalary)}·위치(${escHtml(org.region)}) | GovMap">
  <meta property="og:description" content="${escHtml(desc)}">
  <meta property="og:locale" content="ko_KR">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "name": "${escHtml(org.name)}",
    "url": "${escHtml(org.homepage||'')}",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "${escHtml(org.address)}",
      "addressCountry": "KR"
    },
    "description": "${escHtml(org.description||'')}",
    "sameAs": "${escHtml(org.homepage||'')}"
  }
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Pretendard', -apple-system, 'Malgun Gothic', sans-serif;
           background: #f9fafb; color: #1f2937; line-height: 1.6; }
    a { color: inherit; text-decoration: none; }
    /* 헤더 */
    .site-header { background: #fff; border-bottom: 1px solid #e5e7eb;
                   padding: 0 24px; height: 56px; display: flex;
                   align-items: center; justify-content: space-between; position: sticky; top:0; z-index:10; }
    .logo { font-size: 18px; font-weight: 700; color: #03c75a; }
    .logo span { color: #1f2937; }
    .back-btn { font-size: 13px; color: #6b7280; background: #f3f4f6;
                padding: 6px 14px; border-radius: 20px; transition: background .2s; }
    .back-btn:hover { background: #e5e7eb; }
    /* 본문 */
    .container { max-width: 780px; margin: 32px auto; padding: 0 16px 80px; }
    /* 브레드크럼 */
    .breadcrumb { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
    .breadcrumb a { color: #6b7280; }
    .breadcrumb a:hover { color: #03c75a; }
    /* 타이틀 카드 */
    .title-card { background: #fff; border-radius: 16px; padding: 28px 28px 24px;
                  border: 1px solid #e5e7eb; margin-bottom: 16px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 600;
             color: #fff; padding: 3px 10px; border-radius: 20px; margin-bottom: 10px; }
    .org-name { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
    .org-short { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
    .org-desc  { font-size: 14px; color: #374151; line-height: 1.7; margin-bottom: 20px; }
    .map-btn { display: inline-flex; align-items: center; gap: 6px;
               background: #03c75a; color: #fff; font-size: 14px; font-weight: 600;
               padding: 10px 22px; border-radius: 8px; transition: background .2s; }
    .map-btn:hover { background: #02b350; }
    /* 섹션 카드 */
    .card { background: #fff; border-radius: 16px; padding: 24px 28px;
            border: 1px solid #e5e7eb; margin-bottom: 16px; }
    .card-title { font-size: 13px; font-weight: 700; color: #6b7280;
                  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 16px; }
    /* 정보 그리드 */
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    @media(max-width:500px){ .info-grid { grid-template-columns: 1fr; } }
    .info-item label { font-size: 12px; color: #9ca3af; display: block; margin-bottom: 3px; }
    .info-item span  { font-size: 15px; font-weight: 600; color: #111827; }
    .info-item.full  { grid-column: 1 / -1; }
    /* 태그 */
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag { background: #f3f4f6; color: #374151; font-size: 13px;
           padding: 5px 12px; border-radius: 20px; }
    .tag-blue   { background: #eff6ff; color: #1d4ed8; }
    .tag-purple { background: #f5f3ff; color: #6d28d9; }
    .tag-green  { background: #ecfdf5; color: #065f46; }
    /* 테이블 */
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; }
    th { font-size: 12px; color: #9ca3af; font-weight: 600; background: #f9fafb; }
    tr:last-child td { border-bottom: none; }
    /* 지점 */
    .branch-list { list-style: none; }
    .branch-list li { padding: 9px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .branch-list li:last-child { border-bottom: none; }
    .branch-list strong { color: #111827; }
    /* allBranches 그룹 */
    .branch-intro { padding: 10px 12px; background: #f0fdf4; border-radius: 8px;
                    margin-bottom: 14px; font-size: 12px; color: #374151; line-height: 1.6; }
    .branch-intro strong { color: #03c75a; }
    .allbranch-group { margin-bottom: 14px; }
    .allbranch-group-title { font-size: 13px; font-weight: 700; color: #1f2937;
                             background: #f3f4f6; padding: 7px 12px; border-radius: 6px;
                             margin-bottom: 6px; }
    .allbranch-count { font-weight: 400; color: #6b7280; font-size: 12px; }
    .allbranch-list { list-style: none; margin: 0; padding: 0; }
    .allbranch-item { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .allbranch-item:last-child { border-bottom: none; }
    .allbranch-name { color: #111827; font-weight: 500; }
    .allbranch-addr { color: #6b7280; font-size: 11px; margin-top: 2px; }
    /* 관련 기관 */
    .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media(max-width:540px){ .related-grid { grid-template-columns: repeat(2, 1fr); } }
    .rel-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
                padding: 12px; display: flex; flex-direction: column; gap: 4px;
                transition: box-shadow .15s; }
    .rel-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); background: #fff; }
    .rel-badge { font-size: 10px; font-weight: 700; color: #fff;
                 padding: 2px 8px; border-radius: 20px; width: fit-content; }
    .rel-name   { font-size: 13px; font-weight: 700; color: #111827; line-height: 1.3; }
    .rel-region { font-size: 11px; color: #9ca3af; }
    /* 푸터 */
    .site-footer { text-align: center; font-size: 12px; color: #9ca3af;
                   padding: 32px 16px; border-top: 1px solid #e5e7eb; margin-top: 40px; }
    .site-footer a { color: #03c75a; }
  </style>
</head>
<body>

<header class="site-header">
  <a class="logo" href="${BASE_URL}">Gov<span>Map</span></a>
  <a class="back-btn" href="${BASE_URL}">← 지도로 돌아가기</a>
</header>

<div class="container">

  <!-- 브레드크럼 -->
  <nav class="breadcrumb">
    <a href="${BASE_URL}">공공기관 지도</a> &rsaquo; ${escHtml(org.type)} &rsaquo; ${escHtml(org.name)}
  </nav>

  <!-- 타이틀 카드 -->
  <div class="title-card">
    <span class="badge" style="background:${color}">${escHtml(badge)}</span>
    <div class="org-name">${escHtml(org.name)}${org.shortName ? ` <small style="font-size:16px;color:#6b7280">(${escHtml(org.shortName)})</small>` : ''}</div>
    ${org.description ? `<p class="org-desc">${escHtml(org.description)}</p>` : ''}
    <a class="map-btn" href="${BASE_URL}">
      🗺 지도에서 위치 보기
    </a>
  </div>

  <!-- 기본 정보 -->
  <div class="card">
    <div class="card-title">기관 기본 정보</div>
    <div class="info-grid">
      <div class="info-item">
        <label>본사 주소</label>
        <span>${escHtml(org.address)}</span>
      </div>
      <div class="info-item">
        <label>지역</label>
        <span>${escHtml(org.region)}</span>
      </div>
      <div class="info-item">
        <label>초임 연봉</label>
        <span>${salary(org.startingSalary)}</span>
      </div>
      <div class="info-item">
        <label>평균 연봉</label>
        <span>${salary(org.avgSalary)}</span>
      </div>
      ${org.avgYears ? `<div class="info-item"><label>평균 근속연수</label><span>${org.avgYears}년</span></div>` : ''}
      ${org.industry ? `<div class="info-item"><label>산업 분야</label><span>${escHtml(org.industry)}</span></div>` : ''}
    </div>
  </div>

  <!-- 주요 사업 -->
  ${mainBiz ? `<div class="card">
    <div class="card-title">주요 사업</div>
    <div class="tags">
      ${(org.mainBusiness||[]).map(b=>`<span class="tag">${escHtml(b)}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- 복리후생 -->
  ${welStr ? `<div class="card">
    <div class="card-title">복리후생</div>
    <div class="tags">
      ${(org.welfare||[]).map(w=>`<span class="tag tag-green">${escHtml(w)}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- NCS 시험과목 -->
  ${ncsHtml}

  <!-- 직렬별 전공과목 -->
  ${majorDirs.length ? `<div class="card">
    <div class="card-title">직렬별 전공과목</div>
    <table>
      <thead><tr><th>직렬</th><th>관련 전공</th></tr></thead>
      <tbody>${majorRows}</tbody>
    </table>
  </div>` : ''}

  <!-- 전공 시험과목 -->
  ${examStr ? `<div class="card">
    <div class="card-title">전공 시험과목</div>
    <div class="tags">
      ${(org.examSubjects||[]).map(e=>`<span class="tag tag-purple">${escHtml(e)}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- 전국 사업장·지점 -->
  ${allBranchesHtml ? `<div class="card">
    <div class="card-title">전국 본사·지점·사업소</div>
    ${allBranchesHtml}
  </div>` : branchItems ? `<div class="card">
    <div class="card-title">전국 본사·지점·사업소</div>
    <div class="branch-intro">⚠️ 국가보안시설 등 기관 사정으로 지도에 표시되지 않은 사업장·지점이 있을 수 있어요.</div>
    <ul class="branch-list">${branchItems}</ul>
  </div>` : ''}

  <!-- 링크 -->
  <div class="card">
    <div class="card-title">바로가기</div>
    <div class="tags">
      ${org.homepage ? `<a href="${escHtml(org.homepage)}" target="_blank" rel="noopener" class="tag">🏛 공식 홈페이지</a>` : ''}
      ${org.recruitUrl ? `<a href="${escHtml(org.recruitUrl)}" target="_blank" rel="noopener" class="tag">📋 채용공고</a>` : ''}
      <a href="${BASE_URL}" class="tag">🗺 GovMap 지도</a>
    </div>
  </div>

  <!-- 관련 기관 -->
  ${related.length ? `<div class="card">
    <div class="card-title">같은 유형의 다른 기관</div>
    <div class="related-grid">${relatedCards}</div>
  </div>` : ''}

</div>

<footer class="site-footer">
  <p>© 2026 <a href="${BASE_URL}">GovMap 공공기관 지도</a> — 공무원·공기업 취준생을 위한 기관 정보 서비스</p>
  <p style="margin-top:6px">데이터 기준: 2026년 공채 공고 / 오류 제보 환영</p>
</footer>

</body>
</html>`;
}

// ── 페이지 생성 루프 ─────────────────────────────────────────
let created = 0;
const sitemapUrls = [`  <url>
    <loc>${BASE_URL}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`];

for (const org of ORGS) {
  const dirName  = org.name;                              // 한글 폴더명
  const dirPath  = path.join(ORGS_DIR, dirName);
  const filePath = path.join(dirPath, 'index.html');

  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

  fs.writeFileSync(filePath, buildPage(org), 'utf8');
  created++;

  const encodedName = encodeURIComponent(org.name);
  sitemapUrls.push(`  <url>
    <loc>${BASE_URL}/orgs/${encodedName}/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
}

// ── sitemap.xml 업데이트 ────────────────────────────────────
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>\n`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ 생성 완료: ${created}개 기관 페이지`);
console.log(`📍 경로: orgs/[기관명]/index.html`);
console.log(`🗺 sitemap.xml 업데이트: ${sitemapUrls.length}개 URL`);
