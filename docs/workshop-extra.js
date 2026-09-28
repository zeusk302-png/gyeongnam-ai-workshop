'use strict';
let practiceBank, lessonEnrichment, slideDeck;
let slidePage = 0;
const extraRoute = id => id === 'practice-bank' || id === 'slides' || Boolean(practiceBank?.cases.some(c => 'practice-' + c.id === id));
const practiceCase = id => practiceBank?.cases.find(c => 'practice-' + c.id === id);
const toolLabel = id => ({gemini:'Gemini',notebooklm:'NotebookLM',claude:'Claude',mixed:'종합 실습'}[id] || id);

function teachingDownloads() {
  const count=slideDeck.slides.length;
  return `<section class="section teaching-downloads"><div class="section-heading"><div><p class="eyebrow">강의 자료</p><h2>수업용 PPT와 추가 실습</h2></div></div><p>설명과 시연은 ${count}장 슬라이드로, 개별 활동은 웹 실습으로 진행합니다. 발표자 노트에는 진행 시간과 질문, 확인할 내용을 담았습니다.</p><div class="teaching-actions"><a class="primary" href="#slides">강의 슬라이드 보기</a><a class="secondary" href="${fileUrl(slideDeck.pptx)}" download>PPT 내려받기 ↓</a>${slideDeck.pdf?`<a class="secondary" href="${fileUrl(slideDeck.pdf)}" download>슬라이드 PDF ↓</a>`:''}<a class="secondary" href="#practice-bank">추가 실습 ${practiceBank.cases.length}개</a></div><p class="note">추가 실습은 180분 본 수업을 마친 뒤 선택해서 진행합니다. 별도 심화 수업이나 복습에 사용하세요.</p>${slideDeck.guide?downloads([slideDeck.guide,...(slideDeck.curriculum?[slideDeck.curriculum]:[])]):''}</section>`;
}

function enrichmentConcept(s) {
  const e=isExtended()?lessonEnrichment.steps[s.id]:null;
  return e?.concept?`<section class="section lesson-concept"><h2>${esc(e.concept.title)}</h2><p>${esc(e.concept.text)}</p></section>`:'';
}

function lessonClinic(s) {
  if(!isExtended()) return '';
  const e=lessonEnrichment.steps[s.id];
  const related=practiceBank.cases.filter(c=>c.relatedStep===s.id);
  let body='';
  if(e) body+=`<section class="section"><h2>시간을 나누어 진행하기</h2><ol class="lesson-timing">${e.runOfShow.map(x=>`<li><strong>${x.minutes}분</strong><span>${esc(x.activity)}</span></li>`).join('')}</ol><p class="note">위 ${s.endMinute-s.startMinute}분 활동 안에서 설명·작성·확인을 나눈 시간입니다.</p></section><section class="section"><h2>작성한 뒤 함께 확인하기</h2><ul class="review-questions">${e.peerReview.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><details class="worked-example"><summary>${esc(e.workedExample.title)} · 검토 예시 펼치기</summary><p class="note">강사가 작성한 비교 예시입니다. 실제 AI 응답 캡처와 구분해서 보세요.</p><div class="example-pair"><div><h3>검토 전</h3><p>${esc(e.workedExample.before)}</p></div><div><h3>검토 후</h3><p>${esc(e.workedExample.after)}</p></div></div><p class="example-reason">${esc(e.workedExample.reason)}</p></details>${e.challenge?`<details class="worked-example"><summary>${esc(e.challenge.title)} · 선택 활동</summary><p>${esc(e.challenge.instructions)}</p><p class="note">${e.challenge.minutes}분 정도. ${s.id==='g-email'?'수업 후에 진행하며 추가 AI 사용량이 듭니다. 계정 한도가 부족하면 미뤄 두세요.':'먼저 마쳤을 때 남은 시간에 하거나 수업 후 이어서 합니다.'}</p></details>`:''}</section>`;
  if(related.length) body+=`<section class="section related-practice"><h2>수업 후 이어서 해 볼 실습</h2>${related.map(c=>`<a href="#practice-${c.id}"><strong>${esc(c.title)}</strong><span>${c.minutes}분 · ${toolLabel(c.toolId)} ${icon('arrow-right')}</span></a>`).join('')}</section>`;
  return body;
}

