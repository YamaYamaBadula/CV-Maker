import { PAGE_SIZES } from './components/CvDocument.jsx';

export const safeFileName = (cv, ext) => {
  const base = (cv.personal.fullName || cv.name || 'CV').trim() + ' CV';
  return `${base.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ')}.${ext}`;
};

/** Page rules used when printing (the CV itself is rendered in #print-root). */
export function printPageCss(d) {
  const page = PAGE_SIZES[d.pageSize] || PAGE_SIZES.A4;
  // Explicit portrait dimensions, so the print dialog can't guess landscape.
  const size = `${page.w}mm ${page.h}mm`;
  if (d.template === 'modern') {
    // Full-bleed pages: the sidebar colour is painted on every page by a fixed element,
    // and the main column repeats its top/bottom padding at each page break.
    return `
@media print {
  @page { size: ${size}; margin: 0; }
  .cv.cv-print.cv-modern { padding: 0; min-height: 0; background: transparent; }
  .cv.cv-print.cv-modern::before {
    content: ''; position: fixed; left: 0; top: 0; bottom: 0; width: 33%;
    background: var(--accent-soft); z-index: 0;
  }
  .cv.cv-print.cv-modern .cv-aside,
  .cv.cv-print.cv-modern .cv-main { position: relative; z-index: 1; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
  .cv.cv-print.cv-modern .cv-aside { background: transparent; }
}`;
  }
  return `
@media print {
  @page { size: ${size}; margin: ${d.margin}mm 0; }
  @page :first { margin-top: 0; }
  .cv.cv-print { padding-bottom: 0; }
}`;
}

/** Vector, selectable-text PDF via the browser's print dialog ("Save as PDF"). */
export async function printCv(cv) {
  const prevTitle = document.title;
  document.title = safeFileName(cv, 'pdf').replace(/\.pdf$/, '');
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }
  const restore = () => {
    document.title = prevTitle;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
  setTimeout(restore, 1500);
}

/** One-click PDF download (rendered as an image – good for sharing, not for ATS). */
export async function downloadPdf(cv) {
  const source = document.querySelector('#print-root .cv');
  if (!source) throw new Error('Nothing to export');
  const { default: html2pdf } = await import('html2pdf.js');
  const d = cv.design;
  const page = PAGE_SIZES[d.pageSize] || PAGE_SIZES.A4;

  const wrap = document.createElement('div');
  wrap.style.cssText = `position:fixed;left:-20000px;top:0;width:${page.w}mm;background:#fff;`;
  const clone = source.cloneNode(true);
  clone.classList.remove('cv-print');
  clone.style.width = `${page.w}mm`;
  clone.style.minHeight = '0';
  if (!clone.classList.contains('cv-modern')) {
    clone.style.paddingTop = '0';
    clone.style.paddingBottom = '0';
  }
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  try {
    await document.fonts?.ready;
    await html2pdf()
      .set({
        margin: [d.margin, 0, d.margin, 0],
        filename: safeFileName(cv, 'pdf'),
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', letterRendering: true },
        jsPDF: { unit: 'mm', format: d.pageSize === 'Letter' ? 'letter' : 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.entry', 'li', 'p', '.cv-section-title', '.tag-group', '.cv-header'] },
      })
      .from(clone)
      .save();
  } finally {
    wrap.remove();
  }
}
