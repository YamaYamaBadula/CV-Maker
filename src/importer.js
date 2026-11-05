/**
 * Import existing CVs: extract text lines from PDF / DOCX / TXT / pasted text,
 * then heuristically split them into personal details and sections.
 */
import { blankCv, newEntry, newSection, normalizeCv, SECTION_PRESETS, uid } from './model.js';
import { BULLET_RE } from './richtext.jsx';

/* ======================= text extraction ======================= */

async function extractPdf(buf) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const lines = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const tc = await page.getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!('str' in it) || !it.str) continue;
      const x = it.transform[4];
      const y = it.transform[5];
      const h = Math.abs(it.height || it.transform[3]) || 10;
      let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2, h * 0.45));
      if (!row) rows.push((row = { y, items: [], size: 0 }));
      row.items.push({ x, w: it.width, str: it.str, h });
      if (it.str.trim()) row.size = Math.max(row.size, h);
    }
    rows.sort((a, b) => b.y - a.y);
    let prevY = null;
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let text = '';
      let end = null;
      for (const it of r.items) {
        if (end !== null) {
          const gap = it.x - end;
          if (gap > it.h * 2.5) text += ' | ';
          else if (gap > it.h * 0.12 && !text.endsWith(' ') && !it.str.startsWith(' ')) text += ' ';
        }
        text += it.str;
        end = it.x + it.w;
      }
      text = text.replace(/\s+/g, ' ').replace(/(\s*\|\s*)+/g, ' | ').replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim();
      // A big vertical gap = paragraph break
      if (prevY !== null && prevY - r.y > r.size * 2.2) lines.push({ text: '' });
      prevY = r.y;
      if (text) lines.push({ text, size: r.size });
    }
    lines.push({ text: '' });
  }
  return lines;
}

async function extractDocx(buf) {
  const mammoth = (await import('mammoth')).default;
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const lines = [];
  const walk = (el) => {
    for (const node of el.children) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol' || tag === 'table' || tag === 'tbody' || tag === 'thead' || tag === 'tr') {
        walk(node);
      } else if (tag === 'li') {
        const nested = node.querySelector('ul,ol');
        const own = nested ? node.cloneNode(true) : node;
        if (nested) own.querySelectorAll('ul,ol').forEach((x) => x.remove());
        const t = own.textContent.trim();
        if (t) lines.push({ text: `• ${t}` });
        if (nested) walk(nested);
      } else if (tag === 'td' || tag === 'th') {
        if (node.querySelector('p,li,h1,h2,h3,h4,ul,ol')) walk(node);
        else if (node.textContent.trim()) lines.push({ text: node.textContent.trim() });
      } else {
        // p / h*: preserve <br> line breaks
        node.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
        const text = node.textContent;
        const strongOnly =
          node.children.length > 0 &&
          [...node.childNodes].every((c) => (c.nodeType === 3 && !c.textContent.trim()) || ['STRONG', 'B'].includes(c.tagName));
        for (const part of text.split('\n')) {
          const t = part.replace(/\t+/g, ' | ').replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim();
          if (!t) continue;
          lines.push({ text: t, heading: /^h[1-6]$/.test(tag), strong: strongOnly, big: tag === 'h1' });
        }
        if (!text.trim()) lines.push({ text: '' });
      }
    }
  };
  walk(doc.body.firstChild);
  return lines;
}

