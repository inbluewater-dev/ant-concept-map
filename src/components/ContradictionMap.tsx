// ③ 모순과 대안 도 — 갈등하는 행위자들(빨간 점선) → 모순 → 다시 잇는 대안
import { forwardRef } from 'react';
import { wrap } from '../lib/layout';
import type { AntAnalysis } from '../lib/schema';

const W = 980;
const ROW = 138;

export const ContradictionMap = forwardRef<SVGSVGElement, { analysis: AntAnalysis }>(function ContradictionMap({ analysis }, ref) {
  const name = (id: string) => analysis.actors.find((a) => a.id === id)?.name ?? id;
  const rows = analysis.contradictions;
  const H = 90 + Math.max(1, rows.length) * ROW + 10;
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg border border-slate-200 bg-white" role="img" aria-label="모순과 대안 도" fontFamily="Pretendard, 'Noto Sans KR', 'Malgun Gothic', sans-serif">
      <defs>
        <marker id="c-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#16a34a" />
        </marker>
      </defs>
      <rect width={W} height={H} fill="#fff" />
      <text x={20} y={30} fontSize={17} fontWeight={700} fill="#0f172a">
        ③ 모순과 대안
      </text>
      <text x={20} y={50} fontSize={12} fill="#64748b">
        왼쪽: 갈등에 얽힌 행위자 · 가운데: 모순 · 오른쪽: 네트워크를 다시 잇는 대안
      </text>
      {rows.length === 0 && (
        <text x={20} y={100} fontSize={13} fill="#94a3b8">
          자료에서 모순을 확인하지 못했습니다.
        </text>
      )}
      {rows.map((c, i) => {
        const y = 80 + i * ROW;
        const actors = c.actorIds.map(name).slice(0, 4);
        return (
          <g key={i} data-testid={`contradiction-${i}`}>
            {actors.map((a, j) => (
              <g key={j}>
                <rect x={20} y={y + j * 24} width={190} height={20} rx={10} fill="#fef2f2" stroke="#fecaca" />
                <text x={30} y={y + j * 24 + 14} fontSize={12} fill="#991b1b">
                  {wrap(a, 15, 1)[0]}
                </text>
                <line x1={212} y1={y + j * 24 + 10} x2={300} y2={y + 56} stroke="#dc2626" strokeWidth={1.6} strokeDasharray="7 5" />
              </g>
            ))}
            <rect x={300} y={y} width={330} height={112} rx={8} fill="#fff" stroke="#dc2626" strokeWidth={2} strokeDasharray="7 5" />
            {(() => {
              const title = wrap(c.label, 22, 2);
              return (
                <>
                  {title.map((l, j) => (
                    <text key={`t${j}`} x={314} y={y + 22 + j * 17} fontSize={14} fontWeight={700} fill="#b91c1c">
                      {l}
                    </text>
                  ))}
                  {wrap(c.description, 26, title.length > 1 ? 3 : 4).map((l, j) => (
                    <text key={j} x={314} y={y + 26 + title.length * 17 + j * 16} fontSize={12} fill="#334155">
                      {l}
                    </text>
                  ))}
                </>
              );
            })()}
            <line x1={632} y1={y + 56} x2={676} y2={y + 56} stroke="#16a34a" strokeWidth={2} markerEnd="url(#c-arr)" />
            <rect x={680} y={y} width={280} height={112} rx={8} fill="#f0fdf4" stroke="#16a34a" strokeWidth={1.5} />
            <text x={694} y={y + 22} fontSize={12} fontWeight={700} fill="#15803d">
              대안
            </text>
            {wrap(c.alternative || '자료에 대안이 나오지 않음', 21, 5).map((l, j) => (
              <text key={j} x={694} y={y + 44 + j * 16} fontSize={12} fill="#14532d">
                {l}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
});
