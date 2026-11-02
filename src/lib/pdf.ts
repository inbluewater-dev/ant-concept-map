// PDF → 글자. 한글 글꼴(CID)을 읽으려면 cMap이 필요하다 (public/cmaps)
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function pdfToText(file: File, onProgress?: (page: number, total: number) => void): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, cMapUrl: `${import.meta.env.BASE_URL}cmaps/`, cMapPacked: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
    onProgress?.(i, doc.numPages);
  }
  return cleanText(pages.join('\n\n'));
}

/** 줄 끝 하이픈 이음, 과한 빈 줄·공백 정리 */
export function cleanText(s: string): string {
  return s
    .replace(/\r/g, '')
    .replace(/[\uE000-\uF8FF\uFFFD]/g, '') // 글꼴 전용 문자·깨진 문자
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
