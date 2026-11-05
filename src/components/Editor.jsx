import { useEffect, useRef, useState } from 'react';
import { KIND_LABELS, LIST_STYLES, SECTION_PRESETS, labelsFor, newEntry, newSection, uid } from '../model.js';
import { applySuggestion, scanText } from '../wording.js';
import { parseList, ratingKey } from '../richtext.jsx';
import { Icon } from './Icon.jsx';

const move = (arr, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

/** Auto-growing textarea with inline wording hints. */
export function TextField({ path, value, onChange, placeholder, rows = 3, cv, onIgnore, hint, checkWording = true }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 520)}px`;
  }, [value]);
  const findings = checkWording ? scanText(value, cv.ignored).filter((f) => f.rule.suggestions.length || f.rule.category !== 'structure') : [];
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? findings : findings.slice(0, 3);
  return (
    <div className="field">
      <textarea
        ref={ref}
        data-path={path}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck
      />
      {hint && <div className="field-hint">{hint}</div>}
      {findings.length > 0 && (
        <div className="hints">
          {shown.map((f, i) => (
            <div className={`hint hint-${f.rule.category}`} key={`${f.key}${i}`}>
              <button
                className="hint-match"
                title={`${f.rule.note} – click to select it in the text`}
                onClick={() => {
                  const el = ref.current;
                  el.focus();
                  el.setSelectionRange(f.start, f.end);
                }}
              >
                “{f.match.trim().length > 40 ? `${f.match.trim().slice(0, 40)}…` : f.match.trim() || '—'}”
              </button>
              {f.rule.suggestions.length > 0 && <span className="hint-arrow">→</span>}
              {f.rule.suggestions.map((s, j) => (
                <button key={j} className="chip" onClick={() => onChange(applySuggestion(value, f, s))}>
                  {f.rule.labels?.[j] || (s === '' ? 'remove' : s)}
                </button>
              ))}
              {!f.rule.suggestions.length && <span className="hint-note">{f.rule.note}</span>}
              <button className="hint-x" title="Ignore this everywhere" onClick={() => onIgnore(f.key)}>
                <Icon name="x" size={12} />
              </button>
            </div>
          ))}
          {findings.length > 3 && (
            <button className="link-btn" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `+${findings.length - 3} more wording hints`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, path, wide }) {
  return (
    <label className={`inp ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <input data-path={path} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

async function readPhoto(file) {
  const url = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const size = 360;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const s = Math.min(img.width, img.height);
  c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.86);
}

