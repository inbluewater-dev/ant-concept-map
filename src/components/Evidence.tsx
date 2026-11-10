// 근거 인용과 원문 확인 표시
import { EVIDENCE_LABEL, type SourceIndex } from '../lib/evidence';
import type { Evidence } from '../lib/schema';

export const TONE = { exact: 'bg-emerald-100 text-emerald-900', partial: 'bg-amber-100 text-amber-900', missing: 'bg-red-100 text-red-900' } as const;

export function EvidenceList({ items, index }: { items: Evidence[]; index: SourceIndex | null }) {
  if (!items.length) return <p className="text-xs text-slate-400">원문 근거 없음</p>;
  return (
    <ul className="space-y-1">
      {items.map((e, i) => {
        const st = index ? index.check(e.quote) : null;
        const doc = index?.multi ? index.where(e.quote) : null;
        return (
          <li key={i} className="flex items-start gap-2 text-xs">
            {st && <span className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${TONE[st]}`}>{EVIDENCE_LABEL[st]}</span>}
            {doc && <span className="shrink-0 rounded border border-slate-300 px-1.5 py-0.5 text-slate-600">{doc}</span>}
            <q className="text-slate-700">{e.quote}</q>
          </li>
        );
      })}
    </ul>
  );
}

/** 전체 근거 확인 비율 */
export function evidenceStats(all: Evidence[], index: SourceIndex | null) {
  const s = { exact: 0, partial: 0, missing: 0 };
  if (index) for (const e of all) s[index.check(e.quote)]++;
  return s;
}

/** 인용 하나를 원문 앞뒤 문맥과 함께 — 노드를 눌렀을 때 "이 판단이 원문 어디에서 나왔는지" 보여 준다 */
export function QuoteInContext({ quote, index }: { quote: string; index: SourceIndex | null }) {
  const ctx = index?.context(quote) ?? null;
  if (!ctx) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs" data-testid="quote-missing">
        <span className={`mr-1.5 rounded px-1.5 py-0.5 font-medium ${TONE.missing}`}>{EVIDENCE_LABEL.missing}</span>
        <q className="text-slate-700">{quote}</q>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs leading-relaxed" data-testid="quote-context">
      <p className="mb-1 flex flex-wrap gap-1.5">
        <span className={`rounded px-1.5 py-0.5 font-medium ${TONE[ctx.status]}`}>{EVIDENCE_LABEL[ctx.status]}</span>
        <span className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-slate-600">{ctx.doc}</span>
      </p>
      <p className="text-slate-500">
        {ctx.before}
        <mark className="rounded bg-yellow-200 px-0.5 text-slate-900">{ctx.match}</mark>
        {ctx.after}
      </p>
    </div>
  );
}
