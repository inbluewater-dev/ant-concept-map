# ANT 개념도 생성기

논문·사례 글 같은 자료를 넣으면 **행위자 네트워크 이론(Actor-Network Theory)** 에 따라
**행위자 · 네트워크 · 번역(5단계) · OPP · 블랙박스 · 모순과 대안**을 찾아 개념도로 그립니다.

- 사이트: https://ant-concept-map.web.app
- 디지털도서관연구 2026-2 과제 (2026-11-04 제출)

## 무엇을 하나

| 단계 | 내용 |
|---|---|
| 입력 | PDF(본문 글자 추출) · TXT · MD 파일 또는 붙여 넣은 글. 한글(HWP) 파일은 본문을 복사해 붙여 넣기 |
| 분석 | Google Gemini(Firebase AI Logic)에 ANT 개념 정의와 분석 규칙을 주고, 정해진 JSON 형식으로만 답하게 한 뒤 검증 |
| 출력 | ① 행위자 네트워크도 ② 번역 5단계·OPP·블랙박스 도 ③ 모순과 대안 도 + 항목별 근거 표 · PNG/SVG/JSON 내려받기 |

### 설계 원칙
- **대칭성**: 인간(○)과 비인간(□) 행위자를 같은 크기로 그립니다. 색은 행위자 유형, 선은 관계 유형(파랑=협력·지원, 초록=정보·자료 흐름, 빨간 점선=갈등·모순).
- **OPP는 고르지 않고 확인한다**: "OPP는 중요하거나 중심에 있는 행위자가 아니며, 분석자가 임의로 지정하는 것이 아니라 행위자들의 목표와 관계를 분석해 확인하는 것"이라는 수업 자료의 원칙에 따라, 프로그램은 OPP를 하나로 단정하지 않고 **후보 · 그 관문을 지나는 행위자 · 각자의 목표 · 근거 · 확신 정도**를 보여 줍니다.
- **근거 확인**: 모든 항목에 원문 인용을 붙이게 하고, 그 인용이 **원문에 실제로 있는지 프로그램이 대조**해 "원문 확인 / 부분 일치 / 원문에 없음"으로 표시합니다.
- **경계(cut)와 보이지 않는 타자**를 함께 적게 해, 네트워크를 어디서 끊었는지 드러냅니다.
- 번역 단계는 칼롱의 문제 제기 → OPP 설정 → 관심 유도 → 등록 → 동원. 자료에서 확인되지 않은 단계는 빈칸으로 둡니다.

## 실행

```
npm install
npm run dev          # .env.local 없으면 샘플(Mock) 모드
npm test             # 단위 테스트
npm run test:e2e     # 화면 테스트 (샘플 모드)
```

실제 AI를 쓰려면 `.env.example`을 `.env.local`로 복사해 Firebase 값을 넣습니다(영화 수업 설계 도우미와 같은 Firebase 프로젝트·웹 앱 사용).
내 컴퓨터에서는 App Check 디버그 토큰(`VITE_APPCHECK_DEBUG_TOKEN`), 배포 사이트는 Fraud Defense 키(`VITE_RECAPTCHA_SITE_KEY`)로 App Check를 통과합니다.

## 배포

`firebase.json`의 호스팅 대상 `ant` → `.firebaserc`에서 사이트 `ant-concept-map`에 연결.

```
npx firebase-tools hosting:sites:create ant-concept-map   # 처음 한 번
npx firebase-tools deploy --only hosting:ant               # 빌드까지 자동
```

main에 반영하면 GitHub Actions가 자동으로 배포합니다(`.github/workflows/deploy.yml`, 필요한 Secrets는 파일 머리말 참고).

## 한계
- 결과는 AI 초안입니다. 특히 OPP·블랙박스 판단은 연구자가 자료로 다시 확인해야 합니다.
- 무료 등급 AI로 보낸 내용은 Google 제품 개선에 쓰일 수 있으므로 개인정보가 담긴 자료는 넣지 않습니다.
- 스캔한 그림 PDF와 HWP 파일은 직접 읽지 못합니다.

## 참고
- 이효순(2025). 교육정책 실행 분석 방법론으로서의 행위자-네트워크이론(ANT)의 가능성 탐색. 『교육비평』, 57.
- 예시 자료(`src/lib/sample.ts`)는 이 앱을 위해 새로 쓴 가상의 사례입니다.
