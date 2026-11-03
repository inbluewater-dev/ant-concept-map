// 2차 분석의 '변화' 탭 — AI가 정리한 변화 + 프로그램이 두 결과를 직접 비교한 차이
import type { Comparison } from '../lib/compare';
import type { SourceIndex } from '../lib/evidence';
import { CHANGE_KINDS, type Change, type ChangeKind } from '../lib/schema';
import { EvidenceList } from './Evidence';

const TONE: Record<ChangeKind, string> = {
  확인됨: 'bg-emerald-100 text-emerald-900',
  '새로 나옴': 'bg-indigo-100 text-indigo-900',
  달라짐: 'bg-amber-100 text-amber-900',
  반박됨: 'bg-red-100 text-red-900',
};
const HELP: Record<ChangeKind, string> = {
  확인됨: '1차 판단을 인터뷰가 뒷받침',
  '새로 나옴': '인터뷰에서 새로 드러남',
  달라짐: '관계·역할·확신이 바뀜',
  반박됨: '인터뷰가 1차 판단과 어긋남',
};

export function ChangesView({ changes, comparison, index }: { changes: Change[]; comparison: Comparison | null; index: SourceIndex | null }) {
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2 mt-6 text-base font-semibold text-slate-900 first:mt-0">{children}</h3>;
  return (
    <div className="text-sm" data-testid="changes">
      <H>AI가 정리한 변화 ({changes.length})</H>
      <p className="mb-3 text-xs text-slate-500">인터뷰 인용이 실제로 인터뷰에 있는지 프로그램이 대조했습니다. 판단은 연구자가 다시 확인해야 합니다.</p>
      {changes.length === 0 && <p className="text-slate-500">AI가 정리한 변화가 없습니다.</p>}
      <div className="space-y-4">
        {CHANGE_KINDS.map((k) => {
          const xs = changes.filter((c) => c.kind === k);
          if (!xs.length) return null;
          return (
            <div key={k}>
              <p className="mb-1.5 text-xs text-slate-500">
                <span className={`mr-2 rounded px-1.5 py-0.5 font-semibold ${TONE[k]}`}>{k}</span>
                {HELP[k]}
              </p>
              <ul className="space-y-2">
                {xs.map((c, i) => (
                  <li key={i} className="rounded-md border border-slate-200 p-3">
                    <p className="font-medium text-slate-900">{c.target}</p>
                    <p className="mt-0.5 text-slate-700">{c.description}</p>
                    <div className="mt-2">
                      <EvidenceList items={c.evidence} index={index} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {comparison && (
        <>
          <H>프로그램이 비교한 차이 (1차 → 2차)</H>
          <p className="mb-3 text-xs text-slate-500">AI의 설명과 별도로, 두 결과의 행위자 이름과 관계를 프로그램이 직접 맞대어 본 것입니다.</p>
          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <Row label="새 행위자 (네트워크도에 ‘새’ 표시)" items={comparison.newActors} />
            <Row label="빠진 행위자" items={comparison.removedActors} />
            <Row label="새 관계" items={comparison.newRelations.map((r) => `${r.from} → ${r.to} (${r.kind}: ${r.label})`)} />
            <Row label="종류가 바뀐 관계" items={comparison.changedRelations.map((r) => `${r.from} → ${r.to}: ${r.before} → ${r.after}`)} />
            <Row label="빠진 관계" items={comparison.removedRelations.map((r) => `${r.from} → ${r.to} (${r.kind})`)} />
            <Row label="OPP 후보 (1차)" items={comparison.opp.before} />
            <Row label="OPP 후보 (2차)" items={comparison.opp.after} />
          </dl>
        </>
      )}
    </div>
  );
}

function Row({ label, items }: { label: string; items: string[] }) {
  return (
    <>
      <dt className="text-xs font-semibold text-slate-500 sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-slate-800">
        {items.length ? (
          <ul className="list-disc space-y-0.5 pl-4">
            {items.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : (
          <span className="text-slate-400">없음</span>
        )}
      </dd>
    </>
  );
}
