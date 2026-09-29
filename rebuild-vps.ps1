# ==============================================================================
# SCRIPT REBUILD & DEPLOY NHANH LEN VPS CHO CUOC THI QUIZ
# ==============================================================================
# Cach dung tu may tinh Windows:
#   .\rebuild-vps.ps1
#
# Script se:
#   1. Doc thong tin VPS_HOST, VPS_USER, VPS_PASS tu file .env
#   2. Tu dong ket noi SSH len VPS (tu dong nhap pass neu co VPS_PASS)
#   3. Pull code moi nhat tu GitHub
#   4. Chay 'docker compose up -d --build'
#   5. Hien thi trang thai cac container dang chay
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$rootDir = $PSScriptRoot
$envFile = Join-Path $rootDir ".env"

if (-not (Test-Path $envFile)) {
    Write-Error "Khong tim thay file .env tai: $envFile"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  HE THONG THI QUIZ - REBUILD & DEPLOY LEN VPS AUTOMATION " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Doc bien moi truong tu file .env
$envMap = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*[^#\s].*=' } | ForEach-Object {
    $tokens = $_ -split '=', 2
    if ($tokens.Count -eq 2) {
        $envMap[$tokens[0].Trim()] = $tokens[1].Trim()
    }
}

$vpsHost = if ($envMap.ContainsKey("VPS_HOST")) { $envMap["VPS_HOST"] } else { "14.225.212.138" }
$vpsPort = if ($envMap.ContainsKey("VPS_PORT")) { $envMap["VPS_PORT"] } else { "22" }
$vpsUser = if ($envMap.ContainsKey("VPS_USER")) { $envMap["VPS_USER"] } else { "root" }
$vpsPass = if ($envMap.ContainsKey("VPS_PASS")) { $envMap["VPS_PASS"] } else { "" }
$vpsDir  = if ($envMap.ContainsKey("VPS_DIR"))  { $envMap["VPS_DIR"] }  else { "/root/online-quiz" }

Write-Host "[1/3] Ket noi den VPS: " -NoNewline -ForegroundColor White
Write-Host "$vpsUser@$vpsHost (Port $vpsPort) - Thu muc: $vpsDir" -ForegroundColor Green

# 2. Cau lenh remote chay tren VPS
$remoteCmd = @"
cd $vpsDir && \
echo '---------------------------------------------------------' && \
echo '===> [1/3] Kéo mã nguồn mới nhất từ GitHub...' && \
git pull origin main && \
echo '===> [2/3] Build và khởi động lại toàn bộ containers...' && \
docker compose up -d --build && \
echo '===> [3/3] Trạng thái các container đang hoạt động:' && \
docker compose ps && \
echo '---------------------------------------------------------' && \
echo 'REBUILD THANH CONG! He thong da san sang.'
"@

# 3. Thiet lap AskPass de tu dong truyen mat khau (neu co VPS_PASS)
$askpassFile = $null
$oldAskpass = $env:SSH_ASKPASS
$oldRequire = $env:SSH_ASKPASS_REQUIRE
$oldDisplay = $env:DISPLAY

try {
    if (-not [string]::IsNullOrWhiteSpace($vpsPass) -and $vpsPass -ne "dien_mat_khau_vps_o_day") {
        $askpassFile = Join-Path $env:TEMP ("ssh_askpass_" + [System.Guid]::NewGuid().ToString("N") + ".bat")
        $batContent = "@echo off`r`necho $vpsPass`r`n"
        [System.IO.File]::WriteAllText($askpassFile, $batContent, [System.Text.Encoding]::ASCII)

        $env:SSH_ASKPASS = $askpassFile
        $env:SSH_ASKPASS_REQUIRE = "force"
        $env:DISPLAY = "dummy:0"
        Write-Host "[2/3] Su dung mat khau tu file .env de dang nhap tu dong..." -ForegroundColor Cyan
    } else {
        Write-Host "[2/3] Dang nhap bang SSH Key hoac nhap mat khau truc tiep..." -ForegroundColor Yellow
    }

    Write-Host "[3/3] Dang thuc thi rebuild tren VPS..." -ForegroundColor White
    ssh.exe -p $vpsPort -o StrictHostKeyChecking=no "$vpsUser@$vpsHost" "$remoteCmd"

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  DEPLOY HOAN TAT THANH CONG!                             " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  - IP VPS:    http://$vpsHost/" -ForegroundColor Yellow
    Write-Host "  - Domain:    http://btdcsgioinghean.com/" -ForegroundColor Yellow
    Write-Host "  - Admin:     http://btdcsgioinghean.com/admin/login" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Error "Co loi xay ra trong qua trinh rebuild tren VPS: $_"
    exit 1
}
finally {
    if ($askpassFile -and (Test-Path $askpassFile)) {
        Remove-Item -Force $askpassFile -ErrorAction SilentlyContinue
    }
    $env:SSH_ASKPASS = $oldAskpass
    $env:SSH_ASKPASS_REQUIRE = $oldRequire
    $env:DISPLAY = $oldDisplay
}
