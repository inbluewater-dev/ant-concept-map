// 네트워크도 배치 — d3-force로 처음 자리를 정한다(같은 입력이면 같은 그림이 나오도록 시작점을 고정)
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import type { AntAnalysis } from './schema';

export interface Pos {
  x: number;
  y: number;
}
export const MAP_W = 980;
export const MAP_H = 640;

type N = SimulationNodeDatum & { id: string };

/** OPP 후보도 노드로 함께 배치한다 (id: opp0, opp1, …) */
export function layoutNetwork(a: AntAnalysis, withOpp: boolean): Record<string, Pos> {
  const nodes: N[] = a.actors.map((x, i) => {
    const ang = (i / a.actors.length) * Math.PI * 2;
    return { id: x.id, x: MAP_W / 2 + Math.cos(ang) * 220, y: MAP_H / 2 + Math.sin(ang) * 200 };
  });
  const links: { source: string; target: string; strength: number }[] = a.relations.map((r) => ({ source: r.from, target: r.to, strength: 0.5 }));
  if (withOpp)
    a.oppCandidates.forEach((o, i) => {
      nodes.push({ id: `opp${i}`, x: MAP_W / 2 + i * 30, y: MAP_H / 2 });
      o.passingActorIds.forEach((id) => links.push({ source: `opp${i}`, target: id, strength: 0.9 }));
    });
  const sim = forceSimulation(nodes)
    .force('link', forceLink<N, { source: string; target: string; strength: number }>(links).id((d) => d.id).distance(130).strength((l) => l.strength))
    .force('charge', forceManyBody().strength(-520))
    .force('collide', forceCollide(62))
    .force('x', forceX(MAP_W / 2).strength(0.05))
    .force('y', forceY(MAP_H / 2).strength(0.07))
    .stop();
  for (let i = 0; i < 320; i++) sim.tick();
  // 화면 안으로 맞추기
  const xs = nodes.map((n) => n.x!);
  const ys = nodes.map((n) => n.y!);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = { x: 90, top: 70, bottom: 155 }; // 아래쪽은 범례 자리
  const sx = (MAP_W - pad.x * 2) / Math.max(1, maxX - minX);
  const sy = (MAP_H - pad.top - pad.bottom) / Math.max(1, maxY - minY);
  const s = Math.min(sx, sy, 1.4);
  const ox = (MAP_W - (maxX - minX) * s) / 2;
  const oy = pad.top + (MAP_H - pad.top - pad.bottom - (maxY - minY) * s) / 2;
  const out: Record<string, Pos> = {};
  for (const n of nodes) out[n.id] = { x: ox + (n.x! - minX) * s, y: oy + (n.y! - minY) * s };
  return out;
}

/** 글을 n자 단위로 줄바꿈 (공백 우선) */
export function wrap(text: string, n: number, maxLines = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= n) cur = (cur + ' ' + w).trim();
    else {
      if (cur) lines.push(cur);
      let rest = w;
      while (rest.length > n) {
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      cur = rest;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].slice(0, Math.max(1, n - 1)) + '…';
    return cut;
  }
  return lines;
}
