# Build the static MyFy Premier site from _src/ (template + page fragments).
# Output: <root>/*.html . Run after editing _src/ or assets/.
param([string]$Root = "C:\Users\bturner_rvfinancingu\Documents\premier\site")
$ErrorActionPreference = 'Stop'
$src = Join-Path $Root '_src'

$template   = Get-Content -LiteralPath (Join-Path $src 'template.html') -Raw
$logoMyfy   = Get-Content -LiteralPath (Join-Path $src 'partials\logo-myfy.svg') -Raw
$logoPow    = Get-Content -LiteralPath (Join-Path $src 'partials\logo-poweredby.svg') -Raw

# page key, output file, <title>, meta description, active nav (home|yacht|contact|'')
$pages = @(
  @{ key='index';                title='MyFy Premier | Luxury RV & Yacht Loans'; desc='Luxury Yacht and RV financing with concierge-level service and the best rates available.'; active='home' }
  @{ key='yacht-financing';      title='Yacht Financing | MyFy Premier';         desc='Fixed-rate boat loans up to $25mm, terms to 20 years. Private party, dealer, LLC, trusts and foreign-flagged.'; active='yacht' }
  @{ key='contact-us';           title='Contact Us | MyFy Premier';              desc='Connect with a MyFy Premier finance officer. Call 502-498-4212 ext 1000 or send us a message.'; active='contact' }
  @{ key='privacy-policy';       title='Privacy Policy | MyFy Premier';          desc='How MyFy Premier collects, uses, and protects your information.'; active='' }
  @{ key='terms-and-conditions'; title='Terms and Conditions | MyFy Premier';    desc='Terms and conditions of use for MyFy Premier.'; active='' }
)

foreach ($p in $pages) {
  $contentPath = Join-Path $src ("pages\" + $p.key + '.content.html')
  if (-not (Test-Path $contentPath)) { Write-Host "skip $($p.key) (no content yet)" -ForegroundColor Yellow; continue }
  $content = Get-Content -LiteralPath $contentPath -Raw

  $html = $template
  $html = $html.Replace('{{TITLE}}', $p.title)
  $html = $html.Replace('{{DESC}}',  $p.desc)
  $html = $html.Replace('{{CONTENT}}', $content)
  $html = $html.Replace('{{LOGO_MYFY}}', $logoMyfy)
  $html = $html.Replace('{{LOGO_POWERED}}', $logoPow)
  # active nav state
  $html = $html.Replace('{{ACT_HOME}}',    $(if($p.active -eq 'home'){'aria-current="page"'}else{''}))
  $html = $html.Replace('{{ACT_YACHT}}',   $(if($p.active -eq 'yacht'){'aria-current="page"'}else{''}))
  $html = $html.Replace('{{ACT_CONTACT}}', $(if($p.active -eq 'contact'){'aria-current="page"'}else{''}))

  $out = Join-Path $Root ($p.key + '.html')
  $html | Out-File -LiteralPath $out -Encoding utf8 -NoNewline
  Write-Host ("built {0}  ({1:N0} KB)" -f ($p.key + '.html'), ((Get-Item $out).Length/1kb))
}
Write-Host "done."
