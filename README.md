# MyFy Premier — Static Offline Site

A fully self-contained, static copy of **www.myfypremier.com**. It renders entirely
from local files and makes **no network calls back to Wix** (or Google/parastorage/etc.).

## Pages
- `index.html` — Home
- `contact-us.html` — Contact Us (Our Officers + contact form)
- `privacy-policy.html` — Privacy Policy
- `terms-and-conditions.html` — Terms & Conditions
- `yacht-financing.html` — Yacht Financing (sourced from the saved `blank.html`; this
  page is not currently published on the live site)

All assets live under `assets/` (`assets/img`, `assets/fonts`, `assets/video`). Internal
links between pages are rewritten to local files. `sitemap.xml` lists all pages (on the
canonical domain https://www.myfypremier.com).

"Yacht Financing" appears in the desktop main menu (after Home) and the footer's left
column on every page. (The Yacht Financing page came from an older capture whose Wix
header couldn't host the menu, so it gets a matching white header nav injected instead.)

## How to view
Just open `index.html` in a browser, or serve the folder over a local web server
(recommended so fonts/MIME behave exactly like a real site):

```powershell
# from this folder
powershell -File ..\_build\serve.ps1 -Port 8753
# then open http://localhost:8753/
```

## What was done
Each live page was rendered in a real browser (so Wix's JavaScript-computed layout is
baked into the HTML), then the Wix runtime scripts were removed and every external
asset (images, fonts, favicon) was downloaded locally and re-pointed to `assets/`.

## Known limitations (inherent to a static snapshot)
- **Contact form**: wired to email submissions via FormSubmit (a free no-signup
  form-to-email relay). Submissions go to Morgan@myfyusa.com and CC derek@myfyusa.com.
  Requires internet to send (it POSTs to https://formsubmit.co). **One-time activation:**
  the first time the form is submitted, FormSubmit emails a confirmation link to
  Morgan@myfyusa.com that must be clicked before any submissions are delivered.
- **Hero background video**: restored as a native autoplaying `<video>` (`assets/video/hero.mp4`), muted + looped so it plays offline with no scripts. The yacht still image is its poster/fallback.
- **Mobile menu**: replaced Wix's JS-driven hamburger (which was stripped) with a small,
  self-contained menu — a gold hamburger button (shown ≤750px) opens a full-screen
  overlay with Home / Yacht Financing / Contact Us and morphs into a close (X). Pure
  inline CSS+JS, no external calls. The current page is highlighted gold.
- **Mobile layout width**: the page inherits Wix's mobile layout, which has a ~480px
  minimum width (so very narrow phones may show a slight horizontal scroll). This is the
  original Wix behavior, not introduced by the static conversion.
- **Other interactive bits** (scroll animations, slideshows) are static — content is
  shown in its final state.
- External click-through links (e.g. "Powered by", Trustpilot) still point to the live web.

## Rebuilding
`..\_build\localize.ps1` regenerates these pages from the rendered HTML in `..\_raw`.
