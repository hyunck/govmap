// _inject_seo.js — index.html에 344개 기관 정적 링크 섹션 주입 (SEO 내부 링크)
const fs = require('fs');

// data-orgs.js 로드
let src = fs.readFileSync('data-orgs.js', 'utf8')
  .replace(/^const ORGS\s*=/, 'var ORGS =')
  .replace(/window\.ORGS\s*=/, 'var ORGS =');
eval(src);

// 타입별 그룹화
const typeMap = { '공기업': [], '준정부': [], '기타공공기관': [] };
ORGS.forEach(o => { if (typeMap[o.type]) typeMap[o.type].push(o); });

const typeLabel = { '공기업': '공기업', '준정부': '준정부기관', '기타공공기관': '기타공공기관' };

// 링크 섹션 HTML 생성
let html = '\n                <!-- SEO: 전체 기관 목록 (정적 크롤링용, _inject_seo.js 자동 생성) -->\n';
html += '                <div id="org-sitemap" style="padding:12px 14px 16px;border-top:1px solid #f3f4f6;">\n';
html += '                  <h2 style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;">전체 기관 상세 정보 (344개)</h2>\n';

['공기업', '준정부', '기타공공기관'].forEach(type => {
  const orgs = typeMap[type];
  if (!orgs.length) return;
  html += `                  <div style="margin-bottom:10px;">\n`;
  html += `                    <p style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:5px;">${typeLabel[type]} (${orgs.length}개)</p>\n`;
  html += `                    <div style="display:flex;flex-wrap:wrap;gap:3px 10px;">\n`;
  orgs.forEach(o => {
    const href = '/orgs/' + encodeURIComponent(o.name) + '/';
    html += `                      <a href="${href}" style="font-size:12px;color:#374151;">${o.name}</a>\n`;
  });
  html += `                    </div>\n`;
  html += `                  </div>\n`;
});

html += '                </div>\n';

// index.html 수정
let indexSrc = fs.readFileSync('index.html', 'utf8');

const SECTION_START = '<!-- SEO: 전체 기관 목록';
const INSERT_BEFORE = '                <div style="text-align:center;font-size:11px;color:#9ca3af;padding:12px 12px 20px;border-top:1px solid #f3f4f6;">';

// 기존 섹션 제거
if (indexSrc.includes(SECTION_START)) {
  const startIdx = indexSrc.lastIndexOf('\n', indexSrc.indexOf(SECTION_START) - 1) + 1;
  const endIdx = indexSrc.indexOf(INSERT_BEFORE);
  if (startIdx >= 0 && endIdx > startIdx) {
    indexSrc = indexSrc.slice(0, startIdx) + indexSrc.slice(endIdx);
    console.log('기존 SEO 섹션 제거 완료');
  }
}

// 새 섹션 삽입
const pos = indexSrc.indexOf(INSERT_BEFORE);
if (pos === -1) throw new Error('삽입 위치를 찾을 수 없습니다: INSERT_BEFORE 마커 없음');

indexSrc = indexSrc.slice(0, pos) + html + indexSrc.slice(pos);
fs.writeFileSync('index.html', indexSrc, 'utf8');

const total = Object.values(typeMap).reduce((s, a) => s + a.length, 0);
console.log(`✅ org-sitemap 주입 완료 (총 ${total}개 링크)`);
console.log(`   공기업: ${typeMap['공기업'].length} / 준정부: ${typeMap['준정부'].length} / 기타: ${typeMap['기타공공기관'].length}`);
