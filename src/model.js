export const uid = () => Math.random().toString(36).slice(2, 10);

export const SECTION_PRESETS = {
  summary: { title: 'Profile', kind: 'text', label: 'Summary / Profile' },
  experience: {
    title: 'Experience',
    kind: 'entries',
    label: 'Work experience',
    labels: { title: 'Job title', subtitle: 'Company', location: 'Location' },
  },
  education: {
    title: 'Education',
    kind: 'entries',
    label: 'Education',
    labels: { title: 'Degree / qualification', subtitle: 'School / university', location: 'Location' },
  },
  skills: { title: 'Skills', kind: 'list', label: 'Skills' },
  projects: {
    title: 'Projects',
    kind: 'entries',
    label: 'Projects',
    labels: { title: 'Project name', subtitle: 'Role, tech or link', location: 'Location' },
  },
  certifications: { title: 'Certifications', kind: 'list', label: 'Certifications', display: 'rows' },
  languages: { title: 'Languages', kind: 'list', label: 'Languages' },
  awards: {
    title: 'Awards',
    kind: 'entries',
    label: 'Awards & achievements',
    labels: { title: 'Award', subtitle: 'Issuer', location: 'Location' },
  },
  volunteering: {
    title: 'Volunteering',
    kind: 'entries',
    label: 'Volunteering',
    labels: { title: 'Role', subtitle: 'Organisation', location: 'Location' },
  },
  publications: {
    title: 'Publications',
    kind: 'entries',
    label: 'Publications',
    labels: { title: 'Title', subtitle: 'Journal / publisher', location: 'Link' },
  },
  interests: { title: 'Interests', kind: 'list', label: 'Interests' },
  references: { title: 'References', kind: 'text', label: 'References' },
  customText: { title: 'Additional information', kind: 'text', label: 'Custom – paragraph' },
  customList: { title: 'Custom list', kind: 'list', label: 'Custom – list' },
  customEntries: { title: 'Custom entries', kind: 'entries', label: 'Custom – dated entries' },
};

export const KIND_LABELS = { text: 'Paragraph', list: 'List', entries: 'Entries' };

export const DEFAULT_LABELS = { title: 'Title', subtitle: 'Subtitle', location: 'Location' };

export const labelsFor = (section) =>
  SECTION_PRESETS[section.preset]?.labels || DEFAULT_LABELS;

export function newEntry(partial = {}) {
  return { id: uid(), title: '', subtitle: '', location: '', start: '', end: '', description: '', ...partial };
}

export function newSection(preset = 'customText', partial = {}) {
  const p = SECTION_PRESETS[preset] || SECTION_PRESETS.customText;
  return {
    id: uid(),
    preset,
    kind: p.kind,
    title: p.title,
    visible: true,
    column: 'auto',
    display: p.display || 'auto',
    content: '',
    align: 'auto',
    showRatings: false,
    ratings: {},
    items: p.kind === 'entries' ? [newEntry()] : [],
    ...partial,
  };
}

export const FONTS = [
  { name: 'Inter', css: "'Inter', Arial, sans-serif", docx: 'Calibri' },
  { name: 'Lato', css: "'Lato', Arial, sans-serif", docx: 'Calibri' },
  { name: 'Source Sans 3', css: "'Source Sans 3', Arial, sans-serif", docx: 'Calibri' },
  { name: 'Roboto', css: "'Roboto', Arial, sans-serif", docx: 'Arial' },
  { name: 'Merriweather', css: "'Merriweather', Georgia, serif", docx: 'Georgia' },
  { name: 'Lora', css: "'Lora', Georgia, serif", docx: 'Cambria' },
  { name: 'Playfair Display', css: "'Playfair Display', Georgia, serif", docx: 'Georgia' },
  { name: 'EB Garamond', css: "'EB Garamond', Garamond, Georgia, serif", docx: 'Garamond' },
  { name: 'Arial', css: 'Arial, Helvetica, sans-serif', docx: 'Arial' },
  { name: 'Calibri', css: "Calibri, Carlito, 'Segoe UI', sans-serif", docx: 'Calibri' },
  { name: 'Cambria', css: 'Cambria, Caladea, Georgia, serif', docx: 'Cambria' },
  { name: 'Georgia', css: 'Georgia, serif', docx: 'Georgia' },
  { name: 'Times New Roman', css: "'Times New Roman', Times, serif", docx: 'Times New Roman' },
];

export const fontByName = (name) => FONTS.find((f) => f.name === name) || FONTS[0];

