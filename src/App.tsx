// ANT 개념도 생성기 — 자료 입력 → AI 분석 → 개념도 3장 + 근거 표 → (인터뷰를 더해) 2차 분석
import { useMemo, useRef, useState } from 'react';
import { ChangesView } from './components/Changes';
import { ActorPanel } from './components/ActorPanel';
import { ContradictionMap } from './components/ContradictionMap';
import { RelationKindsEditor } from './components/RelationKinds';
import { Details } from './components/Details';
import { evidenceStats } from './components/Evidence';
import { NetworkMap } from './components/NetworkMap';
import { TranslationMap } from './components/TranslationMap';
import { DEFAULT_MODEL, MODELS, runAnalysis, runFollowup, type GenerateFn, type ModelId } from './lib/ai/core';
import { mockGenerate } from './lib/ai/mock';
import { config } from './lib/config';
import { downloadBlob, safeName, svgString, svgToPng } from './lib/download';
import { compare } from './lib/compare';
import { kindOrder } from './lib/palette';
import { SourceIndex } from './lib/evidence';
import { MAX_INTERVIEW_CHARS, MAX_SOURCE_CHARS, type InterviewDoc } from './lib/prompt';
import { SAMPLE_INTERVIEWS, SAMPLE_SOURCE, SAMPLE_TITLE } from './lib/sample';
import type { AntAnalysis } from './lib/schema';
import { loadHistory, loadKinds, removeRun, saveKinds, saveRun, type SavedRun } from './lib/storage';
import { DEFAULT_RELATION_KINDS, MIN_RELATION_KINDS, cleanKinds, type RelationKindDef } from './lib/schema';

type Tab = 'network' | 'translation' | 'contradiction' | 'details' | 'changes';
const TABS: { id: Tab; label: string }[] = [
  { id: 'network', label: '① 네트워크도' },
  { id: 'translation', label: '② 번역·OPP·블랙박스' },
  { id: 'contradiction', label: '③ 모순·대안' },
  { id: 'details', label: '근거 표' },
  { id: 'changes', label: '2차 변화' },
];
const isFigure = (t: Tab): t is 'network' | 'translation' | 'contradiction' => t !== 'details' && t !== 'changes';
const stageLabel = (r: SavedRun) => ((r.stage ?? 1) > 1 ? `[${r.stage}차] ` : '');

/** PDF·TXT·MD 파일 → 글자 */
async function readText(f: File, onBusy: (s: string) => void): Promise<string> {
  if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
    onBusy('PDF에서 글자를 읽는 중…');
    const { pdfToText } = await import('./lib/pdf').catch(() => {
      throw new Error('사이트가 새 버전으로 바뀌었습니다. 새로고침(F5)한 뒤 다시 넣어 주세요.');
    });
    const text = await pdfToText(f, (p, n) => onBusy(`PDF에서 글자를 읽는 중… (${p}/${n}쪽)`));
    if (text.replace(/\s/g, '').length < 100) throw new Error('PDF에서 글자를 거의 읽지 못했습니다. 스캔한 그림 PDF일 수 있습니다. 글을 복사해 붙여 넣어 주세요.');
    return text;
  }
  if (/\.(hwp|hwpx|docx?)$/i.test(f.name)) throw new Error('한글·워드 파일은 아직 직접 읽지 못합니다. 파일을 열어 본문을 복사해 붙여 넣어 주세요.');
  return f.text();
}

async function generator(): Promise<GenerateFn> {
  if (config.aiMode !== 'gemini') return mockGenerate;
  try {
    return (await import('./lib/ai/gemini')).geminiGenerate;
  } catch {
    // 페이지를 연 뒤 사이트가 새 버전으로 배포되면 예전 파일을 못 찾는다
    throw new Error('사이트가 새 버전으로 바뀌었습니다. 새로고침(F5)한 뒤 다시 눌러 주세요.');
  }
}

const btn = 'inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';
const primary = `${btn} bg-indigo-700 text-white hover:bg-indigo-600`;
const secondary = `${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-100`;

