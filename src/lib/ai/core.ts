// 분석 실행: 지시문 → JSON 스키마 강제 생성 → zod 검증(틀리면 이유를 붙여 1회 재시도) → 정리
// 서버가 붐비거나(5xx) 무료 한도(429)가 차면 다음 모델로 넘어간다
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { buildFollowupPrompt, buildPrompt, type InterviewDoc } from '../prompt';
import { DEFAULT_RELATION_KINDS, analysisSchemas, tidy, type AntAnalysis, type Change, type RelationKindDef } from '../schema';

export type GenerateFn = (input: { model: string; prompt: string; jsonSchema: Record<string, unknown> }) => Promise<string>;

/** 2026-10 무료 등급 안정 모델. 무료 한도는 프로젝트·모델별(측정값: Flash-Lite 하루 약 500, Flash 하루 약 20) */
export const MODELS = {
  'gemini-3.5-flash-lite': '빠름 (Flash-Lite)',
  'gemini-3.1-flash-lite': '빠름 (Flash-Lite 3.1)',
  'gemini-3.6-flash': '정밀 (Flash, 하루 한도 작음)',
} as const;
export type ModelId = keyof typeof MODELS;
export const DEFAULT_MODEL: ModelId = 'gemini-3.5-flash-lite';
const FALLBACK: ModelId[] = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'];

export class AiError extends Error {}

function jsonSchema(zs: z.ZodTypeAny): Record<string, unknown> {
  const s = zodToJsonSchema(zs, { $refStrategy: 'none', target: 'jsonSchema7' }) as Record<string, unknown>;
  delete s.$schema;
  delete s.definitions;
  return s;
}

const msgOf = (e: unknown) => String((e as { message?: string })?.message ?? e);
export const isTransient = (e: unknown) => /\b(500|502|503|504)\b|UNAVAILABLE|overloaded|high demand|INTERNAL|DEADLINE_EXCEEDED/i.test(msgOf(e));
export const isQuota = (e: unknown) => /\b429\b|RESOURCE_EXHAUSTED|exceeded your current quota|rate.?limit/i.test(msgOf(e));

export function friendlyError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const msg = msgOf(e);
  const detail = ` (오류 내용: ${msg.replace(/\s+/g, ' ').slice(0, 200)})`;
  if (isQuota(e)) return new AiError('AI 무료 사용량이 다 찼습니다. 1분쯤 뒤 다시 시도하세요. 계속되면 오늘 한도가 찬 것입니다(매일 오후 4~5시 초기화).' + detail);
  if (isTransient(e)) return new AiError('AI 서버가 지금 붐빕니다. 잠시 뒤 다시 시도하세요.' + detail);
  if (/app.?check|\b40[13]\b|PERMISSION_DENIED|API key/i.test(msg)) return new AiError('AI 연결이 허용되지 않았습니다(App Check·AI Logic 설정 확인).' + detail);
  if (/token|too long|exceeds|context/i.test(msg)) return new AiError('자료가 너무 깁니다. 분석할 부분만 붙여 넣어 다시 시도하세요.' + detail);
  if (/failed to fetch|network|offline/i.test(msg)) return new AiError('인터넷 연결을 확인한 뒤 다시 시도하세요.' + detail);
  return new AiError('AI가 응답하지 못했습니다. 잠시 뒤 다시 시도하세요.' + detail);
}

function stripFence(t: string) {
  return t.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
}

export interface RunResult {
  analysis: AntAnalysis;
  model: string;
}
export interface FollowupResult extends RunResult {
  changes: Change[];
}
type RunOpts = { sleep?: (ms: number) => Promise<void>; onStatus?: (s: string) => void };

export async function runAnalysis(
  generate: GenerateFn,
  input: { source: string; focus: string; model: ModelId; relationKinds?: RelationKindDef[] },
  opts: RunOpts = {},
): Promise<RunResult> {
  const kinds = input.relationKinds ?? DEFAULT_RELATION_KINDS;
  const zs = analysisSchemas(kinds).analysis;
  const r = await runStructured(generate, input.model, buildPrompt(input.source, input.focus, kinds), zs, jsonSchema(zs), opts);
  return { analysis: r.value, model: r.model };
}

