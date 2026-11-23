#Requires -Version 5.1
<#
Build the PySide6 desktop template with PyInstaller and optionally Inno Setup.

Usage from the project root:
  powershell -ExecutionPolicy Bypass -File packaging\build.ps1 -SkipInstaller
  powershell -ExecutionPolicy Bypass -File packaging\build.ps1 -Version 0.1.0
#>
[CmdletBinding()]
param(
    [string]$Version = "0.1.0",
    [string]$Py = "python",
    [string]$Iscc = "",
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
$env:PYTHONPYCACHEPREFIX = Join-Path $ProjectRoot ".pycache_root"
New-Item -ItemType Directory -Force -Path $env:PYTHONPYCACHEPREFIX | Out-Null

Write-Host "== [1/4] venv + dependencies =="
& $Py -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe -m pip install pyinstaller

Write-Host "== [2/4] PyInstaller onedir =="
& .\.venv\Scripts\pyinstaller.exe packaging\app.spec --noconfirm --clean
if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller failed with exit code $LASTEXITCODE"
}

if ($SkipInstaller) {
    Write-Host "== Done. Onedir output is under dist\ =="
    exit 0
}

Write-Host "== [3/4] Inno Setup installer =="
if ([string]::IsNullOrWhiteSpace($Iscc)) {
    $candidates = @(
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe"
    )
    $Iscc = ($candidates | Where-Object { Test-Path $_ } | Select-Object -First 1)
}
if (-not (Test-Path $Iscc)) {
    throw "Inno Setup ISCC.exe not found. Set -Iscc or install Inno Setup 6."
}
& $Iscc /DAPP_VERSION="$Version" packaging\installer.iss
if ($LASTEXITCODE -ne 0) {
    throw "Inno Setup failed with exit code $LASTEXITCODE"
}

Write-Host "== [4/4] Done. Installer is under dist\ =="
