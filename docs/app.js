'use strict';
/* 교수 AI 활용 실습 v2.0 — single-file hash router */

let course, practice, instructor, freePlans, deck, promptBook = {}, currentId = 'orientation', toastTimer;
let slideIndex = 0;
let showNotes = /[?&]instructor/.test(location.search);
const storeKey = 'gn-prof-ai-v2';
let saved = { done: [], slide: 0 };
try { saved = { ...saved, ...JSON.parse(localStorage.getItem(storeKey) || '{}') }; } catch { /* storage unavailable */ }
const persist = () => { try { localStorage.setItem(storeKey, JSON.stringify(saved)); } catch { /* ignore */ } };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileUrl = p => p.split('/').map(encodeURIComponent).join('/');
const dl = p => (p.startsWith('downloads/') || p.startsWith('assets/')) ? p : 'downloads/' + p;
const baseName = p => p.split('/').pop();
const fixName = s => String(s ?? '').replace(/(?<!구 )NotebookLM/g, 'Gemini Notebook');
const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
const external = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ↗</a>`;

/* ---------- route model ---------- */
const ORDER = ['orientation', 'instructor', 'why-ai', 'demo-email', 'tool-comparison', 'notebooklm-papers', 'claude-evaluations', 'gemini-syllabus', 'student-ai-use', 'tomorrow', 'free-guide', 'resources'];
const COURSE_NAV = ['why-ai', 'demo-email', 'tool-comparison', 'notebooklm-papers', 'claude-evaluations', 'gemini-syllabus', 'student-ai-use', 'tomorrow'];
const LABELS = {
  'orientation': '수업 안내', 'instructor': '강사 소개', 'why-ai': '왜 AI인가', 'demo-email': '데모: 학생 메일 40통',
  'notebooklm-papers': '논문 5편 비교', 'claude-evaluations': '강의평가 180개', 'gemini-syllabus': '강의계획서·학칙 답장',
  'student-ai-use': '학생의 AI 사용', 'tool-comparison': '도구 지도', 'tomorrow': '내일 해 볼 업무',
  'slides': '강의 슬라이드', 'free-guide': '무료 계정 안내', 'resources': '자료실'
};
const TIMES = { 'why-ai': '0–15분', 'demo-email': '15–20분', 'tool-comparison': '20–25분', 'notebooklm-papers': '25–70분', 'claude-evaluations': '70–105분', 'gemini-syllabus': '115–150분', 'student-ai-use': '150–170분', 'tomorrow': '170–180분' };
const span = id => { const m = (TIMES[id] || '').match(/(\d+)–(\d+)/); return m ? (m[2] - m[1]) + '분' : ''; };
const ROUTES = new Set([...ORDER, 'slides', 'free-guide']);
const PROMPT_SECTIONS = { 1: 'demo-email', 2: 'notebooklm-papers', 3: 'claude-evaluations', 4: 'gemini-syllabus', 5: 'student-ai-use', 6: 'tomorrow' };
const toolOf = id => course.sectionTools[id] || (id === 'tool-comparison' ? 'search' : '');
const toolName = key => course.tools[key]?.name || '';

function toast(text) { const el = document.querySelector('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600); }

/* ---------- 06_복사용_질문모음.md parser ---------- */
function parsePromptBook(md) {
  const out = {};
  const parts = md.replace(/\r\n/g, '\n').split(/^## /m).slice(1);
  for (const part of parts) {
    const m = part.match(/^(\d+)\.\s*(.+)\n/);
    if (!m) continue;
    const route = PROMPT_SECTIONS[m[1]];
    if (!route) continue;
    const body = part.slice(m[0].length).replace(/\n---\s*$/, '');
    const subs = body.split(/^### /m);
    const intro = subs[0].split('```')[0].trim();
    const items = [];
    const readItem = (title, text) => {
      const code = text.match(/```(?:text)?\n([\s\S]*?)```/);
      if (!code) return;
      const before = text.slice(0, code.index).trim();
      const after = text.slice(code.index + code[0].length);
      const check = (after.match(/확인할 곳:\s*(.+)/) || [])[1] || '';
      items.push({ title: fixName(title.trim()), note: before, prompt: code[1].trim(), check: check.trim() });
    };
    if (subs.length > 1) subs.slice(1).forEach(s => { const nl = s.indexOf('\n'); readItem(s.slice(0, nl), s.slice(nl + 1)); });
    else readItem(m[2], subs[0]);
    out[route] = { title: fixName(m[2].trim()), intro: subs.length > 1 ? intro : '', items };
  }
  return out;
}

