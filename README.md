# CV Maker

A free CV builder that runs in your web browser. Pick a look, fill in your details, fix the clunky wording, then download your CV as a PDF or Word file.

## Why this exists

Everyone wants to look at your GitHub cred these days. So I made this simple app with Claude, because I can.

And my CV? Made with this app. Again, because I CAN.

## Free to use. Do whatever.

This is free. Use it, copy it, change it, share it, sell CVs made with it, whatever you like. No sign-up, no payment, no catch. (Officially it's under the [MIT License](LICENSE), which basically says the same thing.)

But if you got a job using this little app, YOU MUST BUY ME COFFEE 😃

---

## How to run it on your computer

You don't need to be a techie. You need to install one free program, download this project, and type two commands. Takes about 10 minutes the first time.

### Step 1: Install Node.js (one time only)

Node.js is a free program that lets your computer run this app.

1. Go to **https://nodejs.org**
2. Click the big button that says **LTS** (that's the stable version) and download it.
3. Open the downloaded file and click **Next** through the installer. The default options are fine.
4. **Restart your computer** once it's done. (This saves you from the most common problem later.)

### Step 2: Download this project

1. At the top of this GitHub page, click the green **Code** button.
2. Click **Download ZIP**.
3. Find the ZIP file in your Downloads folder and **unzip it** (Windows: right-click → **Extract All**. Mac: double-click it).
4. Move the unzipped folder somewhere easy to find, like your Desktop or Documents.

### Step 3: Open a terminal in that folder

A terminal is a window where you type commands. Don't worry, you only need two.

- **Windows:** open the project folder, right-click an empty space inside it, and choose **Open in Terminal**.
  (Don't see it? Click the address bar at the top of the folder window, type `cmd`, and press Enter.)
- **Mac:** open the **Terminal** app (search for it with Cmd + Space). Type `cd ` (with a space after it), drag the project folder into the Terminal window, and press Enter.

### Step 4: Install the app's parts (one time only)

Type this and press Enter:

```bash
npm install
```

It downloads what the app needs. Give it a minute or two. Warnings in yellow are normal. You can ignore them.

### Step 5: Start the app

Type this and press Enter:

```bash
npm run dev
```

You'll see a line like `Local: http://localhost:5173/`. Open your web browser and go to **http://localhost:5173**.

That's it. You're in. 🎉

### Next time

Skip Steps 1, 2 and 4. Just open a terminal in the folder (Step 3) and run `npm run dev` (Step 5).

### Stopping it

Click in the terminal window and press **Ctrl + C** (on Mac too), or just close the terminal window. Your CVs stay saved.

### Something went wrong?

| What you see | What to do |
|---|---|
| `'npm' is not recognized` or `command not found: npm` | Node.js isn't installed, or your computer hasn't noticed yet. Restart your computer. If that doesn't fix it, redo Step 1. |
| The terminal shows a different address, like `localhost:5174` | Something else is using the usual one. Open whatever address the terminal shows. |
| The browser says "This site can't be reached" | The app isn't running. Check the terminal is still open and `npm run dev` is running in it. |
| The PDF comes out sideways (landscape), shrunk, or with "localhost" printed at the top | In the print window, set **Destination** to **Save as PDF**. "Microsoft Print to PDF" and real printers use Windows' own page settings and ignore the CV's layout. |
| `npm install` shows red errors | Make sure the terminal is open *inside* the project folder (you should see `package.json` in that folder), then try again. |

---

## What it can do

- **Build a CV from scratch** or start from the example CV and edit it.
- **6 templates:** Classic, Modern (with a sidebar), Minimal, Executive, Compact and Elegant.
- **Change the look:** colours, fonts, text size, spacing, margins, heading style, justified or left-aligned text, A4 or Letter paper, and an optional photo.
- **Sections your way:** add, remove, rename, reorder or hide them. Experience, education, skills, projects, certifications, languages and more are ready to go.
- **Skill levels:** optionally rate skills from 1 to 5, shown as dots.
- **Bullet points and formatting:** start a line with `-` for a bullet, and use `**bold**` or `*italic*`.
- **Download your CV** as:
  - **PDF (print quality):** opens your browser's print window. Set **Destination** to **Save as PDF** (not "Microsoft Print to PDF"). The text stays real text, so job sites and recruiter software can read it. **Use this one for applications.**
  - **PDF (quick download):** one click, but the text is turned into an image, so job sites can't read it.
  - **Word (.docx):** to keep editing in Microsoft Word or Google Docs.
  - **Backup file (.json):** to save your work or move it to another computer. Import it back into the app later.
- **Import an existing CV:** PDF, Word (.docx), plain text, or just paste in text (handy if ChatGPT or another AI wrote it). The app splits it into sections and lets you check everything before using it.
- **Fix robotic wording:** the **Wording** tab flags about 100 phrases that make CVs sound fake or AI-written, like "spearheaded", "leveraged", "results-driven", "proven track record" and those "…, resulting in…" endings. Click to swap in a plainer word, jump to the phrase and rewrite it yourself, or ignore it. You also get a score for how natural your CV sounds.
- **Several CVs at once:** keep different versions for different jobs. There's also undo/redo, and everything saves automatically.

## What it can't do

- **It doesn't rewrite your CV for you.** The wording checker uses a fixed list of phrases, not AI. It points out the cringe; you do the fixing. It can also miss awkward wording that isn't on its list.
- **No cloud, no accounts.** Your CVs are saved in your web browser on your computer only. They won't show up on another computer or another browser, and **clearing your browser data deletes them.** Use the backup file (Export → JSON) to keep a copy.
- **Scanned CVs can't be imported.** If your PDF is a photo or scan of paper, there's no text in it for the app to read.
- **Imports aren't perfect.** Fancy two-column CVs especially can come in a bit jumbled. You get a review screen to fix things before they're used.
- **Old `.doc` Word files don't work.** Open them in Word and save as `.docx` first.
- **The Word download is close, not identical.** It uses standard fonts every computer has, so it won't look exactly like the preview. The print-quality PDF is the exact version.
- **Internet is needed for the fancy fonts.** Everything else works offline. Without internet, the CV uses similar fonts already on your computer.

## Privacy

Nothing you type is sent anywhere. No accounts, no tracking. Your CVs stay in your browser on your computer.

---

<details>
<summary><b>For developers</b></summary>

Built with Vite + React. Main libraries: `docx` (Word export), `mammoth` (Word import), `pdfjs-dist` (PDF import), `html2pdf.js` (quick PDF).

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # static build in dist/
npx vite preview # serve the build locally
```

The `dist/` folder can be hosted on any static host, such as Netlify or GitHub Pages. For GitHub Pages, set `base: '/CV-Maker/'` in `vite.config.js` first. Opening `dist/index.html` straight from your file explorer won't work properly. It needs to be served over http.

</details>

---

Email: [chemnz@gmail.com](mailto:chemnz@gmail.com)
