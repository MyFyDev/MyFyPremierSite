# Assemble a clean, deploy-only copy of the site into <Root>\dist .
# Includes the 5 built HTML pages + sitemap.xml + ONLY the assets actually
# referenced by those pages and site.css (prunes unused fonts/images).
# Run after _build\build.ps1.  Usage:  pwsh -File _build\make-dist.ps1
param([string]$Root = "C:\Users\bturner_rvfinancingu\Documents\premier\site")
$ErrorActionPreference = 'Stop'
$dist = Join-Path $Root 'dist'
if (Test-Path $dist) { [System.IO.Directory]::Delete($dist, $true) }
New-Item -ItemType Directory -Force -Path $dist | Out-Null

$pages     = 'index.html','yacht-financing.html','contact-us.html','privacy-policy.html','terms-and-conditions.html'
$rootExtra = 'sitemap.xml'

# --- collect referenced asset paths ---
$refs = [System.Collections.Generic.HashSet[string]]::new()
foreach ($pg in $pages) {
  $html = Get-Content (Join-Path $Root $pg) -Raw
  foreach ($m in [regex]::Matches($html,'assets/[A-Za-z0-9_\-./~]+?\.(?:css|js|svg|png|jpe?g|webp|gif|ico|mp4|webm|woff2?|ttf)')) { [void]$refs.Add($m.Value) }
}
$css = Get-Content (Join-Path $Root 'assets/css/site.css') -Raw
foreach ($m in [regex]::Matches($css,'\.\./(?:fonts|img|css|js|video)/[A-Za-z0-9_\-./~]+?\.(?:woff2?|ttf|png|jpe?g|svg|webp|gif|mp4)')) { [void]$refs.Add(($m.Value -replace '^\.\./','assets/')) }
[void]$refs.Add('assets/css/site.css'); [void]$refs.Add('assets/js/site.js')

# --- copy pages + extras ---
foreach ($f in ($pages + $rootExtra)) { $s = Join-Path $Root $f; if (Test-Path $s) { Copy-Item $s (Join-Path $dist $f) } }

# --- copy only referenced assets, preserving relative paths ---
$missing = @()
foreach ($rel in $refs) {
  $relWin = $rel -replace '/','\'
  $src = Join-Path $Root $relWin
  if (Test-Path $src) { $dst = Join-Path $dist $relWin; New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null; Copy-Item $src $dst }
  else { $missing += $rel }
}

# --- report ---
$distFiles = Get-ChildItem $dist -Recurse -File
$srcAssets = Get-ChildItem (Join-Path $Root 'assets') -Recurse -File
Write-Host ("dist/: {0} files, {1:N2} MB total" -f $distFiles.Count, (($distFiles | Measure-Object Length -Sum).Sum/1MB))
Write-Host ("assets: {0} referenced / {1} in source  ->  {2} pruned" -f $refs.Count, $srcAssets.Count, ($srcAssets.Count - $refs.Count))
if ($missing.Count) { Write-Host ("MISSING (referenced but not found in source): " + ($missing -join ', ')) } else { Write-Host "OK: every referenced asset was found and copied." }
Write-Host "--- included assets ---"
$refs | Sort-Object | ForEach-Object { Write-Host "  $_" }
