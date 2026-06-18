param([int]$Port = 8753, [string]$Root = "C:\Users\bturner_rvfinancingu\Documents\premier\site\dist")
$mime = @{
  '.html'='text/html';'.css'='text/css';'.js'='application/javascript';'.json'='application/json'
  '.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.png'='image/png';'.gif'='image/gif';'.svg'='image/svg+xml'
  '.webp'='image/webp';'.avif'='image/avif';'.mp4'='video/mp4'
  '.woff'='font/woff';'.woff2'='font/woff2';'.ttf'='font/ttf';'.ico'='image/x-icon'
}
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "serving $Root at http://localhost:$Port/"
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
    $file = Join-Path $Root $path
    if (Test-Path $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $path")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch { }
}
