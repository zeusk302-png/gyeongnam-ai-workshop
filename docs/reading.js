'use strict';
const lessonStages = new Map();
let aiUseReview;

function lessonView(s) {
  const t=data.tools.find(x=>x.id===s.toolId);
  const active=lessonStages.get(levelKey(s.id))||'brief';
  const stage=(id,body)=>`<div id="stage-${id}" class="lesson-stage" ${active===id?'':'hidden'}>${body}</div>`;
  const next=(id,label)=>`<button class="primary stage-next" data-stage="${id}">${label} ${icon('arrow-right')}</button>`;
  const tool=t?(['g-email','g-meeting','g-budget','n-create','c-outline'].includes(s.id)?`<a class="secondary" href="${t.url}" target="_blank" rel="noopener noreferrer">${esc(t.name)} 열기 ↗</a>`:`<p class="continue-note">앞에서 사용한 ${esc(t.name)} 대화로 돌아가 이어서 진행하세요.</p>`):'';
  const briefing=(workBrief(s)||`<section class="section"><h2>이번 활동</h2><p>${esc(s.objective)}</p></section>`)+useDecision(s)+
    (s.variantNotice?`<p class="note">${esc(s.variantNotice)}</p>`:'')+
    (s.id==='g-email'&&isExtended()?`<section class="section"><h2>먼저 세 건만 직접 처리해 보세요</h2><p>샘플에서 마지막 요청과 승인 여부를 읽고, 처리 상태와 답장에 넣을 내용을 적습니다. 3분 안에 끝내지 못한 부분도 그대로 남기세요.</p>${sourceDownloads(['업무묶음/35_비교샘플_세건.txt'])}<p class="note">이 활동은 작업 부담을 경험하는 연습입니다. 사람 3건과 AI 30건의 소요 시간으로 절감률을 계산하지 않습니다.</p></section>`:'')+
    next('work','실습 시작하기');
  const work=`<section class="section"><div class="section-heading"><h2>진행 순서</h2>${tool}</div><ol class="actions">${s.actions.map(a=>`<li>${esc(a)}</li>`).join('')}</ol></section>`+
    (s.sourceFiles?.length?`<section class="section"><h2>실습에 쓸 원문</h2><p class="note">파일 이름을 누르면 내려받습니다. 내용은 ‘원문 읽기’에서 확인할 수 있습니다.</p>${sourceDownloads(s.sourceFiles)}</section>`:'')+
    (s.prompt?`<section class="section"><h2>질문 보내기</h2>${promptCard(s.id==='g-email'&&isExtended()?'파일 첨부 후, 이 질문만 복사':s.promptIncludesSources?'질문과 원문 함께 복사':'첫 질문',s.prompt,'main')}${(s.followupPrompts||[]).map((p,i)=>promptCard(p.title,p.prompt,'follow-'+i)).join('')}</section>`:'')+
    (s.errorNote?`<div class="callout"><strong>진행 중 확인</strong><p>${esc(s.errorNote)}</p>${s.id==='g-email'&&isExtended()?downloads(['업무묶음/90_대표실습_해설.md']):''}</div>`:'')+freeHint(s.toolId)+next('review',s.id==='g-email'&&isExtended()?'결과 또는 교사 예시 검토하기':'답변을 받았으면 검토하기');
  const review=checks(s.verificationChecklist)+(s.id==='g-email'&&isExtended()?comparisonRecord(s):'')+notes(s)+
    `<details class="review-more"><summary>실제 실행 화면과 해설 보기</summary>${images(s)}${s.id==='g-email'&&isExtended()?downloads(['업무묶음/90_대표실습_해설.md']):''}${lessonClinic(s)}</details>`+bottom(s);
  return head(s,`${t?.name||'수업 마무리'} · ${String(data.steps.findIndex(x=>x.id===s.id)+1).padStart(2,'0')}`)+
    `<nav class="lesson-stages" aria-label="활동 순서">${[['brief','1','업무 확인'],['work','2','실습하기'],['review','3','결과 검토']].map(([id,n,label])=>`<button data-stage="${id}" aria-pressed="${active===id}" aria-controls="stage-${id}"><span>${n}</span>${label}</button>`).join('')}</nav>`+
    stage('brief',briefing)+stage('work',work)+stage('review',review);
}

function sourceDownloads(files) {
 return `<div class="source-list">${files.map(f=>`<div class="source-row">${downloads([f])}<button class="text-button" data-source="${esc(f)}">원문 읽기</button></div>`).join('')}</div>`;
}

