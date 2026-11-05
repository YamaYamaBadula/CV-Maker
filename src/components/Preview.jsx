import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import CvDocument, { PAGE_SIZES } from './CvDocument.jsx';
import { Icon } from './Icon.jsx';

const PX = 96 / 25.4;
const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25];

export default function Preview({ cv, highlight }) {
  const scrollRef = useRef(null);
  const pageRef = useRef(null);
  const [fit, setFit] = useState(0.8);
  const [zoom, setZoom] = useState('fit');
  const [height, setHeight] = useState({ content: 0, page: 0 });
  const page = PAGE_SIZES[cv.design.pageSize] || PAGE_SIZES.A4;
  const pageW = page.w * PX;
  const pageH = page.h * PX;
  const m = cv.design.margin * PX;

  useEffect(() => {
    const el = scrollRef.current;
    const ro = new ResizeObserver(() => setFit(Math.min(1.3, Math.max(0.3, (el.clientWidth - 48) / pageW))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageW]);

  useLayoutEffect(() => {
    const el = pageRef.current?.firstElementChild;
    if (!el) return;
    // Measure where the content actually ends (the page itself has a min-height).
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const scaleNow = el.getBoundingClientRect().height / el.offsetHeight || 1;
      let bottom = 0;
      el.querySelectorAll('.cv-section, .cv-header').forEach((n) => {
        bottom = Math.max(bottom, (n.getBoundingClientRect().bottom - top) / scaleNow);
      });
      setHeight({ content: bottom, page: el.offsetHeight });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.querySelectorAll('.cv-section, .cv-header').forEach((n) => ro.observe(n));
    measure();
    return () => ro.disconnect();
  }, [cv]);

  const scale = zoom === 'fit' ? fit : zoom;

  // Approximate print page breaks: first page has no top margin (CV padding), others use @page margins.
  const breaks = [];
  let pos = pageH - m;
  while (pos < height.content - 2 && breaks.length < 20) {
    breaks.push(pos);
    pos += pageH - 2 * m;
  }
  const pages = breaks.length + 1;

  const step = (dir) => {
    const cur = zoom === 'fit' ? fit : zoom;
    const next = dir > 0 ? ZOOMS.find((z) => z > cur + 0.01) : [...ZOOMS].reverse().find((z) => z < cur - 0.01);
    if (next) setZoom(next);
  };

  return (
    <div className="preview">
      <div className="preview-bar">
        <span className="muted small-text">
          {pages} {pages === 1 ? 'page' : 'pages'} · {cv.design.pageSize}
          {pages > 2 && ' · most CVs work best at 1–2 pages'}
        </span>
        <div className="spacer" />
        <button className="icon-btn" onClick={() => step(-1)} title="Zoom out"><Icon name="zoomOut" /></button>
        <button className={`chip ${zoom === 'fit' ? 'on' : ''}`} onClick={() => setZoom('fit')}>
          {Math.round(scale * 100)}%{zoom === 'fit' && ' · fit'}
        </button>
        <button className="icon-btn" onClick={() => step(1)} title="Zoom in"><Icon name="zoomIn" /></button>
      </div>
      <div className="preview-scroll" ref={scrollRef}>
        <div className="page-holder" style={{ width: pageW * scale, height: Math.max(height.page, pageH) * scale }}>
          <div className="page-scaler" style={{ width: pageW, transform: `scale(${scale})` }} ref={pageRef}>
            <CvDocument cv={cv} highlight={highlight} />
            {breaks.map((y, i) => (
              <div key={i} className="page-break" style={{ top: y }}>
                <span>Page {i + 2}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
