// ① 행위자 네트워크도 — 색=행위자 유형, 모양=인간(원)/비인간(사각형, 같은 크기: 대칭성), 선=관계 유형, 갈등은 빨간 점선
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { layoutNetwork, MAP_H, MAP_W, wrap, type Pos } from '../lib/layout';
import { RELATION_STYLE, TYPE_COLOR } from '../lib/palette';
import { ACTOR_TYPES, RELATION_KINDS, type AntAnalysis } from '../lib/schema';

interface Props {
  analysis: AntAnalysis;
  showOpp: boolean;
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** 2차 분석에서 새로 나온 행위자 — 노드 오른쪽 위에 ‘새’ 표시 */
  newIds?: string[];
}

const R = 26;

export const NetworkMap = forwardRef<SVGSVGElement, Props>(function NetworkMap({ analysis, showOpp, selected, onSelect, newIds = [] }, ref) {
  const initial = useMemo(() => layoutNetwork(analysis, showOpp), [analysis, showOpp]);
  const [pos, setPos] = useState<Record<string, Pos>>(initial);
  useEffect(() => setPos(initial), [initial]);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const toSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const onDown = (id: string) => (e: React.PointerEvent) => {
    const p = toSvg(e);
    drag.current = { id, dx: pos[id].x - p.x, dy: pos[id].y - p.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toSvg(e);
    const { id, dx, dy } = drag.current;
    setPos((s) => ({ ...s, [id]: { x: Math.max(30, Math.min(MAP_W - 30, p.x + dx)), y: Math.max(30, Math.min(MAP_H - 135, p.y + dy)) } }));
  };
  const onUp = () => (drag.current = null);

  const related = useMemo(() => {
    if (!selected) return null;
    const s = new Set([selected]);
    analysis.relations.forEach((r) => {
      if (r.from === selected) s.add(r.to);
      if (r.to === selected) s.add(r.from);
    });
    return s;
  }, [selected, analysis]);
  const dim = (id: string) => (related && !related.has(id) ? 0.25 : 1);

  // 선 끝을 노드 테두리에서 멈추게
  const edge = (a: Pos, b: Pos, pad = R + 6) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x1: a.x + (dx / d) * pad, y1: a.y + (dy / d) * pad, x2: b.x - (dx / d) * pad, y2: b.y - (dy / d) * pad };
  };
  const usedTypes = ACTOR_TYPES.filter((t) => analysis.actors.some((a) => a.type === t));
  const usedKinds = RELATION_KINDS.filter((k) => analysis.relations.some((r) => r.kind === k));

  return (
    <svg
      ref={(el) => {
        svgRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="h-auto w-full touch-none select-none rounded-lg border border-slate-200 bg-white"
      role="img"
      aria-label="행위자 네트워크도"
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onClick={() => onSelect(null)}
      fontFamily="Pretendard, 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    >
      <defs>
        {RELATION_KINDS.map((k) => (
          <marker key={k} id={`arr-${RELATION_KINDS.indexOf(k)}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={RELATION_STYLE[k].color} />
          </marker>
        ))}
        <marker id="arr-opp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#111827" />
        </marker>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="#ffffff" />
      <text x={20} y={30} fontSize={17} fontWeight={700} fill="#0f172a">
        ① 행위자 네트워크도
      </text>
      <text x={20} y={50} fontSize={12} fill="#64748b">
        {wrap(analysis.title, 80, 1)[0]}
      </text>

      {/* 관계 */}
      {analysis.relations.map((r, i) => {
        const a = pos[r.from];
        const b = pos[r.to];
        if (!a || !b) return null;
        const st = RELATION_STYLE[r.kind];
        const e = edge(a, b);
        const op = related ? (related.has(r.from) && related.has(r.to) && (r.from === selected || r.to === selected) ? 1 : 0.12) : 0.85;
        return (
          <g key={i} opacity={op}>
            <line {...e} stroke={st.color} strokeWidth={2} strokeDasharray={st.dash} markerEnd={`url(#arr-${RELATION_KINDS.indexOf(r.kind)})`}>
              <title>{`${r.kind}: ${r.label}`}</title>
            </line>
            {selected && (r.from === selected || r.to === selected) && (
              <text x={(e.x1 + e.x2) / 2} y={(e.y1 + e.y2) / 2 - 4} fontSize={11} textAnchor="middle" fill={st.color} stroke="#fff" strokeWidth={3} paintOrder="stroke">
                {r.label}
              </text>
            )}
          </g>
        );
      })}

      {/* OPP 후보 (점선으로 지나가는 행위자와 잇는다) */}
      {showOpp &&
        analysis.oppCandidates.map((o, i) => {
          const p = pos[`opp${i}`];
          if (!p) return null;
          const lines = wrap(o.label, 10, 3);
          return (
            <g key={`opp${i}`} opacity={related ? 0.3 : 1}>
              {o.passingActorIds.map((aid) =>
                pos[aid] ? <line key={aid} {...edge(pos[aid], p, 30)} stroke="#111827" strokeWidth={1.6} strokeDasharray="3 3" markerEnd="url(#arr-opp)" /> : null,
              )}
              <g transform={`translate(${p.x},${p.y})`} onPointerDown={onDown(`opp${i}`)} style={{ cursor: 'grab' }}>
                <rect x={-58} y={-26 - (lines.length - 1) * 7} width={116} height={52 + (lines.length - 1) * 14} rx={4} fill="#111827" />
                <text y={-10 - (lines.length - 1) * 7} fontSize={10} textAnchor="middle" fill="#fbbf24" fontWeight={700}>
                  OPP 후보 · {o.confidence}
                </text>
                {lines.map((l, j) => (
                  <text key={j} y={6 - (lines.length - 1) * 7 + j * 14} fontSize={12} textAnchor="middle" fill="#fff">
                    {l}
                  </text>
                ))}
              </g>
            </g>
          );
        })}

      {/* 행위자 */}
      {analysis.actors.map((a) => {
        const p = pos[a.id];
        if (!p) return null;
        const c = TYPE_COLOR[a.type];
        const isSel = selected === a.id;
        const lines = wrap(a.name, 9, 2);
        return (
          <g
            key={a.id}
            transform={`translate(${p.x},${p.y})`}
            opacity={dim(a.id)}
            onPointerDown={onDown(a.id)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isSel ? null : a.id);
            }}
            style={{ cursor: 'pointer' }}
            data-testid={`node-${a.id}`}
          >
            <title>{`${a.name} (${a.nature}·${a.type})${a.role ? ` — ${a.role}` : ''}`}</title>
            {a.nature === '인간' ? (
              <circle r={R} fill={c} fillOpacity={0.15} stroke={c} strokeWidth={isSel ? 4 : 2} />
            ) : (
              <rect x={-R} y={-R} width={R * 2} height={R * 2} rx={8} fill={c} fillOpacity={0.15} stroke={c} strokeWidth={isSel ? 4 : 2} />
            )}
            <text y={5} fontSize={11} textAnchor="middle" fill={c} fontWeight={700}>
              {a.nature === '인간' ? '인간' : '비인간'}
            </text>
            {newIds.includes(a.id) && (
              <g transform={`translate(${R - 2},${-R + 2})`} data-testid={`new-${a.id}`}>
                <circle r={10} fill="#4338ca" stroke="#fff" strokeWidth={2} />
                <text y={4} fontSize={10} textAnchor="middle" fill="#fff" fontWeight={700}>
                  새
                </text>
              </g>
            )}
            {lines.map((l, j) => (
              <text key={j} y={R + 16 + j * 14} fontSize={13} textAnchor="middle" fill="#0f172a" fontWeight={600} stroke="#fff" strokeWidth={3} paintOrder="stroke">
                {l}
              </text>
            ))}
          </g>
        );
      })}

      {/* 범례 */}
      <g transform={`translate(20, ${MAP_H - 70})`} fontSize={11} fill="#334155">
        <text fontWeight={700}>행위자 유형</text>
        {usedTypes.map((t, i) => (
          <g key={t} transform={`translate(${78 + i * 92}, -4)`}>
            <rect width={12} height={12} y={-6} rx={3} fill={TYPE_COLOR[t]} fillOpacity={0.3} stroke={TYPE_COLOR[t]} />
            <text x={17} y={4}>
              {t}
            </text>
          </g>
        ))}
        <text y={26} fontWeight={700}>
          관계
        </text>
        {usedKinds.map((k, i) => (
          <g key={k} transform={`translate(${78 + i * 118}, 22)`}>
            <line x1={0} x2={26} stroke={RELATION_STYLE[k].color} strokeWidth={2} strokeDasharray={RELATION_STYLE[k].dash} />
            <text x={31} y={4}>
              {k}
            </text>
          </g>
        ))}
        <text y={50} fill="#64748b">
          ○ 인간 행위자 · □ 비인간 행위자 (같은 크기로 그림: 대칭성){newIds.length ? ' · 새 = 2차 분석에서 새로 나온 행위자' : ''}{showOpp && analysis.oppCandidates.length ? ' · ■ OPP 후보(자료에서 확인한 관문, 점선=그 관문을 지나는 행위자)' : ''}
        </text>
      </g>
    </svg>
  );
});
