# Vuelta atrás: reboundstore.com.ar apunta otra vez a Netlify (como antes del cambio).
$ErrorActionPreference = "Stop"
$zone = 'e43dd9c454bdfd05a585f93022b24dcf'
$token = (Get-Content 'C:\ProyectosF\rebound\.cloudflare-token' -Raw).Trim()
$headers = @{ Authorization = "Bearer $token" }
function CF($method, $path, $body) {
  $r = Invoke-RestMethod -Method $method -Uri "https://api.cloudflare.com/client/v4/zones/$zone$path" -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json -Compress)
  if (-not $r.success) { throw "Cloudflare: $($r.errors | ConvertTo-Json -Compress)" }
  $r.result
}
foreach ($r in @(@{ id = '0892d9d758d69f427542f5c4b2da8d96'; name = 'reboundstore.com.ar' }, @{ id = '858333307e1ed76e96955e2ff903044d'; name = 'www.reboundstore.com.ar' })) {
  $res = CF PUT "/dns_records/$($r.id)" @{ type = 'CNAME'; name = $r.name; content = 'reboundstore.netlify.app'; proxied = $false; ttl = 1 }
  "  $($res.name) -> $($res.type) $($res.content)"
}
(CF PATCH '/settings/ssl' @{ value = 'full' }).value
Write-Host 'Volvió a Netlify.' -ForegroundColor Green