function practiceView(c) {
 const id='practice-'+c.id,active=lessonStages.get(id)||'brief',s={...c,id};
 const stage=(key,body)=>`<div id="stage-${key}" class="lesson-stage" ${active===key?'':'hidden'}>${body}</div>`;
 const brief=`<section class="section"><h2>이번에 완성할 것</h2><ul>${c.deliverables.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>${esc(c.teacherNote)}</p><p class="note">180분 본 수업을 마친 뒤 진행하는 선택 과제입니다. ${c.toolId==='mixed'?'도구별 1회씩 총 3회':'첫 질문 1회'}를 추가로 사용합니다. 계정 한도가 부족하면 원문과 해설을 직접 비교하세요.</p></section><button class="primary" data-stage="work">실습 시작하기 ${icon('arrow-right')}</button>`;
 const work=`<section class="section"><h2>진행 순서</h2><p class="note">새 대화 또는 별도 노트북에서 시작하세요. 본 수업 자료와 새 승인 문서를 섞지 않습니다.</p><ol class="actions">${c.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="teaching-actions">${data.tools.filter(t=>c.toolId==='mixed'||t.id===c.toolId).map(t=>`<a class="secondary" href="${t.url}" target="_blank" rel="noopener noreferrer">${esc(t.name)} 열기 ↗</a>`).join('')}</div></section><section class="section"><h2>실습에 쓸 원문</h2>${sourceDownloads(c.sourceFiles)}</section><section class="section"><h2>질문 보내기</h2><p class="note">${c.toolId==='notebooklm'?'원문 파일을 노트북에 넣은 다음 질문을 보내세요.':c.toolId==='mixed'?'Gemini·Claude 질문에는 원문이 들어 있습니다. NotebookLM에는 28번을 소스로 추가하고 두 번째 질문을 보내세요.':'아래 질문에는 전체 원문이 포함되어 있습니다.'}</p>${promptCard(c.promptTitle||'질문과 원문',c.prompt,'main')}${(c.followupPrompts||[]).map((p,i)=>promptCard(p.title,p.prompt,'follow-'+i)).join('')}</section><button class="primary" data-stage="review">답변을 받았으면 검토하기 ${icon('arrow-right')}</button>`;
 const review=checks(c.checks)+notes(s)+`<details class="review-more"><summary>완성 예시와 실제 화면 보기</summary><p>해설에서 ${esc(c.id.toUpperCase())} 항목을 확인하세요. 날짜·상태·수치와 다음 조치가 맞는지 비교합니다.</p>${downloads([practiceBank.answerFile])}${images(c)}</details><div class="bottom-actions"><button class="complete ${saved.done.includes(id)?'is-done':''}" data-complete="${id}">${saved.done.includes(id)?'✓ 완료 표시됨':'이 단계 완료 표시'}</button><a class="secondary" href="#practice-bank">추가 실습 목록</a></div>`;
 return `<header class="lesson-head"><p class="eyebrow">추가 실습 · ${esc(toolLabel(c.toolId))} · ${c.minutes}분</p><h1>${esc(c.title)}</h1><p class="lead">${esc(c.scenario)}</p><a href="#practice-bank">목록으로 돌아가기</a></header><nav class="lesson-stages" aria-label="활동 순서">${[['brief','1','업무 확인'],['work','2','실습하기'],['review','3','결과 검토']].map(([k,n,l])=>`<button data-stage="${k}" aria-pressed="${active===k}" aria-controls="stage-${k}"><span>${n}</span>${l}</button>`).join('')}</nav>`+stage('brief',brief)+stage('work',work)+stage('review',review);
}

function useDecision(s) {
 if(!isExtended()||!['g-email','g-budget','n-create','c-outline'].includes(s.id))return '';
 const descriptions={
  'g-email':['한 줄 답장 한 건이라면 직접 쓰는 편이 낫습니다.','이번에는 문의 30건의 앞뒤 회신, 접수대장, 승인 기록을 오가며 30행 처리표와 답장 5개, 확인 요청 목록을 만듭니다. 반복되는 분류와 초안 작성을 AI에 맡겨 봅니다.','마지막 요청, 승인된 범위, 아직 확인하지 못한 일을 사람이 판단합니다. 답변이 빨리 나와도 검토와 수정이 오래 걸리면 업무에 맞지 않을 수 있습니다.'],
  'g-budget':['합계를 구하는 일은 스프레드시트가 더 적합합니다.','AI에는 견적 메모와 승인 문장에서 중복·취소·보류 항목을 골라 검토표로 정리하게 합니다. 금액은 수식으로 다시 계산합니다.','틀린 합계를 그럴듯하게 설명할 수 있습니다. 계산이 맞는지와 구매해도 되는지는 따로 확인하세요.'],
  'n-create':['짧은 공지 한 장만 읽는다면 문서 검색으로 충분합니다.','문서 네 개를 한 번 등록하고, 참가 안내·답변 대기 문의 14건·공지 수정사항에 다시 사용합니다. 질문마다 여러 문서를 왕복해 읽는 부담이 줄어드는지 확인합니다.','인용이 붙어 있어도 최신 승인인지 확인해야 합니다. 대여 기기 확보와 개인별 배정은 서로 다른 상태입니다.'],
  'c-outline':['문장 한두 줄을 다듬는 일은 직접 하는 편이 빠를 수 있습니다.','출석·설문·지출·현장 메모를 묶어 결과 보고서와 전달 메일을 만들고, 같은 수정 요청을 두 문서에 반영합니다.','집계는 수식으로 검산하고, 승인·계획·실적을 구분합니다. AI에 입력한 시간부터 최종 저장까지가 작업 시간입니다.']
 };
 const d=descriptions[s.id];
 return `<section class="section use-decision"><h2>이 업무에 AI를 쓰는 이유</h2><p class="human-option">${esc(d[0])}</p><p>${esc(d[1])}</p><p><strong>사람이 맡을 부분</strong><br>${esc(d[2])}</p></section>`;
}

