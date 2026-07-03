const fs = require('fs'), path = require('path');

let src = fs.readFileSync('data-orgs.js','utf8');
src = src.replace(/^const ORGS\s*=/, 'var ORGS =').replace(/^window\.ORGS\s*=/, 'var ORGS =');
eval(src);

const BASE_URL = 'https://govmap.kr';
const GRADES = ['S','A','B','C','D','E'];
const GRADE_LABEL  = {S:'탁월',A:'우수',B:'양호',C:'보통',D:'미흡',E:'아주미흡'};
const GRADE_COLOR  = {S:'#7c3aed',A:'#15803d',B:'#1d4ed8',C:'#4b5563',D:'#c2410c',E:'#dc2626'};
const GRADE_BG     = {S:'#faf5ff',A:'#f0fdf4',B:'#eff6ff',C:'#f9fafb',D:'#fff7ed',E:'#fef2f2'};
const GRADE_BORDER = {S:'#ddd6fe',A:'#bbf7d0',B:'#bfdbfe',C:'#e5e7eb',D:'#fed7aa',E:'#fecaca'};

const evalOrgs = ORGS.filter(o => o.evalGrade);

function byGrade(grade) {
  return evalOrgs.filter(o => o.evalGrade === grade);
}

function gradeSummary() {
  return GRADES.map(g => {
    const orgs = byGrade(g);
    if (!orgs.length) return '';
    return `<a href="#grade-${g}" class="sum-chip" style="background:${GRADE_BG[g]};border:1px solid ${GRADE_BORDER[g]};color:${GRADE_COLOR[g]};">
      <span class="sum-grade">${g}</span>
      <span class="sum-label">${GRADE_LABEL[g]}</span>
      <span class="sum-cnt">${orgs.length}개</span>
    </a>`;
  }).join('');
}

