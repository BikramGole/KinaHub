# Dukan Dev Launcher (PowerShell)
# Usage: ./start.ps1 [-Offline] [-NoBrowser] [-ResetApiKey]
param(
    [switch]$Offline,
    [switch]$NoBrowser,
    [switch]$ResetApiKey
)

$ErrorActionPreference = "SilentlyContinue"

# --- ANSI Colors (requires Windows 10+) ---
$ESC = [char]27
function Green($t)  { "$ESC[0;32m$t$ESC[0m" }
function Cyan($t)   { "$ESC[0;36m$t$ESC[0m" }
function Yellow($t) { "$ESC[1;33m$t$ESC[0m" }
function Red($t)    { "$ESC[0;31m$t$ESC[0m" }
function Dim($t)    { "$ESC[2m$t$ESC[0m" }
function Bold($t)   { "$ESC[1m$t$ESC[0m" }

# Enable ANSI on Windows
if ($PSVersionTable.PSVersion.Major -ge 7) {
    $null = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} else {
    $null = New-ItemProperty -Path "HKCU:\Console" -Name "VirtualTerminalLevel" -Value 1 -PropertyType DWORD -Force 2>$null
}

# --- Setup ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
New-Item -ItemType Directory -Path "logs" -Force | Out-Null

$BackendPort  = 8000
$FrontendPort = 5173
$EnvFile      = "frontend\.env.local"
$StartTime    = Get-Date

# --- UI Header ---
Clear-Host
Write-Host (Cyan "┌─────────────────────────────────────────────┐")
Write-Host (Cyan "│                 $(Bold 'DUKAN DEV')                   │")
Write-Host (Cyan "│ $(Dim 'Student-built ecommerce platform 🇳🇵')         │")
Write-Host (Cyan "└─────────────────────────────────────────────┘")
Write-Host ""

# --- Kill Stale Processes ---
function Kill-Port($Port, $Name) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $proc.Id -Force
            Write-Host (Dim "  Killed stale $Name process on port $Port")
        }
    }
}
Kill-Port $BackendPort  "Backend"
Kill-Port $FrontendPort "Frontend"

# --- AI Configuration ---
Write-Host "🤖 $(Bold 'AI Configuration')"
Write-Host (Dim "─────────────────────────────────────────────")

$CurrentKey = ""
if (Test-Path $EnvFile) {
    $CurrentKey = (Get-Content $EnvFile | Where-Object { $_ -match "VITE_OPENROUTER_API_KEY=" } | ForEach-Object { $_ -replace "VITE_OPENROUTER_API_KEY=", "" }) -join ""
}

$AiStatus = "OFFLINE"

if ($Offline) {
    Write-Host "API Key: $(Dim 'Skipped (--Offline)')"
    Set-Content $EnvFile "VITE_OPENROUTER_API_KEY="
    Write-Host (Green "✓ Offline mode configured")
    Write-Host ""
} elseif ($ResetApiKey -or [string]::IsNullOrWhiteSpace($CurrentKey)) {
    Write-Host (Dim "OpenRouter API Key (optional)")
    Write-Host (Dim "Press Enter for offline mode")
    $NewKey = Read-Host "API Key"
    if ([string]::IsNullOrWhiteSpace($NewKey)) {
        Set-Content $EnvFile "VITE_OPENROUTER_API_KEY="
        Write-Host (Green "✓ Configuration saved (Offline)")
        Write-Host ""
    } else {
        Set-Content $EnvFile "VITE_OPENROUTER_API_KEY=$NewKey"
        Write-Host (Green "✓ Configuration saved")
        Write-Host ""
        $AiStatus = "OPENROUTER"
    }
} else {
    $MaskedKey = $CurrentKey.Substring(0, [Math]::Min(16, $CurrentKey.Length)) + "••••••••••••••••"
    Write-Host "API Key: $(Cyan $MaskedKey)"
    Write-Host (Green "✓ Configuration loaded from .env.local")
    Write-Host ""
    $AiStatus = "OPENROUTER"
}