function practiceIndex() {
  const total=practiceBank.cases.reduce((s,c)=>s+c.minutes,0);
  const done=practiceBank.cases.filter(c=>saved.done.includes('practice-'+c.id)).length;
  return `<header class="lesson-head"><p class="eyebrow">추가 실습과 복습</p><h1>업무가 바뀌었을 때 이어서 처리하기</h1><p class="lead">새 회신과 수정 문서가 도착한 상황입니다. 기존 결과물을 고쳐서 다음 담당자에게 넘깁니다.</p><div class="meta"><span class="pill">${practiceBank.cases.length}개 과제</span><span class="pill">전체 약 ${total}분</span><span class="pill">${done}개 완료</span></div></header><div class="callout"><strong>하나씩 골라 진행하세요.</strong><p>본 수업은 180분입니다. 아래 8개는 본 수업을 마친 뒤 고르는 선택·복습 과제입니다. 본 수업 중 남는 시간에는 각 단계의 짧은 직접 수정 활동을 진행하세요. 추가 실습에서 AI에 보내는 질문은 본 수업의 무료 계정 질문 계획에 포함되지 않습니다. 한도에 걸리면 원문과 해설을 대조하며 직접 수정하세요.</p></div><section class="section"><div class="practice-list">${practiceBank.cases.map((c,i)=>`<article class="practice-row"><span class="practice-number">${String(i+1).padStart(2,'0')}</span><div><p class="eyebrow">${toolLabel(c.toolId)} · ${c.minutes}분</p><h2><a href="#practice-${c.id}">${esc(c.title)}</a></h2><p>${esc(c.scenario)}</p><p class="note">남길 결과: ${c.deliverables.map(esc).join(', ')}</p></div><a class="practice-go" href="#practice-${c.id}" aria-label="${esc(c.title)} 시작">${saved.done.includes('practice-'+c.id)?'완료한 실습 다시 보기':'실습 시작'} ${icon('arrow-right')}</a></article>`).join('')}</div></section><section class="section"><h2>자료 내려받기</h2>${downloads(practiceBank.downloadFiles.filter(f=>f!==practiceBank.answerFile))}<details class="worked-example"><summary>추가 실습 해설 · 활동을 마친 뒤 확인</summary><p>계산값, 상태 판단, 완성 예시와 흔한 오류를 모았습니다.</p>${downloads([practiceBank.answerFile])}</details></section><a class="secondary" href="#resources">전체 자료실</a>`;
}

function practiceDetail(c) { return practiceView(c); }

function slidesPage() {
  const s=slideDeck.slides[Math.min(slidePage,slideDeck.slides.length-1)];
  if(!s) return '<h1>강의 슬라이드</h1><p>슬라이드 자료를 준비하고 있습니다.</p>';
  return `<header class="lesson-head"><p class="eyebrow">강의용 프레젠테이션</p><h1>수업용 PPT</h1><p class="lead">설명은 슬라이드로 진행하고, 각 장의 실습 링크에서 직접 작성합니다.</p></header><div class="teaching-actions"><a class="primary" href="${fileUrl(slideDeck.pptx)}" download>편집 가능한 PPT 받기 ↓</a>${slideDeck.pdf?`<a class="secondary" href="${fileUrl(slideDeck.pdf)}" download>슬라이드 PDF ↓</a>`:''}<button class="secondary" id="slide-focus" aria-pressed="${document.body.classList.contains('slide-focus')}">${document.body.classList.contains('slide-focus')?'목차와 함께 보기':'슬라이드 크게 보기'}</button></div><section class="section slide-stage" aria-label="강의 슬라이드"><div class="slide-controls"><button class="secondary" id="slide-prev" ${slidePage===0?'disabled':''}>이전 장</button><label for="slide-select" class="sr-only">이동할 슬라이드</label><select id="slide-select">${slideDeck.slides.map((x,i)=>`<option value="${i}" ${i===slidePage?'selected':''}>${i+1}. ${esc(x.title)}</option>`).join('')}</select><button class="secondary" id="slide-next" ${slidePage===slideDeck.slides.length-1?'disabled':''}>다음 장</button></div><figure><img class="slide-image" src="${esc(s.image)}" alt="${slidePage+1}장. ${esc(s.title)}"><figcaption>${slidePage+1} / ${slideDeck.slides.length} · ${esc(s.title)}</figcaption></figure>${s.route?`<a class="primary" href="#${esc(s.route)}">이 장의 실습 열기 ${icon('arrow-right')}</a>`:''}<p class="note">키보드 ← →로 이동할 수 있습니다. 슬라이드의 텍스트와 표는 PPT에서 편집할 수 있습니다.</p><details class="worked-example"><summary>강사용 발표자 노트</summary><div class="speaker-notes">${esc(s.notes||'')}</div></details></section>${slideDeck.guide?downloads([slideDeck.guide,...(slideDeck.curriculum?[slideDeck.curriculum]:[])]):''}`;
}

function bindExtras() {
  const change=next=>{slidePage=Math.min(Math.max(next,0),slideDeck.slides.length-1);render();};
  document.querySelector('#slide-prev')?.addEventListener('click',()=>change(slidePage-1));
  document.querySelector('#slide-next')?.addEventListener('click',()=>change(slidePage+1));
  document.querySelector('#slide-select')?.addEventListener('change',e=>change(Number(e.target.value)));
  document.querySelector('#slide-focus')?.addEventListener('click',()=>{document.body.classList.toggle('slide-focus');render();});
}
document.addEventListener('keydown',event=>{
  if(currentId!=='slides'||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
    event.preventDefault();slidePage=Math.min(Math.max(slidePage+(event.key==='ArrowRight'?1:-1),0),slideDeck.slides.length-1);render();
  }
});