export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'Centred header, ruled headings',
    entryLayout: 'stacked',
    preset: { headingFont: 'Merriweather', bodyFont: 'Source Sans 3', headingStyle: 'underline', accent: '#1f3a5f', fontSize: 10.5 },
  },
  {
    id: 'modern',
    name: 'Modern',
    blurb: 'Tinted sidebar for skills & contact',
    entryLayout: 'stacked',
    preset: { headingFont: 'Inter', bodyFont: 'Inter', headingStyle: 'plain', accent: '#2563eb', fontSize: 10 },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    blurb: 'Airy, dates in a left column',
    entryLayout: 'leftdate',
    preset: { headingFont: 'Lato', bodyFont: 'Lato', headingStyle: 'plain', accent: '#0f766e', fontSize: 10.5 },
  },
  {
    id: 'executive',
    name: 'Executive',
    blurb: 'Bold colour band header',
    entryLayout: 'stacked',
    preset: { headingFont: 'Playfair Display', bodyFont: 'Lato', headingStyle: 'line', accent: '#1e293b', fontSize: 10.5 },
  },
  {
    id: 'compact',
    name: 'Compact',
    blurb: 'Dense, fits more on one page',
    entryLayout: 'inline',
    preset: { headingFont: 'Roboto', bodyFont: 'Roboto', headingStyle: 'plain', accent: '#374151', fontSize: 9.5 },
  },
  {
    id: 'elegant',
    name: 'Elegant',
    blurb: 'Serif, centred and refined',
    entryLayout: 'stacked',
    preset: { headingFont: 'EB Garamond', bodyFont: 'EB Garamond', headingStyle: 'line', accent: '#8a6d3b', fontSize: 11.5 },
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

export const HEADING_STYLES = [
  { id: 'underline', name: 'Underline' },
  { id: 'line', name: 'Trailing line' },
  { id: 'bar', name: 'Side bar' },
  { id: 'filled', name: 'Filled' },
  { id: 'plain', name: 'Plain' },
];

export const LIST_STYLES = [
  { id: 'inline', name: 'Inline (a · b · c)' },
  { id: 'tags', name: 'Tags' },
  { id: 'bullets', name: 'Bullets' },
  { id: 'columns', name: 'Columns' },
  { id: 'rows', name: 'One per line' },
];

export const ACCENTS = ['#1f3a5f', '#2563eb', '#0f766e', '#15803d', '#7c3aed', '#be123c', '#c2410c', '#8a6d3b', '#1e293b', '#374151'];

export const DEFAULT_DESIGN = {
  template: 'classic',
  accent: '#1f3a5f',
  headingFont: 'Merriweather',
  bodyFont: 'Source Sans 3',
  fontSize: 10.5,
  lineHeight: 1.4,
  margin: 16,
  spacing: 'normal',
  pageSize: 'A4',
  headingStyle: 'underline',
  uppercaseHeadings: true,
  listStyle: 'inline',
  showPhoto: true,
  dateSeparator: '–',
  textAlign: 'left',
};

export function blankCv(name = 'Untitled CV') {
  return {
    id: uid(),
    name,
    updatedAt: Date.now(),
    personal: { fullName: '', headline: '', email: '', phone: '', location: '', website: '', linkedin: '', photo: '' },
    sections: [
      newSection('summary'),
      newSection('experience'),
      newSection('education'),
      newSection('skills'),
    ],
    design: { ...DEFAULT_DESIGN },
    ignored: [],
    source: '',
  };
}

export function sampleCv() {
  const cv = blankCv('Sample – Jordan Avery');
  cv.personal = {
    fullName: 'Jordan Avery',
    headline: 'Senior Product Designer',
    email: 'jordan.avery@example.com',
    phone: '+44 7700 900123',
    location: 'Manchester, UK',
    website: 'jordanavery.design',
    linkedin: 'linkedin.com/in/jordanavery',
    photo: '',
  };
  cv.sections = [
    newSection('summary', {
      content:
        'Results-driven product designer with a proven track record of spearheading user-centric experiences in a fast-paced environment. Passionate about leveraging data to deliver seamless, cutting-edge solutions that drive engagement.\nI have spent seven years designing booking and payments tools used by small businesses, and I enjoy the unglamorous parts: research calls, edge cases and design systems.',
    }),
    newSection('experience', {
      items: [
        newEntry({
          title: 'Senior Product Designer',
          subtitle: 'Brightline Software',
          location: 'Manchester, UK',
          start: 'Mar 2021',
          end: 'Present',
          description:
            '- Spearheaded the redesign of the checkout flow, ensuring a seamless experience for over 40,000 merchants.\n- Led weekly research sessions with customers and turned the findings into a quarterly roadmap.\n- Built and maintained the company design system (120+ components) used by four product teams.\n- Leveraged cross-functional synergies to foster a culture of innovation — resulting in a 25% increase in feature adoption.',
        }),
        newEntry({
          title: 'Product Designer',
          subtitle: 'Northwind Travel',
          location: 'Leeds, UK',
          start: 'Jun 2017',
          end: 'Feb 2021',
          description:
            '- Designed the mobile booking app from first sketches to launch; it reached a 4.7 rating on the App Store.\n- Ran usability tests every two weeks and cut support tickets about booking changes by 30%.\n- Mentored two junior designers.',
        }),
      ],
    }),
    newSection('education', {
      items: [
        newEntry({
          title: 'BA (Hons) Interaction Design',
          subtitle: 'University of Leeds',
          location: 'Leeds, UK',
          start: '2013',
          end: '2016',
          description: 'First-class honours. Dissertation on accessible form design.',
        }),
      ],
    }),
    newSection('skills', {
      content: 'Design: Figma, prototyping, design systems, accessibility (WCAG 2.2)\nResearch: interviews, usability testing, survey design\nTools: Jira, Notion, basic HTML/CSS',
    }),
    newSection('languages', { content: 'English (native), Spanish (conversational)' }),
  ];
  return cv;
}

/* ---------- field paths used by the wording checker & focus logic ---------- */

export function getField(cv, path) {
  const parts = path.split(':');
  if (parts[0] === 'p') return cv.personal[parts[1]] || '';
  const s = cv.sections.find((x) => x.id === parts[1]);
  if (!s) return '';
  if (parts[2] === 'content') return s.content || '';
  if (parts[2] === 'e') {
    const e = s.items.find((x) => x.id === parts[3]);
    return e ? e[parts[4]] || '' : '';
  }
  return '';
}

export function setField(cv, path, value) {
  const parts = path.split(':');
  if (parts[0] === 'p') return { ...cv, personal: { ...cv.personal, [parts[1]]: value } };
  return {
    ...cv,
    sections: cv.sections.map((s) => {
      if (s.id !== parts[1]) return s;
      if (parts[2] === 'content') return { ...s, content: value };
      return { ...s, items: s.items.map((e) => (e.id === parts[3] ? { ...e, [parts[4]]: value } : e)) };
    }),
  };
}

/** All free-text fields worth checking for wording, in display order. */
export function textFields(cv) {
  const out = [];
  if (cv.personal.headline) out.push({ path: 'p:headline', label: 'Headline', section: 'Personal details' });
  for (const s of cv.sections) {
    if (s.kind === 'entries') {
      for (const e of s.items) {
        out.push({ path: `s:${s.id}:e:${e.id}:title`, label: `${e.title || 'Entry'} – title`, section: s.title || 'Untitled section', sectionId: s.id, entryId: e.id });
        out.push({ path: `s:${s.id}:e:${e.id}:description`, label: e.title || e.subtitle || 'Entry', section: s.title || 'Untitled section', sectionId: s.id, entryId: e.id });
      }
    } else {
      out.push({ path: `s:${s.id}:content`, label: s.title || 'Untitled section', section: s.title || 'Untitled section', sectionId: s.id });
    }
  }
  return out;
}

/* ---------- storage ---------- */

const KEY = 'cvmaker.docs.v1';
const CUR = 'cvmaker.current.v1';

export function loadDocs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const docs = JSON.parse(raw);
      if (Array.isArray(docs) && docs.length) return docs.map(normalizeCv);
    }
  } catch {
    /* ignore */
  }
  return [sampleCv()];
}

export function saveDocs(docs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(docs));
    return true;
  } catch {
    return false;
  }
}

export function loadCurrentId() {
  try {
    return localStorage.getItem(CUR);
  } catch {
    return null;
  }
}

export function saveCurrentId(id) {
  try {
    localStorage.setItem(CUR, id);
  } catch {
    /* ignore */
  }
}

/** Fill in any missing fields (older saves, imported JSON). */
export function normalizeCv(cv) {
  const base = blankCv();
  return {
    ...base,
    ...cv,
    id: cv.id || uid(),
    personal: { ...base.personal, ...(cv.personal || {}) },
    design: { ...DEFAULT_DESIGN, ...(cv.design || {}) },
    sections: (cv.sections || []).map((s) => ({
      ...newSection(s.preset || 'customText'),
      ...s,
      id: s.id || uid(),
      items: (s.items || []).map((e) => ({ ...newEntry(), ...e, id: e.id || uid() })),
    })),
    ignored: cv.ignored || [],
  };
}