function extractPlain(text) {
  return text.split(/\r?\n/).map((raw) => {
    const md = /^(#{1,6})\s+(.*)$/.exec(raw.trim());
    if (md) return { text: md[2].trim(), heading: true, big: md[1].length === 1 };
    // markdown bold-only line, e.g. **Experience**
    const b = /^\*\*([^*]+)\*\*:?$/.exec(raw.trim());
    if (b) return { text: b[1].trim(), strong: true };
    return { text: raw.replace(/\*\*/g, '').replace(/\t+/g, ' | ').trim() };
  });
}

/** Returns { lines, json? } */
export async function extractFromFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { lines: await extractPdf(await file.arrayBuffer()) };
  if (ext === 'docx') return { lines: await extractDocx(await file.arrayBuffer()) };
  if (ext === 'json') {
    const data = JSON.parse(await file.text());
    if (data && data.personal && data.sections) return { json: normalizeCv({ ...data, id: uid() }) };
    throw new Error('This JSON file is not a CV Maker backup.');
  }
  if (ext === 'doc') throw new Error('Old .doc files can’t be read in the browser. Open it in Word and “Save as” .docx or PDF, then import that.');
  if (['txt', 'md', 'markdown', 'text', 'rtf'].includes(ext) || file.type.startsWith('text/'))
    return { lines: extractPlain(await file.text()) };
  throw new Error(`Unsupported file type: .${ext}. Use PDF, DOCX, TXT, MD or a CV Maker JSON backup.`);
}

export const extractFromText = (text) => ({ lines: extractPlain(text) });

/* ======================= parsing ======================= */

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const HEADINGS = {
  summary: ['summary', 'professional summary', 'profile', 'professional profile', 'personal profile', 'about', 'about me', 'objective', 'career objective', 'personal statement', 'overview', 'career summary', 'executive summary', 'introduction', 'summary of qualifications', 'professional overview'],
  experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history', 'relevant experience', 'professional background', 'career', 'positions held', 'experience and employment', 'professional history'],
  education: ['education', 'academic background', 'education and training', 'qualifications', 'academic qualifications', 'academic history', 'education and qualifications'],
  skills: ['skills', 'technical skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'skills and abilities', 'areas of expertise', 'expertise', 'technologies', 'tools', 'tech stack', 'skills and tools', 'strengths', 'skills summary', 'skill set', 'skillset', 'tools and technologies', 'technical proficiencies', 'key competencies', 'soft skills', 'hard skills', 'skills and expertise'],
  projects: ['projects', 'key projects', 'personal projects', 'selected projects', 'portfolio', 'side projects', 'notable projects'],
  certifications: ['certifications', 'certificates', 'licenses', 'licences', 'licenses and certifications', 'licences and certifications', 'certifications and training', 'training', 'courses', 'professional development', 'certifications and licenses', 'professional certifications', 'courses and certifications'],
  languages: ['languages', 'language skills', 'language'],
  awards: ['awards', 'honors', 'honours', 'achievements', 'awards and achievements', 'accomplishments', 'key achievements', 'awards and honors', 'awards and honours', 'honors and awards'],
  volunteering: ['volunteering', 'volunteer experience', 'volunteer work', 'community involvement', 'community', 'volunteer'],
  publications: ['publications', 'research', 'papers', 'presentations', 'publications and presentations', 'research experience'],
  interests: ['interests', 'hobbies', 'hobbies and interests', 'personal interests', 'interests and hobbies', 'activities', 'extracurricular activities'],
  references: ['references', 'referees'],
};
const HEADING_MAP = new Map();
for (const [preset, list] of Object.entries(HEADINGS)) for (const h of list) HEADING_MAP.set(norm(h), preset);

const CONTACT_LABELS = new Set(
  ['contact', 'contacts', 'contact details', 'contact information', 'contact info', 'personal details', 'personal information', 'personal info', 'email', 'e mail', 'phone', 'mobile', 'telephone', 'tel', 'location', 'address', 'website', 'web', 'linkedin', 'github', 'details'].map(norm)
);

const MONTH ='(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|spring|summer|autumn|fall|winter)';
const DATE = `(?:\\b${MONTH}\\.?,?\\s+(?:19|20)\\d{2}|\\b\\d{1,2}[/.](?:19|20)\\d{2}|\\b(?:19|20)\\d{2})`;
const END = `(?:${DATE}|present|current|now|today|ongoing|date)`;
const RANGE_RE = new RegExp(`\\(?\\s*(${DATE})\\s*(?:-|–|—|to|until|through|~)\\s*(${END})\\b\\s*\\)?`, 'i');
const SINGLE_RE = new RegExp(`\\(?\\s*(${DATE})\\s*\\)?`, 'i');

const tidyDate = (s) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/^(present|current|now|today|ongoing|date)$/i, 'Present')
    .replace(/^([a-z])/, (c) => c.toUpperCase());

