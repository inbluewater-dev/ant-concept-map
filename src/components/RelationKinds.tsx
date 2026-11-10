// 관계 종류 정하기 — 현상에 따라 기본 다섯 종류가 모자라거나 필요 없을 수 있으므로 연구자가 직접 고친다
import { DEFAULT_RELATION_KINDS, MAX_RELATION_KINDS, MIN_RELATION_KINDS, cleanKinds, type RelationKindDef } from '../lib/schema';
import { relationStyle } from '../lib/palette';

const same = (a: RelationKindDef[], b: RelationKindDef[]) => a.length === b.length && a.every((k, i) => k.name === b[i].name && k.description === b[i].description);

export function RelationKindsEditor({ kinds, onChange }: { kinds: RelationKindDef[]; onChange: (k: RelationKindDef[]) => void }) {
  const valid = cleanKinds(kinds);
  const names = valid.map((k) => k.name);
  const isDefault = same(kinds, DEFAULT_RELATION_KINDS);
  const set = (i: number, patch: Partial<RelationKindDef>) => onChange(kinds.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const dup = (name: string, i: number) => !!name.trim() && kinds.findIndex((k) => k.name.trim() === name.trim()) !== i;

  return (
    <details className="rounded-md border border-slate-200 px-3 py-2" data-testid="relation-kinds">
      <summary className="cursor-pointer text-sm text-slate-700">
        관계 종류 {valid.length}개{isDefault ? ' (기본)' : ' (직접 정함)'}
        <span className="block truncate text-xs text-slate-500">{names.join(' · ')}</span>
      </summary>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-slate-500">현상에 맞게 이름과 뜻을 고치거나, 더하거나 뺄 수 있습니다. AI는 이 목록 안에서만 관계를 고릅니다. 이름에 ‘갈등·모순·대립·충돌’이 들어가면 빨간 점선으로 그립니다.</p>
        {kinds.map((k, i) => {
          const st = relationStyle(k.name.trim(), names);
          return (
            <div key={i} className="flex items-start gap-2">
              <svg width="22" height="30" aria-hidden="true" className="shrink-0">
                <line x1="2" x2="20" y1="15" y2="15" stroke={st.color} strokeWidth="2.5" strokeDasharray={st.dash} />
              </svg>
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  aria-label={`관계 종류 ${i + 1} 이름`}
                  value={k.name}
                  maxLength={20}
                  onChange={(e) => set(i, { name: e.target.value })}
                  placeholder="이름 (예: 권력·통제)"
                  className={`w-full rounded-md border px-2 py-1 text-sm ${dup(k.name, i) ? 'border-red-400' : 'border-slate-300'}`}
                />
                <input
                  aria-label={`관계 종류 ${i + 1} 뜻`}
                  value={k.description}
                  maxLength={80}
                  onChange={(e) => set(i, { description: e.target.value })}
                  placeholder="어떤 관계인지 한 줄로"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
              <button
                type="button"
                aria-label={`관계 종류 ${i + 1} 빼기`}
                className="mt-1 text-xs text-slate-400 hover:text-red-700 disabled:opacity-30"
                disabled={kinds.length <= MIN_RELATION_KINDS}
                onClick={() => onChange(kinds.filter((_, j) => j !== i))}
              >
                빼기
              </button>
            </div>
          );
        })}
        {kinds.some((k, i) => dup(k.name, i)) && <p className="text-xs text-red-700">같은 이름이 있습니다. 하나로 합쳐 씁니다.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-40"
            disabled={kinds.length >= MAX_RELATION_KINDS}
            onClick={() => onChange([...kinds, { name: '', description: '' }])}
          >
            종류 더하기
          </button>
          {!isDefault && (
            <button type="button" className="text-xs underline text-slate-500" onClick={() => onChange(DEFAULT_RELATION_KINDS.map((k) => ({ ...k })))}>
              기본 다섯으로 되돌리기
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
