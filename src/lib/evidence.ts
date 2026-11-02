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

export class SourceIndex {
  private norm: string;
  constructor(source: string) {
    this.norm = normalize(source);
  }
  check(quote: string): EvidenceStatus {
    const q = normalize(quote);
    if (q.length < 4) return 'missing';
    if (this.norm.includes(q)) return 'exact';
    // 앞뒤가 조금 다른 경우: 긴 인용의 70% 이상이 이어서 일치하면 부분 일치
    const needle = q.slice(0, 200);
    return longestCommon(this.norm, needle) >= Math.max(8, Math.floor(needle.length * 0.7)) ? 'partial' : 'missing';
  }
}
