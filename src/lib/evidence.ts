// 근거 인용이 원문에 실제로 있는지 확인한다 — AI가 지어낸 근거를 가려내는 장치
export type EvidenceStatus = 'exact' | 'partial' | 'missing';
export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = { exact: '원문 확인', partial: '부분 일치', missing: '원문에 없음' };

/** 비교용: 공백·줄바꿈·따옴표 종류·가운뎃점 차이를 없앤다 */
export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[·ㆍ・]/g, '·')
    .replace(/[\s ​]+/g, '')
    .toLowerCase();
}

/** 가장 긴 공통 부분 문자열 길이 (짧은 쪽 기준, O(n·m) — 인용은 짧다) */
function longestCommon(hay: string, needle: string): number {
  const m = needle.length;
  let best = 0;
  let prev = new Uint16Array(m + 1);
  let cur = new Uint16Array(m + 1);
  for (let i = 1; i <= hay.length; i++) {
    const c = hay.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) {
      cur[j] = c === needle.charCodeAt(j - 1) ? prev[j - 1] + 1 : 0;
      if (cur[j] > best) best = cur[j];
    }
    [prev, cur] = [cur, prev];
    cur.fill(0);
  }
  return best;
}

export interface SourceDoc {
  name: string;
  text: string;
}

/** 원문(과 2차 분석의 인터뷰들)에서 인용을 찾는다. 여러 자료면 어느 자료에서 찾았는지도 알려 준다 */
export class SourceIndex {
  private docs: { name: string; norm: string }[];
  constructor(source: string, extra: SourceDoc[] = []) {
    this.docs = [{ name: '원 자료', norm: normalize(source) }, ...extra.map((d) => ({ name: d.name, norm: normalize(d.text) }))];
  }
  get multi(): boolean {
    return this.docs.length > 1;
  }
  check(quote: string): EvidenceStatus {
    return this.locate(quote).status;
  }
  /** 인용이 있는 자료 이름 (없으면 null) */
  where(quote: string): string | null {
    return this.locate(quote).doc;
  }
  private locate(quote: string): { status: EvidenceStatus; doc: string | null } {
    const q = normalize(quote);
    if (q.length < 4) return { status: 'missing', doc: null };
    for (const d of this.docs) if (d.norm.includes(q)) return { status: 'exact', doc: d.name };
    // 앞뒤가 조금 다른 경우: 긴 인용의 70% 이상이 이어서 일치하면 부분 일치
    const needle = q.slice(0, 200);
    const need = Math.max(8, Math.floor(needle.length * 0.7));
    for (const d of this.docs) if (longestCommon(d.norm, needle) >= need) return { status: 'partial', doc: d.name };
    return { status: 'missing', doc: null };
  }
}
