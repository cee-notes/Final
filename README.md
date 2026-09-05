# NEXUS — Fully Functional Website (GitHub Pages + Google Apps Script)

A complete, production-ready website with a **real backend** and **100% free hosting**:

| Layer | Technology | Cost |
|---|---|---|
| Frontend | HTML + CSS + JS on **GitHub Pages** | $0 |
| Backend API | **Google Apps Script** Web App | $0 |
| Database | **Google Sheets** | $0 |

The contact form on the website sends data to your Apps Script backend, which validates it and stores it in your Google Sheet. Optionally, you also get an email for every submission.

## Files in this package

```
website/
├── index.html              ← The website (paste into GitHub)
├── style.css               ← The website styles (paste into GitHub)
├── script.js               ← Website logic + backend connection (paste into GitHub)
├── apps-script/
│   └── Code.gs             ← The backend (paste into Apps Script)
└── README.md               ← This guide
```

---

# PART A — Deploy the Frontend on GitHub

### Step 1: Create the repository
1. Go to [github.com](https://github.com) and log in.
2. Click the **+** icon (top right) → **New repository**.
3. Name it anything, for example `my-website`.
4. Keep it **Public** (required for free GitHub Pages).
5. Click **Create repository**.

### Step 2: Upload the website files
1. In your new repository, click **Add file → Create new file**.
2. Name it `index.html`, copy the **entire content** of this package's `index.html` into it, and click **Commit changes**.
3. Repeat for `style.css` and `script.js`.
   - **Important:** keep the files at the root of the repository (next to the README), not inside a folder — the paths in `index.html` expect them side by side.

### Step 3: Turn on GitHub Pages
1. In the repository, go to **Settings → Pages** (left sidebar).
2. Under **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` and `/ (root)`
3. Click **Save**.
4. Wait 1–2 minutes, refresh the page — a green box shows your live URL, like:
   `https://YOUR-USERNAME.github.io/my-website/`
5. Open it. The website is live. The form currently runs in **demo mode** until you connect the backend (Part B).

---

# PART B — Deploy the Backend on Google Apps Script

### Step 4: Create the Google Sheet (your database)
1. Go to [sheets.google.com](https://sheets.google.com) and create a **Blank spreadsheet**.
2. Name it something like `Website Responses`. You never have to touch it again — the script creates the `Responses` tab automatically.

### Step 5: Add the Apps Script code
1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete any code in the editor, then paste the **entire content** of `apps-script/Code.gs`.
3. (Optional) At the top of `Code.gs`:
   - Set `NOTIFY_EMAIL = "you@gmail.com";` to receive an email for every submission.
   - Set `SECRET_KEY = "any-secret-word";` for extra protection (then also add `"key": "any-secret-word"` in `script.js` payload). Leave as `""` if unsure.
4. Press **Ctrl+S** (Cmd+S on Mac) to save.

### Step 6: Run `setup()` once
1. In the toolbar dropdown (next to "Debug"), select the function **`setup`**.
2. Click **Run**.
3. Approve the permission prompt: **Review permissions → choose your account → Advanced → Go to project (unsafe) → Allow**.
   *(This warning appears because the script is yours and not verified by Google — it only touches your own spreadsheet.)*
4. The script creates the bold **Responses** header row in the sheet.

### Step 7: Deploy as a Web App
1. Click **Deploy → New deployment** (blue button, top right).
2. Click the gear icon → choose **Web app**.
3. Set:
   - **Description:** `Website backend`
   - **Execute as:** `Me (your@gmail.com)`
   - **Who has access:** `Anyone`  ← this is required for the form to work
4. Click **Deploy** and approve the access prompt.
5. Copy the **Web app URL** — it ends with `/exec`. Example:
   `https://script.google.com/macros/s/AKfycb.../exec`

> To test the backend by itself: open that URL in a browser — you should see
> `{"success":true,"service":"NEXUS Apps Script backend",...}`. You can also run the `testPost()` function in the editor and check that a row appears in the Sheet.

---

# PART C — Connect Frontend to Backend

### Step 8: Paste the backend URL into `script.js`
1. Open `script.js` (on GitHub, click the pencil icon to edit).
2. Find this line at the top:
   ```js
   SCRIPT_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
   ```
3. Replace the placeholder with your `/exec` URL:
   ```js
   SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
4. **Commit changes**.

GitHub Pages redeploys automatically in 1–2 minutes. Open your live website, fill the form, press **Send Message** — a green toast confirms it, and the message appears instantly as a new row in your Google Sheet.

**Everything is now fully functional.**

---

# Customizing the website

| What | Where |
|---|---|
| Site name "NEXUS" | Search & replace in `index.html` and `style.css` |
| Hero title / subtitle | `index.html` → `<section class="hero">` |
| Feature cards | `index.html` → `features-grid` block |
| Email / phone / location | `index.html` → `contact-info` block |
| Colors | `style.css` → `:root` variables (`--primary`, `--accent`, ...) |
| Form fields | `index.html` form + validation in `script.js` + `HEADERS` in `Code.gs` |

# Troubleshooting

| Problem | Fix |
|---|---|
| 404 on the live URL | Wait 2–3 min; check Settings → Pages is set to branch `main` / root. |
| Form says "Demo mode" | You did not paste the `/exec` URL in `script.js` (Step 8), or the commit hasn't redeployed yet. |
| Form shows an error but the sheet is empty | In Apps Script: **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**. Any code change requires a new version. |
| "Unauthorized" message | You set a `SECRET_KEY` in `Code.gs` but did not send it from the frontend (or vice versa). |
| Access prompt loops / "unsafe" warning | Normal — it is your own script. Choose your account → Advanced → "Go to project" → Allow. |
| Data saved but no email | Set `NOTIFY_EMAIL` in `Code.gs`, then create a **New deployment version** (see above). |

# Security notes

- Your Google Sheet stays **private** — visitors can never read it; they can only add rows through the Web App.
- Input is validated on **both** the client (JavaScript) and the server (Apps Script).
- `Who has access: Anyone` means anyone can *submit* the form — it does **not** expose your account or spreadsheet.
- For extra hardening, enable `SECRET_KEY` as described in Step 5.
