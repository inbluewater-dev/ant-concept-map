// 노드를 누르면 오른쪽에 — 이 행위자와 그 관계가 원문 어디에서 나왔는지(앞뒤 문맥 포함) 보여 준다.
// 11/4 수업: "시각화된 노드를 누르면 원래 있던 원문에 어떤 내용이 반영됐는지 오른쪽으로 보여 줘야 검증이 된다"
import type { SourceIndex } from '../lib/evidence';
import { TYPE_COLOR, relationStyle } from '../lib/palette';
import type { AntAnalysis } from '../lib/schema';
import { QuoteInContext } from './Evidence';

interface Props {
  analysis: AntAnalysis;
  actorId: string;
  index: SourceIndex | null;
  kindOrder: readonly string[];
  isNew?: boolean;
  onSelect: (id: string | null) => void;
}

export function ActorPanel({ analysis, actorId, index, kindOrder, isNew, onSelect }: Props) {
  const a = analysis.actors.find((x) => x.id === actorId);
  if (!a) return null;
  const name = (id: string) => analysis.actors.find((x) => x.id === id)?.name ?? id;
  const rels = analysis.relations.filter((r) => r.from === actorId || r.to === actorId);
  const has = (ids: string[]) => ids.includes(actorId);
  const elsewhere = [
    ...analysis.translation.filter((t) => t.found && has(t.actorIds)).map((t) => ({ k: '번역', v: `${t.stage}: ${t.description}` })),
    ...analysis.oppCandidates.filter((o) => has(o.passingActorIds)).map((o) => ({ k: 'OPP 후보', v: `${o.label} (확신 ${o.confidence})` })),
    ...analysis.blackBoxes.filter((b) => has(b.actorIds)).map((b) => ({ k: '블랙박스', v: b.label })),
    ...analysis.contradictions.filter((c) => has(c.actorIds)).map((c) => ({ k: '모순', v: c.label })),
  ];
  const H = ({ children }: { children: React.ReactNode }) => <h4 className="mb-1.5 mt-4 text-xs font-semibold text-slate-500 first:mt-0">{children}</h4>;

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 text-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" data-testid="selected-actor" aria-label={`${a.name}의 원문 근거`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="inline-block h-3 w-3 shrink-0 border-2" style={{ borderColor: TYPE_COLOR[a.type], borderRadius: a.nature === '인간' ? '50%' : 2 }} aria-hidden="true" />
            <span className="text-base font-bold text-slate-900">{a.name}</span>
            {isNew && <span className="rounded bg-indigo-700 px-1.5 py-0.5 text-xs font-semibold text-white">새</span>}
          </p>
          <p className="text-xs text-slate-500">
            {a.nature} 행위자 · {a.type}
          </p>
        </div>
        <button type="button" className="shrink-0 text-xs text-slate-500 underline" onClick={() => onSelect(null)}>
          닫기
        </button>
      </div>
      <p className="mt-2 text-slate-800">{a.role}</p>
      {a.goal && <p className="text-slate-600">목표: {a.goal}</p>}

      <H>이 행위자가 나온 원문 ({a.evidence.length})</H>
      {a.evidence.length ? (
        <div className="space-y-1.5">
          {a.evidence.map((e, i) => (
            <QuoteInContext key={i} quote={e.quote} index={index} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">원문 근거 없음</p>
      )}

      <H>연결된 관계 ({rels.length})</H>
      <ul className="space-y-3">
        {rels.map((r, i) => {
          const out = r.from === actorId;
          const other = out ? r.to : r.from;
          const st = relationStyle(r.kind, kindOrder);
          return (
            <li key={i}>
              <p className="flex flex-wrap items-center gap-1.5">
                <svg width="22" height="10" aria-hidden="true">
                  <line x1="1" x2="21" y1="5" y2="5" stroke={st.color} strokeWidth="2.5" strokeDasharray={st.dash} />
                </svg>
                <span className="text-xs" style={{ color: st.color }}>
                  {r.kind}
                </span>
                <span className="text-slate-800">
                  {out ? '→ ' : '← '}
                  <button type="button" className="font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700" onClick={() => onSelect(other)}>
                    {name(other)}
                  </button>
                </span>
                <span className="text-slate-600">{r.label}</span>
              </p>
              <div className="mt-1 space-y-1.5 pl-7">
                {r.evidence.length ? r.evidence.map((e, j) => <QuoteInContext key={j} quote={e.quote} index={index} />) : <p className="text-xs text-slate-400">원문 근거 없음</p>}
              </div>
            </li>
          );
        })}
      </ul>

      {elsewhere.length > 0 && (
        <>
          <H>분석의 다른 자리</H>
          <ul className="space-y-1 text-xs text-slate-700">
            {elsewhere.map((x, i) => (
              <li key={i}>
                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{x.k}</span>
                {x.v}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