/* ---------- shared pieces ---------- */
function fileLinks(files) {
  return `<div class="files">${(files || []).map(f => `<a class="file" href="${fileUrl(dl(f.path || f))}" download>${esc(f.name || baseName(f))}</a>`).join('')}</div>`;
}
let promptStore = [];
function promptCard(item) {
  const i = promptStore.push(item.prompt) - 1;
  return `<article class="prompt">
    <div class="prompt-head"><h3>${esc(item.title)}</h3><button class="copy-btn" data-copy="${i}">질문 복사</button></div>
    ${item.note ? `<p class="prompt-note">${inline(item.note)}</p>` : ''}
    <pre>${esc(item.prompt)}</pre>
    ${item.check ? `<p class="prompt-check"><strong>확인할 곳</strong>${inline(item.check)}</p>` : ''}
  </article>`;
}
function pager(id) {
  const i = ORDER.indexOf(id);
  const prev = i > 0 ? ORDER[i - 1] : null, next = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : (i < 0 ? 'orientation' : null);
  const a = (r, cls, label) => r ? `<a class="${cls}" href="#${r}"><small>${label}</small><span>${cls === 'next' ? esc(LABELS[r]) + ' →' : '← ' + esc(LABELS[r])}</span></a>` : `<span class="empty"></span>`;
  return `<nav class="pager" aria-label="이전·다음">${a(prev, 'prev', '이전')}${a(next, 'next', i < 0 ? '처음으로' : '다음')}</nav>`;
}
function doneButton(id) {
  const on = saved.done.includes(id);
  return `<div class="done-row"><button class="done-btn" data-done="${id}" aria-pressed="${on}">${on ? '✓ 완료 표시됨' : '이 단계 완료 표시'}</button></div>`;
}
function stuckCallout() {
  return `<div class="callout tip"><h3>막히면</h3><p>사용량 한도에 걸리면 받은 답을 저장하고 옆 사람 화면으로 함께 확인하세요. 도구별 대처는 <a href="#free-guide">무료 계정 안내</a>에 있습니다.</p></div>`;
}
function privacyCallout() {
  return `<div class="callout warn"><h3>주의 · 개인정보</h3><p>실습 파일은 모두 교육용 가상 자료입니다. 실제 학생 이름, 학번, 성적, 메일은 AI에 넣지 않습니다.</p></div>`;
}

/* ---------- pages ---------- */
function homePage() {
  const h = course.hero, total = 180;
  return `<div class="page">
  <section class="hero">
    <div>
      <p class="hero-kicker">${esc(h.kicker)}</p>
      <h1>${esc(h.title[0])}<br><em>${esc(h.title[1].split(' 합니다')[0])}</em>${h.title[1].includes(' 합니다') ? ' 합니다' : ''}</h1>
      <p class="hero-lead">${esc(h.lead)}</p>
      <div class="hero-actions"><a class="btn btn-primary" href="#why-ai">실습 시작하기 →</a><a class="hero-link" href="#slides">강의 슬라이드 보기</a></div>
    </div>
    <div class="outcomes" aria-label="오늘 만들어 볼 것">${h.outcomes.map(o => `<a class="outcome" data-tool="${o.tool}" href="#${o.route}">${esc(o.text)}</a>`).join('')}</div>
  </section>

  <section class="block">
    <div class="block-head"><h2>오늘의 흐름</h2><span class="meta">총 180분</span></div>
    <div class="timebar" aria-hidden="true">${course.timeline.map(t => `<span data-tool="${t.tool}" style="flex:${t.end - t.start}"></span>`).join('')}</div>
    <ol class="timeline">${course.timeline.map(t => {
      const inner = `<span class="tl-time">${t.start}–${t.end}분</span>
      <span><span class="tl-title">${esc(t.title)}</span><span class="tl-kind">${esc(t.kind)}${t.route ? ' · ' + (t.end - t.start) + '분' : ''}</span></span>
      ${course.tools[t.tool] ? `<span class="chip" data-tool="${t.tool}">${esc(course.tools[t.tool].short || toolName(t.tool))}</span>` : t.tool === 'search' ? '<span class="chip" data-tool="search">도구 지도</span>' : '<span></span>'}`;
      return `<li data-tool="${t.tool}">${t.route ? `<a href="#${t.route}">${inner}</a>` : `<div class="tl-row">${inner}</div>`}</li>`;
    }).join('')}</ol>
  </section>

  <section class="block">
    <div class="block-head"><h2>시작 전 준비</h2><span class="meta">수업 전 5분</span></div>
    <div class="cards">${course.prep.map((p, i) => `<article class="card"><span class="num">${i + 1}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>${p.href ? `<a href="${fileUrl(p.href)}" download>${esc(p.link)} ↓</a>` : `<a href="#${p.route}">${esc(p.link)} →</a>`}</article>`).join('')}</div>
  </section>

  <section class="block">
    <a class="instructor-mini" href="#instructor"><img src="${esc(instructor.photo)}" alt=""><span><strong>강사 ${esc(instructor.name)}</strong><span>${esc(instructor.role)}</span></span></a>
  </section>
  </div>`;
}

