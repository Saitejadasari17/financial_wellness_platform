$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$sqlPath = "scripts/seed-ml-recommendations.sql"

if (!(Test-Path $sqlPath)) {
  throw "SQL seed file not found: $sqlPath"
}

Write-Host "Seeding ML recommendation data into Postgres..."
Get-Content $sqlPath | docker compose -f infrastructure/docker/docker-compose.yml exec -T postgres psql -U postgres -d financial_wellness | Out-Host

Write-Host ""
Write-Host "Done. Open: http://localhost/investments"
