// ANT 분석 결과의 형식 — AI 응답은 이 스키마로 강제·검증한다
// 근거 자료: 이효순(2025) 「교육정책 실행 분석 방법론으로서의 ANT의 가능성 탐색」, 『교육비평』 57호 /
//           「행위 네트워크 이론, 도서관협력수업 사례 시각화」(수업 배포 자료)
import { z } from 'zod';

export const ACTOR_TYPES = ['인간', '조직·기관', '자료·도구', '기술·시스템', '제도·규범', '물리 환경', '기타'] as const;
export const RELATION_KINDS = ['협력·지원', '정보·자료 흐름', '요청·활용', '제약·조정', '갈등·모순'] as const;
/** 칼롱의 번역 4계기 + 동원 = 수업 자료의 5단계 표 */
export const TRANSLATION_STAGES = ['문제 제기', 'OPP 설정', '관심 유도', '등록', '동원'] as const;
export const CONFIDENCE = ['높음', '보통', '낮음'] as const;

const text = z.string();
const ids = z.array(z.string());

/** 원문에서 그대로 옮긴 인용 — 프로그램이 원문과 대조해 확인한다 */
export const Evidence = z.object({ quote: text });

export const Actor = z.object({
  id: text,
  name: text,
  nature: z.enum(['인간', '비인간']),
  type: z.enum(ACTOR_TYPES),
  role: text,
  goal: text,
  evidence: z.array(Evidence),
});

export const Relation = z.object({
  from: text,
  to: text,
  kind: z.enum(RELATION_KINDS),
  label: text,
  evidence: z.array(Evidence),
});

export const TranslationStep = z.object({
  stage: z.enum(TRANSLATION_STAGES),
  found: z.boolean(),
  description: text,
  actorIds: ids,
  evidence: z.array(Evidence),
});

export const OppCandidate = z.object({
  label: text,
  passingActorIds: ids,
  reasoning: text,
  confidence: z.enum(CONFIDENCE),
  evidence: z.array(Evidence),
});

export const BlackBox = z.object({ label: text, folded: text, actorIds: ids, evidence: z.array(Evidence) });

export const Contradiction = z.object({
  label: text,
  actorIds: ids,
  description: text,
  alternative: text,
  evidence: z.array(Evidence),
});

export const AntAnalysis = z.object({
  title: text,
  summary: text,
  actors: z.array(Actor).min(2),
  relations: z.array(Relation),
  translation: z.array(TranslationStep).length(5),
  oppCandidates: z.array(OppCandidate),
  blackBoxes: z.array(BlackBox),
  contradictions: z.array(Contradiction),
  boundary: z.object({ included: text, excluded: text, invisibleOthers: z.array(text) }),
});

/** 2차 분석: 1차 결과와 비교해 인터뷰 등 추가 자료가 바꾼 것 */
export const CHANGE_KINDS = ['확인됨', '새로 나옴', '달라짐', '반박됨'] as const;
export const Change = z.object({
  kind: z.enum(CHANGE_KINDS),
  target: text,
  description: text,
  evidence: z.array(Evidence),
});
export const FollowupAnalysis = AntAnalysis.extend({ changes: z.array(Change) });

export type Evidence = z.infer<typeof Evidence>;
export type Change = z.infer<typeof Change>;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
export type FollowupAnalysis = z.infer<typeof FollowupAnalysis>;
export type Actor = z.infer<typeof Actor>;
export type Relation = z.infer<typeof Relation>;
export type TranslationStep = z.infer<typeof TranslationStep>;
export type OppCandidate = z.infer<typeof OppCandidate>;
export type BlackBox = z.infer<typeof BlackBox>;
export type Contradiction = z.infer<typeof Contradiction>;
export type AntAnalysis = z.infer<typeof AntAnalysis>;
export type ActorType = (typeof ACTOR_TYPES)[number];
export type RelationKind = (typeof RELATION_KINDS)[number];

/** 응답 정리: 없는 행위자를 가리키는 관계·ID를 빼고, 번역 단계를 표 순서로 맞춘다 */
export function tidy(a: AntAnalysis): AntAnalysis {
  const seen = new Set<string>();
  const actors = a.actors.filter((x) => x.id && !seen.has(x.id) && (seen.add(x.id), true));
  const known = (id: string) => seen.has(id);
  const keepIds = (xs: string[]) => [...new Set(xs.filter(known))];
  const relKey = new Set<string>();
  const relations = a.relations.filter((r) => {
    if (!known(r.from) || !known(r.to) || r.from === r.to) return false;
    const k = `${r.from}|${r.to}|${r.kind}`;
    if (relKey.has(k)) return false;
    relKey.add(k);
    return true;
  });
  const translation = TRANSLATION_STAGES.map(
    (stage) => {
      const t = a.translation.find((x) => x.stage === stage);
      return t ? { ...t, actorIds: keepIds(t.actorIds) } : { stage, found: false, description: '', actorIds: [], evidence: [] };
    },
  );
  return {
    ...a,
    actors,
    relations,
    translation,
    oppCandidates: a.oppCandidates.map((o) => ({ ...o, passingActorIds: keepIds(o.passingActorIds) })),
    blackBoxes: a.blackBoxes.map((b) => ({ ...b, actorIds: keepIds(b.actorIds) })),
    contradictions: a.contradictions.map((c) => ({ ...c, actorIds: keepIds(c.actorIds) })),
  };
}