# --- Start Services ---
Write-Host "🚀 $(Bold 'Starting Services')"
Write-Host (Dim "─────────────────────────────────────────────")
Write-Host ""

# [1/2] Backend
Write-Host "$(Bold '[1/2] Backend (Django)')"
$BackendLog = "$ScriptDir\logs\backend.log"
$BackendJob = Start-Job -ScriptBlock {
    param($Dir, $Log)
    Set-Location "$Dir\backend"
    & cmd /c "call venv\Scripts\activate.bat && python manage.py runserver 2>&1" | Out-File -FilePath $Log -Encoding utf8
} -ArgumentList $ScriptDir, $BackendLog

Start-Sleep -Seconds 2
if ($BackendJob.State -eq "Running") {
    Write-Host (Green "✓ Running on http://127.0.0.1:$BackendPort")
    Write-Host ""
    $BackendStatus = "ONLINE"
} else {
    Write-Host (Red "✗ Failed to start")
    Write-Host (Dim "  See logs\backend.log")
    Write-Host ""
    $BackendStatus = "FAILED"
}

# [2/2] Frontend
Write-Host "$(Bold '[2/2] Frontend (Vite)')"
$FrontendLog = "$ScriptDir\logs\frontend.log"
$FrontendJob = Start-Job -ScriptBlock {
    param($Dir, $Log)
    Set-Location "$Dir\frontend"
    & cmd /c "npm install 2>&1 && npm run dev 2>&1" | Out-File -FilePath $Log -Encoding utf8
} -ArgumentList $ScriptDir, $FrontendLog

Start-Sleep -Seconds 3
if ($FrontendJob.State -eq "Running") {
    Write-Host (Green "✓ Running on http://localhost:$FrontendPort")
    Write-Host ""
    $FrontendStatus = "ONLINE"
} else {
    Write-Host (Red "✗ Failed to start")
    Write-Host (Dim "  See logs\frontend.log")
    Write-Host ""
    $FrontendStatus = "FAILED"
}

# --- Open Browser ---
if (-not $NoBrowser -and $FrontendStatus -eq "ONLINE") {
    Write-Host "🌐 $(Bold 'Opening browser...')"
    Start-Process "http://localhost:$FrontendPort"
    Write-Host (Green "✓ Browser opened")
    Write-Host ""
}

# --- Elapsed Time ---
$Elapsed = ((Get-Date) - $StartTime).TotalSeconds
$ElapsedStr = [Math]::Round($Elapsed, 1)

# --- Final Summary Dashboard ---
Write-Host (Dim "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
Write-Host "✅ $(Bold 'Dukan is ready!')"
Write-Host ""
$BackendDot  = if ($BackendStatus  -eq "ONLINE") { Green  "ONLINE" } else { Red "FAILED" }
$FrontendDot = if ($FrontendStatus -eq "ONLINE") { Green  "ONLINE" } else { Red "FAILED" }
$AiDot       = if ($AiStatus       -eq "OFFLINE") { Yellow "OFFLINE" } else { Cyan "OPENROUTER" }
Write-Host "Backend  ● $BackendDot"
Write-Host "Frontend ● $FrontendDot"
Write-Host "AI       ● $AiDot"
Write-Host ""
Write-Host "Frontend: $(Cyan "http://localhost:$FrontendPort")"
Write-Host "Backend : $(Cyan "http://127.0.0.1:$BackendPort")"
Write-Host ""
Write-Host (Dim "Started in ${ElapsedStr}s")
Write-Host ""
Write-Host (Dim "Press Ctrl+C to stop all services.")
Write-Host (Dim "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

# --- Wait and Cleanup ---
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host (Yellow "Stopping services...")
    Stop-Job  $BackendJob,  $FrontendJob -ErrorAction SilentlyContinue
    Remove-Job $BackendJob, $FrontendJob -Force -ErrorAction SilentlyContinue
    Write-Host (Green "✓ Dukan stopped cleanly.")
}