function PersonalCard({ cv, update, open, toggle }) {
  const p = cv.personal;
  const set = (k) => (v) => update((c) => ({ ...c, personal: { ...c.personal, [k]: v } }));
  return (
    <div className={`card ${open ? 'open' : ''}`}>
      <div className="card-head" onClick={toggle}>
        <Icon name={open ? 'chevDown' : 'chevRight'} />
        <div className="card-title">Personal details</div>
        <div className="card-sub">{p.fullName || 'Name, contact, photo'}</div>
      </div>
      {open && (
        <div className="card-body">
          <div className="grid2">
            <Input label="Full name" value={p.fullName} onChange={set('fullName')} placeholder="Jane Smith" wide />
            <Input label="Headline" path="p:headline" value={p.headline} onChange={set('headline')} placeholder="e.g. Senior Accountant" wide />
            <Input label="Email" value={p.email} onChange={set('email')} placeholder="jane@email.com" />
            <Input label="Phone" value={p.phone} onChange={set('phone')} placeholder="+1 555 0100" />
            <Input label="Location" value={p.location} onChange={set('location')} placeholder="City, Country" />
            <Input label="Website" value={p.website} onChange={set('website')} placeholder="janesmith.com" />
            <Input label="LinkedIn" value={p.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/jane" wide />
          </div>
          <div className="photo-row">
            {p.photo ? <img src={p.photo} alt="" className="photo-thumb" /> : <div className="photo-thumb empty"><Icon name="user" /></div>}
            <label className="btn small">
              <Icon name="upload" size={14} /> {p.photo ? 'Change photo' : 'Add photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files[0];
                  e.target.value = '';
                  if (f) set('photo')(await readPhoto(f));
                }}
              />
            </label>
            {p.photo && (
              <button className="btn small ghost" onClick={() => set('photo')('')}>
                Remove
              </button>
            )}
            <span className="muted small-text">Optional. Many UK/US employers prefer no photo.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryEditor({ s, e, idx, count, cv, updateEntry, removeEntry, moveEntry, duplicateEntry, ignore, focusReq }) {
  const L = labelsFor(s);
  const [open, setOpen] = useState(idx === 0 || !e.title);
  useEffect(() => {
    if (focusReq?.path.includes(e.id)) setOpen(true);
  }, [focusReq, e.id]);
  const set = (k) => (v) => updateEntry(e.id, { [k]: v });
  return (
    <div className={`entry-card ${open ? 'open' : ''}`}>
      <div className="entry-card-head" onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevDown' : 'chevRight'} size={14} />
        <div className="entry-card-title">
          {e.title || <span className="muted">Untitled</span>}
          {e.subtitle && <span className="muted"> · {e.subtitle}</span>}
        </div>
        <div className="icon-row" onClick={(ev) => ev.stopPropagation()}>
          <button className="icon-btn" title="Move up" disabled={idx === 0} onClick={() => moveEntry(idx, -1)}><Icon name="up" size={14} /></button>
          <button className="icon-btn" title="Move down" disabled={idx === count - 1} onClick={() => moveEntry(idx, 1)}><Icon name="down" size={14} /></button>
          <button className="icon-btn" title="Duplicate" onClick={() => duplicateEntry(e)}><Icon name="copy" size={14} /></button>
          <button className="icon-btn danger" title="Delete entry" onClick={() => removeEntry(e.id)}><Icon name="trash" size={14} /></button>
        </div>
      </div>
      {open && (
        <div className="entry-card-body">
          <div className="grid2">
            <Input label={L.title} value={e.title} onChange={set('title')} path={`s:${s.id}:e:${e.id}:title`} />
            <Input label={L.subtitle} value={e.subtitle} onChange={set('subtitle')} />
            <Input label="Start" value={e.start} onChange={set('start')} placeholder="Jan 2021" />
            <Input label="End" value={e.end} onChange={set('end')} placeholder="Present" />
            <Input label={L.location} value={e.location} onChange={set('location')} wide />
          </div>
          <TextField
            path={`s:${s.id}:e:${e.id}:description`}
            value={e.description}
            onChange={set('description')}
            cv={cv}
            onIgnore={ignore}
            rows={4}
            placeholder={'- Start a line with a dash for a bullet\n- **bold** and *italic* work too'}
          />
        </div>
      )}
    </div>
  );
}

function RatingsEditor({ s, setS }) {
  const items = parseList(s.content).flatMap((g) => g.items);
  const ratings = s.ratings || {};
  if (!items.length) return <div className="field-hint">Add some items above, then rate them here.</div>;
  const rate = (key, n) => {
    const next = { ...ratings };
    if (next[key] === n) delete next[key];
    else next[key] = n;
    setS({ ratings: next });
  };
  return (
    <div className="ratings-editor">
      {items.map((it, i) => {
        const key = ratingKey(it);
        const v = ratings[key] || 0;
        return (
          <div className="rating-row" key={`${key}-${i}`}>
            <span className="rating-name">{it.replace(/\*+/g, '')}</span>
            <span className="rating-dots" role="radiogroup" aria-label={`${it} level`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`rating-dot ${n <= v ? 'on' : ''}`}
                  title={v === n ? 'Click again to clear' : `${n} of 5`}
                  aria-checked={v === n}
                  role="radio"
                  onClick={() => rate(key, n)}
                />
              ))}
            </span>
          </div>
        );
      })}
      <div className="field-hint">Click a dot to set a level, or click it again to clear. Unrated items appear without dots.</div>
    </div>
  );
}

function SectionCard({ s, i, count, cv, update, open, toggle, ignore, focusReq }) {
  const setS = (patch) => update((c) => ({ ...c, sections: c.sections.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) }));
  const updateEntry = (eid, patch) => setS({ items: s.items.map((e) => (e.id === eid ? { ...e, ...patch } : e)) });
  const remove = () => {
    if (confirm(`Delete the “${s.title || 'Untitled'}” section?`)) update((c) => ({ ...c, sections: c.sections.filter((x) => x.id !== s.id) }));
  };
  const moveSection = (dir) => update((c) => ({ ...c, sections: move(c.sections, i, dir) }));
  const changeKind = (kind) => {
    if (kind === s.kind) return;
    let patch = { kind };
    if (kind === 'entries' && !s.items.length) {
      patch.items = [newEntry({ description: s.content })];
    } else if (s.kind === 'entries' && kind !== 'entries') {
      const text = s.items
        .map((e) => [[e.title, e.subtitle].filter(Boolean).join(', '), e.description].filter(Boolean).join('\n'))
        .join('\n');
      patch.content = s.content || text;
    }
    setS(patch);
  };
  const modern = cv.design.template === 'modern';
  return (
    <div className={`card ${open ? 'open' : ''} ${s.visible ? '' : 'hidden-section'}`} data-section-card={s.id}>
      <div className="card-head" onClick={toggle}>
        <Icon name={open ? 'chevDown' : 'chevRight'} />
        <div className="card-title">{s.title || 'Untitled section'}</div>
        <div className="card-sub">{KIND_LABELS[s.kind]}{!s.visible && ' · hidden'}</div>
        <div className="icon-row" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title={s.visible ? 'Hide from CV' : 'Show on CV'} onClick={() => setS({ visible: !s.visible })}>
            <Icon name={s.visible ? 'eye' : 'eyeOff'} size={15} />
          </button>
          <button className="icon-btn" title="Move up" disabled={i === 0} onClick={() => moveSection(-1)}><Icon name="up" size={15} /></button>
          <button className="icon-btn" title="Move down" disabled={i === count - 1} onClick={() => moveSection(1)}><Icon name="down" size={15} /></button>
          <button className="icon-btn danger" title="Delete section" onClick={remove}><Icon name="trash" size={15} /></button>
        </div>
      </div>
      {open && (
        <div className="card-body">
          <div className="section-opts">
            <label className="inp title-inp">
              <span>Section title</span>
              <input value={s.title} placeholder="Leave empty to show no heading" onChange={(e) => setS({ title: e.target.value })} />
            </label>
            <label className="inp">
              <span>Type</span>
              <select value={s.kind} onChange={(e) => changeKind(e.target.value)}>
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="inp">
              <span>Alignment</span>
              <select value={s.align || 'auto'} onChange={(e) => setS({ align: e.target.value })}>
                <option value="auto">Design default</option>
                <option value="left">Left</option>
                <option value="justify">Justified</option>
              </select>
            </label>
            {s.kind === 'list' && (
              <label className="inp">
                <span>Display</span>
                <select value={s.display || 'auto'} onChange={(e) => setS({ display: e.target.value })}>
                  <option value="auto">Design default</option>
                  {LIST_STYLES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            )}
            {modern && (
              <label className="inp">
                <span>Column</span>
                <select value={s.column || 'auto'} onChange={(e) => setS({ column: e.target.value })}>
                  <option value="auto">Auto</option>
                  <option value="main">Main</option>
                  <option value="side">Sidebar</option>
                </select>
              </label>
            )}
          </div>

          {s.kind === 'text' && (
            <TextField
              path={`s:${s.id}:content`}
              value={s.content}
              onChange={(v) => setS({ content: v })}
              cv={cv}
              onIgnore={ignore}
              rows={4}
              placeholder="Write a few sentences. Start a line with - for a bullet."
            />
          )}
          {s.kind === 'list' && (
            <TextField
              path={`s:${s.id}:content`}
              value={s.content}
              onChange={(v) => setS({ content: v })}
              cv={cv}
              onIgnore={ignore}
              rows={3}
              placeholder={'One per line, or comma separated.\nLabel: item, item  ← makes a labelled group'}
              hint="Separate items with commas or new lines. Use “Label: a, b, c” for groups."
            />
          )}
          {s.kind === 'list' && (
            <label className="check small-text rating-toggle">
              <input type="checkbox" checked={!!s.showRatings} onChange={(e) => setS({ showRatings: e.target.checked })} />
              Show skill levels (1–5)
            </label>
          )}
          {s.kind === 'list' && s.showRatings && <RatingsEditor s={s} setS={setS} />}
          {s.kind === 'entries' && (
            <div className="entries">
              {s.items.map((e, j) => (
                <EntryEditor
                  key={e.id}
                  s={s}
                  e={e}
                  idx={j}
                  count={s.items.length}
                  cv={cv}
                  ignore={ignore}
                  focusReq={focusReq}
                  updateEntry={updateEntry}
                  removeEntry={(id) => setS({ items: s.items.filter((x) => x.id !== id) })}
                  moveEntry={(idx, dir) => setS({ items: move(s.items, idx, dir) })}
                  duplicateEntry={(en) => {
                    const at = s.items.findIndex((x) => x.id === en.id);
                    const items = s.items.slice();
                    items.splice(at + 1, 0, { ...en, id: uid() });
                    setS({ items });
                  }}
                />
              ))}
              <button className="btn small ghost add-entry" onClick={() => setS({ items: [...s.items, newEntry()] })}>
                <Icon name="plus" size={14} /> Add entry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Editor({ cv, update, openCards, setOpenCards, ignore, focusReq }) {
  const [adding, setAdding] = useState(false);
  const toggle = (id) => setOpenCards((o) => ({ ...o, [id]: !o[id] }));
  const add = (preset) => {
    const s = newSection(preset);
    update((c) => ({ ...c, sections: [...c.sections, s] }));
    setOpenCards((o) => ({ ...o, [s.id]: true }));
    setAdding(false);
    setTimeout(() => document.querySelector(`[data-section-card="${s.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };
  const used = new Set(cv.sections.map((s) => s.preset));
  return (
    <div className="editor">
      <PersonalCard cv={cv} update={update} open={!!openCards.personal} toggle={() => toggle('personal')} />
      {cv.sections.map((s, i) => (
        <SectionCard
          key={s.id}
          s={s}
          i={i}
          count={cv.sections.length}
          cv={cv}
          update={update}
          open={!!openCards[s.id]}
          toggle={() => toggle(s.id)}
          ignore={ignore}
          focusReq={focusReq}
        />
      ))}
      <div className="add-section">
        {!adding ? (
          <button className="btn wide dashed" onClick={() => setAdding(true)}>
            <Icon name="plus" /> Add section
          </button>
        ) : (
          <div className="preset-grid">
            {Object.entries(SECTION_PRESETS).map(([k, p]) => (
              <button key={k} className={`preset ${used.has(k) && !k.startsWith('custom') ? 'used' : ''}`} onClick={() => add(k)}>
                <span>{p.label}</span>
                <small>{KIND_LABELS[p.kind]}</small>
              </button>
            ))}
            <button className="preset cancel" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
