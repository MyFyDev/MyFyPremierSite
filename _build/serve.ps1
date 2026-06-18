param([int]$Port = 8753, [string]$Root = "C:\Users\bturner_rvfinancingu\Documents\premier\site")
$mime = @{
  '.html'='text/html';'.css'='text/css';'.js'='application/javascript';'.json'='application/json'
  '.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.png'='image/png';'.gif'='image/gif';'.svg'='image/svg+xml'
  '.webp'='image/webp';'.avif'='image/avif';'.mp4'='video/mp4';'.webm'='video/webm'
  '.woff'='font/woff';'.woff2'='font/woff2';'.ttf'='font/ttf';'.ico'='image/x-icon'
}
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "serving $Root at http://localhost:$Port/"
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request; $res = $ctx.Response
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
    $file = Join-Path $Root $path
    if (Test-Path -LiteralPath $file -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] }
      $res.Headers['Accept-Ranges'] = 'bytes'
      $fs = [System.IO.File]::OpenRead($file)
      try {
        $total = $fs.Length
        $rangeHeader = $req.Headers['Range']
        $start = 0; $len = $total
        if ($rangeHeader -match 'bytes=(\d*)-(\d*)') {
          $s = $matches[1]; $e = $matches[2]
          if ($s -ne '') { $start = [int64]$s }
          $end = if ($e -ne '') { [int64]$e } else { $total - 1 }
          if ($end -ge $total) { $end = $total - 1 }
          if ($start -gt $end) { $start = 0; $end = $total - 1 }
          $len = $end - $start + 1
          $res.StatusCode = 206
          $res.Headers['Content-Range'] = "bytes $start-$end/$total"
        }
        $res.ContentLength64 = $len
        $fs.Position = $start
        $buf = New-Object byte[] 65536
        $remaining = $len
        while ($remaining -gt 0) {
          $toRead = [Math]::Min($buf.Length, $remaining)
          $read = $fs.Read($buf, 0, $toRead)
          if ($read -le 0) { break }
          $res.OutputStream.Write($buf, 0, $read)
          $remaining -= $read
        }
      } finally { $fs.Close() }
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $path")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.OutputStream.Close()
  } catch { }
}
