import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, runFollowup, type GenerateFn } from '../../src/lib/ai/core';
import { MOCK_ANALYSIS, MOCK_FOLLOWUP } from '../../src/lib/ai/mock';
import { compare } from '../../src/lib/compare';
import { SourceIndex } from '../../src/lib/evidence';
import { buildFollowupPrompt } from '../../src/lib/prompt';
import { SAMPLE_INTERVIEWS, SAMPLE_SOURCE } from '../../src/lib/sample';
import { FollowupAnalysis } from '../../src/lib/schema';

const docs = SAMPLE_INTERVIEWS.map((d, i) => ({ name: `인터뷰 ${i + 1}`, text: d.text }));

describe('2차 분석 예시 결과(샘플 모드)', () => {
  it('스키마를 통과하고, 모든 인용이 원 자료나 인터뷰에 실제로 있다', () => {
    expect(FollowupAnalysis.safeParse(MOCK_FOLLOWUP).success).toBe(true);
    const idx = new SourceIndex(SAMPLE_SOURCE, docs);
    const m = MOCK_FOLLOWUP;
    const quotes = [m.actors, m.relations, m.translation, m.oppCandidates, m.blackBoxes, m.contradictions, m.changes].flatMap((xs) => xs.flatMap((x) => x.evidence));
    for (const q of quotes) expect([q.quote, idx.check(q.quote)]).toEqual([q.quote, 'exact']);
  });
  it('변화의 인용은 인터뷰에서 찾는다', () => {
    const idx = new SourceIndex(SAMPLE_SOURCE, docs);
    for (const c of MOCK_FOLLOWUP.changes) for (const e of c.evidence) expect(idx.where(e.quote)).toMatch(/^인터뷰 \d$/);
    expect(idx.where('시간표가 두 교사의 협력을 제약했다')).toBe('원 자료');
    expect(idx.where('교육부는 예산을 늘렸다')).toBeNull();
  });
});

describe('1차 ↔ 2차 비교', () => {
  const c = compare(MOCK_ANALYSIS, MOCK_FOLLOWUP);
  it('새 행위자·새 관계·종류가 바뀐 관계를 찾는다', () => {
    expect(c.newActors).toEqual(['교감', 'AI 챗봇', '종이 활동지']);
    expect(c.newActorIds).toEqual(['a12', 'a13', 'a14']);
    expect(c.removedActors).toEqual([]);
    expect(c.newRelations.map((r) => `${r.from}→${r.to}`)).toContain('교감→시간표');
    expect(c.changedRelations).toEqual([{ from: '평가 기준표', to: '사서교사', before: '협력·지원', after: '갈등·모순' }]);
  });
  it('id가 바뀌어도 이름이 같으면 같은 행위자로 본다', () => {
    const renumbered = { ...MOCK_ANALYSIS, actors: MOCK_ANALYSIS.actors.map((a) => ({ ...a, id: `x${a.id}` })), relations: MOCK_ANALYSIS.relations.map((r) => ({ ...r, from: `x${r.from}`, to: `x${r.to}` })) };
    const d = compare(MOCK_ANALYSIS, renumbered);
    expect(d.newActors).toEqual([]);
    expect(d.newRelations).toEqual([]);
  });
});

describe('2차 분석 실행', () => {
  it('지시문에 1차 결과·원 자료·인터뷰와 다음 id 번호가 들어가고, 근거 인용은 1차 결과에서 뺀다', () => {
    const p = buildFollowupPrompt(MOCK_ANALYSIS, SAMPLE_SOURCE, docs, '');
    expect(p).toContain('[1차 분석 결과]');
    expect(p).toContain('a12부터');
    expect(p).toContain('[인터뷰 3] 인터뷰 3');
    expect(p).toContain(SAMPLE_SOURCE.slice(0, 30));
    const prevJson = p.slice(p.indexOf('[1차 분석 결과]'), p.indexOf('[원 자료]\n'));
    expect(prevJson).not.toContain('"evidence"');
  });
  it('변화 목록과 분석을 나눠 돌려준다', async () => {
    const g: GenerateFn = async ({ jsonSchema }) => {
      expect(JSON.stringify(jsonSchema)).toContain('changes');
      return JSON.stringify(MOCK_FOLLOWUP);
    };
    const r = await runFollowup(g, { prev: MOCK_ANALYSIS, source: SAMPLE_SOURCE, interviews: docs, focus: '', model: DEFAULT_MODEL }, { sleep: async () => undefined });
    expect(r.changes).toHaveLength(5);
    expect('changes' in r.analysis).toBe(false);
    expect(r.analysis.actors).toHaveLength(14);
  });
  it('형식이 틀리면 한 번 더 받는다', async () => {
    const res = ['{"title":"x"}', JSON.stringify(MOCK_FOLLOWUP)];
    const prompts: string[] = [];
    const g: GenerateFn = async ({ prompt }) => (prompts.push(prompt), res.shift()!);
    const r = await runFollowup(g, { prev: MOCK_ANALYSIS, source: SAMPLE_SOURCE, interviews: docs, focus: '', model: DEFAULT_MODEL }, { sleep: async () => undefined });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain('JSON 스키마에 맞지 않았습니다');
    expect(r.changes.length).toBeGreaterThan(0);
  });
});
