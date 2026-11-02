// 분석 실행: 지시문 → JSON 스키마 강제 생성 → zod 검증(틀리면 이유를 붙여 1회 재시도) → 정리
// 서버가 붐비거나(5xx) 무료 한도(429)가 차면 다음 모델로 넘어간다
import { zodToJsonSchema } from 'zod-to-json-schema';
import { buildPrompt } from '../prompt';
import { AntAnalysis, tidy } from '../schema';

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

function jsonSchema(): Record<string, unknown> {
  const s = zodToJsonSchema(AntAnalysis, { $refStrategy: 'none', target: 'jsonSchema7' }) as Record<string, unknown>;
  delete s.$schema;
  delete s.definitions;
  return s;
}
const SCHEMA = jsonSchema();

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

export async function runAnalysis(
  generate: GenerateFn,
  input: { source: string; focus: string; model: ModelId },
  opts: { sleep?: (ms: number) => Promise<void>; onStatus?: (s: string) => void } = {},
): Promise<RunResult> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const models = [input.model, ...FALLBACK.filter((m) => m !== input.model)];
  const base = buildPrompt(input.source, input.focus);

  async function call(prompt: string): Promise<{ text: string; model: string }> {
    let last: unknown;
    for (const model of models) {
      for (let tryNo = 0; tryNo < 2; tryNo++) {
        try {
          if (model !== input.model) opts.onStatus?.(`${model}(으)로 다시 시도하는 중…`);
          return { text: await generate({ model, prompt, jsonSchema: SCHEMA }), model };
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
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt = attempt === 0 ? base : `${base}\n\n[주의] 이전 응답이 JSON 스키마에 맞지 않았습니다(${issue}). 스키마에 맞는 JSON만 출력하세요.`;
    const { text, model } = await call(prompt);
    try {
      const parsed = AntAnalysis.safeParse(JSON.parse(stripFence(text)));
      if (parsed.success) return { analysis: tidy(parsed.data), model };
      issue = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } catch {
      issue = 'JSON이 아님';
    }
    opts.onStatus?.('응답 형식을 고쳐 다시 받는 중…');
  }
  throw new AiError('AI 응답 형식이 맞지 않아 두 번 시도했지만 실패했습니다. 다시 눌러 주세요.');
}