export default function App() {
  const [source, setSource] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [focus, setFocus] = useState('');
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<SavedRun | null>(null);
  const [history, setHistory] = useState<SavedRun[]>(() => loadHistory());
  const [tab, setTab] = useState<Tab>('network');
  const [showOpp, setShowOpp] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<InterviewDoc[]>([]);
  const [draft, setDraft] = useState('');
  const [kinds, setKindsState] = useState<RelationKindDef[]>(() => loadKinds() ?? DEFAULT_RELATION_KINDS.map((k) => ({ ...k })));
  const setKinds = (k: RelationKindDef[]) => {
    setKindsState(k);
    saveKinds(k);
  };
  const usableKinds = cleanKinds(kinds);
  const svgs = { network: useRef<SVGSVGElement>(null), translation: useRef<SVGSVGElement>(null), contradiction: useRef<SVGSVGElement>(null) };

  const index = useMemo(
    () => (run?.source ? new SourceIndex(run.source, (run.interviews ?? []).map((d, i) => ({ name: `인터뷰 ${i + 1}`, text: d.text }))) : null),
    [run],
  );
  const analysis: AntAnalysis | null = run?.analysis ?? null;
  const comparison = useMemo(() => (run?.prevAnalysis && run.analysis ? compare(run.prevAnalysis, run.analysis) : null), [run]);
  const parent = run?.parentId ? history.find((h) => h.id === run.parentId) ?? null : null;
  const tabs = TABS.filter((t) => t.id !== 'changes' || run?.changes);
  const runKindNames = (run?.relationKinds ?? DEFAULT_RELATION_KINDS).map((k) => k.name);
  const interviewChars = interviews.reduce((n, d) => n + d.text.length, 0);
  const stats = useMemo(() => {
    if (!analysis) return null;
    const all = [
      ...analysis.actors.flatMap((x) => x.evidence),
      ...analysis.relations.flatMap((x) => x.evidence),
      ...analysis.translation.flatMap((x) => x.evidence),
      ...analysis.oppCandidates.flatMap((x) => x.evidence),
      ...analysis.blackBoxes.flatMap((x) => x.evidence),
      ...analysis.contradictions.flatMap((x) => x.evidence),
    ];
    return { total: all.length, ...evidenceStats(all, index) };
  }, [analysis, index]);

  async function onFile(f: File) {
    setError(null);
    try {
      setSource(await readText(f, setBusy));
      setSourceName(f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function onInterviewFiles(files: File[]) {
    setError(null);
    try {
      const added: InterviewDoc[] = [];
      for (const f of files) added.push({ name: f.name, text: await readText(f, setBusy) });
      setInterviews((xs) => [...xs, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function openRun(h: SavedRun) {
    setRun(h);
    setSource(h.source);
    setSourceName(h.sourceName);
    setFocus(h.focus);
    setSelected(null);
    setInterviews([]);
    if (!h.changes && tab === 'changes') setTab('network');
  }

  async function analyze() {
    setError(null);
    setBusy('AI가 자료를 분석하는 중… (긴 논문은 1분쯤 걸립니다)');
    try {
      const res = await runAnalysis(await generator(), { source: source.slice(0, MAX_SOURCE_CHARS), focus, model, relationKinds: usableKinds }, { onStatus: (s) => setBusy(s) });
      const saved: SavedRun = { id: String(Date.now()), createdAt: new Date().toISOString(), sourceName: sourceName || '붙여 넣은 글', source, focus, model: config.aiMode === 'gemini' ? res.model : 'mock', analysis: res.analysis, relationKinds: usableKinds };
      setRun(saved);
      setHistory(saveRun(saved));
      setSelected(null);
      setInterviews([]);
      setTab('network');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function followup() {
    if (!run) return;
    setError(null);
    setBusy('AI가 인터뷰를 더해 2차 분석하는 중… (1분쯤 걸립니다)');
    try {
      let left = MAX_INTERVIEW_CHARS;
      const docs = interviews.map((d) => {
        const text = d.text.slice(0, Math.max(0, left));
        left -= text.length;
        return { ...d, text };
      });
      const runKinds = run.relationKinds ?? DEFAULT_RELATION_KINDS;
      const res = await runFollowup(await generator(), { prev: run.analysis, source: run.source.slice(0, MAX_SOURCE_CHARS), interviews: docs, focus, model, relationKinds: runKinds }, { onStatus: (s) => setBusy(s) });
      const saved: SavedRun = {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        sourceName: run.sourceName,
        source: run.source,
        focus,
        model: config.aiMode === 'gemini' ? res.model : 'mock',
        analysis: res.analysis,
        relationKinds: runKinds,
        stage: (run.stage ?? 1) + 1,
        parentId: run.id,
        prevAnalysis: run.analysis,
        interviews: docs,
        changes: res.changes,
      };
      setRun(saved);
      setHistory(saveRun(saved));
      setSelected(null);
      setInterviews([]);
      setTab('changes');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function exportFig(kind: 'svg' | 'png') {
    const t = isFigure(tab) ? tab : 'network';
    const svg = svgs[t].current;
    if (!svg || !analysis) return;
    const base = `${safeName(analysis.title)}_${TABS.find((x) => x.id === t)!.label.replace(/[①②③\s·]/g, '')}`;
    try {
      if (kind === 'svg') downloadBlob(`${base}.svg`, new Blob([svgString(svg)], { type: 'image/svg+xml' }));
      else downloadBlob(`${base}.png`, await svgToPng(svg));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const len = source.length;
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4">
          <h1 className="text-lg font-bold">ANT 개념도 생성기</h1>
          <p className="text-sm text-slate-600">자료를 넣으면 행위자 네트워크 이론으로 행위자·네트워크·번역·OPP·블랙박스·모순을 찾아 개념도로 그립니다.</p>
        </div>
        {config.aiMode === 'mock' && <div className="bg-amber-50 px-4 py-1 text-center text-xs text-amber-900">샘플 모드 — 실제 AI 대신 고정된 예시 결과를 보여 줍니다</div>}
      </header>

      <main className="mx-auto grid max-w-[100rem] gap-6 px-4 py-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">1. 자료 넣기</h2>
            <label className="block">
              <span className="text-sm text-slate-600">PDF·TXT·MD 파일</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,text/plain,application/pdf"
                aria-label="자료 파일"
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                  e.target.value = '';
                }}
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">또는 글 붙여 넣기 (한글 파일은 본문 복사)</span>
              <textarea
                aria-label="분석할 글"
                rows={9}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setSourceName('');
                }}
                placeholder="논문, 수업 기록, 사례 글 등"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {sourceName && <span className="mr-1 font-medium text-slate-700">{sourceName}</span>}
                {len.toLocaleString()}자{len > MAX_SOURCE_CHARS && <span className="text-amber-700"> · 앞 {MAX_SOURCE_CHARS.toLocaleString()}자만 분석</span>}
              </span>
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setSource(SAMPLE_SOURCE);
                  setSourceName(SAMPLE_TITLE);
                }}
              >
                예시 자료 넣기
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">2. 분석</h2>
            <label className="block">
              <span className="text-sm text-slate-600">분석 초점 (선택)</span>
              <input
                aria-label="분석 초점"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="예: 디지털 시스템이 행위자가 되는 과정에 주목"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            {config.aiMode === 'gemini' && (
              <label className="block">
                <span className="text-sm text-slate-600">AI 모델</span>
                <select aria-label="AI 모델" value={model} onChange={(e) => setModel(e.target.value as ModelId)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                  {(Object.keys(MODELS) as ModelId[]).map((m) => (
                    <option key={m} value={m}>
                      {MODELS[m]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <RelationKindsEditor kinds={kinds} onChange={setKinds} />
            <button type="button" className={`${primary} w-full`} disabled={!!busy || source.trim().length < 50 || usableKinds.length < MIN_RELATION_KINDS} onClick={analyze}>
              {busy ? '분석 중…' : '개념도 만들기'}
            </button>
            {busy && (
              <p role="status" className="text-sm text-indigo-800">
                {busy}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <p className="text-xs text-slate-500">입력한 글은 AI(Google Gemini 무료 등급)로 보내지며 Google 제품 개선에 쓰일 수 있습니다. 개인정보가 담긴 자료는 넣지 마세요.</p>
          </section>

          {run && (
            <section className="space-y-3 rounded-lg border border-indigo-200 bg-white p-4" aria-labelledby="followup-h">
              <h2 id="followup-h" className="font-semibold">
                3. {(run.stage ?? 1) + 1}차 분석: 인터뷰 더하기
              </h2>
              <p className="text-sm text-slate-600">지금 보고 있는 결과에 행위자들의 실제 인터뷰를 더해, 무엇이 확인되고 새로 나오고 달라졌는지 다시 분석합니다. 관계 종류는 앞 분석과 같은 것({(run.relationKinds ?? DEFAULT_RELATION_KINDS).length}개)을 씁니다.</p>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">인터뷰는 이름·학교·연락처를 지우고 ‘담당 교사 A’처럼 바꾼 뒤 넣으세요. 무료 등급 AI로 보낸 내용은 Google 제품 개선에 쓰일 수 있습니다.</p>
              <label className="block">
                <span className="text-sm text-slate-600">인터뷰 파일 (PDF·TXT·MD, 여러 개 가능)</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,text/plain,application/pdf"
                  aria-label="인터뷰 파일"
                  className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
                  onChange={(e) => {
                    const fs = [...(e.target.files ?? [])];
                    if (fs.length) void onInterviewFiles(fs);
                    e.target.value = '';
                  }}
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600">또는 인터뷰 붙여 넣기</span>
                <textarea
                  aria-label="인터뷰 글"
                  rows={5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="한 사람의 인터뷰를 붙여 넣고 ‘목록에 추가’를 누르세요"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className={secondary}
                  disabled={draft.trim().length < 20}
                  onClick={() => {
                    setInterviews((xs) => [...xs, { name: `붙여 넣은 인터뷰 ${xs.length + 1}`, text: draft.trim() }]);
                    setDraft('');
                  }}
                >
                  목록에 추가
                </button>
                {run.source === SAMPLE_SOURCE && (
                  <button type="button" className="text-xs underline text-slate-500" onClick={() => setInterviews(SAMPLE_INTERVIEWS.map((d) => ({ ...d })))}>
                    예시 인터뷰 넣기
                  </button>
                )}
              </div>
              {interviews.length > 0 && (
                <ol className="space-y-1 text-sm" aria-label="넣은 인터뷰">
                  {interviews.map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">인터뷰 {i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{d.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{d.text.length.toLocaleString()}자</span>
                      <button type="button" aria-label={`인터뷰 ${i + 1} 빼기`} className="text-xs text-slate-400 hover:text-red-700" onClick={() => setInterviews((xs) => xs.filter((_, j) => j !== i))}>
                        빼기
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {interviewChars > MAX_INTERVIEW_CHARS && <p className="text-xs text-amber-700">인터뷰가 길어 앞 {MAX_INTERVIEW_CHARS.toLocaleString()}자만 분석합니다.</p>}
              <button type="button" className={`${primary} w-full`} disabled={!!busy || interviews.length === 0} onClick={followup}>
                {busy ? '분석 중…' : `인터뷰 ${interviews.length}건 더해 ${(run.stage ?? 1) + 1}차 분석`}
              </button>
            </section>
          )}

          {history.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-2 font-semibold">최근 분석 (이 브라우저)</h2>
              <ul className="space-y-1 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-2">
                    <button type="button" className={`min-w-0 flex-1 truncate text-left hover:underline ${run?.id === h.id ? 'font-semibold' : ''}`} onClick={() => openRun(h)}>
                      {stageLabel(h)}
                      {h.analysis.title}
                    </button>
                    <button type="button" aria-label={`${h.analysis.title} 지우기`} className="text-xs text-slate-400 hover:text-red-700" onClick={() => setHistory(removeRun(h.id))}>
                      지우기
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          {!analysis ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              <p className="font-medium">왼쪽에 자료를 넣고 ‘개념도 만들기’를 누르세요.</p>
              <p className="mt-2 text-sm">결과: ① 행위자 네트워크도 ② 번역 5단계·OPP·블랙박스 ③ 모순과 대안, 그리고 항목마다 원문 근거와 그 근거가 원문에 실제로 있는지 확인한 표시</p>
              <p className="mt-1 text-sm">결과가 나오면 행위자들의 인터뷰를 더해 2차 분석을 할 수 있습니다.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                {run?.prevAnalysis && (
                  <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-indigo-800" data-testid="stage-note">
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-semibold">{run.stage}차 분석</span>
                    앞 분석 ‘{run.prevAnalysis.title}’ + 인터뷰 {run.interviews?.length ?? 0}건
                    {parent && (
                      <button type="button" className="underline" onClick={() => openRun(parent)}>
                        앞 분석 보기
                      </button>
                    )}
                  </p>
                )}
                <h2 className="text-lg font-bold">{analysis.title}</h2>
                <p className="mt-1 text-sm text-slate-700">{analysis.summary}</p>
                {stats && stats.total > 0 && (
                  <p className="mt-2 text-xs text-slate-500" data-testid="evidence-stats">
                    근거 인용 {stats.total}개 — <span className="text-emerald-700">원문 확인 {stats.exact}</span> · <span className="text-amber-700">부분 일치 {stats.partial}</span> · <span className="text-red-700">원문에 없음 {stats.missing}</span>
                    {run && <span> · 모델 {run.model}</span>}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1" role="tablist" aria-label="결과 보기">
                  {tabs.map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rounded-md px-3 py-1.5 text-sm ${tab === t.id ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white hover:bg-slate-100'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  {isFigure(tab) && (
                    <>
                      <button type="button" className={secondary} onClick={() => exportFig('png')}>
                        PNG
                      </button>
                      <button type="button" className={secondary} onClick={() => exportFig('svg')}>
                        SVG
                      </button>
                    </>
                  )}
                  <button type="button" className={secondary} onClick={() => downloadBlob(`${safeName(analysis.title)}.json`, new Blob([JSON.stringify({ ...analysis, ...(run?.changes ? { changes: run.changes, _stage: run.stage, _interviews: run.interviews?.map((d) => d.name) } : {}), _source: run?.sourceName, _model: run?.model, _createdAt: run?.createdAt }, null, 2)], { type: 'application/json' }))}>
                    JSON
                  </button>
                </div>
              </div>

              {tab === 'network' && (
                <div className={selected ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]' : ''}>
                  <div className="min-w-0 space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={showOpp} onChange={() => setShowOpp(!showOpp)} /> OPP 후보 함께 보기
                    </label>
                    <NetworkMap ref={svgs.network} analysis={analysis} showOpp={showOpp} selected={selected} onSelect={setSelected} newIds={comparison?.newActorIds} relationKinds={runKindNames} />
                    <p className="text-xs text-slate-500">노드를 누르면 연결된 관계가 강조되고, 그 판단이 원문 어디에서 나왔는지 옆에 보입니다. 노드는 끌어 옮길 수 있습니다.</p>
                  </div>
                  {selected && <ActorPanel analysis={analysis} actorId={selected} index={index} kindOrder={kindOrder(analysis.relations, runKindNames)} isNew={comparison?.newActorIds.includes(selected)} onSelect={setSelected} />}
                </div>
              )}
              {tab === 'translation' && <TranslationMap ref={svgs.translation} analysis={analysis} />}
              {tab === 'contradiction' && <ContradictionMap ref={svgs.contradiction} analysis={analysis} />}
              {tab === 'changes' && run?.changes && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <ChangesView changes={run.changes} comparison={comparison} index={index} />
                </div>
              )}
              {tab === 'details' && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <Details analysis={analysis} index={index} selected={selected} />
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-[100rem] px-4 pb-8 text-xs text-slate-500">
        AI 분석 결과는 초안입니다. 특히 OPP·블랙박스는 연구자가 자료로 다시 확인해야 합니다. · 참고: 이효순(2025), 「교육정책 실행 분석 방법론으로서의 행위자-네트워크이론(ANT)의 가능성 탐색」, 『교육비평』 57호.
      </footer>
    </div>
  );
}
