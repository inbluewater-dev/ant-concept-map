// 샘플(Mock) 모드 — 인터넷·Firebase 없이 화면과 개념도를 시험한다. 예시 자료에 맞춘 고정 결과를 돌려준다.
import type { GenerateFn } from './core';
import type { AntAnalysis } from '../schema';

export const MOCK_ANALYSIS: AntAnalysis = {
  title: '(샘플) 고등학교 도서관협력수업의 행위자 네트워크',
  summary: '(샘플 결과 — 실제 AI가 아닙니다) 교과교사와 사서교사의 공동 수업이 공동 수업 설계라는 관문을 거쳐 안정되고, 결국 학교 교육과정 운영 계획 안에서 블랙박스가 되는 과정입니다.',
  actors: [
    { id: 'a1', name: '교과교사', nature: '인간', type: '인간', role: '주제 선정과 평가', goal: '교과 성취', evidence: [{ quote: '교과교사는 성취기준에 맞춘 교과 성취를 목표로 했고' }] },
    { id: 'a2', name: '사서교사', nature: '인간', type: '인간', role: '자료 검색과 출처 표기 지도', goal: '학생의 정보활용능력 향상', evidence: [{ quote: '사서교사는 학생의 정보활용능력 향상을 목표로 했다' }] },
    { id: 'a3', name: '학생', nature: '인간', type: '인간', role: '탐구 보고서 작성', goal: '보고서 완성', evidence: [{ quote: '도서관 검색시스템으로 자료를 찾아 보고서를 썼다' }] },
    { id: 'a4', name: '학교도서관 장서', nature: '비인간', type: '자료·도구', role: '탐구 자료 제공', goal: '', evidence: [{ quote: '수업에는 학교도서관 장서와 온라인 학술 데이터베이스' }] },
    { id: 'a5', name: '온라인 학술 데이터베이스', nature: '비인간', type: '기술·시스템', role: '탐구 자료 제공', goal: '', evidence: [{ quote: '온라인 학술 데이터베이스, 학교 LMS가 쓰였다' }] },
    { id: 'a6', name: '학교 LMS', nature: '비인간', type: '기술·시스템', role: '탐구 계획서 제출 통로', goal: '', evidence: [{ quote: '학생들은 LMS에 탐구 계획서를 올리고' }] },
    { id: 'a7', name: '도서관 검색시스템', nature: '비인간', type: '기술·시스템', role: '자료 찾기 도구', goal: '', evidence: [{ quote: '도서관 검색시스템으로 자료를 찾아 보고서를 썼다' }] },
    { id: 'a8', name: '시간표', nature: '비인간', type: '제도·규범', role: '협력 시간을 제약', goal: '', evidence: [{ quote: '시간표가 두 교사의 협력을 제약했다' }] },
    { id: 'a9', name: '학교 규정(평가 참여)', nature: '비인간', type: '제도·규범', role: '사서교사의 평가 참여를 막음', goal: '', evidence: [{ quote: '학교 규정상 사서교사는 평가에 참여할 수 없어' }] },
    { id: 'a10', name: '평가 기준표', nature: '비인간', type: '자료·도구', role: '사서교사 피드백을 평가에 잇는 장치', goal: '', evidence: [{ quote: '사서교사의 피드백을 평가 기준표에 반영하는 방식' }] },
    { id: 'a11', name: '학교 교육과정 운영 계획', nature: '비인간', type: '제도·규범', role: '공동 수업을 정식화', goal: '', evidence: [{ quote: '공동 수업이 학교 교육과정 운영 계획에 정식으로 들어가' }] },
  ],
  relations: [
    { from: 'a1', to: 'a2', kind: '협력·지원', label: '공동 수업', evidence: [{ quote: '국어 교과교사와 사서교사가 \'주제 탐구 보고서\' 단원을 함께 가르치기로 했다' }] },
    { from: 'a2', to: 'a1', kind: '요청·활용', label: '출처 오류 사례로 설득', evidence: [{ quote: '사서교사는 교과교사에게 지난 학기 학생 보고서의 출처 표기 오류 사례를 보여 주며' }] },
    { from: 'a2', to: 'a3', kind: '협력·지원', label: '검색·출처 표기 지도', evidence: [{ quote: '사서교사는 자료 검색과 출처 표기 지도를 맡기로' }] },
    { from: 'a3', to: 'a6', kind: '요청·활용', label: '계획서 제출', evidence: [{ quote: '학생들은 LMS에 탐구 계획서를 올리고' }] },
    { from: 'a3', to: 'a7', kind: '요청·활용', label: '자료 검색', evidence: [{ quote: '도서관 검색시스템으로 자료를 찾아 보고서를 썼다' }] },
    { from: 'a7', to: 'a4', kind: '정보·자료 흐름', label: '장서 연결', evidence: [] },
    { from: 'a5', to: 'a3', kind: '정보·자료 흐름', label: '학술 자료', evidence: [] },
    { from: 'a8', to: 'a1', kind: '제약·조정', label: '시간 부족', evidence: [{ quote: '주당 수업 시간이 부족해 도서관 활용 시간을 따로 확보하기 어려웠고' }] },
    { from: 'a8', to: 'a2', kind: '제약·조정', label: '협력 시간 제약', evidence: [{ quote: '시간표가 두 교사의 협력을 제약했다' }] },
    { from: 'a9', to: 'a2', kind: '갈등·모순', label: '평가 참여 제한', evidence: [{ quote: '역할을 둘러싼 갈등이 생겼다' }] },
    { from: 'a10', to: 'a2', kind: '협력·지원', label: '피드백 반영', evidence: [{ quote: '사서교사의 피드백을 평가 기준표에 반영하는 방식' }] },
    { from: 'a10', to: 'a1', kind: '협력·지원', label: '평가에 사용', evidence: [] },
    { from: 'a11', to: 'a1', kind: '제약·조정', label: '공동 수업 정식화', evidence: [{ quote: '공동 수업이 학교 교육과정 운영 계획에 정식으로 들어가' }] },
    { from: 'a11', to: 'a2', kind: '제약·조정', label: '공동 수업 정식화', evidence: [] },
  ],
  translation: [
    { stage: '문제 제기', found: true, description: '학생의 자료 탐색·평가 능력 부족을 공통 문제로 확인', actorIds: ['a1', 'a2', 'a3'], evidence: [{ quote: '학생들이 자료를 찾고 평가하는 능력이 부족하다는 점을 공통의 문제로 확인했다' }] },
    { stage: 'OPP 설정', found: true, description: '정보활용능력 중심의 공동 수업 설계를 두 교사가 거쳐야 할 관문으로 설정', actorIds: ['a1', 'a2'], evidence: [{ quote: '교과교사와 사서교사 모두 이 공동 설계를 거쳐야 각자의 목표를 이룰 수 있게 되었다' }] },
    { stage: '관심 유도', found: true, description: '사서교사가 출처 표기 오류 사례로 교과교사를 설득', actorIds: ['a2', 'a1'], evidence: [{ quote: '정보활용교육이 필요하다고 설득했다' }] },
    { stage: '등록', found: true, description: '주제 선정·평가(교과교사)와 검색·출처 지도(사서교사)로 역할 확정', actorIds: ['a1', 'a2'], evidence: [{ quote: '협의 끝에 교과교사는 주제 선정과 평가를, 사서교사는 자료 검색과 출처 표기 지도를 맡기로 역할을 나누었다' }] },
    { stage: '동원', found: true, description: '학생이 LMS·검색시스템으로 실제 탐구 활동을 수행', actorIds: ['a3', 'a6', 'a7'], evidence: [{ quote: '학생들은 LMS에 탐구 계획서를 올리고' }] },
  ],
  oppCandidates: [
    {
      label: '정보활용능력 중심의 공동 수업 설계',
      passingActorIds: ['a1', 'a2'],
      reasoning: '교과교사(교과 성취)와 사서교사(정보활용능력)가 각자의 목표를 이루려면 이 설계를 거쳐야 한다고 자료가 직접 밝힘',
      confidence: '높음',
      evidence: [{ quote: '교과교사와 사서교사 모두 이 공동 설계를 거쳐야 각자의 목표를 이룰 수 있게 되었다' }],
    },
    {
      label: '평가 기준표',
      passingActorIds: ['a1', 'a2'],
      reasoning: '사서교사의 지도가 평가에 반영되려면 이 기준표를 거쳐야 하지만, 모든 행위자가 반드시 거치는지는 자료에서 확인되지 않음',
      confidence: '낮음',
      evidence: [{ quote: '사서교사의 피드백을 평가 기준표에 반영하는 방식' }],
    },
  ],
  blackBoxes: [
    { label: "'원래 하는 수업'", folded: '역할 협상, 시간표 조정, 평가 참여 갈등의 조정 과정', actorIds: ['a1', 'a2', 'a11'], evidence: [{ quote: "다음 해부터는 별도 협의 없이 '원래 하는 수업'처럼 운영되었다" }] },
  ],
  contradictions: [
    { label: '수업 시간 부족', actorIds: ['a8', 'a1', 'a2'], description: '시간표가 도서관 활용 시간을 막음', alternative: '블록 수업으로 시간을 묶음', evidence: [{ quote: '두 교사는 블록 수업으로 시간을 묶고' }] },
    { label: '평가 참여를 둘러싼 역할 갈등', actorIds: ['a9', 'a2', 'a1'], description: '학교 규정상 사서교사는 평가에 참여할 수 없음', alternative: '사서교사의 피드백을 평가 기준표에 반영', evidence: [{ quote: '학교 규정상 사서교사는 평가에 참여할 수 없어 역할을 둘러싼 갈등이 생겼다' }] },
  ],
  boundary: {
    included: '한 단원의 공동 수업에 직접 관여한 교사·학생과 수업에 쓰인 자료·시스템·제도',
    excluded: '학부모, 교육청, 다른 교과 교사',
    invisibleOthers: ['학교 관리자(교육과정 운영 계획 결재)', '데이터베이스 구독 계약'],
  },
};

export const mockGenerate: GenerateFn = async () => {
  await new Promise((r) => setTimeout(r, 600));
  return JSON.stringify(MOCK_ANALYSIS);
};