function casesSection(page) {
  const w = course.whyAi, list = (w.cases || []).filter(c => (c.on || ['why-ai']).includes(page));
  if (!list.length) return '';
  return `<section class="section" id="real-cases"><h2>${esc(page === 'why-ai' ? w.casesTitle : '실제 설문으로 보면')}</h2>${list.map(c => `<article class="case">
    <h3>${esc(c.title)}</h3>
    <div class="case-figures">${(c.figures || []).map(f => `<div><strong>${esc(f.n)}</strong><span>${esc(f.label)}</span></div>`).join('')}</div>
    <p>${esc(c.text)}</p>${c.limit ? `<p class="case-limit">한계 · ${esc(c.limit)}</p>` : ''}
    <p class="sources">출처 ${(c.sources || []).map(x => external(x.url, x.title)).join('')}</p></article>`).join('')}
    ${w.casesChecked ? `<p class="checked">${esc(w.casesChecked)}</p>` : ''}</section>`;
}

function whyAiPage() {
  const w = course.whyAi, r = w.result, max = Math.max(...r.types.map(x => x[1]));
  const minutes = r.rehearsal.minutes ?? '___';
  return `<div class="page">
  <header class="lesson-head" data-tool=""><div class="lesson-meta"><span class="chip" data-tool="mixed">설명</span><span class="time">${TIMES['why-ai']}</span></div>
    <h1>${esc(w.title)}</h1><p class="lead">${esc(w.lead)}</p></header>

  <section class="section"><h2>${esc(r.title)}</h2><p>${esc(r.lead)}</p>
    <div class="funnel">${r.funnel.map(f => `<div><strong>${f.n}</strong><span>${esc(f.label)}</span>${f.note ? `<small>${esc(f.note)}</small>` : ''}</div>`).join('<span class="funnel-arrow" aria-hidden="true">→</span>')}</div>
    <div class="result-grid">
      <div class="type-bars" aria-label="유형별 메일 수">${r.types.map(([name, n]) => `<div class="type-row"><span>${esc(name)}</span><span class="bar"><i style="width:${n / max * 100}%"></i></span><strong>${n}</strong></div>`).join('')}<p class="checked">${esc(r.source)}</p></div>
      <div class="rehearsal"><span class="rehearsal-label">${esc(r.rehearsal.label)}</span><strong>${esc(minutes)}<small>분</small></strong><span>${esc(r.rehearsal.task)}</span><p>오늘 이 방에서 다시 잽니다.</p></div>
    </div>
    <div class="callout practice"><p>${esc(r.judgement)}</p></div></section>

  <section class="section"><h2>나눠서 맡깁니다</h2><div class="split">
    <div class="ai-side"><h3>${esc(w.split.ai.title)}</h3><ul>${w.split.ai.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="human-side"><h3>${esc(w.split.human.title)}</h3><ul>${w.split.human.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  </div></section>

  ${casesSection('why-ai')}

  <section class="section"><h2>${esc(w.poll.question)}</h2><ul class="poll">${w.poll.items.map(x => `<li><strong>${esc(x.title || x)}</strong>${x.text ? `<span>${esc(x.text)}</span>` : ''}</li>`).join('')}</ul></section>

  <section class="section"><h2>질문은 네 줄로 씁니다</h2><p>오늘 모든 실습 질문이 이 순서를 따릅니다.</p>
    <div class="formula">${w.formula.map(f => `<div><strong>${esc(f.label)}</strong><span>${esc(f.meaning)}</span><q>${esc(f.example)}</q></div>`).join('')}</div></section>

  <section class="section"><h2>자료를 넣기 전에</h2><div class="callout warn"><h3>주의 · 개인정보</h3><p>${esc(w.privacy)}</p><p><a href="#tool-comparison">도구별 학습 설정 보기 →</a></p></div>
    <div class="callout tip"><p>${esc(w.measure.replace('{minutes}', minutes))}</p></div></section>
  ${doneButton('why-ai')}${pager('why-ai')}</div>`;
}

