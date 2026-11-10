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

/** 가장 긴 공통 부분 문자열 (짧은 쪽 기준, O(n·m) — 인용은 짧다). end = hay에서 끝나는 위치 */
function longestCommonAt(hay: string, needle: string): { len: number; end: number } {
  const m = needle.length;
  let best = 0;
  let end = 0;
  let prev = new Uint16Array(m + 1);
  let cur = new Uint16Array(m + 1);
  for (let i = 1; i <= hay.length; i++) {
    const c = hay.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) {
      cur[j] = c === needle.charCodeAt(j - 1) ? prev[j - 1] + 1 : 0;
      if (cur[j] > best) {
        best = cur[j];
        end = i;
      }
    }
    [prev, cur] = [cur, prev];
    cur.fill(0);
  }
  return { len: best, end };
}

/** normalize와 같은 결과를 만들면서, 비교용 글자마다 원문(NFC) 위치를 기억한다 — 원문 문맥을 보여 주려고 */
export function normalizeWithMap(text: string): { orig: string; norm: string; map: number[] } {
  const orig = text.normalize('NFC');
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < orig.length; i++) {
    let c = orig[i];
    if (/[\s\u00a0\u200b]/.test(c)) continue;
    c = c.replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[·ㆍ・]/g, '·').toLowerCase();
    for (let k = 0; k < c.length; k++) {
      norm += c[k];
      map.push(i);
    }
  }
  return { orig, norm, map };
}

export interface SourceDoc {
  name: string;
  text: string;
}

/** 인용이 원문에서 놓인 자리와 앞뒤 문맥 */
export interface QuoteContext {
  doc: string;
  status: EvidenceStatus;
  before: string;
  match: string;
  after: string;
}

const squash = (s: string) => s.replace(/\s+/g, ' ');

/** 원문(과 2차 분석의 인터뷰들)에서 인용을 찾는다. 여러 자료면 어느 자료에서 찾았는지도 알려 준다 */
export class SourceIndex {
  private docs: { name: string; orig: string; norm: string; map: number[] }[];
  constructor(source: string, extra: SourceDoc[] = []) {
    this.docs = [{ name: '원 자료', text: source }, ...extra].map((d) => ({ name: d.name, ...normalizeWithMap(d.text) }));
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
  /** 인용을 원문 앞뒤 문맥과 함께 돌려준다(부분 일치면 일치한 부분만 강조). 원문에 없으면 null */
  context(quote: string, radius = 90): QuoteContext | null {
    const r = this.locate(quote);
    if (r.status === 'missing' || r.at === null) return null;
    const d = this.docs[r.at.doc];
    const s = d.map[r.at.start];
    const e = d.map[r.at.end - 1] + 1;
    const b0 = Math.max(0, s - radius);
    const a1 = Math.min(d.orig.length, e + radius);
    return {
      doc: d.name,
      status: r.status,
      before: (b0 > 0 ? '…' : '') + squash(d.orig.slice(b0, s)),
      match: squash(d.orig.slice(s, e)),
      after: squash(d.orig.slice(e, a1)) + (a1 < d.orig.length ? '…' : ''),
    };
  }
  private locate(quote: string): { status: EvidenceStatus; doc: string | null; at: { doc: number; start: number; end: number } | null } {
    const q = normalize(quote);
    if (q.length < 4) return { status: 'missing', doc: null, at: null };
    for (let i = 0; i < this.docs.length; i++) {
      const p = this.docs[i].norm.indexOf(q);
      if (p >= 0) return { status: 'exact', doc: this.docs[i].name, at: { doc: i, start: p, end: p + q.length } };
    }
    // 앞뒤가 조금 다른 경우: 긴 인용의 70% 이상이 이어서 일치하면 부분 일치
    const needle = q.slice(0, 200);
    const need = Math.max(8, Math.floor(needle.length * 0.7));
    for (let i = 0; i < this.docs.length; i++) {
      const lc = longestCommonAt(this.docs[i].norm, needle);
      if (lc.len >= need) return { status: 'partial', doc: this.docs[i].name, at: { doc: i, start: lc.end - lc.len, end: lc.end } };
    }
    return { status: 'missing', doc: null, at: null };
  }
}
