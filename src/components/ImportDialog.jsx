import { useState } from 'react';
import { KIND_LABELS } from '../model.js';
import { buildCv, buildSection, extractFromFile, extractFromText, linesToText, parseLines } from '../importer.js';
import { Icon } from './Icon.jsx';

const summarize = (r) => {
  const s = buildSection(r, r.kind);
  if (s.kind === 'entries') return `${s.items.length} ${s.items.length === 1 ? 'entry' : 'entries'}: ${s.items.map((e) => e.title || e.subtitle).filter(Boolean).slice(0, 3).join(', ')}`;
  const t = s.content.replace(/\n/g, ' · ');
  return t.length > 110 ? `${t.slice(0, 110)}…` : t;
};

export default function ImportDialog({ onClose, onImport, onImportJson }) {
  const [mode, setMode] = useState('file');
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { parsed, sections, source, name }
  const [drag, setDrag] = useState(false);

  const process = (lines, name) => {
    const parsed = parseLines(lines);
    const source = linesToText(lines);
    if (!parsed.rawSections.length && !parsed.personal.fullName) throw new Error('No readable text found. If this is a scanned PDF (an image), it needs OCR first.');
    setResult({ parsed, sections: parsed.rawSections.map((r) => ({ ...r, include: true })), source, name });
  };

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const out = await extractFromFile(file);
      if (out.json) {
        onImportJson(out.json);
        return;
      }
      process(out.lines, file.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      console.error(e);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handlePaste = () => {
    setError('');
    try {
      process(extractFromText(paste).lines, '');
    } catch (e) {
      setError(e.message);
    }
  };

  const setSec = (i, patch) => setResult((r) => ({ ...r, sections: r.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const p = result?.parsed.personal;
  const setP = (k, v) => setResult((r) => ({ ...r, parsed: { ...r.parsed, personal: { ...r.parsed.personal, [k]: v } } }));

  const finish = (replace) => {
    const cv = buildCv(result.parsed, result.sections.filter((s) => s.include), result.source, result.parsed.personal.fullName || result.name);
    onImport(cv, replace);
  };

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{result ? 'Check what was found' : 'Import an existing CV'}</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>

        {!result && (
          <div className="modal-body">
            <p className="muted">
              Bring in a CV you already have – including one written by ChatGPT or another AI tool. It is split into sections so you can
              keep the structure and rewrite the wording in your own voice. Everything stays in your browser.
            </p>
            <div className="tabs small">
              <button className={mode === 'file' ? 'on' : ''} onClick={() => setMode('file')}>Upload a file</button>
              <button className={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}>Paste text</button>
            </div>
            {mode === 'file' ? (
              <label
                className={`drop ${drag ? 'drag' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                <Icon name="upload" size={28} />
                <strong>{busy ? 'Reading…' : 'Drop a file here or click to choose'}</strong>
                <span className="muted small-text">PDF, Word (.docx), text / Markdown, or a CV Maker .json backup</span>
                <input type="file" hidden accept=".pdf,.docx,.txt,.md,.markdown,.json,.doc" onChange={(e) => handleFile(e.target.files[0])} />
              </label>
            ) : (
              <div>
                <textarea
                  className="paste-area"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={'Paste your CV text here…\n\nJane Smith\nMarketing Manager\njane@email.com | London, UK\n\nEXPERIENCE\nMarketing Manager | Acme Ltd | 2020 – Present\n- Led a team of four…'}
                />
                <button className="btn primary" disabled={!paste.trim()} onClick={handlePaste}>
                  Analyse text
                </button>
              </div>
            )}
            {error && <div className="error">{error}</div>}
          </div>
        )}

        {result && (
          <div className="modal-body">
            <p className="muted small-text">Tweak anything that was misread. Section types can be changed here or later in the editor.</p>
            <div className="grid2 import-personal">
              {[
                ['fullName', 'Name'],
                ['headline', 'Headline'],
                ['email', 'Email'],
                ['phone', 'Phone'],
                ['location', 'Location'],
                ['website', 'Website'],
                ['linkedin', 'LinkedIn'],
              ].map(([k, label]) => (
                <label className="inp" key={k}>
                  <span>{label}</span>
                  <input value={p[k]} onChange={(e) => setP(k, e.target.value)} />
                </label>
              ))}
            </div>
            <h4 className="panel-h">Sections ({result.sections.filter((s) => s.include).length})</h4>
            <div className="import-sections">
              {result.sections.map((s, i) => (
                <div key={i} className={`import-sec ${s.include ? '' : 'off'}`}>
                  <input type="checkbox" checked={s.include} onChange={(e) => setSec(i, { include: e.target.checked })} />
                  <div className="import-sec-main">
                    <input className="import-title" value={s.title} onChange={(e) => setSec(i, { title: e.target.value })} />
                    <div className="muted small-text">{summarize(s)}</div>
                  </div>
                  <select value={s.kind} onChange={(e) => setSec(i, { kind: e.target.value })}>
                    {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              ))}
              {!result.sections.length && <div className="muted">No sections detected – the text will still be kept as the original source for reference.</div>}
            </div>
            <details className="raw">
              <summary>Show extracted text</summary>
              <pre>{result.source}</pre>
            </details>
          </div>
        )}

        <div className="modal-foot">
          {result ? (
            <>
              <button className="btn ghost" onClick={() => setResult(null)}>Back</button>
              <div className="spacer" />
              <button className="btn" onClick={() => finish(true)}>Replace current CV</button>
              <button className="btn primary" onClick={() => finish(false)}>
                <Icon name="check" size={15} /> Create new CV
              </button>
            </>
          ) : (
            <button className="btn ghost" onClick={onClose}>Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}
