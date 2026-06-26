# MyFy Premier Static Site — Hand-off Document

> Complete state of the project so a fresh agent can continue with zero guesswork.
> Last updated after a full element-by-element fidelity pass against the live site (branch `master`).

---

## 1. What this project is

Take the client's Wix website **www.myfypremier.com** and produce a **static copy that
lives on the user's computer and makes no calls back to Wix**. The site is a 5‑page
brochure for a luxury Yacht/RV financing company ("MyFy Premier", powered by "My
Financing USA").

**Project root:** `C:\Users\bturner_rvfinancingu\Documents\premier\site` (a git repo).

**Canonical source of truth for design/content:** the LIVE site **https://www.myfypremier.com/**.
Home, Contact, Privacy, and Terms all render there. **`/yacht-financing` is 404 on the
live site** — it is not published; its content came from an older saved capture (see §7).

---

## 2. Current approach (IMPORTANT — read this)

We went through TWO approaches. **Only the second is current.**

1. **(ABANDONED) Wix static export** — rendered the live pages headless, downloaded all
   Wix assets locally, stripped the Wix JS, rewrote URLs. Artifacts still in the repo
   under `_raw/` and `_build/localize.ps1`. This produced heavy (~600KB–1MB) pages that
   were fragile (broken mobile, broken yacht header). **Superseded. Do not build on it.**

2. **(CURRENT) Clean hand-coded rebuild** — the user explicitly chose to rebuild from
   scratch as lightweight, hand-written pages that all share **one base** (one template,
   one stylesheet, one JS), assembled by a small build script. This is what's live in the
   repo root now. **All future work goes here.**

The user's repeated, central concern is **visual fidelity to the live Wix site**
(fonts, logos, spacing, colors, section layout). When in doubt, **measure the live site's
computed styles and match them exactly — do not eyeball.**

---

## 3. Architecture (current build)

```
_src/template.html                 # shared shell: <head>, header, nav, mobile overlay, footer
_src/partials/logo-myfy.svg        # MyFy Premier wordmark (gold, inline SVG)
_src/partials/logo-poweredby.svg   # "My Financing USA" star logo (gold, inline SVG)
_src/pages/index.content.html              # Home content fragment
_src/pages/yacht-financing.content.html    # Yacht Financing content fragment
_src/pages/contact-us.content.html         # Contact content fragment (incl. form)
_src/pages/privacy-policy.content.html     # Privacy legal text (prose)
_src/pages/terms-and-conditions.content.html  # Terms legal text (prose)

assets/css/site.css                # ALL styling (design tokens, layout, responsive)
assets/js/site.js                  # mobile hamburger menu toggle only
assets/img/                        # 22 images (hero, officers, badges, watermark, favicon…)
assets/fonts/                      # woff2 fonts (only 3 are actually used — see §5)
assets/video/hero.mp4              # home hero background video (8 MB)

_build/build.ps1                   # CURRENT build: assembles _src/* -> root *.html
_build/serve.ps1                   # local static server (HttpListener, supports HTTP Range)
_build/localize.ps1                # LEGACY (old Wix localizer) — ignore

index.html  yacht-financing.html  contact-us.html  privacy-policy.html  terms-and-conditions.html
                                   # the 5 BUILT pages (generated — do not hand-edit; edit _src/)
sitemap.xml   README.md   HANDOFF.md
_raw/                              # LEGACY rendered Wix captures (reference only)
```

### Build workflow
1. Edit `_src/template.html` (header/footer/nav) or `_src/pages/*.content.html` (page body)
   or `assets/css/site.css`.
2. Run: `powershell -File _build\build.ps1`
   → regenerates the five root `*.html`.
3. Preview: `powershell -File _build\serve.ps1 -Port 8753` → open `http://localhost:8753/`
   and **hard-refresh (Ctrl+Shift+R)** — the browser aggressively caches `site.css`.

### Template placeholders (filled by build.ps1)
`{{TITLE}}` `{{DESC}}` `{{CONTENT}}` `{{LOGO_MYFY}}` `{{LOGO_POWERED}}`
`{{ACT_HOME}}` `{{ACT_YACHT}}` `{{ACT_CONTACT}}` (the active one becomes `aria-current="page"`).
Page list, titles, descriptions, and active-nav are defined in the `$pages` array in `build.ps1`.

---

## 4. Brand / design spec (measured from the live site)

**Colors**
- Dark teal (sections, header, footer, headings on light): `#183131`
- Nav-bar teal: `#3e7e7b`
- Divider / accent gold: `#c8a168`
- Button / tan gold: `#e5c69c`
- Logo gold: `#e4c69b`
- Body text on light: near-black (`#111`, live uses `rgb(0,0,0)`)
- Text on dark sections: `#fff`

**Fonts (local, no Google/CDN)** — headings are **regular weight 400, NOT bold**
- Headings: **Playfair Display**, weight 400 → `assets/fonts/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgEM86xQ.woff2`
- Body: **Lato** 400 → `2hXzmNaFRuKTSBR9nRGO-A.woff2`; Lato 700 → `7nLfsQCzhQW_PwpkrwroYw.woff2`
- (@font-face declarations are at the top of `site.css`.)

**Type scale (desktop, re-measured live element-by-element — see §9 tooling)**
- Hero title: 73px / Playfair 400 / white
- Standard section titles ("Welcome", "Testimonials", "Our Officers", every prose/legal H2…): **40px** / Playfair 400
- "Features That Set Us Apart" is the ONE larger title: **~49px** (`.section-features .section-title`)
- Feature titles (h3): 30px / Playfair 400 / white
- Testimonial names: **22px** / Playfair 400; officer names: **~19px**
- Legal prose: H1 ~44px (left-aligned), H2 ~40px, H3 ~25px (all left, not centered)
- Nav links: **15px** / Lato 400 / white; the "Apply Now" nav button: **14px / 700**
- Body paragraphs: 16px / Lato (the local 'Lato' @font-face actually loads the Lato-**Light** file
  `2hXz…woff2`, which is exactly what live calls "lato-light") / line-height 24px / letter-spacing 0.5px / **#000**

**Content column / side spacing** — live uses a FLUID column **~91.4% of viewport, capped at 1600px**
(≈4.5% gutter each side), NOT a fixed 1200px. CSS: `--maxw:1600px` + `--colw:91.4%`;
`.container`, `.header-top`, and `.hero-inner` all use `width:var(--colw);max-width:var(--maxw)` so the
header, hero, every section and the footer share ONE left edge. (Inner blocks keep their own caps —
`.features`1100 / `.program-list`940 / `.loan-cards`840 / `.prose`880 — to avoid over-stretch at 1600px.)

**Header (90px dark top row + 56px teal nav bar)**
- Top row: MyFy Premier logo (**height 55px** — matches live; the old "42px" was wrong) + a
  tan-gold (`#e5c69c`) "Powered by" label + the My Financing USA logo (constrained to a **106×37px**
  box like live, via `height:37px;width:106px` + `preserveAspectRatio` letterboxing — NOT a wider auto width).
- Teal nav bar `#3e7e7b` with a **4px `#c8a168` bottom border**; links Home / Yacht Financing /
  Contact Us (current page underlined) on the left, white **Apply Now** button on the right.
- ≤750px: teal nav hidden, a gold hamburger (top-right) opens a full-screen overlay menu.

**"Features That Set Us Apart" section** (this was wrong twice — get it right)
- Background: `#183131` + the **Watermark.png** image (`assets/img/25a1a4_de9ba1f456934feca2c9226460e36bcc~mv2.png`), `center/cover`.
- Three **stacked rows** (class `.section-features` + `.features`/`.feature`): each row =
  **gold icon + Playfair title on the LEFT**, **white Lato description on the RIGHT**, with a
  thin divider line between rows. (NOT a 3-across grid, NOT icon-above-title.)

**Footer (dark, 3 columns — ALL text in tan-gold `#e5c69c`, matching live)**: page links |
address + Trustpilot | MyFy logo + "Powered by My Financing USA". No column headings (live has none).
Bottom band = two disclaimers on the LEFT (hard-credit-inquiry + the APR/rate disclaimer) and the
`© 2026 …` copyright RIGHT-aligned.

**Feature icons** are clean hand-drawn line SVGs (anchor / ship / star-burst) — APPROXIMATIONS,
not the exact Wix icons. Open item if pixel-exact icons are wanted (pull from live site).

---

## 5. Page-by-page content

**Home (`index.html`)**
- Hero: background **video** (`assets/video/hero.mp4`, autoplay muted loop, poster = the yacht
  image `25a1a4_033a51e72da24d00a88b202e181a2b8cf000.jpg`). Title "Where Luxury Finance Meets
  Legacy" / sub "For Those Who Sail Beyond Limits" / button "Apply in 5 Minutes".
- "Welcome to MyFy Premier" (uses `.section-title.sm`) + intro paragraph + "Apply Now" button.
- "Features That Set Us Apart" (the dark watermark section, 3 rows).
- "Testimonials": Jacob P., Michael P., James B.

**Yacht Financing (`yacht-financing.html`)** — not on the live site; content from old capture.
- Hero IMAGE `assets/img/3f98ec_da363670373d49b0b53ce1e48b00a472~mv2.jpeg`, title "Yacht Financing".
- Features (same dark section).
- "The MyFy Premier Experience" (dark) + "Connect With Us" → contact.
- "Our Program" — 6 bullets: Terms up to 20 years; Financing up to $25mm; Rates between
  5.99% and 19.95%; Private Party and Dealer Purchases; LLC, Trusts and Foreign Flagged;
  Full Timers. + "Apply in 5 Minutes" + note "Please call us to ask about our 3 and 5 year ARM programs."
- "Fixed Rate Boat Loans" — TWO cards (**confirm these figures with the client**):
  - $250,000 plus — APR 5.99%* — 240 months max $7.16 / $1,000; 180 months max $8.43 / $1,000
  - $100,000–$249,999 — APR 6.24%* — 240 months max $7.30 / $1,000; 180 months max $8.57 / $1,000
- "Our Process is Easy": 1 Apply Online · 2 We Find Your Match · 3 Sign & Sail.
- "Testimonials": Rufus, Gary L., Freddie S.
- "A Company You Can Trust": 4 badge logos — NMLA `3f98ec_884179874ed146f080f5c576f510717a~mv2.png`,
  Trustpilot `3f98ec_faed0a99bc0d4349a81061ea2874bfe3~mv2.png`, MRAA `3f98ec_49a79ad774c848e2bbdf4a843a21ae4d~mv2.png`,
  BBB `3f98ec_1e853e3e84b14aa6943435c383857df7~mv2.png`. + "Connect with an Officer" → contact.

**Contact (`contact-us.html`)**
- Dark band "Your Journey to the Exceptional Starts Here".
- "Our Officers" + intro. Main line **502-498-4212 ext 1000**. Four officers (photo / name / role / phone / email):
  - Derek Robertson — Marine Finance Director — 502-498-4128 ex. 864 — Derek@MyFyUSA.com — `25a1a4_ede013f4c14c415b8b76c0283cf33957~mv2.jpg`
  - Diane Bloodsworth — Executive Finance Officer — 502-515-8740 ex. 869 — Diane@MyFyUSA.com — `25a1a4_d68eb90a119f4923b6794f4a066edf65~mv2.jpg`
  - Michael Doss — Executive Finance Officer — 502-413-2836 ext. 860 — Mike@MyFyUSA.com — `25a1a4_c994c7cae7c44a808a26684d15d1f4e4~mv2.jpg`
  - Kristy Deboer — Executive Finance Officer — 502-413-2834 ex. 849 — KristyD@MyFyUSA.com — `25a1a4_fd96de31b2c44067acf5b738c2197da3~mv2.jpg`
- "Connect with a Premier Officer": intro text + the contact form.

**Privacy (`privacy-policy.html`) / Terms (`terms-and-conditions.html`)**
- Long legal text rendered as `.prose`. It was auto-sanitized from the old Wix capture's
  `<main>`. **Note: the legal text references the legal entity "Bailey Carrier Capital"
  (dba My Financing USA / RV Financing USA / Boat Financing USA). Should be proofread by the client.**

---

## 6. Contact form (FormSubmit)

The form posts to **FormSubmit** (no backend). In `_src/pages/contact-us.content.html`:
- `action="https://formsubmit.co/Morgan@myfyusa.com"`, `method="POST"`
- Hidden: `_subject="New contact form submission - MyFy Premier"`, `_cc="derek@myfyusa.com"`,
  `_template="table"`, plus a `_honey` honeypot.
- Visible fields (name attrs): `First Name`, `Last Name`, `Phone`, `email`, `Message`.
- **ACTION REQUIRED BY CLIENT:** FormSubmit needs a one-time activation — the first real
  submission triggers a confirmation email to **Morgan@myfyusa.com** that must be clicked
  before any submissions are delivered. (Note: "Morgan" was a typo-fix of the user's original
  "Mogran"; recipients confirmed as Morgan@myfyusa.com + cc derek@myfyusa.com.)

---

## 7. External links (intentional click-throughs — these are NOT Wix calls)
- "Apply Now" / "Apply in 5 Minutes" / "digital application" → `https://www.myfy.us/premier`
- "See our reviews on Trustpilot" → `https://www.trustpilot.com/review/myfinancingusa.com`
- These only fire on user click. Page LOADS make zero external calls (verified).

---

## 8. Environment & tooling gotchas (Windows)
- **No Node. No real Python** (only a Microsoft Store stub). Use **PowerShell + headless Chrome**.
- Chrome path: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- **Screenshots / responsive testing:** use `--headless=new` (old `--headless` does NOT honor
  `--window-size` as the CSS viewport, so media queries won't apply). Use a fresh
  `--user-data-dir` per run. Add `--autoplay-policy=no-user-gesture-required` to capture the
  hero video. Example:
  `& chrome --headless=new --user-data-dir=$env:TEMP\x1 --window-size=1440,3000 --screenshot=out.png "file:///C:/.../index.html"`
- The "Claude in Chrome" browser extension **cannot open `file://`** and its viewport is
  effectively stuck (~1718px; resize is ineffective). Test responsive behavior via headless
  Chrome at a chosen `--window-size`, or against the live site.
- `file://` **fetch is blocked (CORS)** — so the site can't fetch-include the header at runtime;
  that's why the header/footer are baked into every page by `build.ps1`.
- Git: commit messages end with the Co-Authored-By trailer. Files show LF→CRLF warnings (benign).

---

## 9. Verification checklist (do this against the LIVE site, per element)

> **Measurement tooling (added during the fidelity pass).** The "Claude in Chrome" extension
> BLOCKS reading any JS-eval output from the live Wix site (cookies), so computed styles were
> captured with **headless Chrome driven over the DevTools Protocol** from PowerShell:
> - `_build/audit-styles.js` — the audit expression (drills to text leaves; returns JSON of
>   headings, nav, buttons, body, footer band with font/size/weight/lh/ls/color).
> - `_build/compare.ps1 -Bases home,contact,…` — diffs `_build/_audit/live-*.json` vs `loc-*.json`
>   and flags `*SIZE/*COLOR/*WT`. (`*FONT(playfair-display-v2/Playfair Display)` is a false positive
>   — same font, different internal name; ignore it.)
> - Capture pattern: launch `chrome --headless=new --remote-debugging-port=PORT --user-data-dir=<fresh>`,
>   poll `http://127.0.0.1:PORT/json` for the page target's `webSocketDebuggerUrl`, connect via
>   `System.Net.WebSockets.ClientWebSocket`, `Runtime.evaluate{returnByValue:true}`. Run this INLINE
>   in the pwsh-7 tool (the `_build/_audit/*.json` outputs are gitignored). GOTCHAS: `powershell -File`
>   is Windows PowerShell **5.1** (no `if`-as-expression / `??`, mangles UTF-8) — use `pwsh`. The local
>   single-threaded `serve.ps1` can still be streaming the 8 MB hero video when you navigate on, so a
>   later page may be measured before `site.css` loads — add a warmup that waits for `body` font-family
>   to be Lato before auditing.
> - **Mobile screenshot gotcha:** on this machine headless `--screenshot`/`--window-size` can't render a
>   CSS viewport below ~484px (OS display scaling + Chrome's min window width), so a "390px" `--screenshot`
>   actually lays out at ~484px and the 390-wide image canvas clips the right edge (looks like a fake
>   overflow/clip bug). For TRUE phone widths use CDP `Emulation.setDeviceMetricsOverride` then
>   `Page.captureScreenshot`; overflow/computed-style checks via forced device metrics are accurate.

1. Build (`build.ps1`), serve (`serve.ps1`), hard-refresh.
2. For each element type (hero, each section title, h3, body, nav, buttons, footer): compare
   **computed** font-family / size / weight / line-height / letter-spacing / color against the
   same element on `https://www.myfypremier.com/`. They should match within ~1px.
3. Compare section layouts and spacing (esp. the Features rows) at high zoom.
4. Confirm zero network requests leave `localhost` on page load (only the form POST + the
   click-through links above are allowed to be external).
5. Check mobile at `--window-size=390,*`: hamburger opens overlay; layout stacks; no oversized text.

## 10. Known open items / things to confirm
- Feature icons are approximations (pull exact SVGs from live if pixel-match required).
- Yacht loan-rate numbers — confirm with client.
- Privacy/Terms legal text ("Bailey Carrier Capital") — proofread with client. NOTE: the footer
  now also carries the live APR/rate disclaimer, which adds another "Bailey Carrier Capital dba
  My Financing USA" reference and the "6.24% to 19.95%" rate range — include in that proofing.
- **Fidelity pass (this round), verified by measuring live computed styles element-by-element:**
  corrected standard section titles 54→40px; Features title →49px; nav links 18→15px; Apply
  button 14px/700; testimonial names 24→22px; officer names →19px; legal prose H1/H2/H3 →
  44/40/25px left-aligned; body →#000 / 0.5px; **rebuilt the footer to live's all-gold scheme**
  (gold text, no column headings, disclaimers-left + copyright-right, added the APR disclaimer).
- Two INTENTIONAL deviations from a literal live match (both judgment calls, flag if client objects):
  (1) headings use brand teal `#183131`, live uses pure `#000` on most headings — visually
  indistinguishable, and live is itself inconsistent (its home "Welcome" is `#183131`).
  (2) Terms H1 normalized to 44px to match the Privacy H1; live's Terms H1 is an inconsistent 64px.
- Still verify against the LIVE site rather than assuming a match (live uses fluid type scaling,
  so px shift slightly with viewport width — these targets are measured at ~1440px desktop).
- Hosting/deploy target is unknown (site currently lives locally). `sitemap.xml` uses
  `https://www.myfypremier.com` canonical URLs.
