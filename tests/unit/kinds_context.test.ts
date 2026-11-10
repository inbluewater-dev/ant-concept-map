import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, runAnalysis, type GenerateFn } from '../../src/lib/ai/core';
import { MOCK_ANALYSIS, mockGenerate } from '../../src/lib/ai/mock';
import { SourceIndex, normalize, normalizeWithMap } from '../../src/lib/evidence';
import { kindOrder, relationStyle } from '../../src/lib/palette';
import { buildPrompt } from '../../src/lib/prompt';
import { SAMPLE_INTERVIEWS, SAMPLE_SOURCE } from '../../src/lib/sample';
import { DEFAULT_RELATION_KINDS, analysisSchemas, cleanKinds } from '../../src/lib/schema';

const CUSTOM = [
  { name: '권력·통제', description: '한쪽이 다른 쪽의 행동을 정하는 관계' },
  { name: '협력·지원', description: '함께 일하거나 돕는 관계' },
  { name: '대립', description: '목표가 부딪히는 관계' },
];

describe('관계 종류 지정', () => {
  it('빈 이름·같은 이름을 빼고 앞뒤 공백을 지운다', () => {
    expect(cleanKinds([{ name: ' 가 ', description: '' }, { name: '', description: 'x' }, { name: '가', description: '둘째' }, { name: '나', description: '' }]).map((k) => k.name)).toEqual(['가', '나']);
  });
  it('AI 응답 스키마가 정한 종류만 받는다', () => {
    const { analysis } = analysisSchemas(CUSTOM);
    const ok = { ...MOCK_ANALYSIS, relations: MOCK_ANALYSIS.relations.map((r) => ({ ...r, kind: '권력·통제' })) };
    expect(analysis.safeParse(ok).success).toBe(true);
    expect(analysis.safeParse(MOCK_ANALYSIS).success).toBe(false); // 기본 종류(정보·자료 흐름 등)는 이제 목록 밖
  });
  it('지시문에 연구자가 정한 종류와 뜻이 들어간다', () => {
    const p = buildPrompt('자료', '', CUSTOM);
    expect(p).toContain('- 권력·통제: 한쪽이 다른 쪽의 행동을 정하는 관계');
    expect(p).toContain('권력·통제 / 협력·지원 / 대립');
    expect(p).not.toContain('정보·자료 흐름');
    expect(buildPrompt('자료', '')).toContain('- 갈등·모순: 목표나 이해가 부딪히는 관계');
  });
  it('새 종류도 색이 정해지고, 갈등 계열 이름은 빨간 점선이다', () => {
    const order = kindOrder([{ kind: '권력·통제' }], CUSTOM.map((k) => k.name));
    expect(relationStyle('협력·지원', order).color).toBe('#2563eb');
    expect(relationStyle('대립', order)).toEqual({ color: '#dc2626', dash: '7 5' });
    expect(relationStyle('권력·통제', order).color).toBe('#7c3aed');
  });
  it('샘플 모드는 결과의 관계 종류를 정한 목록으로 옮겨 적는다', async () => {
    const r = await runAnalysis(mockGenerate, { source: SAMPLE_SOURCE, focus: '', model: DEFAULT_MODEL, relationKinds: CUSTOM }, { sleep: async () => undefined });
    const used = new Set(r.analysis.relations.map((x) => x.kind));
    for (const k of used) expect(CUSTOM.map((c) => c.name)).toContain(k);
    expect(used.has('대립')).toBe(true); // 갈등·모순 → 대립
  });
  it('JSON 스키마의 enum이 정한 종류다', async () => {
    let seen: unknown;
    const g: GenerateFn = async ({ jsonSchema }) => ((seen = jsonSchema), JSON.stringify({ ...MOCK_ANALYSIS, relations: [] }));
    await runAnalysis(g, { source: SAMPLE_SOURCE, focus: '', model: DEFAULT_MODEL, relationKinds: CUSTOM }, { sleep: async () => undefined });
    expect(JSON.stringify(seen)).toContain('"enum":["권력·통제","협력·지원","대립"]');
    expect(DEFAULT_RELATION_KINDS).toHaveLength(5);
  });
});

describe('원문 문맥', () => {
  it('normalizeWithMap은 normalize와 같은 결과를 낸다', () => {
    for (const t of [SAMPLE_SOURCE, ...SAMPLE_INTERVIEWS.map((d) => d.text), '“가”  나ㆍ다\n라 ‘마’ E']) expect(normalizeWithMap(t).norm).toBe(normalize(t));
  });
  it('정확한 인용은 원문 앞뒤 문맥과 함께, 인터뷰면 인터뷰 이름으로', () => {
    const idx = new SourceIndex(SAMPLE_SOURCE, SAMPLE_INTERVIEWS.map((d, i) => ({ name: `인터뷰 ${i + 1}`, text: d.text })));
    const c = idx.context('시간표가 두 교사의 협력을 제약했다')!;
    expect(c.doc).toBe('원 자료');
    expect(c.status).toBe('exact');
    expect(c.match).toBe('시간표가 두 교사의 협력을 제약했다');
    expect(c.before.length).toBeGreaterThan(10);
    const d = idx.context('블록 수업은 교감 선생님이 시간표를 바꿔 주셔서 가능했어요')!;
    expect(d.doc).toBe('인터뷰 1');
    expect(idx.context('교육부가 예산을 늘렸다는 이야기')).toBeNull();
  });
  it('띄어쓰기가 달라도 원문 그대로의 글을 보여 주고, 부분 일치면 일치한 부분만 강조한다', () => {
    const idx = new SourceIndex(SAMPLE_SOURCE);
    expect(idx.context('시간표가두교사의 협력을제약했다')!.match).toBe('시간표가 두 교사의 협력을 제약했다');
    const p = idx.context('시간표가 두 교사의 협력을 제약했다고 한다')!;
    expect(p.status).toBe('partial');
    expect(p.match).toContain('시간표가 두 교사의 협력을 제약했다');
  });
});
