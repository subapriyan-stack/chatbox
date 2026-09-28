# PowerShell Lightweight HTTP Server for ChatGPT UI
param(
    [int]$Port = 8080
)

$HostIP = "127.0.0.1"
$Url = "http://${HostIP}:${Port}/"
$Folder = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting ChatGPT UI Local Web Server" -ForegroundColor Green
Write-Host "  URL: $Url" -ForegroundColor Yellow
Write-Host "  Folder: $Folder" -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Url)

try {
    $Listener.Start()
} catch {
    Write-Host "Error starting listener: $_" -ForegroundColor Red
    exit 1
}

# Open default browser
Start-Process $Url

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $LocalPath = $Request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($LocalPath) -or $LocalPath -eq "/") {
            $LocalPath = "index.html"
        }

        $FilePath = Join-Path $Folder $LocalPath

        if (Test-Path $FilePath -PathType Leaf) {
            $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
            
            # Content Types
            $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $ContentType = switch ($Ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                default { "application/octet-stream" }
            }

            $Response.ContentType = $ContentType
            $Response.ContentLength64 = $Bytes.Length
            $Response.Headers.Add("Access-Control-Allow-Origin", "*")
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Response.StatusCode = 404
            $NotFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $Response.OutputStream.Write($NotFound, 0, $NotFound.Length)
        }
        $Response.Close()
    } catch {
        # Catch cancellation or client disconnect
    }
}
