# MyFy Premier — Static Site (clean rebuild)

A lightweight, hand-built static copy of the MyFy Premier site. All five pages share
**one base** (header, footer, stylesheet, scripts) and are fully responsive. No Wix, no
runtime dependencies, no external calls on page load.

## Pages
- `index.html` — Home
- `yacht-financing.html` — Yacht Financing
- `contact-us.html` — Contact Us (officers + working contact form)
- `privacy-policy.html` — Privacy Policy
- `terms-and-conditions.html` — Terms & Conditions

## How it's built (one shared base)
Pages are assembled from a shared template + per-page content, so the header/footer/nav
are defined **once**:

```
_src/template.html              # shell: <head>, header, nav, footer, {{placeholders}}
_src/partials/*.svg             # MyFy + "Powered by" logos (inlined at build)
_src/pages/<page>.content.html  # the unique content of each page
assets/css/site.css             # all shared styling + responsive rules
assets/js/site.js               # mobile menu toggle
assets/img, assets/fonts, assets/video   # local assets (no external CDNs)
```

**To make changes:**
- Header / footer / nav → edit `_src/template.html`
- Colors / fonts / layout → edit `assets/css/site.css`
- A page's content → edit `_src/pages/<page>.content.html`
- Then rebuild:

```powershell
powershell -File _build\build.ps1
```

This regenerates the five `*.html` files at the project root.

## Preview locally
```powershell
powershell -File _build\serve.ps1 -Port 8753
# open http://localhost:8753/
```
(You can also just open `index.html` directly in a browser.)

## Notes
- **Responsive:** desktop shows the teal nav bar; ≤750px shows a hamburger that opens a
  full-screen menu. Layout reflows cleanly at every width.
- **Contact form:** posts to FormSubmit (no backend needed), emailing submissions to
  Morgan@myfyusa.com and CC derek@myfyusa.com. Requires internet to send. **One-time
  activation:** the first submission triggers a confirmation email to Morgan@myfyusa.com
  that must be clicked before submissions are delivered.
- **External links (click-through only, not auto-loaded):** "Apply Now" → myfy.us/premier,
  Trustpilot review link, and the contact-form POST. Nothing else leaves the machine.

## Legacy
`_raw/` and `_build/localize.ps1` are the earlier Wix-export snapshot and its localizer,
kept only for reference. The clean rebuild above supersedes them.
