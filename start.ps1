# PresentPerfect – start script
# Detecteaza IP-ul curent, actualizeaza frontend/.env, porneste backend-ul

$envFile = Join-Path $PSScriptRoot "frontend\.env"

# Gaseste IP-ul activ (WiFi sau hotspot) - exclude loopback si link-local
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -eq 'Dhcp'
    } |
    Sort-Object InterfaceIndex |
    Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "ATENTIE: Nu s-a putut detecta un IP valid. Se incearca cu toate interfetele..." -ForegroundColor Yellow
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*'
        } |
        Sort-Object InterfaceIndex |
        Select-Object -First 1).IPAddress
}

if (-not $ip) {
    Write-Host "EROARE: Nu s-a gasit niciun IP de retea. Verifica conexiunea." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== PresentPerfect ===" -ForegroundColor Cyan
Write-Host "IP detectat: $ip" -ForegroundColor Green
Write-Host "Backend:     http://${ip}:4000/api" -ForegroundColor Green
Write-Host ""

# Actualizeaza frontend/.env
$newUrl = "EXPO_PUBLIC_API_BASE_URL=http://${ip}:4000/api"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    $updated = $content -replace 'EXPO_PUBLIC_API_BASE_URL=http://[^\r\n]+', $newUrl
    Set-Content $envFile $updated -Encoding utf8 -NoNewline
    Write-Host "frontend/.env actualizat cu noul IP." -ForegroundColor Green
} else {
    Set-Content $envFile $newUrl -Encoding utf8
    Write-Host "frontend/.env creat." -ForegroundColor Green
}

Write-Host ""
Write-Host "Pornesc backend-ul (CTRL+C pentru oprire)..." -ForegroundColor Cyan
Write-Host "Intr-un alt terminal, porneste frontend-ul cu: cd frontend && npx expo start" -ForegroundColor Yellow
Write-Host ""

Set-Location (Join-Path $PSScriptRoot "backend")
npm run dev
