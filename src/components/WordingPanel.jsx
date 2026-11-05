import { useMemo, useState } from 'react';
import { getField, setField, textFields } from '../model.js';
import { CATEGORIES, applySuggestion, scanText } from '../wording.js';
import { Icon } from './Icon.jsx';

export function collectFindings(cv) {
  const out = [];
  for (const f of textFields(cv)) {
    const text = getField(cv, f.path);
    for (const finding of scanText(text, cv.ignored)) out.push({ ...finding, field: f, text });
  }
  return out;
}

function Context({ text, f }) {
  const a = Math.max(0, f.start - 50);
  const b = Math.min(text.length, f.end + 50);
  return (
    <div className="ctx">
      {a > 0 && '…'}
      {text.slice(a, f.start)}
      <mark className={`wd-mark wd-${f.rule.category}`}>{text.slice(f.start, f.end)}</mark>
      {text.slice(f.end, b)}
      {b < text.length && '…'}
    </div>
  );
}

export default function WordingPanel({ cv, update, ignore, goTo, highlight, setHighlight }) {
  const findings = useMemo(() => collectFindings(cv), [cv]);
  const [filter, setFilter] = useState('all');
  const [showSource, setShowSource] = useState(false);
  const counts = {};
  for (const f of findings) counts[f.rule.category] = (counts[f.rule.category] || 0) + 1;
  const shown = filter === 'all' ? findings : findings.filter((f) => f.rule.category === filter);

  const words = textFields(cv).reduce((n, f) => n + (getField(cv, f.path).match(/\S+/g)?.length || 0), 0);
  const flagged = findings.filter((f) => f.rule.category !== 'structure').length;
  const density = words ? (flagged / words) * 100 : 0;
  const score = Math.round(100 * Math.exp(-density / 12));
  const verdict = score >= 85 ? 'Reads naturally' : score >= 65 ? 'A few stock phrases' : 'Sounds templated';

  const apply = (f, s) => update((c) => setField(c, f.field.path, applySuggestion(getField(c, f.field.path), f, s)));

  // group by field
  const groups = [];
  for (const f of shown) {
    let g = groups.find((x) => x.path === f.field.path);
    if (!g) groups.push((g = { path: f.field.path, field: f.field, items: [] }));
    g.items.push(f);
  }

  return (
    <div className="wording">
      <div className="score-card">
        <div className={`score-ring ${score >= 85 ? 'good' : score >= 65 ? 'ok' : 'bad'}`}>
          <span>{score}</span>
        </div>
        <div>
          <div className="score-title">{verdict}</div>
          <div className="muted small-text">
            {findings.length} {findings.length === 1 ? 'thing' : 'things'} to review across {words} words. Scores drop with buzzwords, clichés and AI-style patterns.
          </div>
          <label className="check small-text" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} /> Highlight phrases in the preview
          </label>
        </div>
      </div>

      <div className="filters">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          All <b>{findings.length}</b>
        </button>
        {Object.entries(CATEGORIES).map(([k, c]) =>
          counts[k] ? (
            <button key={k} className={`chip cat-${k} ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
              {c.name} <b>{counts[k]}</b>
            </button>
          ) : null
        )}
      </div>

      {!findings.length && (
        <div className="empty-state">
          <Icon name="check" size={28} />
          <p>Nothing flagged. Still worth a read-through out loud – that is the best test of natural wording.</p>
        </div>
      )}

      {groups.map((g) => (
        <div className="wd-group" key={g.path}>
          <div className="wd-group-head">
            <span className="muted">{g.field.section}</span>
            {g.field.label !== g.field.section && <> · {g.field.label}</>}
            <button className="link-btn" onClick={() => goTo(g.path)}>
              <Icon name="edit" size={13} /> Edit
            </button>
          </div>
          {g.items.map((f, i) => (
            <div className={`wd-item cat-${f.rule.category}`} key={`${f.key}-${i}`}>
              <div className="wd-item-top">
                <span className={`cat-dot cat-${f.rule.category}`} />
                <span className="wd-cat">{CATEGORIES[f.rule.category].name}</span>
                <span className="wd-note">{f.rule.note}</span>
              </div>
              <Context text={f.text} f={f} />
              <div className="wd-actions">
                {f.rule.suggestions.map((s, j) => (
                  <button key={j} className="chip" onClick={() => apply(f, s)}>
                    {f.rule.labels?.[j] || (s === '' ? 'Remove it' : `→ ${s}`)}
                  </button>
                ))}
                <button className="chip ghost" onClick={() => goTo(f.field.path, f.start, f.end)}>
                  Rewrite myself
                </button>
                <button className="chip ghost" onClick={() => ignore(f.key)}>
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {cv.ignored?.length > 0 && (
        <button className="link-btn" onClick={() => update((c) => ({ ...c, ignored: [] }))}>
          Restore {cv.ignored.length} ignored {cv.ignored.length === 1 ? 'phrase' : 'phrases'}
        </button>
      )}

      {cv.source && (
        <div className="source-box">
          <button className="link-btn" onClick={() => setShowSource(!showSource)}>
            <Icon name={showSource ? 'chevDown' : 'chevRight'} size={13} /> Original imported text
          </button>
          {showSource && <pre className="source-text">{cv.source}</pre>}
        </div>
      )}

      <div className="tips">
        <h4>Tips for natural-sounding CVs</h4>
        <ul>
          <li>Prefer plain verbs: <i>led, built, ran, fixed, wrote, cut</i>.</li>
          <li>Replace adjectives about yourself with a fact: a number, a result, a name.</li>
          <li>Vary sentence length. Not every bullet needs a “resulting in…” tail.</li>
          <li>Read it aloud. If you would not say it to a colleague, rewrite it.</li>
        </ul>
      </div>
    </div>
  );
}
