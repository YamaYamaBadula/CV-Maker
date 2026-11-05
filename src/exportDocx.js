import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Tab,
  TabStopType,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { fontByName, templateById } from './model.js';
import { inlineTokens, parseBlocks, parseList, ratingKey } from './richtext.jsx';
import { contactItems, dateRange, isSideSection, sectionHasContent, tint } from './components/CvDocument.jsx';
import { safeFileName } from './exportPdf.js';

const MM = 56.6929; // twips per mm
const hex = (c) => c.replace('#', '').toUpperCase();

function photoRun(dataUrl, px) {
  const m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i.exec(dataUrl || '');
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const type = m[1].toLowerCase().startsWith('jp') ? 'jpg' : m[1].toLowerCase();
  return new ImageRun({ type, data: bytes, transformation: { width: px, height: px } });
}

export function buildDocx(cv) {
  const d = cv.design;
  const p = cv.personal;
  const tpl = templateById(d.template);
  const accent = hex(d.accent);
  const accentMid = hex(tint(d.accent, 0.45));
  const soft = hex(tint(d.accent, 0.1));
  const body = fontByName(d.bodyFont).docx;
  const head = fontByName(d.headingFont).docx;
  const sz = Math.round(d.fontSize * 2);
  const page = d.pageSize === 'Letter' ? { width: 12240, height: 15840 } : { width: 11906, height: 16838 };
  const margin = Math.round(d.margin * MM);
  const contentW = page.width - margin * 2;
  const line = Math.round(d.lineHeight * 240 * 0.85);
  const sectionBefore = { compact: 150, normal: 230, relaxed: 330 }[d.spacing] ?? 230;
  const centered = tpl.id === 'classic' || tpl.id === 'elegant';
  const exec = tpl.id === 'executive';

  const run = (text, o = {}) =>
    new TextRun({
      text,
      break: o.br ? 1 : undefined,
      font: o.font || body,
      size: o.size || sz,
      bold: o.bold,
      italics: o.italics,
      color: o.color,
      allCaps: o.allCaps,
      characterSpacing: o.spacing,
    });

  // A newline inside the text becomes a line break in the same paragraph (keeps bullet indentation).
  const inlineRuns = (text, base = {}) =>
    inlineTokens(text || '').flatMap((t) =>
      t.text.split('\n').map((part, i) => run(part, { ...base, br: i > 0, bold: base.bold || t.bold, italics: base.italics || t.italic }))
    );

  const alignOf = (s) => {
    const a = s && s.align && s.align !== 'auto' ? s.align : d.textAlign;
    return a === 'justify' ? AlignmentType.JUSTIFIED : undefined;
  };

  const tabRun = (text, o = {}) =>
    new TextRun({ children: [new Tab(), text], font: body, size: o.size || Math.round(sz * 0.95), color: o.color || '555555' });

  /* ---------- building blocks ---------- */

  function heading(title, { side = false } = {}) {
    const style = d.headingStyle;
    const filled = style === 'filled';
    const color = filled ? 'FFFFFF' : exec ? '111111' : accent;
    const opts = {
      keepNext: true,
      spacing: { before: sectionBefore, after: 90 },
      alignment: tpl.id === 'elegant' && !side ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [
        run(d.uppercaseHeadings ? title.toUpperCase() : title, {
          font: head,
          bold: true,
          size: Math.round(sz * (side ? 1.0 : 1.08)),
          color,
          spacing: d.uppercaseHeadings ? 24 : 0,
        }),
      ],
    };
    if (style === 'underline' || (tpl.id === 'modern' && style === 'plain' && !side))
      opts.border = { bottom: { style: BorderStyle.SINGLE, size: 10, color: accent, space: 2 } };
    if (style === 'line') opts.border = { bottom: { style: BorderStyle.SINGLE, size: 4, color: exec ? accent : accentMid, space: 2 } };
    if (style === 'bar') opts.border = { left: { style: BorderStyle.SINGLE, size: 24, color: accent, space: 6 } };
    if (filled) opts.shading = { type: ShadingType.CLEAR, fill: accent, color: 'auto' };
    return new Paragraph(opts);
  }

  function blocks(text, alignment) {
    return parseBlocks(text).map((b) =>
      b.type === 'gap'
        ? new Paragraph({ spacing: { after: 0, line }, children: [run('')] })
        : b.type === 'bullet'
        ? new Paragraph({ alignment, numbering: { reference: 'bullets', level: 0 }, spacing: { after: 30, line }, children: inlineRuns(b.text) })
        : new Paragraph({ alignment, spacing: { after: 50, line }, children: inlineRuns(b.text) })
    );
  }

  function entry(e, width, side, alignment) {
    const date = dateRange(e, d.dateSeparator);
    const tabStops = [{ type: TabStopType.RIGHT, position: width }];
    const out = [];
    const titleRuns = inlineRuns(e.title, { bold: true, color: '111111' });
    const subRuns = inlineRuns(e.subtitle, { italics: tpl.id !== 'minimal' && tpl.id !== 'compact', color: '333333' });
    if (side) {
      if (e.title) out.push(new Paragraph({ keepNext: true, spacing: { before: 80, line }, children: titleRuns }));
      if (e.subtitle) out.push(new Paragraph({ keepNext: true, spacing: { line }, children: subRuns }));
      const meta = [date, e.location].filter(Boolean).join(' · ');
      if (meta) out.push(new Paragraph({ keepNext: true, spacing: { line }, children: [run(meta, { color: '555555', size: Math.round(sz * 0.92) })] }));
    } else if (tpl.entryLayout === 'inline') {
      const children = [...titleRuns];
      if (e.subtitle) children.push(run(e.title ? ' — ' : ''), ...inlineRuns(e.subtitle, { color: '333333' }));
      if (e.location) children.push(run(`, ${e.location}`, { color: '555555' }));
      if (date) children.push(tabRun(date));
      out.push(new Paragraph({ keepNext: true, tabStops, spacing: { before: 100, line }, children }));
    } else {
      if (e.title || date)
        out.push(
          new Paragraph({
            keepNext: true,
            tabStops,
            spacing: { before: 110, line },
            children: [...titleRuns, ...(date ? [tabRun(date)] : [])],
          })
        );
      if (e.subtitle || e.location)
        out.push(
          new Paragraph({
            keepNext: true,
            tabStops,
            spacing: { line },
            children: [...subRuns, ...(e.location ? [tabRun(e.location)] : [])],
          })
        );
    }
    out.push(...blocks(e.description, alignment));
    return out;
  }

  function list(s) {
    const style = s.display && s.display !== 'auto' ? s.display : d.listStyle;
    const groups = parseList(s.content, style !== 'rows');
    const labelled = groups.some((g) => g.label);
    const alignment = style === 'inline' || style === 'rows' ? alignOf(s) : undefined;
    const para = (children) => new Paragraph({ alignment, spacing: { after: 40, line }, children });
    if (style === 'rows')
      return groups.map((g) => para([...(g.label ? [run(`${g.label}: `, { bold: true })] : []), ...inlineRuns(g.line)]));
    if (style === 'bullets' || style === 'columns') {
      const items = labelled
        ? groups.map((g) => ({ label: g.label, text: g.items.join(', ') }))
        : groups.flatMap((g) => g.items.map((t) => ({ text: t })));
      return items.map(
        (it) =>
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            spacing: { after: 30, line },
            children: [...(it.label ? [run(`${it.label}: `, { bold: true })] : []), ...inlineRuns(it.text)],
          })
      );
    }
    // inline & tags
    if (!labelled) return [para(inlineRuns(groups.flatMap((g) => g.items).join('  ·  ')))];
    return groups.map((g) => para([...(g.label ? [run(`${g.label}: `, { bold: true })] : []), ...inlineRuns(g.items.join('  ·  '))]));
  }

  function ratedList(s, width) {
    const ratings = s.ratings || {};
    const pos = Math.min(width, Math.round(75 * MM));
    const out = [];
    for (const g of parseList(s.content)) {
      if (g.label) out.push(new Paragraph({ keepNext: true, spacing: { before: 40, after: 20, line }, children: [run(g.label, { bold: true })] }));
      for (const it of g.items) {
        const n = ratings[ratingKey(it)] || 0;
        const children = inlineRuns(it);
        if (n)
          children.push(
            new TextRun({ children: [new Tab()], font: body, size: sz }),
            run('●'.repeat(n), { color: accent, size: Math.round(sz * 0.9) }),
            run('●'.repeat(5 - n), { color: accentMid, size: Math.round(sz * 0.9) })
          );
        out.push(new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: pos }], spacing: { after: 30, line }, children }));
      }
    }
    return out;
  }

  function section(s, width, side = false) {
    const out = [];
    if (s.title && s.title.trim()) out.push(heading(s.title, { side }));
    else out.push(new Paragraph({ spacing: { before: Math.round(sectionBefore * 0.6), after: 0, line: 240 }, children: [run('', { size: 2 })] }));
    if (s.kind === 'text') out.push(...blocks(s.content, alignOf(s)));
    else if (s.kind === 'list') out.push(...(s.showRatings ? ratedList(s, width) : list(s)));
    else
      s.items
        .filter((e) => e.title || e.subtitle || e.description || e.start || e.end)
        .forEach((e) => out.push(...entry(e, width, side, alignOf(s))));
    return out;
  }

  function contactRuns(color) {
    const items = contactItems(p);
    const children = [];
    items.forEach(([, value, link], i) => {
      if (i) children.push(run('  ·  ', { color: exec ? 'FFFFFF' : accent, bold: true, size: Math.round(sz * 0.93) }));
      const r = run(value, { color, size: Math.round(sz * 0.93) });
      children.push(link ? new ExternalHyperlink({ link, children: [r] }) : r);
    });
    return children;
  }

  /* ---------- header ---------- */

  function header() {
    const out = [];
    const align = centered ? AlignmentType.CENTER : AlignmentType.LEFT;
    const shading = exec ? { type: ShadingType.CLEAR, fill: accent, color: 'auto' } : undefined;
    const pad = exec ? { left: 160, right: 160 } : undefined;
    const photo = d.showPhoto && photoRun(p.photo, 96);
    if (exec) out.push(new Paragraph({ shading, spacing: { after: 0 }, children: [run(' ', { size: 12 })] }));
    if (photo) out.push(new Paragraph({ alignment: align, shading, indent: pad, spacing: { after: 80 }, children: [photo] }));
    if (p.fullName)
      out.push(
        new Paragraph({
          alignment: align,
          shading,
          indent: pad,
          spacing: { after: 40 },
          children: [
            run(tpl.id === 'elegant' ? p.fullName.toUpperCase() : p.fullName, {
              font: head,
              size: Math.round(sz * 2.4),
              bold: tpl.id !== 'elegant' && tpl.id !== 'minimal',
              color: exec ? 'FFFFFF' : tpl.id === 'classic' ? accent : '111111',
              spacing: tpl.id === 'elegant' ? 60 : 0,
            }),
          ],
        })
      );
    if (p.headline)
      out.push(
        new Paragraph({
          alignment: align,
          shading,
          indent: pad,
          spacing: { after: 60 },
          children: inlineRuns(p.headline, {
            size: Math.round(sz * 1.18),
            color: exec ? 'FFFFFF' : tpl.id === 'classic' ? '444444' : accent,
            italics: tpl.id === 'elegant',
          }),
        })
      );
    const contacts = contactRuns(exec ? 'FFFFFF' : '444444');
    if (contacts.length)
      out.push(
        new Paragraph({
          alignment: align,
          shading,
          indent: pad,
          spacing: { after: exec ? 0 : 60 },
          border: tpl.id === 'compact' ? { bottom: { style: BorderStyle.SINGLE, size: 14, color: accent, space: 6 } } : undefined,
          children: contacts,
        })
      );
    if (out.length === (exec ? 1 : 0)) return [];
    if (exec) out.push(new Paragraph({ shading, spacing: { after: 0 }, children: [run(' ', { size: 12 })] }));
    return out;
  }

  /* ---------- body ---------- */

  const sections = cv.sections.filter(sectionHasContent);
  let children;

  if (tpl.id === 'modern') {
    const leftW = Math.round(contentW * 0.33);
    const rightW = contentW - leftW;
    const cellPad = 200;
    const sideSecs = sections.filter(isSideSection);
    const mainSecs = sections.filter((s) => !isSideSection(s));
    const photo = d.showPhoto && photoRun(p.photo, 110);
    const left = [];
    if (photo) left.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [photo] }));
    if (contactItems(p).length) left.push(heading('Contact', { side: true }));
    contactItems(p).forEach(([label, value, link]) => {
      left.push(new Paragraph({ spacing: { before: 60 }, children: [run(label.toUpperCase(), { size: Math.round(sz * 0.72), bold: true, color: '666666', spacing: 16 })] }));
      const r = run(value, { size: Math.round(sz * 0.92) });
      left.push(new Paragraph({ children: [link ? new ExternalHyperlink({ link, children: [r] }) : r] }));
    });
    sideSecs.forEach((s) => left.push(...section(s, leftW - cellPad * 2, true)));

    const right = [];
    if (p.fullName)
      right.push(new Paragraph({ spacing: { after: 40 }, children: [run(p.fullName, { font: head, bold: true, size: Math.round(sz * 2.5), color: '111111' })] }));
    if (p.headline) right.push(new Paragraph({ spacing: { after: 60 }, children: inlineRuns(p.headline, { size: Math.round(sz * 1.18), color: accent }) }));
    mainSecs.forEach((s) => right.push(...section(s, rightW - cellPad * 2)));

    children = [
      new Table({
        width: { size: contentW, type: WidthType.DXA },
        columnWidths: [leftW, rightW],
        borders: TableBorders.NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: leftW, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: soft, color: 'auto' },
                margins: { top: cellPad, bottom: cellPad, left: cellPad, right: cellPad },
                children: left.length ? left : [new Paragraph('')],
              }),
              new TableCell({
                width: { size: rightW, type: WidthType.DXA },
                margins: { top: 0, bottom: cellPad, left: cellPad * 1.5, right: 0 },
                children: right.length ? right : [new Paragraph('')],
              }),
            ],
          }),
        ],
      }),
    ];
  } else {
    children = [...header()];
    sections.forEach((s) => children.push(...section(s, contentW)));
  }

  return new Document({
    creator: p.fullName || 'CV Maker',
    title: `${p.fullName || 'CV'} – CV`,
    styles: {
      default: {
        document: { run: { font: body, size: sz, color: '1F2328' }, paragraph: { spacing: { line } } },
      },
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 300, hanging: 220 } }, run: { color: accent } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: page, margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        children,
      },
    ],
  });
}

export async function exportDocx(cv) {
  const blob = await Packer.toBlob(buildDocx(cv));
  saveAs(blob, safeFileName(cv, 'docx'));
}
