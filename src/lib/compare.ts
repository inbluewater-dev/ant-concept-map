// 1차 ↔ 2차 결과 비교 — AI가 쓴 변화 목록과 별도로, 프로그램이 두 결과를 직접 맞대어 본다
import type { AntAnalysis, RelationKind } from './schema';

const key = (s: string) => s.normalize('NFC').replace(/[\s·・ㆍ()（）'"‘’“”]/g, '').toLowerCase();

export interface Comparison {
  /** 2차에서 새로 나온 행위자 id (2차 결과 기준) */
  newActorIds: string[];
  newActors: string[];
  /** 1차에 있었는데 2차에서 빠진 행위자 이름 */
  removedActors: string[];
  newRelations: { from: string; to: string; kind: RelationKind; label: string }[];
  changedRelations: { from: string; to: string; before: RelationKind; after: RelationKind }[];
  removedRelations: { from: string; to: string; kind: RelationKind }[];
  opp: { before: string[]; after: string[] };
}

/** 행위자는 이름으로 맞춘다(같은 id라도 이름이 전혀 다르면 다른 행위자로 본다). 관계는 두 행위자 쌍으로 맞춘다 */
export function compare(prev: AntAnalysis, next: AntAnalysis): Comparison {
  const prevByName = new Map(prev.actors.map((a) => [key(a.name), a]));
  const prevName = (id: string) => prev.actors.find((a) => a.id === id)?.name ?? id;
  const nextName = (id: string) => next.actors.find((a) => a.id === id)?.name ?? id;

  const added = next.actors.filter((a) => !prevByName.has(key(a.name)));
  const newActorIds = added.map((a) => a.id);
  const newActors = added.map((a) => a.name);
  const nextNames = new Set(next.actors.map((a) => key(a.name)));
  const removedActors = prev.actors.filter((a) => !nextNames.has(key(a.name))).map((a) => a.name);

  const pair = (from: string, to: string) => `${key(from)}→${key(to)}`;
  const prevRel = new Map(prev.relations.map((r) => [pair(prevName(r.from), prevName(r.to)), r]));
  const nextRel = new Map(next.relations.map((r) => [pair(nextName(r.from), nextName(r.to)), r]));

  const newRelations: Comparison['newRelations'] = [];
  const changedRelations: Comparison['changedRelations'] = [];
  for (const [k, r] of nextRel) {
    const p = prevRel.get(k);
    if (!p) newRelations.push({ from: nextName(r.from), to: nextName(r.to), kind: r.kind, label: r.label });
    else if (p.kind !== r.kind) changedRelations.push({ from: nextName(r.from), to: nextName(r.to), before: p.kind, after: r.kind });
  }
  const removedRelations = [...prevRel].filter(([k]) => !nextRel.has(k)).map(([, r]) => ({ from: prevName(r.from), to: prevName(r.to), kind: r.kind }));

  const oppLabel = (a: AntAnalysis) => a.oppCandidates.map((o) => `${o.label} (확신 ${o.confidence})`);
  return { newActorIds, newActors, removedActors, newRelations, changedRelations, removedRelations, opp: { before: oppLabel(prev), after: oppLabel(next) } };
}
