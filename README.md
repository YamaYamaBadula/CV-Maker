# CV Maker

An all-in-one CV builder that runs in your browser. Nothing is uploaded anywhere: CVs are saved in your browser's local storage.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. For a static build, run `npm run build` and serve the `dist/` folder.

## Features

- **Content editor**: personal details and photo, plus sections you can add, remove, rename, reorder, hide and switch between paragraph, list and dated-entry types. Includes 15 section presets (experience, education, skills, projects, certifications, languages…). Descriptions support `- bullets`, `**bold**` and `*italic*`.
- **6 templates**: Classic, Modern (sidebar), Minimal, Executive, Compact and Elegant. Each has adjustable colour, heading/body fonts, font size, line height, margins, spacing, heading style, list style, date format and paper size (A4/Letter).
- **Export**
  - *PDF (print quality)*: opens the print dialog, where you choose "Save as PDF". The text stays selectable, so job-portal (ATS) systems can read it.
  - *PDF (quick download)*: one click, but the text is rendered as an image.
  - *Word (.docx)*: a real editable document. The template layout is approximated, and fonts are mapped to Word-safe equivalents.
  - *JSON backup*: import it again later to keep editing.
- **Import**: PDF, DOCX, TXT/Markdown, pasted text or a JSON backup. It finds your name, contact details and sections, splits experience into entries (title, company, location, dates, bullets) and re-joins lines that a PDF wrapped. You can review and correct the result before it's applied.
- **Wording checker**: flags about 100 buzzwords, clichés, filler phrases and AI-style patterns (spearheaded, leveraged, results-driven, em-dashes, trailing ", resulting in…" clauses, repeated bullet openers, long sentences). You get one-click plainer alternatives, a "rewrite myself" button that jumps to the phrase, and highlighting in the preview. You can ignore any flag. The original imported text stays available for reference.
- Several CVs at once (duplicate, rename, delete), undo/redo, autosave, approximate page-break guides and a mobile layout.

## Known limitations

- Scanned (image-only) PDFs have no text to extract, so they need OCR first.
- Two-column PDFs are harder to parse, so check the import review screen.
- Old `.doc` files must be re-saved as `.docx`.
