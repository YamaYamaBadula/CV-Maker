import { ACCENTS, FONTS, HEADING_STYLES, LIST_STYLES, TEMPLATES } from '../model.js';

function Thumb({ id, accent }) {
  const bar = (x, y, w, h = 3, c = '#cbd5e1') => <rect x={x} y={y} width={w} height={h} rx="1" fill={c} />;
  return (
    <svg viewBox="0 0 60 78" className="thumb">
      <rect width="60" height="78" fill="#fff" />
      {id === 'classic' && (
        <>
          {bar(15, 7, 30, 5, accent)}
          {bar(20, 15, 20, 2)}
          {[26, 46].map((y) => (
            <g key={y}>
              {bar(6, y, 18, 3, accent)}
              {bar(6, y + 4, 48, 0.8, accent)}
              {bar(6, y + 8, 44, 2)}
              {bar(6, y + 12, 40, 2)}
            </g>
          ))}
        </>
      )}
      {id === 'modern' && (
        <>
          <rect width="20" height="78" fill={accent} opacity="0.14" />
          <circle cx="10" cy="11" r="5" fill={accent} opacity="0.5" />
          {bar(4, 22, 12, 2, accent)}
          {bar(4, 26, 10, 2)}
          {bar(4, 30, 12, 2)}
          {bar(4, 40, 12, 2, accent)}
          {bar(4, 44, 11, 2)}
          {bar(25, 7, 28, 5, '#334155')}
          {bar(25, 14, 18, 2, accent)}
          {[24, 46].map((y) => (
            <g key={y}>
              {bar(25, y, 14, 3, accent)}
              {bar(25, y + 6, 30, 2)}
              {bar(25, y + 10, 28, 2)}
            </g>
          ))}
        </>
      )}
      {id === 'minimal' && (
        <>
          {bar(6, 8, 30, 5, '#475569')}
          {bar(6, 16, 18, 2, accent)}
          {[26, 46].map((y) => (
            <g key={y}>
              {bar(6, y, 14, 2, accent)}
              {bar(6, y + 6, 10, 2)}
              {bar(20, y + 6, 32, 2)}
              {bar(20, y + 10, 30, 2)}
            </g>
          ))}
        </>
      )}
      {id === 'executive' && (
        <>
          <rect width="60" height="20" fill={accent} />
          {bar(6, 6, 28, 5, '#fff')}
          {bar(6, 13, 18, 2, '#ffffffaa')}
          {[28, 48].map((y) => (
            <g key={y}>
              {bar(6, y, 14, 3, '#334155')}
              {bar(22, y + 1.5, 32, 0.8, accent)}
              {bar(6, y + 6, 46, 2)}
              {bar(6, y + 10, 40, 2)}
            </g>
          ))}
        </>
      )}
      {id === 'compact' && (
        <>
          {bar(6, 6, 24, 4, '#334155')}
          {bar(38, 6, 16, 2)}
          {bar(38, 10, 14, 2)}
          {bar(6, 16, 48, 1, accent)}
          {[22, 36, 50].map((y) => (
            <g key={y}>
              {bar(6, y, 10, 2, accent)}
              {bar(20, y, 34, 2)}
              {bar(20, y + 4, 30, 2)}
              {bar(20, y + 8, 32, 2)}
            </g>
          ))}
        </>
      )}
      {id === 'elegant' && (
        <>
          {bar(14, 8, 32, 4, '#334155')}
          {bar(22, 15, 16, 2, accent)}
          {[26, 46].map((y) => (
            <g key={y}>
              {bar(6, y + 1.5, 16, 0.8, accent)}
              {bar(24, y, 12, 3, accent)}
              {bar(38, y + 1.5, 16, 0.8, accent)}
              {bar(6, y + 7, 46, 2)}
              {bar(6, y + 11, 42, 2)}
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

function Row({ label, children, value }) {
  return (
    <div className="d-row">
      <div className="d-label">
        {label}
        {value !== undefined && <span className="d-value">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export default function DesignPanel({ cv, update }) {
  const d = cv.design;
  const set = (patch) => update((c) => ({ ...c, design: { ...c.design, ...patch } }));
  const pickTemplate = (t) => set({ template: t.id, ...t.preset });

  return (
    <div className="design">
      <h3 className="panel-h">Template</h3>
      <p className="muted small-text">Choosing a template also applies its suggested fonts and colour – tweak them below.</p>
      <div className="tpl-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} className={`tpl ${d.template === t.id ? 'active' : ''}`} onClick={() => pickTemplate(t)}>
            <Thumb id={t.id} accent={d.template === t.id ? d.accent : t.preset.accent} />
            <div className="tpl-name">{t.name}</div>
            <div className="tpl-blurb">{t.blurb}</div>
          </button>
        ))}
      </div>

      <h3 className="panel-h">Colour</h3>
      <div className="swatches">
        {ACCENTS.map((c) => (
          <button key={c} className={`swatch ${d.accent === c ? 'active' : ''}`} style={{ background: c }} onClick={() => set({ accent: c })} title={c} />
        ))}
        <label className="swatch custom" title="Custom colour">
          <input type="color" value={d.accent} onChange={(e) => set({ accent: e.target.value })} />
        </label>
      </div>

      <h3 className="panel-h">Typography</h3>
      <div className="grid2">
        <label className="inp">
          <span>Heading font</span>
          <select value={d.headingFont} onChange={(e) => set({ headingFont: e.target.value })}>
            {FONTS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </label>
        <label className="inp">
          <span>Body font</span>
          <select value={d.bodyFont} onChange={(e) => set({ bodyFont: e.target.value })}>
            {FONTS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </label>
      </div>
      <p className="muted small-text">
        Word export uses {FONTS.find((f) => f.name === d.bodyFont)?.docx} for body text so it looks right on any PC.
      </p>
      <Row label="Font size" value={`${d.fontSize}pt`}>
        <input type="range" min="8.5" max="13" step="0.5" value={d.fontSize} onChange={(e) => set({ fontSize: +e.target.value })} />
      </Row>
      <Row label="Line height" value={d.lineHeight.toFixed(2)}>
        <input type="range" min="1.1" max="1.8" step="0.05" value={d.lineHeight} onChange={(e) => set({ lineHeight: +e.target.value })} />
      </Row>

      <h3 className="panel-h">Layout</h3>
      <Row label="Page margins" value={`${d.margin}mm`}>
        <input type="range" min="8" max="28" step="1" value={d.margin} onChange={(e) => set({ margin: +e.target.value })} />
      </Row>
      <div className="grid2">
        <label className="inp">
          <span>Section spacing</span>
          <select value={d.spacing} onChange={(e) => set({ spacing: e.target.value })}>
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </label>
        <label className="inp">
          <span>Paper size</span>
          <select value={d.pageSize} onChange={(e) => set({ pageSize: e.target.value })}>
            <option value="A4">A4</option>
            <option value="Letter">US Letter</option>
          </select>
        </label>
        <label className="inp">
          <span>Heading style</span>
          <select value={d.headingStyle} onChange={(e) => set({ headingStyle: e.target.value })}>
            {HEADING_STYLES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        <label className="inp">
          <span>Lists (skills etc.)</span>
          <select value={d.listStyle} onChange={(e) => set({ listStyle: e.target.value })}>
            {LIST_STYLES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="inp">
          <span>Date separator</span>
          <select value={d.dateSeparator} onChange={(e) => set({ dateSeparator: e.target.value })}>
            <option value="–">2020 – 2023</option>
            <option value="-">2020 - 2023</option>
            <option value="to">2020 to 2023</option>
            <option value="→">2020 → 2023</option>
          </select>
        </label>
        <label className="inp">
          <span>Text alignment</span>
          <select value={d.textAlign || 'left'} onChange={(e) => set({ textAlign: e.target.value })}>
            <option value="left">Left</option>
            <option value="justify">Justified</option>
          </select>
        </label>
      </div>
      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={d.uppercaseHeadings} onChange={(e) => set({ uppercaseHeadings: e.target.checked })} /> Uppercase headings
        </label>
        <label className="check">
          <input type="checkbox" checked={d.showPhoto} onChange={(e) => set({ showPhoto: e.target.checked })} /> Show photo (if added)
        </label>
      </div>
    </div>
  );
}