/** 2차 분석: 1차 결과 + 원 자료 + 인터뷰 → 고친 분석과 변화 목록 */
export async function runFollowup(
  generate: GenerateFn,
  input: { prev: AntAnalysis; source: string; interviews: InterviewDoc[]; focus: string; model: ModelId; relationKinds?: RelationKindDef[] },
  opts: RunOpts = {},
): Promise<FollowupResult> {
  const kinds = input.relationKinds ?? DEFAULT_RELATION_KINDS;
  const zs = analysisSchemas(kinds).followup;
  const prompt = buildFollowupPrompt(input.prev, input.source, input.interviews, input.focus, kinds);
  const r = await runStructured(generate, input.model, prompt, zs, jsonSchema(zs), opts);
  const { changes, ...analysis } = r.value;
  return { analysis, changes: changes.filter((c) => c.target.trim() || c.description.trim()), model: r.model };
}

async function runStructured<S extends z.ZodType<AntAnalysis>>(
  generate: GenerateFn,
  first: ModelId,
  base: string,
  zs: S,
  schema: Record<string, unknown>,
  opts: RunOpts,
): Promise<{ value: z.infer<S>; model: string }> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const models = [first, ...FALLBACK.filter((m) => m !== first)];

  async function call(prompt: string): Promise<{ text: string; model: string }> {
    let last: unknown;
    for (const model of models) {
      for (let tryNo = 0; tryNo < 2; tryNo++) {
        try {
          if (model !== first) opts.onStatus?.(`${model}(으)로 다시 시도하는 중…`);
          return { text: await generate({ model, prompt, jsonSchema: schema }), model };
        } catch (e) {
          last = e;
          if (isQuota(e)) break;
          if (!isTransient(e)) throw friendlyError(e);
          if (tryNo === 0) await sleep(1500);
        }
      }
    }
    throw friendlyError(last);
  }

  let issue = '';
  let fallback: { value: z.infer<S>; model: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0
        ? base
        : fallback
          ? `${base}\n\n[주의] 이전 응답을 다시 쓰세요. ${issue}`
          : `${base}\n\n[주의] 이전 응답이 JSON 스키마에 맞지 않았습니다(${issue}). 스키마에 맞는 JSON만 출력하세요.`;
    const { text, model } = await call(prompt);
    try {
      const parsed = zs.safeParse(JSON.parse(stripFence(text).replace(/[\uE000-\uF8FF\uFFFD]/g, '')));
      if (parsed.success) {
        const value = { ...parsed.data, ...tidy(parsed.data) } as z.infer<S>;
        const bad = nonActors(value);
        if (bad.length === 0 || attempt === 1) return { value, model };
        // 이론·개념·저자를 행위자로 잡았으면 한 번 더 받는다 (그래도 그러면 그대로 돌려준다)
        fallback = { value, model };
        issue = `이론·개념·저자는 행위자가 아닙니다: ${bad.join(', ')}. 자료가 다루는 사례 현장(학교·기관·사람·문서·기기·제도·공간)에서 행위자를 다시 찾고, 모순도 현장 행위자 사이의 갈등으로 쓰세요.`;
        opts.onStatus?.('사례 현장 중심으로 다시 분석하는 중…');
        continue;
      }
      issue = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } catch {
      issue = 'JSON이 아님';
    }
    if (fallback) return fallback;
    opts.onStatus?.('응답 형식을 고쳐 다시 받는 중…');
  }
  if (fallback) return fallback;
  throw new AiError('AI 응답 형식이 맞지 않아 두 번 시도했지만 실패했습니다. 다시 눌러 주세요.');
}

/** 사례 현장의 행위자가 아니라 이론·개념·글쓴이를 행위자로 잡은 경우 (AI 모델·교육과정 같은 것은 행위자로 둔다) */
const NON_ACTOR = /(이론|존재론|인식론|방법론|패러다임|번역\s*모델|번역\s*과정|^ANT$|\bANT\b|행위자-?\s*네트워크|연구자|저자|필자|분석자|라투르|칼롱|^존\s*로$|Latour|Callon|John\s*Law)/;
export function nonActors(a: AntAnalysis): string[] {
  const authorLike = /논문|저자|본 연구|연구를 (수행|진행)|연구자로서|이론가|학자|이론을 (제안|창시|정립|발전)|창시자/;
  return a.actors.filter((x) => NON_ACTOR.test(x.name) || (x.nature === '인간' && authorLike.test(`${x.role} ${x.goal}`))).map((x) => x.name);
}
