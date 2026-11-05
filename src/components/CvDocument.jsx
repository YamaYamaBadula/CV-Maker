import { fontByName, templateById } from '../model.js';
import { Blocks, Inline, parseList, ratingKey } from '../richtext.jsx';

export const PAGE_SIZES = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
};

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix a colour with white. amount = share of the colour (0..1). */
export function tint(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const m = (c) => Math.round(255 - (255 - c) * amount);
  return `#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export function cvStyleVars(d) {
  const page = PAGE_SIZES[d.pageSize] || PAGE_SIZES.A4;
  const gap = { compact: 0.7, normal: 1.1, relaxed: 1.6 }[d.spacing] ?? 1.1;
  return {
    '--accent': d.accent,
    '--accent-soft': tint(d.accent, 0.1),
    '--accent-mid': tint(d.accent, 0.45),
    '--font-body': fontByName(d.bodyFont).css,
    '--font-head': fontByName(d.headingFont).css,
    '--fs': `${d.fontSize}pt`,
    '--lh': d.lineHeight,
    '--margin': `${d.margin}mm`,
    '--gap': `${gap}em`,
    '--page-w': `${page.w}mm`,
    '--page-h': `${page.h}mm`,
  };
}

export const dateRange = (e, sep = '–') =>
  [e.start, e.end].filter((x) => x && x.trim()).join(` ${sep} `);

const href = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

export function contactItems(p) {
  return [
    ['Email', p.email, p.email && `mailto:${p.email}`],
    ['Phone', p.phone, p.phone && `tel:${p.phone.replace(/[^\d+]/g, '')}`],
    ['Location', p.location],
    ['Website', p.website, p.website && href(p.website)],
    ['LinkedIn', p.linkedin, p.linkedin && href(p.linkedin)],
  ].filter((c) => c[1] && c[1].trim());
}

export function sectionHasContent(s) {
  if (!s.visible) return false;
  if (s.kind === 'entries') return s.items.some((e) => e.title || e.subtitle || e.description || e.start || e.end);
  return !!(s.content && s.content.trim());
}

export const isSideSection = (s) => s.column === 'side' || (s.column !== 'main' && s.kind === 'list');

export const hasTitle = (s) => !!(s.title && s.title.trim());

function Dots({ n }) {
  return (
    <span className="cv-dots" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`cv-dot ${i <= n ? 'on' : ''}`} />
      ))}
    </span>
  );
}

function RatedList({ s, hl }) {
  const groups = parseList(s.content);
  const ratings = s.ratings || {};
  return (
    <div className="cv-list cv-list-rated">
      {groups.map((g, i) => (
        <div key={i} className="rated-group">
          {g.label && <div className="tag-label">{g.label}</div>}
          <div className="rated-grid">
            {g.items.map((it, j) => {
              const n = ratings[ratingKey(it)];
              return (
                <div className="rated-item" key={j}>
                  <span className="rated-name">
                    <Inline text={it} hl={hl} />
                  </span>
                  {n > 0 && <Dots n={n} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListBody({ s, d, hl }) {
  if (s.showRatings) return <RatedList s={s} hl={hl} />;
  const style = s.display && s.display !== 'auto' ? s.display : d.listStyle;
  const groups = parseList(s.content, style !== 'rows');
  if (style === 'rows')
    return (
      <div className="cv-list cv-list-rows">
        {groups.map((g, i) => (
          <p key={i}>
            {g.label && <strong>{g.label}: </strong>}
            <Inline text={g.line} hl={hl} />
          </p>
        ))}
      </div>
    );
  if (style === 'tags')
    return (
      <div className="cv-list cv-list-tags">
        {groups.map((g, i) => (
          <div key={i} className="tag-group">
            {g.label && <div className="tag-label">{g.label}</div>}
            {g.items.map((it, j) => (
              <span className="tag" key={j}>
                <Inline text={it} hl={hl} />
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  if (style === 'bullets' || style === 'columns') {
    const labelled = groups.some((g) => g.label);
    const items = labelled
      ? groups.map((g) => ({ label: g.label, text: g.items.join(', ') }))
      : groups.flatMap((g) => g.items.map((t) => ({ text: t })));
    return (
      <ul className={`cv-list cv-list-${style}`}>
        {items.map((it, i) => (
          <li key={i}>
            {it.label && <strong>{it.label}: </strong>}
            <Inline text={it.text} hl={hl} />
          </li>
        ))}
      </ul>
    );
  }
  // inline
  const labelled = groups.some((g) => g.label);
  if (!labelled)
    return (
      <p className="cv-list cv-list-inline">
        <Inline text={groups.flatMap((g) => g.items).join('  ·  ')} hl={hl} />
      </p>
    );
  return (
    <div className="cv-list cv-list-inline">
      {groups.map((g, i) => (
        <p key={i}>
          {g.label && <strong>{g.label}: </strong>}
          <Inline text={g.items.join('  ·  ')} hl={hl} />
        </p>
      ))}
    </div>
  );
}

function Entry({ e, layout, hl, sep }) {
  const date = dateRange(e, sep);
  const title = e.title && <Inline text={e.title} hl={hl} />;
  const sub = e.subtitle && <Inline text={e.subtitle} hl={hl} />;
  if (layout === 'leftdate')
    return (
      <div className="entry entry-leftdate">
        <div className="entry-side">
          {date && <div className="entry-date">{date}</div>}
          {e.location && <div className="entry-loc">{e.location}</div>}
        </div>
        <div className="entry-main">
          {title && <div className="entry-title">{title}</div>}
          {sub && <div className="entry-sub">{sub}</div>}
          <Blocks text={e.description} hl={hl} />
        </div>
      </div>
    );
  if (layout === 'inline')
    return (
      <div className="entry entry-inline">
        <div className="entry-row">
          <div>
            {title && <span className="entry-title">{title}</span>}
            {sub && (
              <span className="entry-sub">
                {title ? ' — ' : ''}
                {sub}
              </span>
            )}
            {e.location && <span className="entry-loc">, {e.location}</span>}
          </div>
          {date && <div className="entry-date">{date}</div>}
        </div>
        <Blocks text={e.description} hl={hl} />
      </div>
    );
  return (
    <div className="entry">
      {(title || date) && (
        <div className="entry-row">
          <div className="entry-title">{title}</div>
          {date && <div className="entry-date">{date}</div>}
        </div>
      )}
      {(sub || e.location) && (
        <div className="entry-row">
          <div className="entry-sub">{sub}</div>
          {e.location && <div className="entry-loc">{e.location}</div>}
        </div>
      )}
      <Blocks text={e.description} hl={hl} />
    </div>
  );
}

function Section({ s, d, hl, layout }) {
  return (
    <section
      className={`cv-section cv-kind-${s.kind} ${hasTitle(s) ? '' : 'no-title'} al-${s.align && s.align !== 'auto' ? s.align : d.textAlign || 'left'}`}
      data-section={s.id}
    >
      {hasTitle(s) && (
        <h2 className="cv-section-title">
          <span>{s.title}</span>
        </h2>
      )}
      <div className="cv-section-body">
        {s.kind === 'text' && <Blocks text={s.content} hl={hl} />}
        {s.kind === 'list' && <ListBody s={s} d={d} hl={hl} />}
        {s.kind === 'entries' &&
          s.items
            .filter((e) => e.title || e.subtitle || e.description || e.start || e.end)
            .map((e) => <Entry key={e.id} e={e} layout={layout} hl={hl} sep={d.dateSeparator} />)}
      </div>
    </section>
  );
}

function Contacts({ p, vertical }) {
  const items = contactItems(p);
  if (!items.length) return null;
  return (
    <div className={vertical ? 'cv-contact-v' : 'cv-contact'}>
      {items.map(([label, value, link]) => (
        <div key={label} className="cv-contact-item">
          {vertical && <div className="cv-contact-label">{label}</div>}
          {link ? <a href={link}>{value}</a> : <span>{value}</span>}
        </div>
      ))}
    </div>
  );
}

function Photo({ p, d }) {
  if (!d.showPhoto || !p.photo) return null;
  return <img className="cv-photo" src={p.photo} alt="" />;
}

function Header({ cv, hl, withContacts = true }) {
  const { personal: p, design: d } = cv;
  const hasPhoto = d.showPhoto && p.photo;
  if (!p.fullName?.trim() && !p.headline?.trim() && !hasPhoto && !(withContacts && contactItems(p).length)) return null;
  return (
    <header className="cv-header">
      <Photo p={p} d={d} />
      <div className="cv-header-text">
        {p.fullName && <h1 className="cv-name">{p.fullName}</h1>}
        {p.headline && (
          <div className="cv-headline">
            <Inline text={p.headline} hl={hl} />
          </div>
        )}
        {withContacts && cv.design.template !== 'compact' && <Contacts p={p} />}
      </div>
      {withContacts && cv.design.template === 'compact' && <Contacts p={p} vertical={false} />}
    </header>
  );
}

export default function CvDocument({ cv, highlight = false, forPrint = false }) {
  const d = cv.design;
  const tpl = templateById(d.template);
  const hl = highlight ? { ignored: cv.ignored || [] } : null;
  const sections = cv.sections.filter(sectionHasContent);
  const cls = [
    'cv',
    `cv-${tpl.id}`,
    `hs-${d.headingStyle}`,
    d.uppercaseHeadings ? 'upper' : '',
    forPrint ? 'cv-print' : '',
  ].join(' ');

  if (tpl.id === 'modern') {
    const side = sections.filter(isSideSection);
    const main = sections.filter((s) => !isSideSection(s));
    return (
      <div className={cls} style={cvStyleVars(d)}>
        <aside className="cv-aside">
          <Photo p={cv.personal} d={d} />
          {contactItems(cv.personal).length > 0 && (
            <section className="cv-section">
              <h2 className="cv-section-title">
                <span>Contact</span>
              </h2>
              <Contacts p={cv.personal} vertical />
            </section>
          )}
          {side.map((s) => (
            <Section key={s.id} s={s} d={d} hl={hl} layout={tpl.entryLayout} />
          ))}
        </aside>
        <main className="cv-main">
          {(cv.personal.fullName?.trim() || cv.personal.headline?.trim()) && (
            <header className="cv-header">
              <div className="cv-header-text">
                {cv.personal.fullName && <h1 className="cv-name">{cv.personal.fullName}</h1>}
                {cv.personal.headline && (
                  <div className="cv-headline">
                    <Inline text={cv.personal.headline} hl={hl} />
                  </div>
                )}
              </div>
            </header>
          )}
          {main.map((s) => (
            <Section key={s.id} s={s} d={d} hl={hl} layout={tpl.entryLayout} />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className={cls} style={cvStyleVars(d)}>
      <Header cv={cv} hl={hl} />
      {sections.map((s) => (
        <Section key={s.id} s={s} d={d} hl={hl} layout={tpl.entryLayout} />
      ))}
    </div>
  );
}