function practicePage(id) {
  const s = practice.sections.find(x => x.id === id);
  const tool = toolOf(id);
  const book = promptBook[id];
  const prompts = book?.items?.length ? book.items : [{ title: '복사할 질문', prompt: s.prompt, check: '' }, ...(s.followups || [])];
  const t = course.tools[tool];
  const toolLabel = tool === 'notebook' ? t.name : fixName(s.tool);
  const openLinks = tool === 'mixed' ? [course.tools.claude, course.tools.gemini] : [t];
  const range = TIMES[id] || s.minutes + '분';
  const mins = span(id);
  return `<div class="page" data-tool="${tool}">
  <header class="lesson-head"><div class="lesson-meta"><span class="chip solid" data-tool="${tool}">${esc(toolLabel)}</span><span class="time">${esc(range)}${mins ? ' · ' + mins : ''}</span></div>
    <h1>${esc(fixName(s.title))}</h1><p class="lead">${esc(s.goal)}</p></header>

  ${casesSection(id)}
  <section class="task-box"><h2>이번에 할 일</h2><dl>
    <dt>시간</dt><dd>${esc(range)}${mins ? ` (${mins})` : ''}</dd>
    <dt>도구</dt><dd>${esc(toolLabel)} · ${openLinks.map(o => external(o.url, (o.short || o.name) + ' 열기')).join(' · ')}</dd>
    <dt>올릴 파일</dt><dd>${fileLinks(s.files)}</dd>
  </dl></section>

  <section class="section"><h2>순서</h2><ol class="steps">${s.steps.map(x => `<li>${esc(fixName(x))}</li>`).join('')}</ol></section>

  <section class="section"><h2>복사할 질문</h2>${book?.intro ? `<p>${inline(book.intro)}</p>` : ''}${prompts.map(promptCard).join('')}</section>

  <section class="section"><h2>확인할 한 곳</h2><div class="callout practice"><p class="check-callout">${esc(s.check)}</p></div>
    ${privacyCallout()}${stuckCallout()}</section>
  ${doneButton(id)}${pager(id)}</div>`;
}

