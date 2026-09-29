# Ensure Java is in PATH
if ($env:JAVA_HOME -and -not (Get-Command java -ErrorAction SilentlyContinue)) {
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
}

# Load .env from root directory into current process environment
$envFilePath = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFilePath) {
    Write-Host "Loading environment variables from $envFilePath..." -ForegroundColor Cyan
    Get-Content $envFilePath | Where-Object { $_ -match '^\s*[^#\s].*=' } | ForEach-Object {
        $name, $val = $_ -split '=', 2
        Set-Item -Path "env:$($name.Trim())" -Value $val.Trim()
    }
} else {
    Write-Warning ".env file not found at $envFilePath"
}

Write-Host "Starting Spring Boot application..." -ForegroundColor Green
Push-Location $PSScriptRoot
try {
    & .\mvnw.cmd spring-boot:run
} finally {
    Pop-Location
}

