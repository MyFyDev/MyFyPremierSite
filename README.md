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

All assets live under `assets/` (`assets/img`, `assets/fonts`). Internal links between
pages are rewritten to local files.

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
- **Contact form**: displays correctly but does not submit (the live form posts to Wix's
  backend, which no longer exists in this static copy).
- **Hero background video**: restored as a native autoplaying `<video>` (`assets/video/hero.mp4`), muted + looped so it plays offline with no scripts. The yacht still image is its poster/fallback.
- **Interactive bits** (mobile hamburger menu animation, scroll animations, slideshows)
  are static — content is shown in its final state.
- External click-through links (e.g. "Powered by", Trustpilot) still point to the live web.

## Rebuilding
`..\_build\localize.ps1` regenerates these pages from the rendered HTML in `..\_raw`.