function gradeSection(grade) {
  const orgs = byGrade(grade);
  if (!orgs.length) return '';
  const pub  = orgs.filter(o => (o.evalType || o.type) === '공기업');
  const semi = orgs.filter(o => (o.evalType || o.type) !== '공기업');
  const noPay = grade === 'D' || grade === 'E';

  const GRADE_ORDER = {S:0, A:1, B:2, C:3, D:4, E:5};

  function prevGradeHtml(o) {
    if (!o.prevEvalGrade) return '';
    const cur = GRADE_ORDER[o.evalGrade] ?? 99;
    const prv = GRADE_ORDER[o.prevEvalGrade] ?? 99;
    let arrow = '';
    if (cur < prv) arrow = `<span class="arrow-up">▲</span> `;
    else if (cur > prv) arrow = `<span class="arrow-dn">▼</span> `;
    else arrow = `<span style="color:#d1d5db;">= </span>`;
    return `<span class="prev-grade">${arrow}전년 ${o.prevEvalGrade}등급</span>`;
  }

  function orgList(list) {
    return list.map(o => {
      const hasSalary = o.startingSalary || o.avgSalary;
      const salaryHtml = hasSalary
        ? `<span class="org-row-salary">`
          + (o.startingSalary ? `초봉 <strong>${o.startingSalary.toLocaleString()}만원</strong>` : '')
          + (o.startingSalary && o.avgSalary ? ' &nbsp;·&nbsp; ' : '')
          + (o.avgSalary ? `평균 <strong>${o.avgSalary.toLocaleString()}만원</strong>` : '')
          + `</span>`
        : '';
      return `
      <a href="${BASE_URL}/orgs/${encodeURIComponent(o.name)}/" class="org-row">
        <div class="org-row-left">
          <span class="org-row-name">${o.name}</span>
          ${salaryHtml}
        </div>
        <div class="org-row-right">
          ${prevGradeHtml(o)}
          <span class="bonus-badge ${noPay ? 'no' : 'yes'}">${noPay ? '성과급 미지급' : '성과급 지급'}</span>
        </div>
      </a>`;
    }).join('');
  }

  return `
  <div class="grade-section" id="grade-${grade}">
    <div class="grade-header" style="background:${GRADE_BG[grade]};border-bottom:1px solid ${GRADE_BORDER[grade]};">
      <span class="grade-badge" style="background:${GRADE_COLOR[grade]};">${grade}</span>
      <span class="grade-title" style="color:${GRADE_COLOR[grade]};">${GRADE_LABEL[grade]} <span class="grade-cnt">${orgs.length}개 기관</span></span>
    </div>
    <div class="grade-body">
      ${pub.length ? `<div class="org-group">
        <div class="group-label">공기업 (${pub.length}개)</div>
        <div class="org-list">${orgList(pub)}</div>
      </div>` : ''}
      ${semi.length ? `<div class="org-group">
        <div class="group-label">준정부기관 (${semi.length}개)</div>
        <div class="org-list">${orgList(semi)}</div>
      </div>` : ''}
    </div>
  </div>`;
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <!-- Google AdSense -->
  <meta name="google-adsense-account" content="ca-pub-4864032615853020">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4864032615853020" crossorigin="anonymous"></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-5Y011TCG81"></script>
  <script>
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','G-5Y011TCG81');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <!-- 검색 결과 (데스크탑·모바일 공통) -->
  <title>2025년도 공공기관 경영실적 평가결과 (2026 발표) | 등급·성과급 | GovMap</title>
  <meta name="description" content="2025년도 공공기관 경영실적 평가결과 (2026년 6월 기획재정부 발표). 공기업·준정부기관 88개 A우수·B양호·C보통·D미흡·E아주미흡 등급과 성과급 지급 여부를 확인하세요.">
  <meta name="keywords" content="2025년도 공공기관 경영실적 평가,2025 경영평가 결과,2026 공공기관 경영평가,공공기관 경영평가 결과 2026,공공기관 경영평가 결과 2025,기획재정부 경영평가,공기업 경영평가,준정부기관 경영평가,경평 결과,경영평가 등급,경영평가 순위,경영평가 발표,공공기관 성과급,공기업 성과급,준정부기관 성과급,경영평가 성과급,경영평가 우수,경영평가 양호,경영평가 보통,경영평가 미흡,경영평가 아주미흡,A등급 공기업,B등급 공기업,D등급 공기업,공기업 취업">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${BASE_URL}/eval/">
  <!-- OG (SNS·모바일 공유 — 짧고 핵심만) -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/eval/">
  <meta property="og:title" content="2025년도 공공기관 경영실적 평가결과 | GovMap">
  <meta property="og:description" content="공기업·준정부기관 88개 A~E등급 공개 (2026년 발표). 성과급 지급 여부까지 한눈에 확인하세요.">
  <meta property="og:locale" content="ko_KR">
  <!-- Twitter Card (X·카카오톡 등 모바일 앱 공유) -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="2025년도 공공기관 경영실적 평가결과 (2026 발표)">
  <meta name="twitter:description" content="공기업·준정부기관 88개 A~E등급 + 성과급 지급 여부 | GovMap">
  <meta property="og:locale" content="ko_KR">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "2025년도 공공기관 경영실적 평가결과 (2026년 발표)",
    "url": "${BASE_URL}/eval/",
    "description": "2025년도 공기업·준정부기관 경영실적 평가결과 전체 목록 (2026년 기획재정부 발표)",
    "publisher": { "@type": "Organization", "name": "GovMap", "url": "${BASE_URL}" }
  }
  </script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Pretendard',-apple-system,'Malgun Gothic',sans-serif;background:#f9fafb;color:#1f2937;line-height:1.6;}
    a{color:inherit;text-decoration:none;}
    .site-header{background:#fff;border-bottom:1px solid #e5e7eb;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;}
    .logo{font-size:18px;font-weight:700;color:#03c75a;}
    .logo span{color:#1f2937;}
    .back-btn{font-size:13px;color:#6b7280;background:#f3f4f6;padding:6px 14px;border-radius:20px;}
    .back-btn:hover{background:#e5e7eb;}
    .container{max-width:800px;margin:32px auto;padding:0 16px 80px;}
    .breadcrumb{font-size:13px;color:#9ca3af;margin-bottom:20px;}
    .breadcrumb a{color:#6b7280;}
    .breadcrumb a:hover{color:#03c75a;}
    /* 히어로 */
    .hero{background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:32px 28px 28px;margin-bottom:16px;}
    .hero-eyebrow{font-size:12px;font-weight:700;color:#03c75a;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;}
    .hero-title{font-size:28px;font-weight:800;margin-bottom:10px;line-height:1.3;}
    .hero-sub{font-size:14px;color:#6b7280;margin-bottom:24px;line-height:1.75;}
    /* 요약 칩 */
    .summary-row{display:flex;flex-wrap:wrap;gap:10px;}
    .sum-chip{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;transition:opacity .15s;}
    .sum-chip:hover{opacity:.75;}
    .sum-grade{font-size:18px;font-weight:900;}
    .sum-label{font-size:13px;font-weight:600;}
    .sum-cnt{font-size:12px;opacity:.7;}
    /* 안내 */
    .info-note{font-size:12px;color:#6b7280;background:#fff;border-radius:12px;padding:14px 18px;border:1px solid #e5e7eb;margin-bottom:16px;line-height:1.75;}
    /* 등급 섹션 */
    .grade-section{background:#fff;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:14px;overflow:hidden;}
    .grade-header{display:flex;align-items:center;gap:14px;padding:18px 24px;}
    .grade-badge{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;font-size:20px;font-weight:900;color:#fff;flex-shrink:0;}
    .grade-title{font-size:18px;font-weight:700;}
    .grade-cnt{font-size:13px;font-weight:500;margin-left:8px;opacity:.65;}
    .grade-body{padding:4px 20px 20px;}
    .org-group{margin-top:14px;}
    .group-label{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-left:2px;}
    .org-list{display:flex;flex-direction:column;gap:5px;}
    .org-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border-radius:10px;border:1px solid #f3f4f6;transition:background .15s;gap:10px;}
    .org-row:hover{background:#f3f4f6;border-color:#e5e7eb;}
    .org-row-left{display:flex;flex-direction:column;gap:3px;min-width:0;}
    .org-row-name{font-size:14px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .org-row-salary{font-size:12px;color:#6b7280;}
    .org-row-salary strong{color:#374151;font-weight:600;}
    .org-row-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}
    .bonus-badge{font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;white-space:nowrap;}
    .bonus-badge.yes{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;}
    .bonus-badge.no{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
    .prev-grade{font-size:11px;color:#9ca3af;white-space:nowrap;}
    .prev-grade .arrow-up{color:#15803d;font-weight:700;}
    .prev-grade .arrow-dn{color:#dc2626;font-weight:700;}
    @media(max-width:500px){
      .hero{padding:24px 20px 20px;}
      .hero-title{font-size:22px;}
      .grade-header{padding:14px 16px;}
      .grade-body{padding:4px 14px 16px;}
      .sum-chip{padding:7px 12px;}
    }
  </style>
</head>
<body>
  <header class="site-header">
    <a class="logo" href="${BASE_URL}">Gov<span>Map</span></a>
    <a class="back-btn" href="${BASE_URL}">← 지도로 돌아가기</a>
  </header>
  <div class="container">
    <div class="breadcrumb">
      <a href="${BASE_URL}">GovMap</a> &rsaquo; 2025년도 경영실적 평가결과
    </div>

    <div class="hero">
      <div class="hero-eyebrow">기획재정부 · 2026.06.19 발표 · 2025년도 경영실적 평가</div>
      <h1 class="hero-title">2025년도 공공기관 경영실적 평가결과</h1>
      <p class="hero-sub">2026년 6월 기획재정부가 발표한 2025년도 경영실적 평가결과.<br>공기업 31개 · 준정부기관 57개 총 <strong>88개 기관</strong> 등급 공개.<br>기관명을 클릭하면 연봉·지사·시험과목 상세 정보를 확인할 수 있습니다.</p>
      <div class="summary-row">
        ${gradeSummary()}
      </div>
    </div>

    <div class="info-note">
      💡 <strong>성과급 지급 기준</strong> — D·E등급은 성과급 미지급, A·B·C등급은 성과급 지급. 공기업 최대 250%, 준정부기관 최대 100% 수준이나 등급별 정확한 지급률은 기관 내부 기준에 따라 다릅니다.
    </div>

    ${GRADES.map(g => gradeSection(g)).join('')}
  </div>
  <footer style="text-align:center;font-size:12px;color:#9ca3af;padding:32px 16px;border-top:1px solid #e5e7eb;margin-top:40px;">
    <p>© 2026 <a href="${BASE_URL}" style="color:#6b7280;">GovMap 공공기관 지도</a> — 공무원·공기업 취준생을 위한 기관 정보 서비스</p>
    <p style="margin-top:6px"><a href="${BASE_URL}/privacy/" style="color:#6b7280;">개인정보처리방침</a> · 문의: <a href="mailto:acala8282@gmail.com" style="color:#6b7280;">acala8282@gmail.com</a></p>
  </footer>
</body>
</html>`;

const dir = path.join('eval');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
fs.writeFileSync(path.join(dir,'index.html'), html);
console.log('Generated: eval/index.html');
GRADES.forEach(g => {
  const cnt = byGrade(g).length;
  if (cnt) console.log(`  ${g}(${GRADE_LABEL[g]}): ${cnt}개`);
});
