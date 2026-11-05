import { scanText } from './wording.js';

export const BULLET_RE = /^\s*(?:[-*•▪●◦‣∙·–]|\d{1,2}[.)])\s+/;

/** Split free text into bullet / paragraph blocks. */
export function parseBlocks(text = '') {
  const blocks = [];
  let prevBlank = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      // Each empty line between content becomes a real blank line on the CV.
      if (blocks.length) blocks.push({ type: 'gap' });
      prevBlank = true;
      continue;
    }
    const m = BULLET_RE.exec(line);
    const last = blocks[blocks.length - 1];
    if (m) blocks.push({ type: 'bullet', text: line.slice(m[0].length) });
    // A line right after a bullet that is indented or starts lower-case continues that bullet,
    // so it lines up under the bullet's first letter instead of the left edge.
    else if (last?.type === 'bullet' && !prevBlank && (/^\s/.test(raw) || /^[a-z(&+\d]/.test(line)))
      last.text += `\n${line}`;
    else blocks.push({ type: 'para', text: line });
    prevBlank = false;
  }
  while (blocks[blocks.length - 1]?.type === 'gap') blocks.pop(); // ignore trailing empty lines
  return blocks;
}

/** Tokenise **bold** and *italic* markers. */
export function inlineTokens(text = '') {
  const out = [];
  const re = /\*\*([^*]+)\*\*|(?<![\w*])\*([^*\s][^*]*?)\*(?![\w*])/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else out.push({ text: m[2], italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Split list content into groups: "Label: a, b, c" lines. */
/** Key used to store a list item's 1–5 rating (case/space insensitive). */
export const ratingKey = (t) => t.replace(/\*+/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function parseList(text = '', splitItems = true) {
  const groups = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim().replace(BULLET_RE, '');
    if (!line) continue;
    let label = null;
    const lm = /^([^:,]{1,40}):\s+(.+)$/.exec(line);
    if (lm && !/https?$/i.test(lm[1])) {
      label = lm[1].trim();
      line = lm[2];
    }
    const items = splitItems
      ? line.split(/\s*(?:,|;|\s[•·|]\s)\s*(?![^()]*\))/).map((s) => s.trim()).filter(Boolean)
      : [line];
    groups.push({ label, items, line });
  }
  return groups;
}

function Highlighted({ text, ignored }) {
  const findings = scanText(text, ignored, { structure: false });
  if (!findings.length) return text;
  const parts = [];
  let last = 0;
  findings.forEach((f, i) => {
    if (f.start > last) parts.push(text.slice(last, f.start));
    parts.push(
      <mark key={i} className={`wd-mark wd-${f.rule.category}`} title={f.rule.note}>
        {text.slice(f.start, f.end)}
      </mark>
    );
    last = f.end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Render a single line with inline formatting (and optional wording highlights). */
export function Inline({ text, hl }) {
  return inlineTokens(text).map((t, i) => {
    const inner = hl ? <Highlighted text={t.text} ignored={hl.ignored} /> : t.text;
    if (t.bold) return <strong key={i}>{inner}</strong>;
    if (t.italic) return <em key={i}>{inner}</em>;
    return <span key={i}>{inner}</span>;
  });
}

/** Render paragraph/bullet blocks. */
export function Blocks({ text, hl, className = 'cv-desc' }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;
  // group consecutive bullets
  const groups = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (b.type === 'bullet' && last?.type === 'list') last.items.push(b);
    else if (b.type === 'bullet') groups.push({ type: 'list', items: [b] });
    else groups.push(b);
  }
  return (
    <div className={className}>
      {groups.map((g, i) =>
        g.type === 'list' ? (
          <ul key={i}>
            {g.items.map((b, j) => (
              <li key={j}>
                <Inline text={b.text} hl={hl} />
              </li>
            ))}
          </ul>
        ) : g.type === 'gap' ? (
          <div key={i} className="cv-gap" aria-hidden="true" />
        ) : (
          <p key={i}>
            <Inline text={g.text} hl={hl} />
          </p>
        )
      )}
    </div>
  );
}