function comparisonRecord(s) {
 const record=saved.comparisons?.[levelKey(s.id)]||{};
 const input=(key,label,placeholder='0')=>`<label>${label}<input inputmode="decimal" type="number" min="0" step="0.1" data-measure="${key}" value="${esc(record[key]??'')}" placeholder="${placeholder}"></label>`;
 return `<section class="section comparison-record"><h2>내 업무에서는 쓸 만했나요?</h2><p>수업에서는 사람 3건과 AI 30건을 다룹니다. 범위가 다르므로 시간을 직접 비교하지 않습니다. 같은 범위로 다시 해 본 경우에만 아래에 시간을 기록하세요.</p><details><summary>같은 업무로 소요 시간 비교하기</summary><p class="note">각 방식에서 같은 문의·산출물을 사용하세요. 순서대로 반복하면 내용을 기억하는 효과가 있으므로 결과를 일반적인 절감률로 해석하지 않습니다. 빈칸은 0분이 아닙니다.</p><div class="measure-scope">${input('manualCount','직접 처리한 문의 수 (건)')}${input('aiCount','AI로 처리한 문의 수 (건)')}</div><div class="measure-grid">${[['prepare','자료 찾기·입력 준비'],['draft','읽기·작성 / 답변 대기'],['review','검토·수정·저장']].map(([k,l])=>`<fieldset><legend>${l}</legend>${input('manual_'+k,'직접 처리 (분)')}${input('ai_'+k,'AI 사용 (분)')}</fieldset>`).join('')}</div><label class="measure-quality"><input type="checkbox" data-measure-quality ${record.quality?'checked':''}>같은 자료 버전·기준 시각·문의로 처리표·답장·확인 목록·공지 수정표를 모두 완성했고, 날짜·상태·승인 범위를 확인했습니다.</label><p class="measure-result" role="status" aria-live="polite"></p></details></section>`;
}

function bindReading() {
 document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{
   const id=b.dataset.stage;lessonStages.set(levelKey(currentId),id);
   document.querySelectorAll('.lesson-stage').forEach(p=>p.hidden=p.id!=='stage-'+id);
   document.querySelectorAll('.lesson-stages [data-stage]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.stage===id)));
   const nav=document.querySelector('.lesson-stages');nav.scrollIntoView({block:'start',behavior:'instant'});
   document.querySelector(`.lesson-stages [data-stage="${id}"]`).focus({preventScroll:true});
 }));
 document.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',async()=>{
   const d=document.querySelector('#source-dialog');d.querySelector('h2').textContent=b.dataset.source.split('/').pop().replaceAll('_',' ');d.querySelector('pre').textContent='불러오는 중입니다.';d.showModal();
   try{const r=await fetch(fileUrl(b.dataset.source));if(!r.ok)throw Error();d.querySelector('pre').textContent=await r.text()}catch{d.querySelector('pre').textContent='원문을 열지 못했습니다. 파일 내려받기를 이용하세요.'}
 }));
 const update=()=>{
   if(!document.querySelector('.comparison-record'))return;
   saved.comparisons??={};const r=saved.comparisons[levelKey(currentId)]??={};
   document.querySelectorAll('[data-measure]').forEach(i=>r[i.dataset.measure]=i.value);
   r.quality=document.querySelector('[data-measure-quality]').checked;
   const fields=['manualCount','aiCount','manual_prepare','manual_draft','manual_review','ai_prepare','ai_draft','ai_review'];
   let message='동일한 범위로 작업을 마친 뒤 시간을 기록하세요.';
   if(r.manualCount!==''&&r.aiCount!==''&&Number(r.manualCount)!==Number(r.aiCount))message='처리한 문의 수가 달라 시간 비교를 하지 않습니다.';
   else if(fields.some(k=>r[k]===''||!Number.isFinite(Number(r[k]))||Number(r[k])<0)||Number(r.manualCount)<=0||!Number.isInteger(Number(r.manualCount))||!Number.isInteger(Number(r.aiCount)))message='문의 수는 양의 정수로, 시간은 0 이상의 숫자로 모두 채워 주세요.';
   else if(!r.quality)message='같은 산출물을 완성하고 내용을 확인한 뒤 비교하세요.';
   else{const a=Number(r.manual_prepare)+Number(r.manual_draft)+Number(r.manual_review),b=Number(r.ai_prepare)+Number(r.ai_draft)+Number(r.ai_review);message=`직접 처리 ${a.toFixed(1)}분 · AI 사용 ${b.toFixed(1)}분. ${a===b?'기록한 시간은 같습니다.':a>b?`이 기록에서는 AI 사용이 ${(a-b).toFixed(1)}분 짧았습니다.`:`이 기록에서는 직접 처리가 ${(b-a).toFixed(1)}분 짧았습니다.`} 한 번의 측정 결과입니다.`}
   document.querySelector('.measure-result').textContent=message;persist();
 };
 document.querySelectorAll('[data-measure],[data-measure-quality]').forEach(i=>i.addEventListener('input',update));update();
}

