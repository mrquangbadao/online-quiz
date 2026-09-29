# Script khoi dong Backend (Spring Boot)
$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$envFilePath = Join-Path $rootDir ".env"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   KHOI DONG BACKEND (Spring Boot)      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Kiem tra va dam bao Java trong PATH
if ($env:JAVA_HOME -and -not (Get-Command java -ErrorAction SilentlyContinue)) {
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

# 2. Nap bien moi truong tu file .env
if (Test-Path $envFilePath) {
    Write-Host "Loading environment variables from $envFilePath..." -ForegroundColor Green
    Get-Content $envFilePath | Where-Object { $_ -match '^\s*[^#\s].*=' } | ForEach-Object {
        $name, $val = $_ -split '=', 2
        Set-Item -Path "env:$($name.Trim())" -Value $val.Trim()
    }
} else {
    Write-Warning ".env file not found at $envFilePath"
}

# 3. Chay Spring Boot qua Maven Wrapper
Set-Location $backendDir
Write-Host "Starting Spring Boot via Maven Wrapper..." -ForegroundColor Yellow
& .\mvnw.cmd spring-boot:run