export function findDates(text) {
  let m = RANGE_RE.exec(text);
  if (m) return { index: m.index, length: m[0].length, start: tidyDate(m[1]), end: tidyDate(m[2]) };
  m = SINGLE_RE.exec(text);
  if (m) return { index: m.index, length: m[0].length, start: '', end: tidyDate(m[1]) };
  return null;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE_RE = /(\+?\(?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/[^\s|,]+/i;
const URL_RE = /\b(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|io|dev|design|me|co|uk|ai|app|info|site|xyz|tech|page|eu|de|nz|au|ca)(\/[^\s|,]*)?\b/i;
const LOCATION_RE = /^[A-Z][A-Za-z.'\- ]+,\s*[A-Z][A-Za-z.'\- ]+$/;
const ORG_RE = /\b(inc|ltd|llc|corp|corporation|limited|gmbh|plc|university|college|school|institute|group|company|co)\b\.?/i;

function looksLikeLocation(s) {
  const t = s.trim();
  if (/^(remote|hybrid|on-?site)(\s*\(.+\))?$/i.test(t)) return true;
  if (/\b(BBA|MBA|BA|BSc|MSc|BS|MS|PhD|MA|BEng|MEng|LLB|LLM|BCom|Hons|GCSEs?|A-Levels?)\b/.test(t)) return false;
  if (/\b(bachelor|master|degree|marketing|finance|accounting|economics|management|studies|psychology|law|medicine|nursing|diploma|certificate|of|and|science|arts|engineering|business|administration|manager|engineer|developer|designer)\b/i.test(t)) return false;
  return LOCATION_RE.test(t) && t.split(/\s+/).length <= 5 && t.split(',')[0].trim().split(/\s+/).length <= 3 && !ORG_RE.test(t);
}

function headingPreset(text) {
  const t = text.replace(/:$/, '').trim();
  if (t.length > 45) return null;
  return HEADING_MAP.get(norm(t)) || null;
}

function isAllCapsHeading(text) {
  const t = text.trim();
  const letters = t.replace(/[^A-Za-z]/g, '');
  return letters.length >= 3 && t === t.toUpperCase() && t.split(/\s+/).length <= 5 && !/[@\d]/.test(t) && !/[|•,]/.test(t);
}

const words = (s) => s.split(/\s+/).filter(Boolean).length;
const endsSentence = (s) => /[.!?:;]["')]?$/.test(s.trim());

/** Join lines that a PDF wrapped mid-sentence. */
function joinWrapped(prev, next) {
  if (!prev) return false;
  const p = prev.replace(BULLET_RE, '');
  if (BULLET_RE.test(next)) return false;
  if (findDates(next) && words(next) < 12) return false;
  if (/^[a-z(]/.test(next)) return true;
  if (/[,–-]$|\b(and|or|of|the|to|for|with|in|a|an)$/i.test(p)) return true;
  return !endsSentence(p) && p.length > 60;
}

function parseTextSection(lines) {
  const out = [];
  for (const { text } of lines) {
    const t = text.trim();
    if (!t) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    const bullet = BULLET_RE.exec(t);
    const last = out[out.length - 1];
    if (!bullet && last && joinWrapped(last, t)) out[out.length - 1] = `${last} ${t}`;
    else out.push(bullet ? `- ${t.slice(bullet[0].length)}` : t);
  }
  return out.filter((l, i, a) => l !== '' || (i > 0 && i < a.length - 1)).join('\n').replace(/\n{2,}/g, '\n');
}

function parseListSection(lines) {
  const out = [];
  for (const { text } of lines) {
    let t = text.trim();
    if (!t) continue;
    t = t.replace(BULLET_RE, '').replace(/\s+[•·|▪●]\s+/g, ', ').replace(/^[•·▪●]\s*/, '');
    const last = out[out.length - 1];
    if (last && /,$/.test(last)) out[out.length - 1] = `${last} ${t}`;
    else out.push(t);
  }
  return out.join('\n');
}

function applyHeaderLine(entry, text) {
  let rest = text;
  const date = !entry.start && !entry.end ? findDates(text) : null;
  if (date) {
    entry.start = date.start;
    entry.end = date.end;
    rest = `${text.slice(0, date.index)} ${text.slice(date.index + date.length)}`;
  }
  rest = rest
    .replace(/\s+/g, ' ')
    .replace(/^[\s|,–—\-:]+|[\s|,–—\-:]+$/g, '')
    .trim();
  if (!rest) return;
  const parts = rest
    .split(/\s+\|\s+|\s+[–—]\s+|\s+-\s+|\s+@\s+|\t|\s{3,}/)
    .flatMap((part) => {
      // "Engineer at Acme" → two parts, but keep "University of Texas at Austin" intact
      const m = /^(.+?)\s+at\s+(.+)$/i.exec(part);
      return m && !/universit|college|school|institut|academy/i.test(part) ? [m[1], m[2]] : [part];
    })
    .map((s) => s.replace(/^[,|]+|[,|]+$/g, '').trim())
    .filter(Boolean);
  for (const part of parts) {
    if (!entry.location && looksLikeLocation(part)) entry.location = part;
    else if (!entry.title) entry.title = part;
    else if (!entry.subtitle) entry.subtitle = part;
    else if (!entry.location) entry.location = part;
    else entry.subtitle += `, ${part}`;
  }
}

function parseEntriesSection(lines) {
  const entries = [];
  let cur = null;
  let lastWasDesc = false;
  let headerLines = 0;
  const desc = [];
  const start = () => {
    if (cur) cur.description = desc.splice(0).join('\n');
    cur = newEntry();
    entries.push(cur);
    lastWasDesc = false;
    headerLines = 0;
  };
  for (const { text } of lines) {
    const t = text.trim();
    if (!t) continue;
    const bullet = BULLET_RE.exec(t);
    if (bullet) {
      if (!cur) start();
      desc.push(`- ${t.slice(bullet[0].length)}`);
      lastWasDesc = true;
      continue;
    }
    if (lastWasDesc && desc.length && joinWrapped(desc[desc.length - 1], t)) {
      desc[desc.length - 1] += ` ${t}`;
      continue;
    }
    const hasDate = !!findDates(t);
    const long =
      words(t) > 14 ||
      (endsSentence(t) && t.length > 40 && !hasDate) ||
      (cur && cur.title && /[a-z]\.\s+[A-Z]/.test(t) && !hasDate);
    if (long && cur) {
      desc.push(t);
      lastWasDesc = true;
      continue;
    }
    if (!cur || lastWasDesc || (hasDate && (cur.start || cur.end)) || headerLines >= 3) start();
    applyHeaderLine(cur, t);
    headerLines++;
  }
  if (cur) cur.description = desc.join('\n');
  return entries.length ? entries : [newEntry()];
}

function guessKind(lines) {
  const nonEmpty = lines.filter((l) => l.text.trim());
  if (!nonEmpty.length) return 'text';
  const dated = nonEmpty.filter((l) => !BULLET_RE.test(l.text) && findDates(l.text) && words(l.text) < 14).length;
  if (dated >= 1 && nonEmpty.length >= 2) return 'entries';
  const avgWords = nonEmpty.reduce((a, l) => a + words(l.text), 0) / nonEmpty.length;
  if (avgWords < 7 || nonEmpty.every((l) => /,/.test(l.text) && !endsSentence(l.text))) return 'list';
  return 'text';
}

export function buildSection(raw, kind) {
  const base = { title: raw.title, kind };
  if (kind === 'text') return newSection(raw.preset || 'customText', { ...base, content: parseTextSection(raw.lines) });
  if (kind === 'list') return newSection(raw.preset || 'customList', { ...base, content: parseListSection(raw.lines), items: [] });
  return newSection(raw.preset || 'customEntries', { ...base, items: parseEntriesSection(raw.lines) });
}

const titleCase = (s) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)([a-z])/g, (_, a, c) => a + c.toUpperCase()) : s;

/**
 * Parse extracted lines into { personal, rawSections: [{title, preset, kind, lines}] }
 */
export function parseLines(lines) {
  const sizes = lines.map((l) => l.size).filter(Boolean).sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;

  const isHeading = (l, i, cur) => {
    const t = l.text.trim();
    if (!t || words(t) > 6) return false;
    if (headingPreset(t)) return true;
    if (BULLET_RE.test(t) || EMAIL_RE.test(t) || findDates(t)) return false;
    if (l.heading && words(t) <= 5 && !l.big) return i > 0;
    // bold-only lines are usually job titles; only treat them as headings outside entry sections
    const inEntries = cur && SECTION_PRESETS[cur.preset]?.kind === 'entries';
    if (l.strong && cur && !inEntries && words(t) <= 4 && !/[|,\d]/.test(t)) return true;
    if (median && l.size >= median * 1.15 && words(t) <= 4 && i > 2) return true;
    return isAllCapsHeading(t) && i > 1;
  };

  const header = [];
  const raw = [];
  let cur = null;
  lines.forEach((l, i) => {
    const t = l.text.trim();
    // "Skills: Python, Go" – heading with inline content
    const inline = /^([A-Za-z &/]{3,40}):\s+(.+)$/.exec(t);
    const inlinePreset = inline && headingPreset(inline[1]);
    const curKind = cur && SECTION_PRESETS[cur.preset]?.kind;
    if (inlinePreset && (!cur || curKind === 'text')) {
      if (cur && cur.preset === inlinePreset) {
        cur.lines.push(l); // e.g. "Tools: Figma" inside Skills keeps its label
      } else {
        cur = { title: titleCase(inline[1].trim()), preset: inlinePreset, lines: [{ ...l, text: inline[2] }] };
        raw.push(cur);
      }
      return;
    }
    // Sidebar labels like "CONTACT", "EMAIL", "PHONE" belong to the personal details
    if (CONTACT_LABELS.has(norm(t)) && words(t) <= 3) {
      cur = null;
      return;
    }
    if (isHeading(l, i, cur)) {
      const preset = headingPreset(t);
      cur = { title: titleCase(t.replace(/:$/, '')), preset, lines: [] };
      raw.push(cur);
      return;
    }
    if (cur) cur.lines.push(l);
    else header.push(l);
  });

  /* ---- personal details from the header block ---- */
  const personal = { fullName: '', headline: '', email: '', phone: '', location: '', website: '', linkedin: '', photo: '' };
  const leftovers = [];
  const headerLines = header.filter((l) => l.text.trim());
  // name: biggest font among first lines, else first plausible line
  let nameIdx = -1;
  if (median) {
    let best = 0;
    headerLines.slice(0, 5).forEach((l, i) => {
      if (l.size > best && !EMAIL_RE.test(l.text) && words(l.text) <= 5) {
        best = l.size;
        nameIdx = i;
      }
    });
  }
  if (nameIdx < 0) nameIdx = headerLines.findIndex((l) => l.big);
  if (nameIdx < 0)
    nameIdx = headerLines.findIndex(
      (l) =>
        words(l.text) <= 5 &&
        !EMAIL_RE.test(l.text) &&
        !PHONE_RE.test(l.text) &&
        !URL_RE.test(l.text) &&
        !looksLikeLocation(l.text) &&
        !/\d{3}|,/.test(l.text)
    );
  // Two-column layouts: the name may have been read as a "section" title further down
  if (nameIdx < 0) {
    const NAME_RE = /^[A-Z][a-zA-Z'’-]+(\s+[A-Z][a-zA-Z'’.-]*){1,3}$/;
    const k = raw.findIndex((r) => !r.preset && NAME_RE.test(r.title) && r.lines.filter((x) => x.text.trim()).length <= 2);
    if (k >= 0) {
      const [r] = raw.splice(k, 1);
      personal.fullName = r.title;
      const first = r.lines.find((x) => x.text.trim());
      if (first && words(first.text) <= 12) personal.headline = first.text.trim();
    }
  }
  headerLines.forEach((l, i) => {
    let t = l.text.trim();
    if (i === nameIdx) {
      // a name line may carry contact info after a separator
      const [first, ...more] = t.split(/\s+[|•·]\s+/);
      personal.fullName = titleCase(first.trim());
      t = more.join(' | ');
      if (!t) return;
    }
    const tokens = t.split(/\s*[|•·▪●]\s*|\s{3,}|\s+[–—]\s+/).map((s) => s.trim()).filter(Boolean);
    const unused = [];
    for (let tok of tokens) {
      tok = tok.replace(/^(e-?mail|phone|tel|mobile|cell|linkedin|website|web|portfolio|address|location)\s*:\s*/i, '');
      let m;
      if (!personal.email && (m = EMAIL_RE.exec(tok))) {
        personal.email = m[0];
        tok = tok.replace(m[0], '').trim();
      }
      if (!personal.linkedin && (m = LINKEDIN_RE.exec(tok))) {
        personal.linkedin = m[0].replace(/^https?:\/\/(www\.)?/i, '');
        tok = tok.replace(m[0], '').trim();
      }
      if (!personal.phone && (m = PHONE_RE.exec(tok)) && m[1].replace(/\D/g, '').length >= 8 && !findDates(m[1])) {
        personal.phone = m[1].trim();
        tok = tok.replace(m[1], '').trim();
      }
      if (!personal.website && (m = URL_RE.exec(tok)) && !EMAIL_RE.test(tok)) {
        personal.website = m[0].replace(/^https?:\/\//i, '');
        tok = tok.replace(m[0], '').trim();
      }
      tok = tok.replace(/^[,;\s]+|[,;\s]+$/g, '');
      if (!tok) continue;
      if (!personal.location && looksLikeLocation(tok)) personal.location = tok;
      else unused.push(tok);
    }
    const rest = unused.join(' · ');
    if (!rest) return;
    if (!personal.headline && words(rest) <= 12 && i <= nameIdx + 2) personal.headline = rest;
    else leftovers.push({ text: rest });
  });

  // Unlabelled intro paragraph at the top → summary
  if (leftovers.length && leftovers.some((l) => words(l.text) > 10)) {
    const existing = raw.find((r) => r.preset === 'summary');
    if (existing) existing.lines.unshift(...leftovers);
    else raw.unshift({ title: 'Profile', preset: 'summary', lines: leftovers });
  }

  for (const r of raw) {
    r.kind = r.preset ? SECTION_PRESETS[r.preset].kind : guessKind(r.lines);
    if (!r.preset) r.preset = { text: 'customText', list: 'customList', entries: 'customEntries' }[r.kind];
    // certifications / awards with dates read better as entries
    if ((r.preset === 'certifications' || r.preset === 'awards') && guessKind(r.lines) === 'entries') r.kind = 'entries';
    if (r.preset === 'awards' && guessKind(r.lines) !== 'entries') r.kind = 'list';
  }
  return { personal, rawSections: raw.filter((r) => r.lines.some((l) => l.text.trim())) };
}

export function buildCv(parsed, chosen, sourceText, name) {
  const cv = blankCv(name || parsed.personal.fullName || 'Imported CV');
  cv.personal = { ...cv.personal, ...parsed.personal };
  cv.sections = chosen.map((r) => buildSection(r, r.kind));
  if (!cv.sections.length) cv.sections = [newSection('summary')];
  cv.source = sourceText;
  return cv;
}

export const linesToText = (lines) => lines.map((l) => l.text).join('\n').replace(/\n{3,}/g, '\n\n').trim();
