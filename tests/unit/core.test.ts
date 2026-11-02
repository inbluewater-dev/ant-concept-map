import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, nonActors, runAnalysis, type GenerateFn } from '../../src/lib/ai/core';
import { MOCK_ANALYSIS } from '../../src/lib/ai/mock';
import { SourceIndex, normalize } from '../../src/lib/evidence';
import { layoutNetwork, MAP_H, MAP_W, wrap } from '../../src/lib/layout';
import { SAMPLE_SOURCE } from '../../src/lib/sample';
import { AntAnalysis, TRANSLATION_STAGES, tidy } from '../../src/lib/schema';

const ok = JSON.stringify(MOCK_ANALYSIS);
function fake(responses: (string | Error)[]) {
  const calls: { model: string; prompt: string }[] = [];
  const g: GenerateFn = async ({ model, prompt, jsonSchema }) => {
    expect(jsonSchema.type).toBe('object');
    calls.push({ model, prompt });
    const r = responses.shift();
    if (r instanceof Error) throw r;
    return r ?? '';
  };
  return { g, calls };
}
const run = (g: GenerateFn) => runAnalysis(g, { source: SAMPLE_SOURCE, focus: '', model: DEFAULT_MODEL }, { sleep: async () => undefined });

describe('예시 결과(샘플 모드)', () => {
  it('스키마를 통과하고, 모든 근거 인용이 예시 자료에 실제로 있다', () => {
    expect(AntAnalysis.safeParse(MOCK_ANALYSIS).success).toBe(true);
    const idx = new SourceIndex(SAMPLE_SOURCE);
    const quotes = [
      ...MOCK_ANALYSIS.actors.flatMap((a) => a.evidence),
      ...MOCK_ANALYSIS.relations.flatMap((a) => a.evidence),
      ...MOCK_ANALYSIS.translation.flatMap((a) => a.evidence),
      ...MOCK_ANALYSIS.oppCandidates.flatMap((a) => a.evidence),
      ...MOCK_ANALYSIS.blackBoxes.flatMap((a) => a.evidence),
      ...MOCK_ANALYSIS.contradictions.flatMap((a) => a.evidence),
    ];
    for (const q of quotes) expect([q.quote, idx.check(q.quote)]).toEqual([q.quote, 'exact']);
  });
});

describe('근거 확인', () => {
  const idx = new SourceIndex('행위자는 사람만이 아니다.\n시간표는 두 교사의 협력을 제약하는 행위자다.');
  it('공백·줄바꿈이 달라도 원문 확인', () => expect(idx.check('사람만이 아니다. 시간표는 두 교사의')).toBe('exact'));
  it('대부분 같으면 부분 일치', () => expect(idx.check('시간표는 두 교사의 협력을 제약하는 중요한 행위자다')).toBe('partial'));
  it('없는 문장은 원문에 없음', () => expect(idx.check('교육부는 예산을 늘렸다')).toBe('missing'));
  it('따옴표 종류 차이 무시', () => expect(normalize('‘원래’')).toBe(normalize("'원래'")));
});

describe('정리(tidy)', () => {
  it('없는 행위자를 가리키는 관계·ID를 빼고 번역 단계를 표 순서로 맞춘다', () => {
    const a = tidy({
      ...MOCK_ANALYSIS,
      relations: [...MOCK_ANALYSIS.relations, { from: 'a1', to: 'zz', kind: '협력·지원', label: 'x', evidence: [] }, MOCK_ANALYSIS.relations[0]],
      translation: [...MOCK_ANALYSIS.translation].reverse(),
      oppCandidates: [{ ...MOCK_ANALYSIS.oppCandidates[0], passingActorIds: ['a1', 'nope'] }],
    });
    expect(a.relations).toHaveLength(MOCK_ANALYSIS.relations.length);
    expect(a.translation.map((t) => t.stage)).toEqual([...TRANSLATION_STAGES]);
    expect(a.oppCandidates[0].passingActorIds).toEqual(['a1']);
  });
});

describe('분석 실행', () => {
  it('지시문에 OPP 원칙과 자료가 들어간다', async () => {
    const { g, calls } = fake([ok]);
    await run(g);
    expect(calls[0].prompt).toContain('분석자가 임의로 지정하지 않는다');
    expect(calls[0].prompt).toContain('시간표가 두 교사의 협력을 제약했다');
  });
  it('형식이 틀리면 이유를 붙여 한 번 더', async () => {
    const { g, calls } = fake(['{"title":1}', ok]);
    const r = await run(g);
    expect(r.analysis.actors.length).toBeGreaterThan(2);
    expect(calls[1].prompt).toContain('스키마에 맞지 않았습니다');
  });
  it('이론·개념·저자를 행위자로 잡으면 사례 중심으로 한 번 더 받는다', async () => {
    const wrong = structuredClone(MOCK_ANALYSIS);
    wrong.actors[0].name = '칼롱의 번역 모델';
    wrong.actors[1] = { ...wrong.actors[1], nature: '인간', role: '본 연구를 수행한 저자' };
    expect(nonActors(wrong)).toEqual(['칼롱의 번역 모델', wrong.actors[1].name]);
    expect(nonActors(MOCK_ANALYSIS)).toEqual([]);
    const { g, calls } = fake([JSON.stringify(wrong), ok]);
    const r = await runAnalysis(g, { source: SAMPLE_SOURCE, focus: '', model: DEFAULT_MODEL }, { sleep: async () => {} });
    expect(calls).toHaveLength(2);
    expect(calls[1].prompt).toContain('칼롱의 번역 모델');
    expect(nonActors(r.analysis)).toEqual([]);
    // 두 번째도 틀리면 그대로 돌려준다(멈추지 않는다)
    const f2 = fake([JSON.stringify(wrong), JSON.stringify(wrong)]);
    const r2 = await runAnalysis(f2.g, { source: SAMPLE_SOURCE, focus: '', model: DEFAULT_MODEL }, { sleep: async () => {} });
    expect(r2.analysis.actors[0].name).toBe('칼롱의 번역 모델');
  });
  it('붐비면 같은 모델 재시도 후 다음 모델, 한도(429)면 바로 다음 모델', async () => {
    const busy = () => new Error('[503] high demand');
    const quota = () => new Error('[429] You exceeded your current quota');
    const a = fake([busy(), busy(), ok]);
    expect((await run(a.g)).model).toBe('gemini-3.1-flash-lite');
    const b = fake([quota(), quota(), ok]);
    expect((await run(b.g)).model).toBe('gemini-3.6-flash');
    expect(b.calls).toHaveLength(3);
  });
  it('App Check 오류는 바로 안내', async () => {
    const { g, calls } = fake([new Error('[401] Firebase App Check token is invalid')]);
    await expect(run(g)).rejects.toThrow('App Check');
    expect(calls).toHaveLength(1);
  });
});

describe('개념도 배치', () => {
  it('모든 노드가 그림 안에 있고 같은 입력이면 같은 자리', () => {
    const p1 = layoutNetwork(MOCK_ANALYSIS, true);
    const p2 = layoutNetwork(MOCK_ANALYSIS, true);
    expect(p1).toEqual(p2);
    for (const p of Object.values(p1)) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(MAP_W);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(MAP_H);
    }
    expect(Object.keys(p1)).toContain('opp0');
  });
  it('줄바꿈', () => {
    expect(wrap('정보활용능력 중심의 공동 수업 설계', 8)).toEqual(['정보활용능력', '중심의 공동', '수업 설계']);
    expect(wrap('가나다라마바사아자차카타파하', 4, 2)).toEqual(['가나다라', '마바사…']);
  });
});
