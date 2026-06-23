param(
  [string[]]$Pages,                                  # e.g. index,contact-us
  [string]$RawDir  = "C:\Users\bturner_rvfinancingu\Documents\premier\site\_raw",
  [string]$DistDir = "C:\Users\bturner_rvfinancingu\Documents\premier\site"
)
$ErrorActionPreference = 'Stop'
$ua  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
$hdr = @{ 'User-Agent'=$ua; 'Referer'='https://www.myfypremier.com/' }

$IMG  = Join-Path $DistDir 'assets\img'
$FONT = Join-Path $DistDir 'assets\fonts'
New-Item -ItemType Directory -Force $IMG, $FONT | Out-Null

# internal nav link map (absolute + root-relative -> local file)
$nav = [ordered]@{
  'https://www.myfypremier.com/contact-us'           = 'contact-us.html'
  'https://www.myfypremier.com/privacy-policy'       = 'privacy-policy.html'
  'https://www.myfypremier.com/terms-and-conditions' = 'terms-and-conditions.html'
  'https://www.myfypremier.com/'                     = 'index.html'
  'https://www.myfypremier.com'                      = 'index.html'
}

$script:dlCache = @{}   # url -> $true once fetched
function Save-Asset([string]$url, [string]$destAbs) {
  if ($script:dlCache.ContainsKey($destAbs)) { return $true }
  if (Test-Path $destAbs) { $script:dlCache[$destAbs]=$true; return $true }
  try {
    Invoke-WebRequest -Uri $url -OutFile $destAbs -Headers $hdr -TimeoutSec 90 -UseBasicParsing
    $script:dlCache[$destAbs]=$true; return $true
  } catch {
    Write-Host "   ! download failed: $url  ($($_.Exception.Message))" -ForegroundColor Yellow
    return $false
  }
}

# ---- used font families (from live document.fonts) ----
$usedFontFamilies = @('lato-light','lato','playfair-display-v2')

