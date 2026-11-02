// 분석 결과 표 — 행위자·관계·번역·OPP·블랙박스·모순·경계, 항목마다 원문 근거
import type { SourceIndex } from '../lib/evidence';
import { TYPE_COLOR } from '../lib/palette';
import type { AntAnalysis } from '../lib/schema';
import { EvidenceList } from './Evidence';

export function Details({ analysis: a, index, selected }: { analysis: AntAnalysis; index: SourceIndex | null; selected: string | null }) {
  const name = (id: string) => a.actors.find((x) => x.id === id)?.name ?? id;
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-2 mt-6 text-base font-semibold text-slate-900">{children}</h3>;
  return (
    <div className="text-sm">
      <H>행위자 ({a.actors.length})</H>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-1.5 pr-3">행위자</th>
              <th className="py-1.5 pr-3">구분·유형</th>
              <th className="py-1.5 pr-3">역할 / 목표</th>
              <th className="py-1.5">근거</th>
            </tr>
          </thead>
          <tbody>
            {a.actors.map((x) => (
              <tr key={x.id} className={`border-b border-slate-100 align-top ${selected === x.id ? 'bg-amber-50' : ''}`}>
                <td className="py-2 pr-3 font-medium">{x.name}</td>
                <td className="whitespace-nowrap py-2 pr-3">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: TYPE_COLOR[x.type] }} /> {x.nature} · {x.type}
                </td>
                <td className="py-2 pr-3 text-slate-700">
                  {x.role}
                  {x.goal && <span className="block text-xs text-slate-500">목표: {x.goal}</span>}
                </td>
                <td className="py-2">
                  <EvidenceList items={x.evidence} index={index} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H>관계 ({a.relations.length})</H>
      <ul className="space-y-2">
        {a.relations.map((r, i) => (
          <li key={i} className={selected && (r.from === selected || r.to === selected) ? 'rounded bg-amber-50 p-1' : 'p-1'}>
            <span className="font-medium">{name(r.from)}</span> → <span className="font-medium">{name(r.to)}</span> <span className="text-xs text-slate-500">[{r.kind}]</span> {r.label}
            <div className="mt-1 pl-4">
              <EvidenceList items={r.evidence} index={index} />
            </div>
          </li>
        ))}
      </ul>

      <H>번역 5단계</H>
      <ol className="space-y-2">
        {a.translation.map((t, i) => (
          <li key={t.stage} className={t.found ? '' : 'text-slate-400'}>
            <span className="font-medium">
              {i + 1}. {t.stage}
            </span>
            {!t.found && <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs">자료에서 확인 안 됨</span>} — {t.description}
            {t.actorIds.length > 0 && <span className="text-xs text-slate-500"> ({t.actorIds.map(name).join(', ')})</span>}
            <div className="mt-1 pl-4">
              <EvidenceList items={t.evidence} index={index} />
            </div>
          </li>
        ))}
      </ol>

      <H>OPP 후보 ({a.oppCandidates.length})</H>
      <p className="mb-2 text-xs text-slate-500">OPP는 중심에 있어 보이는 것을 고르는 것이 아니라, 행위자들이 각자의 목표를 위해 반드시 지나야 하는 관문을 자료로 확인하는 것입니다. 근거와 확신 정도를 보고 판단하세요.</p>
      {a.oppCandidates.length === 0 && <p className="text-slate-400">자료에서 확인된 OPP 후보가 없습니다.</p>}
      <ul className="space-y-3">
        {a.oppCandidates.map((o, i) => (
          <li key={i} className="rounded-md border border-slate-200 p-3">
            <div className="font-medium">
              {o.label} <span className="ml-1 rounded bg-slate-900 px-1.5 py-0.5 text-xs text-amber-300">확신 {o.confidence}</span>
            </div>
            <p className="mt-1 text-slate-700">{o.reasoning}</p>
            <p className="mt-1 text-xs text-slate-500">지나는 행위자: {o.passingActorIds.map(name).join(', ') || '—'}</p>
            <div className="mt-1">
              <EvidenceList items={o.evidence} index={index} />
            </div>
          </li>
        ))}
      </ul>

      <H>블랙박스 ({a.blackBoxes.length})</H>
      <ul className="space-y-2">
        {a.blackBoxes.map((b, i) => (
          <li key={i}>
            <span className="font-medium">{b.label}</span> — 안에 접힌 것: {b.folded}
            <div className="mt-1 pl-4">
              <EvidenceList items={b.evidence} index={index} />
            </div>
          </li>
        ))}
      </ul>

      <H>모순과 대안 ({a.contradictions.length})</H>
      <ul className="space-y-2">
        {a.contradictions.map((c, i) => (
          <li key={i}>
            <span className="font-medium">{c.label}</span> ({c.actorIds.map(name).join(', ')}) — {c.description}
            <span className="block text-emerald-800">대안: {c.alternative || '—'}</span>
            <div className="mt-1 pl-4">
              <EvidenceList items={c.evidence} index={index} />
            </div>
          </li>
        ))}
      </ul>

      <H>네트워크의 경계</H>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="text-slate-500">포함한 것</dt>
        <dd>{a.boundary.included}</dd>
        <dt className="text-slate-500">뺀 것</dt>
        <dd>{a.boundary.excluded}</dd>
        <dt className="text-slate-500">보이지 않는 타자</dt>
        <dd>{a.boundary.invisibleOthers.join(', ') || '—'}</dd>
      </dl>
    </div>
  );
}
