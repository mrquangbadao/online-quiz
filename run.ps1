# Script khoi dong ca Backend va Frontend tren 2 terminal rieng biet
$rootDir = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  KHOI DONG HE THONG (2 TERMINALS)      " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Write-Host "1. Mo cua so rieng cho Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$rootDir\run-be.ps1`""

Write-Host "2. Khoi dong Frontend tren terminal nay..." -ForegroundColor Green
& "$rootDir\run-fe.ps1"
