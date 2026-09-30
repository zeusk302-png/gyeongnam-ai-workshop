# 교수 AI 활용 실습 (v2.0)

경남대학교 교수 대상 3시간 생성형 AI 실습입니다. **메일은 AI가 먼저 읽고, 판단은 교수님이 합니다.** 학생 메일, 논문, 강의평가, 강의계획서를 가상 자료로 직접 다뤄 보고 내일 해 볼 업무 하나를 정합니다.

**[강의 바로가기](https://zeusk302-png.github.io/gyeongnam-ai-workshop/)**

| 시간 | 활동 | 도구 | 자료 |
|---|---|---|---|
| 0–15분 | 교수님의 한 주는 어디로 새는가 | — | — |
| 15–20분 | 라이브 데모: 학생 메일 40통 분류와 답장 초안 | Claude 또는 Gemini (강사 시연) | `01_학생메일_40통.txt` |
| 20–25분 | 도구 지도·질문 공식·개인정보 | — | — |
| 25–70분 | 논문 5편 비교표, 인용 확인, 오디오 요약 | Gemini Notebook (구 NotebookLM) | `02A`~`02E` |
| 70–105분 | 강의평가 180개 주제 분류와 다음 학기 계획 | Claude | `03_강의평가_서술형응답.csv` |
| 105–115분 | 휴식 | | |
| 115–150분 | 강의계획서 고치기, 루브릭, 학칙 근거 답장 | Gemini | `04`, `05`, `01` |
| 150–170분 | AI로 끝나지 않는 과제와 수업 AI 정책 | Claude 또는 Gemini | `05_강의계획서_초안.md` |
| 170–180분 | 내일 해 볼 업무 하나 · 무료 계정 안내 | 아무 도구 | 개인정보를 지운 내 자료 |

모든 실습 자료는 교육용 가상 자료입니다(가상 대학 '가온대학교', 가상 교수 한도윤).

## 자료

- `docs/downloads/교수실습/` — 참가자 자료 00–06
- `docs/downloads/교수실습_자료.zip` — 참가자 자료 묶음(해설 제외). 00–06을 고치면 `교수실습/` 폴더를 90 해설만 빼고 다시 압축합니다.
- `docs/downloads/강의용/` — 강의 슬라이드 PPT·PDF (v2.0, 50장)
- **강사 진행안** = `docs/slides.json`의 발표자 노트(50장, 장마다 시간·말할 내용·질문). **정답과 확인 기준** = `docs/downloads/교수실습/90_교수실습_해설.md`. 둘 다 참가자에게 미리 나눠 주지 않습니다. 사이트의 발표자 노트는 `강사용 노트 보기`를 누르거나 주소에 `?instructor`를 붙였을 때만 보입니다.
- 이전 교직원 과정(v1.x) 자료는 사이트에서 뺐습니다. git 기록과 `제작자료/archive-v1/`에 남아 있습니다.

## 사이트 구성

`docs/`를 GitHub Pages(`main` 브랜치 `/docs`)로 게시합니다. 빌드 없이 정적 파일로 동작합니다.

- `index.html`, `styles.css`, `app.js` — 해시 라우터 한 파일. 경로: `#orientation`, `#instructor`, `#why-ai`, `#demo-email`, `#tool-comparison`, `#notebooklm-papers`, `#claude-evaluations`, `#gemini-syllabus`, `#student-ai-use`, `#tomorrow`, `#free-guide`, `#slides`, `#resources`
- `lesson-data.json` — 홈·시간표·왜 AI인가·도구 비교표와 도구 지도(출처 포함)·내일 할 일
- `professor-practice.json` — 실습 페이지(목표, 시간, 도구, 파일, 순서, 확인할 한 곳)
- `downloads/교수실습/06_복사용_질문모음.md` — 실습 페이지의 복사용 질문을 이 파일에서 직접 읽습니다
- `slides.json` — 슬라이드 뷰어(장 수와 관계없이 동작), `instructor.json`, `free-plan-data.json`

읽기 기준: 본문 19px, 15px 미만 글자 없음, 본문 폭 720px, 발표 자료와 같은 색(Gemini 파랑, Gemini Notebook 초록, Claude 테라코타).

로컬 확인:

```sh
python -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/docs/
```

완료 표시는 사용 중인 브라우저에만 저장됩니다. 글꼴과 아이콘 라이선스는 `docs/assets/fonts/`, `docs/assets/icons/`에 있습니다.
