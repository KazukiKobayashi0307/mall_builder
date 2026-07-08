param([int]$Port = 8770, [string]$Root = 'C:\Users\81909\YumeMall')
$ErrorActionPreference = 'Stop'
$root = $Root
$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8';
  '.webmanifest'='application/manifest+json; charset=utf-8'; '.png'='image/png';
  '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.map'='application/json';
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "static server on http://localhost:$Port/  root=$root"
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $full = Join-Path $root $rel
    if (Test-Path -LiteralPath $full -PathType Container) { $full = Join-Path $full 'index.html' }
    if (Test-Path -LiteralPath $full -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ctx.Response.ContentType = $ct
      $ctx.Response.Headers.Add('Cache-Control','no-store')
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $rel")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch { }
}