function toolComparisonPage() {
  const c = course.toolComparison, s = practice.sections.find(x => x.id === 'tool-comparison');
  return `<div class="page">
  <header class="lesson-head" data-tool="search"><div class="lesson-meta"><span class="chip" data-tool="search">도구 지도</span><span class="time">${TIMES['tool-comparison']}</span></div>
    <h1>${esc(c.title)}</h1><p class="lead">${esc(c.lead)}</p></header>
  <section class="section compare"><h2>한눈에 비교</h2>${c.table.note ? `<p>${esc(c.table.note)}</p>` : ''}
    <div class="table-wrap"><table class="compare-table"><thead><tr>${c.table.columns.map(x => `<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>
    ${c.table.rows.map(r => `<tr data-tool="${r.accent}"><th scope="row">${esc(r.tool)}${r.alias ? `<small>(${esc(r.alias)})</small>` : ''}</th><td>${esc(r.basis)}</td><td>${esc(r.good)}</td><td>${esc(r.weak)}</td><td>${esc(r.free)}</td><td><strong>${esc(r.training)}</strong>${r.trainingNote ? `<small>${esc(r.trainingNote)}</small>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    ${Object.entries(c.table.footnotes || {}).map(([k, v]) => `<p class="checked">${esc(k)} ${esc(v)}</p>`).join('')}
    ${(c.table.excluded || []).map(x => `<p class="checked">목록에서 뺌: ${esc(x.tool)} — ${esc(x.reason)} (${external(x.source, '출처')})</p>`).join('')}
    ${s ? `<p class="compare-how"><strong>고르는 순서</strong> ${s.steps.map((x, i) => `${'①②③'[i] || ''} ${esc(x)}`).join(' ')}</p>` : ''}</section>
  <h2 class="section" style="margin-bottom:0">도구별 자세히</h2>
  ${c.groups.map(g => `<section class="group"><div class="group-head"><h2>${esc(g.title)}</h2></div><p class="group-basis">${esc(g.basis)}</p>
    <div class="tool-grid">${g.tools.map(t => `<article class="tool-card" data-tool="${t.accent}"><h3>${esc(t.name)}</h3><dl>
      <dt>교수님께 좋은 일</dt><dd>${esc(t.bestFor)}</dd>
      <dt class="caution">주의 · 학습 설정</dt><dd>${esc(t.caution)}</dd></dl>
      ${t.sources.length ? `<p class="sources">출처 ${t.sources.map(x => external(x.url, x.title)).join('')}</p>` : ''}</article>`).join('')}</div></section>`).join('')}
  <section class="section"><h2>한 줄로 기억하기</h2><p class="statement">${esc(c.takeaway)}</p></section>
  <section class="section"><div class="callout tip"><h3>이름이 바뀌거나 사라진 도구</h3><p>${esc(c.notice)}</p><p class="sources">${c.noticeSources.map(x => external(x.url, x.title)).join('')}</p></div>
    <p class="checked">출처 확인일 ${esc(c.checkedAt)}. 요금과 설정 이름은 바뀔 수 있습니다.</p></section>
  ${doneButton('tool-comparison')}${pager('tool-comparison')}</div>`;
}

function tomorrowPage() {
  const t = course.tomorrow, book = promptBook.tomorrow;
  const fallback = practice.sections.find(x => x.id === 'tool-comparison');
  const items = book?.items?.length ? book.items.map(x => ({ ...x, title: '내 업무용 네 줄 질문' })) : [{ title: '내 업무용 네 줄 질문', prompt: fallback?.prompt || '', check: fallback?.check || '' }];
  return `<div class="page">
  <header class="lesson-head" data-tool=""><div class="lesson-meta"><span class="chip" data-tool="mixed">정리</span><span class="time">${TIMES.tomorrow}</span></div>
    <h1>${esc(t.title)}</h1><p class="lead">${esc(t.lead)}</p></header>
  <section class="section"><h2>이 중 하나를 고르세요</h2><ul class="ideas">${t.ideas.map(x => `<li data-tool="${x.tool}"><span>${esc(x.text)}</span><span class="chip" data-tool="${x.tool}">${esc(course.tools[x.tool].short || toolName(x.tool))}</span></li>`).join('')}</ul>
    <p style="margin-top:16px">어느 도구가 맞을지 모르겠다면 <a href="#tool-comparison">도구 지도</a>를 보세요.</p></section>
  <section class="section"><h2>빈칸을 채워 질문하기</h2>${book?.intro || book?.items?.[0]?.note ? `<p>${inline(book.items[0].note || book.intro)}</p>` : ''}${items.map(x => promptCard({ ...x, note: '' })).join('')}</section>
  <section class="section"><h2>내일 아침 세 가지</h2><ul class="checklist">${t.checklist.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
  ${doneButton('tomorrow')}${pager('tomorrow')}</div>`;
}

function instructorPage() {
  const p = instructor;
  return `<div class="page">
  <header class="lesson-head" data-tool=""><div class="profile"><div>
    <div class="lesson-meta"><span class="chip" data-tool="mixed">강사 소개</span></div>
    <h1>${esc(p.name)} <span style="font-weight:600;font-size:26px;color:var(--ink-2)">${esc(p.englishName)}</span></h1>
    <p class="role">${esc(p.role)} · ${esc(p.headline)}</p><p>${esc(p.summary)}</p>
    <div class="tags">${p.focus.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
    ${external(p.website, p.websiteLabel || '강사 웹사이트')}
  </div><img class="profile-photo" src="${esc(p.photo)}" alt="${esc(p.name)} 강사 사진"></div></header>
  <section class="section"><h2>오늘 수업은 이렇게 진행합니다</h2><div class="cards">${p.coursePrinciples.map((x, i) => `<article class="card"><span class="num">${i + 1}</span><h3>${esc(x.title)}</h3><p>${esc(x.detail)}</p></article>`).join('')}</div></section>
  <section class="section"><h2>주요 경력</h2><ul class="career">${p.experience.map(x => `<li><span class="period">${esc(x.period)}</span><div><h3>${esc(x.organization)} · ${esc(x.position)}</h3><p>${esc(x.detail)}</p></div></li>`).join('')}</ul></section>
  <section class="section"><h2>개발 프로젝트</h2><ul class="career">${p.projects.map(x => `<li><span class="period">프로젝트</span><div><h3>${esc(x.title)}</h3><p>${esc(x.detail)}</p></div></li>`).join('')}</ul></section>
  <section class="section"><h2>학력·자격</h2><ul>${p.education.map(x => `<li><strong>${esc(x.name)}</strong> — ${esc(x.detail)}</li>`).join('')}<li>자격: ${p.qualifications.map(esc).join(', ')}</li></ul></section>
  ${pager('instructor')}</div>`;
}

function freeGuidePage() {
  const f = freePlans;
  const accent = { gemini: 'gemini', notebooklm: 'notebook', claude: 'claude' };
  return `<div class="page">
  <header class="lesson-head" data-tool=""><div class="lesson-meta"><span class="chip" data-tool="mixed">무료 계정 안내</span><span class="checked">공식 안내 확인 ${esc(f.checkedAt)}</span></div>
    <h1>무료 계정으로 실습하기</h1><p class="lead">${esc(f.intro)}</p></header>
  <section class="section"><h2>수업 전에 확인할 것</h2><ol class="steps">${f.preflight.map(x => `<li>${esc(x)}</li>`).join('')}</ol><p>${esc(f.scope)}</p></section>
  ${f.tools.map(t => `<section class="free-tool" data-tool="${accent[t.id]}">
    <h2>${esc(t.name)}</h2>
    <div class="callout practice"><h3>이번 수업에서 보낼 질문</h3><p>${esc(t.requestPlan)}</p></div>
    <h3>얼마나 쓸 수 있나요</h3><p><strong>${esc(t.reset)}</strong><br>${esc(t.quota)}</p>
    <ul>${t.publishedLimits.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ${t.policyNote ? `<p>${esc(t.policyNote)}</p>` : ''}
    <h3>남은 사용량 보는 곳</h3><p>${esc(t.where)}</p>
    <h3>실습 순서</h3><ol>${t.sequence.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    <h3>한도에 걸리면</h3><p>${esc(t.blocked)}</p>
    <p><a class="btn btn-secondary btn-small" href="#${t.startRoute}">이 도구 실습으로 →</a> ${external(t.toolUrl, t.name.split(' (')[0] + ' 열기')}</p>
    <p class="sources">출처 ${t.sources.map(x => external(x.url, x.title)).join('')}</p>
    ${(t.screenshots || []).length ? `<details><summary>공식 안내 화면 보기</summary>${t.screenshots.map(x => `<figure class="shot-figure"><img src="${esc(x.src)}" alt="${esc(x.caption)}" loading="lazy"><figcaption>${esc(fixName(x.caption))}</figcaption></figure>`).join('')}</details>` : ''}
  </section>`).join('')}
  <p class="section" style="max-width:var(--measure)">${esc(f.planningNote)}</p>
  ${pager('free-guide')}</div>`;
}

function slidesPage() {
  if (!deck || !deck.slides?.length) return `<div class="page"><h1>강의 슬라이드</h1><p class="lead">슬라이드를 준비하고 있습니다. 잠시 뒤 다시 열어 주세요.</p></div>`;
  slideIndex = Math.min(Math.max(slideIndex, 0), deck.slides.length - 1);
  const s = deck.slides[slideIndex], n = deck.slides.length, focus = document.body.classList.contains('slide-focus');
  const route = s.route && ROUTES.has(s.route) && s.route !== 'slides' ? s.route : null;
  return `<div class="page page-slides">
  <header class="lesson-head" data-tool="" style="margin-bottom:20px"><h1>강의 슬라이드</h1></header>
  <div class="slide-toolbar">
    <button class="btn btn-secondary btn-small" id="slide-prev" ${slideIndex === 0 ? 'disabled' : ''}>← 이전</button>
    <button class="btn btn-secondary btn-small" id="slide-next" ${slideIndex === n - 1 ? 'disabled' : ''}>다음 →</button>
    <label class="sr-only" for="slide-select">슬라이드 고르기</label>
    <select id="slide-select">${deck.slides.map((x, i) => `<option value="${i}" ${i === slideIndex ? 'selected' : ''}>${i + 1}. ${esc(fixName(x.title))}</option>`).join('')}</select>
    <button class="btn btn-secondary btn-small" id="slide-focus" aria-pressed="${focus}">${focus ? '목차 다시 보기' : '크게 보기'}</button>
    <span class="slide-counter">${slideIndex + 1} / ${n}</span>
  </div>
  <figure class="slide-frame" style="margin:0"><img src="${esc(s.image)}" alt="${slideIndex + 1}장. ${esc(fixName(s.title))}"></figure>
  <div class="slide-caption"><strong>${esc(fixName(s.title))}</strong>${route ? `<a class="btn btn-primary btn-small" href="#${route}">이 장의 실습 페이지 → ${esc(LABELS[route])}</a>` : ''}</div>
  <p style="font-size:17px;color:var(--ink-2)">키보드 ← → 로 넘깁니다.${deck.pptx ? ` <a href="${fileUrl(dl(deck.pptx))}" download>PPT 받기 ↓</a>` : ''}${deck.pdf ? ` · <a href="${fileUrl(dl(deck.pdf))}" download>PDF 받기 ↓</a>` : ''}</p>
  ${s.notes ? `<p><button class="btn btn-secondary btn-small" id="notes-toggle" aria-expanded="${showNotes}">${showNotes ? '강사용 노트 닫기' : '강사용 노트 보기'}</button></p>${showNotes ? `<div class="speaker-notes">${esc(s.notes)}</div>` : ''}` : ''}
  </div>`;
}

function resourcesPage() {
  const used = {};
  practice.sections.forEach(s => (s.files || []).forEach(f => { if (f.path !== practice.guide.path) (used[f.path] ||= []).push(s.id); }));
  const profFiles = [practice.guide, ...uniqueFiles(), practice.prompts];
  return `<div class="page">
  <header class="lesson-head" data-tool=""><div class="lesson-meta"><span class="chip" data-tool="mixed">자료실</span></div><h1>자료실</h1>
    <p class="lead">${esc(practice.note)}</p></header>
  <section class="section"><div class="block-head"><h2>교수 실습 자료</h2><a class="btn btn-primary" href="${fileUrl(course.zip)}" download>전체 받기 (zip) ↓</a></div>
    <table class="file-table"><thead><tr><th>파일</th><th>쓰는 시간</th></tr></thead><tbody>
    ${profFiles.map(f => `<tr><td><a href="${fileUrl(f.path)}" download>${esc(f.name)}</a></td><td>${(used[f.path] || []).filter(r => TIMES[r]).map(r => `${esc(LABELS[r])} <small>${TIMES[r]}</small>`).join('') || '<small>전체 안내</small>'}</td></tr>`).join('')}
    </tbody></table></section>
  <section class="section"><h2>강의 슬라이드</h2><p><a class="btn btn-secondary btn-small" href="#slides">웹에서 보기 →</a>
    ${deck?.pptx ? ` <a class="btn btn-secondary btn-small" href="${fileUrl(dl(deck.pptx))}" download>PPT ↓</a>` : ''}${deck?.pdf ? ` <a class="btn btn-secondary btn-small" href="${fileUrl(dl(deck.pdf))}" download>PDF ↓</a>` : ''}</p></section>
  <section class="section"><details><summary>강사용 자료</summary><div class="muted-box">
    <p style="margin-top:16px">정답과 확인 기준입니다. 참가자에게 미리 나눠 주지 않고, AI에 소스로 올리지 않습니다.</p>
    <p><a href="${fileUrl('downloads/교수실습/90_교수실습_해설.md')}" download>90_교수실습_해설.md ↓</a></p></div></details></section>
  ${pager('resources')}</div>`;
}
function uniqueFiles() {
  const seen = new Set(), out = [];
  practice.sections.forEach(s => (s.files || []).forEach(f => { if (!seen.has(f.path) && f.path !== practice.guide.path) { seen.add(f.path); out.push(f); } }));
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

/* ---------- nav ---------- */
function renderNav() {
  const item = (id, time) => {
    const tool = toolOf(id);
    const done = saved.done.includes(id);
    return `<a class="nav-item ${id === currentId ? 'active' : ''} ${done ? 'is-done' : ''}" ${tool ? `data-tool="${tool}"` : ''} href="#${id}" ${id === currentId ? 'aria-current="page"' : ''}>
      <span class="nav-dot ${tool ? '' : 'plain'}" aria-hidden="true">${done ? '✓' : ''}</span>
      <span>${esc(LABELS[id])}${time ? `<span class="nav-time">${time}</span>` : ''}</span></a>`;
  };
  document.querySelector('#course-nav').innerHTML = `
    <div class="nav-group"><p class="nav-label">시작</p>${item('orientation')}${item('instructor')}</div>
    <div class="nav-group"><p class="nav-label">수업 180분</p>${COURSE_NAV.map(id => item(id, TIMES[id])).join('')}</div>
    <div class="nav-group"><p class="nav-label">참고</p>${item('slides')}${item('free-guide')}${item('resources')}</div>`;
  document.querySelector('.topbar-link').toggleAttribute('aria-current', currentId === 'slides');
}

/* ---------- render ---------- */
function render() {
  let id = decodeURIComponent(location.hash.slice(1)) || 'orientation';
  if (id.startsWith('free-')) id = 'free-guide';
  if (!ROUTES.has(id)) id = 'orientation';
  const changed = id !== currentId;
  currentId = id;
  promptStore = [];
  const main = document.querySelector('#lesson');
  main.innerHTML =
    id === 'orientation' ? homePage() :
    id === 'why-ai' ? whyAiPage() :
    id === 'tool-comparison' ? toolComparisonPage() :
    id === 'tomorrow' ? tomorrowPage() :
    id === 'instructor' ? instructorPage() :
    id === 'free-guide' ? freeGuidePage() :
    id === 'slides' ? slidesPage() :
    id === 'resources' ? resourcesPage() :
    practicePage(id);
  if (id !== 'slides') document.body.classList.remove('slide-focus');
  document.title = `${LABELS[id]} | ${course.title}`;
  renderNav();
  bind();
  document.body.classList.remove('nav-open');
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', 'false');
  if (changed) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

async function copyText(text) {
  try {
    await Promise.race([navigator.clipboard.writeText(text), new Promise((_, r) => setTimeout(() => r(Error('timeout')), 1500))]);
    return true;
  } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }
}

function bind() {
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const ok = await copyText(promptStore[Number(b.dataset.copy)]);
    if (ok) { b.textContent = '복사됨 ✓'; b.classList.add('done'); setTimeout(() => { b.textContent = '질문 복사'; b.classList.remove('done'); }, 2000); toast('질문을 복사했습니다. 도구 입력란에 붙여 넣으세요.'); }
    else { const pre = b.closest('.prompt').querySelector('pre'); const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('자동 복사가 막혔습니다. 선택된 글을 Ctrl+C로 복사하세요.'); }
  }));
  document.querySelector('[data-done]')?.addEventListener('click', e => {
    const id = e.currentTarget.dataset.done;
    saved.done = saved.done.includes(id) ? saved.done.filter(x => x !== id) : [...saved.done, id];
    persist(); const y = scrollY; render(); scrollTo({ top: y, behavior: 'instant' });
  });
  const go = i => { slideIndex = i; saved.slide = i; persist(); render(); };
  document.querySelector('#slide-prev')?.addEventListener('click', () => go(slideIndex - 1));
  document.querySelector('#slide-next')?.addEventListener('click', () => go(slideIndex + 1));
  document.querySelector('#slide-select')?.addEventListener('change', e => go(Number(e.target.value)));
  document.querySelector('#notes-toggle')?.addEventListener('click', () => { showNotes = !showNotes; render(); });
  document.querySelector('#slide-focus')?.addEventListener('click', () => { document.body.classList.toggle('slide-focus'); render(); });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); return; }
  if (currentId !== 'slides' || !deck?.slides?.length || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape' && document.body.classList.contains('slide-focus')) { document.body.classList.remove('slide-focus'); render(); return; }
  const d = (e.key === 'ArrowRight' || e.key === 'PageDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'PageUp') ? -1 : 0;
  if (!d) return;
  e.preventDefault();
  const next = Math.min(Math.max(slideIndex + d, 0), deck.slides.length - 1);
  if (next !== slideIndex) { slideIndex = next; saved.slide = next; persist(); render(); }
});
document.querySelector('#menu-toggle').addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  document.querySelector('#menu-toggle').setAttribute('aria-expanded', String(open));
});

const getJson = f => fetch(f, { cache: 'no-store' }).then(r => { if (!r.ok) throw Error(f); return r.json(); });
Promise.all([
  getJson('lesson-data.json'), getJson('professor-practice.json'), getJson('instructor.json'), getJson('free-plan-data.json'),
  getJson('slides.json').catch(() => null),
  fetch(fileUrl('downloads/교수실습/06_복사용_질문모음.md'), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => '')
]).then(([c, p, i, f, s, md]) => {
  course = c; practice = p; instructor = i; freePlans = f; deck = s;
  try { promptBook = md ? parsePromptBook(md) : {}; } catch { promptBook = {}; }
  slideIndex = Number(saved.slide) || 0;
  render();
  window.addEventListener('hashchange', render);
}).catch(err => {
  document.querySelector('#lesson').innerHTML = `<div class="page"><h1>실습 자료를 불러오지 못했습니다.</h1><p class="lead">GitHub Pages 주소나 로컬 미리보기 서버로 열어 주세요. HTML 파일을 바로 열면 브라우저가 자료 읽기를 막습니다.</p><p><a class="btn btn-primary" href="downloads/교수실습_자료.zip" download>실습 자료 받기 ↓</a></p></div>`;
  console.error(err);
});
