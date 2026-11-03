// 근거 인용과 원문 확인 표시
import { EVIDENCE_LABEL, type SourceIndex } from '../lib/evidence';
import type { Evidence } from '../lib/schema';

const TONE = { exact: 'bg-emerald-100 text-emerald-900', partial: 'bg-amber-100 text-amber-900', missing: 'bg-red-100 text-red-900' } as const;

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
