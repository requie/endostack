# Install ttstack into the coding agents on this machine (Windows PowerShell).
# Usage: .\install.ps1 [--scope project|user] [--agents auto|<list>] [--link] [--dry-run] [--uninstall]
# Full option list: .\install.ps1 --help
# --link creates symlinks, which on Windows needs Developer Mode or an elevated shell.
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error 'ttstack install needs Node.js 22 or newer on PATH (https://nodejs.org).'
    exit 2
}
& node (Join-Path $PSScriptRoot 'scripts/install.mjs') @args
exit $LASTEXITCODE
