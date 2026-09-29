# Script khoi dong Frontend (Vite React)
$rootDir = $PSScriptRoot
$frontendDir = Join-Path $rootDir "frontend"

Write-Host "========================================" -ForegroundColor Green
Write-Host "     KHOI DONG FRONTEND (Vite React)    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Set-Location $frontendDir
Write-Host "Starting Vite Dev Server..." -ForegroundColor Yellow
npm run dev