function resourceView() {
 const files=extended.downloadFiles||[];
 const group=(title,text,items,open=false)=>`<details class="resource-group" ${open?'open':''}><summary>${title}<span>${items.length}개 파일</span></summary><p>${text}</p>${sourceDownloads(items)}</details>`;
 return `<header class="lesson-head"><p class="eyebrow">수업 자료</p><h1>자료실</h1><p class="lead">수업에서 지금 쓰는 원문을 골라 받으세요.<br>전체 묶음에는 기본연습과 추가 실습도 들어 있습니다.</p></header><div class="teaching-actions"><a class="primary" href="downloads/실습자료.zip" download>실습자료 전체 받기 ↓</a><button class="secondary" id="export-notes">내 검토 기록 받기 ↓</button></div>${teachingDownloads()}<section class="section"><h2>본 수업 원문</h2><p class="note">모두 교육용 가상 자료입니다. 질문·해설·정답은 AI에 넣을 원문과 구분해 두었습니다.</p>${group('Gemini · 문의 30건과 회신 60개','실습에는 37번 합본 한 개를 첨부합니다. 31~34번은 원문을 나누어 읽을 때 사용하세요.',['업무묶음/37_원문네개_합본.txt','업무묶음/31_교직원연수_운영기준.txt','업무묶음/32_변경승인_업무회신.txt','업무묶음/33_문의메일_60개.txt','업무묶음/34_접수좌석_확인대장.txt'],true)}${group('Gemini · 회의 기록과 구매 요청','30건 문의 실습과는 별도의 행사 자료입니다.',files.filter(f=>/\/1[23]_/.test(f)))}${group('NotebookLM · 안내와 변경 문서 네 개','같은 노트북에 네 원문을 등록하고 공지·FAQ·문의 처리표를 이어서 작성합니다.',files.filter(f=>/\/14[A-D]_/.test(f)))}${group('Claude · 출석·설문·운영 기록','확인한 수치를 보고서와 전달 메일에 일관되게 반영합니다.',files.filter(f=>/\/15_/.test(f)))}</section><section class="section"><h2>활동지와 검토 자료</h2>${group('문의 30건 · 직접 읽기와 결과 확인','원문과 별개인 활동지입니다. 해설은 결과를 작성한 뒤 열어 보세요.',files.filter(f=>f.startsWith('업무묶음/')&&!/\/3[1-47]_/.test(f)))}${group('기본연습 · 조작부터 익힐 때','짧은 예제로 도구의 입력과 복사 방법을 먼저 연습할 수 있습니다.',data.downloadFiles||[])}${group('이전 업무실습 안내와 참고 예제','문의 6건은 추가 실습 1의 앞선 기록으로도 사용합니다.',files.filter(f=>!f.startsWith('업무묶음/')&&!/\/1[2-5][A-D]?_/.test(f)))}</section><section class="section"><h2>180분 시간표</h2><div class="table-wrap"><table class="timeline"><thead><tr><th>시간</th><th>활동</th><th>완성할 것</th></tr></thead><tbody>${data.modules.map(m=>`<tr><td>${esc(m.timeRange)}</td><td><a href="#${m.id==='orientation'?'orientation':m.stepIds[0]}">${esc(m.title)}</a></td><td>${esc(m.description)}</td></tr>`).join('')}</tbody></table></div><p class="note">휴식은 65–70분, 115–120분입니다. 총 180분에 포함됩니다.</p><a href="#free-guide">무료 계정 사용 방법과 한도 안내 →</a></section>`;
}
