import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { blankCv, loadCurrentId, loadDocs, normalizeCv, sampleCv, saveCurrentId, saveDocs, uid } from './model.js';
import CvDocument from './components/CvDocument.jsx';
import Editor from './components/Editor.jsx';
import DesignPanel from './components/DesignPanel.jsx';
import WordingPanel, { collectFindings } from './components/WordingPanel.jsx';
import ImportDialog from './components/ImportDialog.jsx';
import Preview from './components/Preview.jsx';
import { Icon } from './components/Icon.jsx';
import { downloadPdf, printCv, printPageCss, safeFileName } from './exportPdf.js';

function useOutsideClose(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, setOpen]);
  return ref;
}

export default function App() {
  const [docs, setDocs] = useState(loadDocs);
  const [currentId, setCurrentId] = useState(() => {
    const id = loadCurrentId();
    return id;
  });
  const cv = docs.find((d) => d.id === currentId) || docs[0];
  const [tab, setTab] = useState('content');
  const [openCards, setOpenCards] = useState({ personal: true });
  const [highlight, setHighlight] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState('');
  const [mobileView, setMobileView] = useState('edit');
  const [, force] = useState(0);
  const exportRef = useOutsideClose(exportOpen, setExportOpen);
  const docsRef = useOutsideClose(docsOpen, setDocsOpen);

  const cvRef = useRef(cv);
  cvRef.current = cv;
  const hist = useRef({ past: [], future: [], last: 0, id: cv.id });
  if (hist.current.id !== cv.id) hist.current = { past: [], future: [], last: 0, id: cv.id };

  const flash = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind, n: Math.random() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- persistence ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!saveDocs(docs)) flash('Could not save – browser storage is full. Try removing photos or old CVs.', 'err');
    }, 400);
    return () => clearTimeout(t);
  }, [docs, flash]);
  useEffect(() => saveCurrentId(cv.id), [cv.id]);

  /* ---------- editing with undo ---------- */
  const commit = (next) => {
    cvRef.current = next;
    setDocs((ds) => ds.map((d) => (d.id === next.id ? next : d)));
  };
  const update = useCallback((fn) => {
    const prev = cvRef.current;
    const next = { ...fn(prev), updatedAt: Date.now() };
    const h = hist.current;
    const now = Date.now();
    if (now - h.last > 700) {
      h.past.push(prev);
      if (h.past.length > 150) h.past.shift();
    }
    h.last = now;
    h.future = [];
    commit(next);
    force((n) => n + 1);
  }, []);
  const undo = useCallback(() => {
    const h = hist.current;
    if (!h.past.length) return;
    h.future.push(cvRef.current);
    h.last = 0;
    commit(h.past.pop());
    force((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    const h = hist.current;
    if (!h.future.length) return;
    h.past.push(cvRef.current);
    h.last = 0;
    commit(h.future.pop());
    force((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
      if (!(e.ctrlKey || e.metaKey) || typing) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const ignore = useCallback((key) => update((c) => ({ ...c, ignored: [...(c.ignored || []), key] })), [update]);

  /* ---------- documents ---------- */
  const addDoc = (doc, select = true) => {
    setDocs((ds) => [doc, ...ds]);
    if (select) {
      setCurrentId(doc.id);
      setOpenCards({ personal: true });
    }
  };
  const newBlank = () => {
    addDoc(blankCv(`CV ${docs.length + 1}`));
    setDocsOpen(false);
    setTab('content');
  };
  const newSample = () => {
    addDoc(sampleCv());
    setDocsOpen(false);
  };
  const duplicate = () => {
    addDoc({ ...structuredClone(cv), id: uid(), name: `${cv.name} (copy)`, updatedAt: Date.now() });
    setDocsOpen(false);
    flash('Duplicated – you are now editing the copy.');
  };
  const rename = () => {
    const name = prompt('Name this CV (only you see this):', cv.name);
    if (name && name.trim()) update((c) => ({ ...c, name: name.trim() }));
  };
  const remove = () => {
    if (!confirm(`Delete “${cv.name}”? This cannot be undone.`)) return;
    setDocs((ds) => {
      const rest = ds.filter((d) => d.id !== cv.id);
      const out = rest.length ? rest : [blankCv()];
      setCurrentId(out[0].id);
      return out;
    });
    setDocsOpen(false);
  };

  const onImport = (imported, replace) => {
    setShowImport(false);
    if (replace) {
      update((c) => ({ ...imported, id: c.id, name: c.name, design: c.design }));
    } else {
      addDoc({ ...imported, design: { ...cv.design } });
    }
    const n = collectFindings(imported).length;
    setTab(n ? 'wording' : 'content');
    flash(n ? `Imported. ${n} phrases flagged for a rewrite – see the Wording tab.` : 'Imported successfully.');
  };
  const onImportJson = (doc) => {
    setShowImport(false);
    addDoc(doc);
    flash('Backup restored as a new CV.');
  };

  /* ---------- export ---------- */
  const doExport = async (kind) => {
    setExportOpen(false);
    try {
      if (kind === 'print') return printCv(cv);
      setBusy(kind);
      if (kind === 'pdf') {
        await downloadPdf(cv);
      } else if (kind === 'docx') {
        const { exportDocx } = await import('./exportDocx.js');
        await exportDocx(cv);
      } else if (kind === 'json') {
        const { saveAs } = await import('file-saver');
        saveAs(new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' }), safeFileName(cv, 'json'));
      }
      flash('Exported.');
    } catch (e) {
      console.error(e);
      flash(`Export failed: ${e.message || e}`, 'err');
    } finally {
      setBusy('');
    }
  };

  /* ---------- focus a field from the wording panel ---------- */
  const [focusReq, setFocusReq] = useState(null);
  const goTo = (path, start, end) => {
    setTab('content');
    setMobileView('edit');
    const parts = path.split(':');
    setOpenCards((o) => ({ ...o, [parts[0] === 'p' ? 'personal' : parts[1]]: true }));
    setFocusReq({ path, start, end, n: Math.random() });
  };
  useEffect(() => {
    if (!focusReq) return;
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-path="${focusReq.path}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
      if (focusReq.start !== undefined) el.setSelectionRange(focusReq.start, focusReq.end);
    }, 120);
    return () => clearTimeout(t);
  }, [focusReq]);

  const findingCount = useMemo(() => collectFindings(cv).length, [cv]);
  const printRoot = document.getElementById('print-root');

  return (
    <div className={`app mv-${mobileView}`}>
      <header className="topbar">
        <div className="brand">
          <div className="logo"><Icon name="file" size={16} /></div>
          <span>CV Maker</span>
        </div>

        <div className="docs-menu" ref={docsRef}>
          <button className="btn ghost doc-btn" onClick={() => setDocsOpen(!docsOpen)}>
            <Icon name="folder" size={15} />
            <span className="doc-name">{cv.name}</span>
            <Icon name="chevDown" size={14} />
          </button>
          {docsOpen && (
            <div className="menu">
              <div className="menu-label">Your CVs</div>
              <div className="menu-list">
                {docs.map((d) => (
                  <button
                    key={d.id}
                    className={`menu-item ${d.id === cv.id ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentId(d.id);
                      setDocsOpen(false);
                    }}
                  >
                    <span>{d.name}</span>
                    <small>{new Date(d.updatedAt).toLocaleDateString()}</small>
                  </button>
                ))}
              </div>
              <div className="menu-sep" />
              <button className="menu-item" onClick={newBlank}><Icon name="plus" size={14} /> New blank CV</button>
              <button className="menu-item" onClick={newSample}><Icon name="sparkle" size={14} /> New from example</button>
              <button className="menu-item" onClick={duplicate}><Icon name="copy" size={14} /> Duplicate this CV</button>
              <button className="menu-item" onClick={() => { setDocsOpen(false); rename(); }}><Icon name="edit" size={14} /> Rename</button>
              <button className="menu-item danger" onClick={remove}><Icon name="trash" size={14} /> Delete</button>
            </div>
          )}
        </div>

        <div className="spacer" />
        <button className="icon-btn" onClick={undo} disabled={!hist.current.past.length} title="Undo (Ctrl+Z)"><Icon name="undo" /></button>
        <button className="icon-btn" onClick={redo} disabled={!hist.current.future.length} title="Redo (Ctrl+Y)"><Icon name="redo" /></button>
        <button className="btn" onClick={() => setShowImport(true)}>
          <Icon name="upload" size={15} /> <span className="hide-sm">Import</span>
        </button>
        <div className="export-menu" ref={exportRef}>
          <button className="btn primary" onClick={() => setExportOpen(!exportOpen)} disabled={!!busy}>
            <Icon name="download" size={15} /> {busy ? 'Exporting…' : <span className="hide-sm">Export</span>}
          </button>
          {exportOpen && (
            <div className="menu right">
              <button className="menu-item tall" onClick={() => doExport('print')}>
                <Icon name="print" />
                <div><b>PDF – print quality</b><small>Opens the print dialog: choose “Save as PDF”. Selectable text, best for job portals.</small></div>
              </button>
              <button className="menu-item tall" onClick={() => doExport('pdf')}>
                <Icon name="download" />
                <div><b>PDF – quick download</b><small>One click. Text is rendered as an image.</small></div>
              </button>
              <button className="menu-item tall" onClick={() => doExport('docx')}>
                <Icon name="file" />
                <div><b>Word (.docx)</b><small>Editable in Word, Google Docs, Pages.</small></div>
              </button>
              <div className="menu-sep" />
              <button className="menu-item tall" onClick={() => doExport('json')}>
                <Icon name="folder" />
                <div><b>Backup (.json)</b><small>Re-import later to keep editing.</small></div>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mobile-switch">
        <button className={mobileView === 'edit' ? 'on' : ''} onClick={() => setMobileView('edit')}>Edit</button>
        <button className={mobileView === 'preview' ? 'on' : ''} onClick={() => setMobileView('preview')}>Preview</button>
      </div>

      <div className="workspace">
        <aside className="sidepanel">
          <nav className="tabs">
            <button className={tab === 'content' ? 'on' : ''} onClick={() => setTab('content')}>
              <Icon name="edit" size={15} /> Content
            </button>
            <button className={tab === 'design' ? 'on' : ''} onClick={() => setTab('design')}>
              <Icon name="palette" size={15} /> Design
            </button>
            <button className={tab === 'wording' ? 'on' : ''} onClick={() => setTab('wording')}>
              <Icon name="sparkle" size={15} /> Wording {findingCount > 0 && <span className="badge">{findingCount}</span>}
            </button>
          </nav>
          <div className="panel-scroll">
            {tab === 'content' && (
              <Editor cv={cv} update={update} openCards={openCards} setOpenCards={setOpenCards} ignore={ignore} focusReq={focusReq} />
            )}
            {tab === 'design' && <DesignPanel cv={cv} update={update} />}
            {tab === 'wording' && (
              <WordingPanel cv={cv} update={update} ignore={ignore} goTo={goTo} highlight={highlight} setHighlight={setHighlight} />
            )}
          </div>
        </aside>
        <main className="preview-pane">
          <Preview cv={cv} highlight={highlight && tab !== 'design'} />
        </main>
      </div>

      {showImport && <ImportDialog onClose={() => setShowImport(false)} onImport={onImport} onImportJson={(d) => onImportJson(normalizeCv(d))} />}
      {toast && <div className={`toast ${toast.kind}`} key={toast.n}>{toast.msg}</div>}

      {printRoot &&
        createPortal(
          <>
            <style>{printPageCss(cv.design)}</style>
            <CvDocument cv={cv} forPrint />
          </>,
          printRoot
        )}
    </div>
  );
}
