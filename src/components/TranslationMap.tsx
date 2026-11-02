// ② 번역·OPP·블랙박스 도 — 칼롱의 번역 5단계, OPP(행위자들이 각자의 목표를 위해 지나는 관문), 블랙박스
import { forwardRef } from 'react';
import { wrap } from '../lib/layout';
import type { AntAnalysis } from '../lib/schema';

const W = 980;
const STAGE_W = (W - 40) / 5;
const CHIP_CHARS = Math.floor((STAGE_W - 26) / 11);
const MAX_CHIPS = 6;
const stageDesc = (t: AntAnalysis['translation'][number]) => wrap(t.description || (t.found ? '' : '자료에서 확인되지 않음'), 13, 7);
/** 단계 아래 행위자 칩 — 긴 이름은 두 줄로 */
const chipLines = (name: string) => wrap(name, CHIP_CHARS, 2);
const chipH = (lines: string[]) => lines.length * 14 + 6;

export const TranslationMap = forwardRef<SVGSVGElement, { analysis: AntAnalysis }>(function TranslationMap({ analysis }, ref) {
  const name = (id: string) => analysis.actors.find((a) => a.id === id)?.name ?? id;
  const order = { 높음: 0, 보통: 1, 낮음: 2 } as const;
  const opp = [...analysis.oppCandidates].sort((a, b) => order[a.confidence] - order[b.confidence])[0];
  const passing = opp ? opp.passingActorIds : [];
  const stageW = STAGE_W;

  // 단계 칸 높이(설명 줄 + 행위자 칩)에 맞춰 OPP 구역을 내린다
  const stageBottom = Math.max(
    ...analysis.translation.map(
      (t) => 142 + stageDesc(t).length * 16 + 6 + t.actorIds.slice(0, MAX_CHIPS).reduce((h, id) => h + chipH(chipLines(name(id))) + 4, 0) + (t.actorIds.length > MAX_CHIPS ? 18 : 0),
    ),
  );
  const oppTop = stageBottom + 50;
  const rowH = 58;
  const oppH = Math.max(1, passing.length) * rowH + 30;
  const bbTop = oppTop + oppH + 60;
  const bbH = Math.max(1, analysis.blackBoxes.length) * 70 + 40;
  const H = bbTop + bbH + 20;

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg border border-slate-200 bg-white" role="img" aria-label="번역·OPP·블랙박스 도" fontFamily="Pretendard, 'Noto Sans KR', 'Malgun Gothic', sans-serif">
      <defs>
        <marker id="t-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#111827" />
        </marker>
      </defs>
      <rect width={W} height={H} fill="#fff" />
      <text x={20} y={30} fontSize={17} fontWeight={700} fill="#0f172a">
        ② 번역 과정 · OPP · 블랙박스
      </text>
      <text x={20} y={50} fontSize={12} fill="#64748b">
        칼롱의 번역 단계 — 회색 점선은 자료에서 확인되지 않은 단계
      </text>

      {/* 번역 5단계 */}
      {analysis.translation.map((t, i) => {
        const x = 20 + i * stageW;
        const fill = t.found ? '#1e3a8a' : '#ffffff';
        const fg = t.found ? '#ffffff' : '#94a3b8';
        const pts = `${x},70 ${x + stageW - 18},70 ${x + stageW - 2},95 ${x + stageW - 18},120 ${x},120 ${x + (i ? 16 : 0)},95`;
        const desc = stageDesc(t);
        const actors = t.actorIds.map(name);
        let cy = 142 + desc.length * 16 + 6;
        return (
          <g key={t.stage} data-testid={`stage-${i}`}>
            <polygon points={pts} fill={fill} stroke={t.found ? '#1e3a8a' : '#94a3b8'} strokeDasharray={t.found ? undefined : '5 4'} strokeWidth={1.5} />
            <text x={x + stageW / 2 - 4} y={100} fontSize={14} fontWeight={700} textAnchor="middle" fill={fg}>
              {i + 1}. {t.stage}
            </text>
            {desc.map((l, j) => (
              <text key={j} x={x + 6} y={142 + j * 16} fontSize={12} fill={t.found ? '#1e293b' : '#94a3b8'}>
                {l}
              </text>
            ))}
            {actors.slice(0, MAX_CHIPS).map((a, j) => {
              const lines = chipLines(a);
              const h = chipH(lines);
              const y = cy;
              cy += h + 4;
              return (
                <g key={j} transform={`translate(${x + 6}, ${y})`}>
                  <rect width={stageW - 24} height={h} rx={9} fill="#eff6ff" stroke="#bfdbfe" />
                  {lines.map((l, k) => (
                    <text key={k} x={8} y={14 + k * 14} fontSize={11} fill="#1d4ed8">
                      {l}
                    </text>
                  ))}
                </g>
              );
            })}
            {actors.length > MAX_CHIPS && (
              <text x={x + 10} y={cy + 10} fontSize={11} fill="#64748b">
                외 {actors.length - MAX_CHIPS}개
              </text>
            )}
          </g>
        );
      })}

      {/* OPP */}
      <text x={20} y={oppTop - 14} fontSize={15} fontWeight={700} fill="#0f172a">
        OPP — 행위자들이 각자의 목표를 이루려면 지나야 하는 관문
      </text>
      {!opp ? (
        <text x={20} y={oppTop + 20} fontSize={13} fill="#94a3b8">
          자료에서 OPP를 확인하지 못했습니다. (OPP는 중심에 있어 보이는 것을 고르는 것이 아니라 자료로 확인하는 것입니다)
        </text>
      ) : (
        <g>
          {passing.map((id, i) => {
            const y = oppTop + 15 + i * rowH;
            const actor = analysis.actors.find((a) => a.id === id);
            return (
              <g key={id}>
                <rect x={20} y={y} width={200} height={46} rx={6} fill="#f8fafc" stroke="#cbd5e1" />
                {wrap(name(id), 14, 2).map((l, k, all) => (
                  <text key={k} x={30} y={y + (all.length > 1 ? 19 : 28) + k * 16} fontSize={13} fontWeight={600} fill="#0f172a">
                    {l}
                  </text>
                ))}
                <line x1={222} y1={y + 23} x2={W / 2 - 132} y2={oppTop + oppH / 2 - 10} stroke="#111827" strokeWidth={1.4} markerEnd="url(#t-arr)" />
                <line x1={W / 2 + 132} y1={oppTop + oppH / 2 - 10} x2={W - 262} y2={y + 23} stroke="#111827" strokeWidth={1.4} markerEnd="url(#t-arr)" />
                <rect x={W - 260} y={y} width={240} height={46} rx={6} fill="#f0fdf4" stroke="#86efac" />
                {wrap(`목표: ${actor?.goal || '자료에 명시 안 됨'}`, 19, 2).map((l, k) => (
                  <text key={k} x={W - 250} y={y + 19 + k * 16} fontSize={12} fill="#166534">
                    {l}
                  </text>
                ))}
              </g>
            );
          })}
          <rect x={W / 2 - 130} y={oppTop + oppH / 2 - 52} width={260} height={84} rx={6} fill="#111827" />
          <text x={W / 2} y={oppTop + oppH / 2 - 30} fontSize={11} textAnchor="middle" fill="#fbbf24" fontWeight={700}>
            OPP 후보 · 확신 {opp.confidence}
            {analysis.oppCandidates.length > 1 ? ` (후보 ${analysis.oppCandidates.length}개 중 1)` : ''}
          </text>
          {wrap(opp.label, 18, 3).map((l, j) => (
            <text key={j} x={W / 2} y={oppTop + oppH / 2 - 10 + j * 17} fontSize={14} textAnchor="middle" fill="#fff" fontWeight={600}>
              {l}
            </text>
          ))}
        </g>
      )}

      {/* 블랙박스 */}
      <text x={20} y={bbTop - 14} fontSize={15} fontWeight={700} fill="#0f172a">
        블랙박스 — 안정되어 안이 보이지 않게 된 것
      </text>
      {analysis.blackBoxes.length === 0 ? (
        <text x={20} y={bbTop + 20} fontSize={13} fill="#94a3b8">
          자료에서 블랙박스를 확인하지 못했습니다.
        </text>
      ) : (
        analysis.blackBoxes.map((b, i) => {
          const y = bbTop + i * 70;
          return (
            <g key={i}>
              <rect x={20} y={y} width={260} height={56} rx={4} fill="#1f2937" />
              {wrap(b.label, 17, 2).map((l, j) => (
                <text key={j} x={150} y={y + 24 + j * 17} fontSize={14} textAnchor="middle" fill="#fff" fontWeight={600}>
                  {l}
                </text>
              ))}
              <text x={300} y={y + 20} fontSize={12} fill="#475569">
                안에 접힌 것:
              </text>
              {wrap(b.folded, 52, 2).map((l, j) => (
                <text key={j} x={300} y={y + 38 + j * 16} fontSize={12} fill="#0f172a">
                  {l}
                </text>
              ))}
            </g>
          );
        })
      )}
    </svg>
  );
});