foreach ($name in $Pages) {
  $rawPath = Join-Path $RawDir "$name.html"
  if (-not (Test-Path $rawPath)) { Write-Host "skip $name (no raw)" -ForegroundColor Yellow; continue }
  Write-Host "=== $name ===" -ForegroundColor Cyan
  $h = Get-Content -Raw $rawPath

  # 1) strip all scripts (Thunderbolt runtime + analytics + sentry) ----------
  $h = [regex]::Replace($h, '(?is)<script\b[^>]*>.*?</script>', '')
  $h = [regex]::Replace($h, '(?is)<script\b[^>]*/?>', '')
  # 2) strip resource-hint links that point off-box (preload/preconnect/etc) -
  $h = [regex]::Replace($h, '(?is)<link\b[^>]*\brel="(?:preload|prefetch|preconnect|dns-prefetch|modulepreload)"[^>]*>', '')
  # 2b) strip Google Tag Manager noscript tracking iframes (dead + external)
  $h = [regex]::Replace($h, '(?is)<iframe\b[^>]*googletagmanager[^>]*>.*?</iframe>', '')
  $h = [regex]::Replace($h, '(?is)<iframe\b[^>]*googletagmanager[^>]*/?>', '')
  # 2c) remove Wix background <video> (needs JS to play) - the poster image stays as the hero
  $h = [regex]::Replace($h, '(?is)<video\b[^>]*>.*?</video>', '')
  $h = [regex]::Replace($h, '(?is)<video\b[^>]*/?>', '')
  # 3) strip sourceMappingURL comments inside <style> (inert parastorage refs)
  $h = [regex]::Replace($h, '/\*#\s*sourceMappingURL=[^*]*\*/', '')

  # 4) FONTS: collect used-family woff2 urls -> download; rewrite ALL to local
  #    parse @font-face blocks to learn which urls belong to used families
  foreach ($ff in [regex]::Matches($h, '(?is)@font-face\s*\{(.*?)\}')) {
    $block = $ff.Groups[1].Value
    $fam = [regex]::Match($block, "font-family:\s*'?([^;'""]+)'?").Groups[1].Value.Trim().ToLower()
    if ($usedFontFamilies -contains $fam) {
      foreach ($um in [regex]::Matches($block, "url\(\s*['""]?((?:https?:)?//[^)'""\s]+\.woff2?)")) {
        $u = $um.Groups[1].Value
        $full = if ($u -like '//*') { 'https:' + $u } else { $u }
        $fn = ($full -split '[/?#]')[-1]
        Save-Asset $full (Join-Path $FONT $fn) | Out-Null
      }
    }
  }
  # rewrite EVERY parastorage font url (any path: /fonts/, /tag-bundler/.../fonts-cache/, ...) -> local
  $h = [regex]::Replace($h, "(?i)(https?:)?//static\.parastorage\.com/[^)'""\s]+?\.(woff2?)", {
    param($m) 'assets/fonts/' + (($m.Value -split '[/?#]')[-1])
  })

  # 4c) custom uploaded fonts: static.wixstatic.com/ufonts/<hash>/<fmt>/file.<ext>
  #     filenames collide ("file.woff2") across families -> name local by <hash>.<ext>
  $h = [regex]::Replace($h, "(?i)https://static\.wixstatic\.com/ufonts/([^/]+)/(?:ttf|woff2|woff)/[^)'""\s]+?\.(ttf|woff2|woff)", {
    param($m)
    $local = $m.Groups[1].Value + '.' + $m.Groups[2].Value
    Save-Asset $m.Value (Join-Path $FONT $local) | Out-Null
    'assets/fonts/' + $local
  })

  # 5) IMAGES: wixstatic /media/<base>/...  -> download ORIGINAL -> assets/img/<base>
  $h = [regex]::Replace($h, "(?i)https://static\.wixstatic\.com/media/([^/""'\s)]+)(?:/[^""'\s)]*)?", {
    param($m)
    $base = $m.Groups[1].Value -replace '%7[Ee]','~'   # normalize URL-encoded tilde to avoid dup files
    $orig = "https://static.wixstatic.com/media/$base"
    Save-Asset $orig (Join-Path $IMG $base) | Out-Null
    'assets/img/' + $base
  })
  # 6) SHAPES (favicon/svg vectors) + any other static.wixstatic path
  $h = [regex]::Replace($h, "(?i)https://static\.wixstatic\.com/(?:shapes|ficons)/([^/""'\s)]+)", {
    param($m)
    $fn = $m.Groups[1].Value
    Save-Asset "https://static.wixstatic.com/shapes/$fn" (Join-Path $IMG $fn) | Out-Null
    'assets/img/' + $fn
  })
  # 7) video.wixstatic.com refs: <video> already removed; remaining refs are inert JSON.
  #    Rewrite to a local path (not downloaded) so no wix host remains.
  $h = [regex]::Replace($h, "(?i)https://video\.wixstatic\.com/[^""'\s)]+", {
    param($m)
    $fn = ($m.Value -split '[/?#]')[-1]
    if ($fn) { 'assets/img/' + $fn } else { $m.Value }
  })

  # 7b) parastorage NON-font assets (e.g. language-selector flag PNGs) -> assets/img
  $h = [regex]::Replace($h, "(?i)https://static\.parastorage\.com/[^""'\s)]+?\.(png|jpe?g|gif|svg|webp)", {
    param($m)
    $fn = ($m.Value -split '[/?#]')[-1]
    Save-Asset $m.Value (Join-Path $IMG $fn) | Out-Null
    'assets/img/' + $fn
  })

  # 8) internal navigation links -> local html files
  foreach ($k in $nav.Keys) {
    $h = $h.Replace('"' + $k + '"', '"' + $nav[$k] + '"')
    $h = $h.Replace("'" + $k + "'", "'" + $nav[$k] + "'")
  }
  # root-relative internal paths
  $h = [regex]::Replace($h, 'href="/contact-us"', 'href="contact-us.html"')
  $h = [regex]::Replace($h, 'href="/privacy-policy"', 'href="privacy-policy.html"')
  $h = [regex]::Replace($h, 'href="/terms-and-conditions"', 'href="terms-and-conditions.html"')
  $h = [regex]::Replace($h, 'href="/"', 'href="index.html"')

  # 9) neutralize inert metadata attrs that still carry wix URLs (no network effect, just noise)
  $h = [regex]::Replace($h, '(?i)\s+data-[\w-]+="[^"]*(?:parastorage|wixstatic)[^"]*"', '')

  # 9b) load all images eagerly (no JS-driven lazy-load in a static page)
  $h = [regex]::Replace($h, '(?i)\s+loading="lazy"', '')

  # 10) reveal media backgrounds that Wix's (now-removed) JS would fade in.
  #     Scoped to media/background wrappers + bgVideoposter so menus/hover layers stay intact.
  $reveal = @'
<style id="static-snapshot-reveal">
  [data-motion-part^="BG_"]{opacity:1 !important;}
  .bgVideoposter{opacity:1 !important;visibility:visible !important;}
  wow-image,wix-bg-media,[data-motion-part^="BG_IMG"] img{opacity:1 !important;}
</style>
'@
  $h = $h -replace '(?i)</head>', ($reveal + '</head>')

  # 11) restore the hero background video as a native, JS-free autoplaying element (home only)
  if ($name -eq 'index') {
    $heroVideo = '<video class="static-hero-video" autoplay muted loop playsinline preload="auto" poster="assets/img/25a1a4_033a51e72da24d00a88b202e181a2b8cf000.jpg" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;border:0;"><source src="assets/video/hero.mp4" type="video/mp4"></video>'
    if ($h.Contains('</wow-image></wix-video>')) {
      $h = $h.Replace('</wow-image></wix-video>', '</wow-image>' + $heroVideo + '</wix-video>')
    }
  }

  # 12) wire the contact form to FormSubmit so a static page auto-emails submissions (contact page only)
  if ($name -eq 'contact-us') {
    $primaryEmail = 'Morgan@myfyusa.com'      # submissions are emailed here
    $ccEmail      = 'derek@myfyusa.com'       # and CC'd here
    # a) give the <form> a POST action to FormSubmit
    $h = [regex]::Replace($h, '(?is)(<form\b[^>]*?)>',
        ('${1} action="https://formsubmit.co/' + $primaryEmail + '" method="POST">'), 1)
    # b) FormSubmit config + recipients + honeypot, right after the <form> tag
    $hidden = '<input type="hidden" name="_subject" value="New contact form submission - MyFy Premier">' +
              '<input type="hidden" name="_cc" value="' + $ccEmail + '">' +
              '<input type="hidden" name="_template" value="table">' +
              '<input type="text" name="_honey" style="display:none !important" tabindex="-1" autocomplete="off">'
    $h = [regex]::Replace($h, '(?is)(<form\b[^>]*>)', ('${1}' + $hidden), 1)
    # c) give each field a name (FormSubmit uses these as the labels in the email)
    $fieldNames = [ordered]@{ 'First name'='First Name'; 'Last name'='Last Name'; 'Phone. Phone'='Phone'; 'Email'='email'; 'Message'='Message' }
    foreach ($al in $fieldNames.Keys) {
      $pat = '(?is)(<(?:input|textarea)\b)([^>]*aria-label="' + [regex]::Escape($al) + '")'
      $h = [regex]::Replace($h, $pat, ('${1} name="' + $fieldNames[$al] + '"${2}'), 1)
    }
    # d) make the styled submit button actually submit the form
    $h = [regex]::Replace($h, '(?is)(<button\b[^>]*data-hook="submit-button"[^>]*?)type="button"', '${1}type="submit"', 1)
  }

  # 13) add "Yacht Financing" to the desktop main menu and footer (left column) on every page.
  #     Runs AFTER step 8 (links already rewritten to index.html). Clones the existing Home
  #     item so the new item inherits each page's exact styling/classes.
  $yfHref = 'yacht-financing.html'; $yfLabel = 'Yacht Financing'
  # desktop horizontal menu: clone the Home <li>, insert the new item right after it
  $h = [regex]::Replace($h, '(?s)<li\b(?:(?!</li>).)*?data-part="menu-item-link"\s+href="index\.html"(?:(?!</li>).)*?</li>', {
    param($m)
    $item = $m.Value
    if ($item -match 'yacht-financing\.html') { return $item }       # idempotent
    $new = $item -replace 'href="index\.html"', ('href="' + $yfHref + '"')
    $new = $new -replace '\s*data-selected="true"', ''
    $new = $new -replace '\s*aria-current="page"', ''
    $new = $new -replace 'data-interactive="false"', 'data-interactive="true"'
    $new = [regex]::Replace($new, '(data-part="label"[^>]*>)Home(<)', ('${1}' + $yfLabel + '${2}'))
    # on the Yacht Financing page, mark its own menu item as the current page
    if ($name -eq 'yacht-financing') {
      $new = $new -replace 'data-part="menu-item-content"', 'data-selected="true" data-part="menu-item-content"'
      $new = $new -replace 'data-interactive="true"', 'data-interactive="false"'
      $new = [regex]::Replace($new, '(data-part="menu-item-link"[^>]*?)>', '${1} aria-current="page">')
    }
    $item + $new
  })
  # footer left column (rich-text links): clone the Home <p>, insert after it
  $h = [regex]::Replace($h, '(?s)<p[^>]*><a href="index\.html"[^>]*>Home</a></p>', {
    param($m)
    $item = $m.Value
    if ($item -match 'yacht-financing\.html') { return $item }
    $new = ($item -replace 'href="index\.html"', ('href="' + $yfHref + '"')) -replace '>Home</a>', ('>' + $yfLabel + '</a>')
    $item + $new
  })

  # 14) inject a self-contained mobile menu (Wix's JS-driven hamburger was stripped).
  #     Own button + overlay + tiny vanilla JS — no external calls. Shown only <=750px.
  $mmCss = '<style id="smm-style">
.wixui-hamburger-menu,[class*="HamburgerOpenButton"],[data-semantic-classname="hamburger-open-button"],[data-hook="hamburger-overlay-root"],[class*="HamburgerOverlay"],.wixui-hamburger-overlay{display:none!important}
#smm-btn{display:none}
#smm-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483646;background:#183131;display:none;flex-direction:column;align-items:center;justify-content:center;gap:30px}
#smm-overlay.open{display:flex}
#smm-overlay a{color:#fff;font-family:playfair-display-v2,serif;font-size:28px;text-decoration:none;letter-spacing:.4px}
#smm-overlay a:hover,#smm-overlay a:focus,#smm-overlay a[aria-current="page"]{color:#c9a877}
body.smm-open{overflow:hidden}
#smm-btn.open{background:#fff}
#smm-btn.open span{background:#183131}
#smm-btn.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
#smm-btn.open span:nth-child(2){opacity:0}
#smm-btn.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
@media screen and (max-width:750px){
#smm-btn{display:flex;position:fixed;top:16px;right:16px;z-index:2147483647;flex-direction:column;justify-content:center;gap:5px;width:44px;height:44px;background:#c9a877;border:0;border-radius:8px;cursor:pointer;padding:11px;box-shadow:0 2px 6px rgba(0,0,0,.35)}
#smm-btn span{display:block;height:2px;width:100%;background:#183131;border-radius:2px;transition:transform .25s ease,opacity .2s ease}
}
</style>'
  $h = $h.Replace('</head>', $mmCss + '</head>')

  $curHref = "$name.html"
  $mmItems = @(@('index.html','Home'), @('yacht-financing.html','Yacht Financing'), @('contact-us.html','Contact Us'))
  $linksHtml = ''
  foreach ($it in $mmItems) {
    $cur = if ($it[0] -eq $curHref) { ' aria-current="page"' } else { '' }
    $linksHtml += '<a href="' + $it[0] + '"' + $cur + '>' + $it[1] + '</a>'
  }
  $mmBody = '<button id="smm-btn" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
            '<div id="smm-overlay" role="dialog" aria-modal="true" aria-label="Site navigation">' + $linksHtml + '</div>' +
            '<script>(function(){var b=document.getElementById("smm-btn"),o=document.getElementById("smm-overlay");if(!b||!o)return;function set(open){o.classList.toggle("open",open);b.classList.toggle("open",open);document.body.classList.toggle("smm-open",open);b.setAttribute("aria-expanded",open?"true":"false");}b.addEventListener("click",function(){set(!o.classList.contains("open"));});o.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){set(false);});});document.addEventListener("keydown",function(e){if(e.key==="Escape")set(false);});})();</script>'
  $h = $h.Replace('</body>', $mmBody + '</body>')

  $outPath = Join-Path $DistDir "$name.html"
  $h | Out-File -Encoding utf8 $outPath

  # report leftover Wix auto-load refs
  $leftWix = ([regex]::Matches($h, '(?i)(src|srcset|href)="[^"]*(wixstatic|parastorage)')).Count
  $bgWix   = ([regex]::Matches($h, '(?i)url\([^)]*(wixstatic|parastorage)')).Count
  Write-Host ("   wrote {0}  ({1:N0} KB)  leftover-wix-loads: src/href={2} css-url={3}" -f $outPath, ((Get-Item $outPath).Length/1kb), $leftWix, $bgWix)
}
Write-Host "img files:  $((Get-ChildItem $IMG -File).Count)"
Write-Host "font files: $((Get-ChildItem $FONT -File).Count)"

# --- sitemap.xml: lists every page on the canonical domain (clean URLs, no .html) ---
$base = 'https://www.myfypremier.com'
$siteMapPages = [ordered]@{ '' = '1.0'; 'yacht-financing' = '0.9'; 'contact-us' = '0.8'; 'privacy-policy' = '0.5'; 'terms-and-conditions' = '0.5' }
$sm = @('<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
foreach ($slug in $siteMapPages.Keys) {
  $loc = if ($slug -eq '') { "$base/" } else { "$base/$slug" }
  $sm += "  <url><loc>$loc</loc><priority>$($siteMapPages[$slug])</priority></url>"
}
$sm += '</urlset>'
($sm -join "`n") | Out-File -Encoding utf8 (Join-Path $DistDir 'sitemap.xml')
Write-Host "sitemap.xml: $($siteMapPages.Count) urls"
