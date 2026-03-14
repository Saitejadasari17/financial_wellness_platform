$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$composeFile = "infrastructure/docker/docker-compose.yml"

Write-Host "Stopping existing stack..."
docker compose -f $composeFile down --remove-orphans | Out-Host

Write-Host "Building images (COMPOSE_BAKE=false)..."
$env:COMPOSE_BAKE = "false"
docker compose -f $composeFile build | Out-Host

Write-Host "Starting services..."
docker compose -f $composeFile up -d | Out-Host

Write-Host "Reloading nginx to avoid stale upstream IPs after rebuild..."
docker compose -f $composeFile restart nginx | Out-Host

Write-Host "Service status:"
docker compose -f $composeFile ps | Out-Host

Write-Host "Health checks:"
try { (Invoke-WebRequest -UseBasicParsing http://localhost:8000/health).StatusCode | ForEach-Object { "user-service: $_" } | Out-Host } catch { "user-service: down" | Out-Host }
try { (Invoke-WebRequest -UseBasicParsing http://localhost:8001/health).StatusCode | ForEach-Object { "finance-service: $_" } | Out-Host } catch { "finance-service: down" | Out-Host }
try { (Invoke-WebRequest -UseBasicParsing http://localhost:8002/health).StatusCode | ForEach-Object { "ml-service: $_" } | Out-Host } catch { "ml-service: down" | Out-Host }
try { (Invoke-WebRequest -UseBasicParsing http://localhost:8003/health).StatusCode | ForEach-Object { "notification-service: $_" } | Out-Host } catch { "notification-service: down" | Out-Host }
try { (Invoke-WebRequest -UseBasicParsing http://localhost).StatusCode | ForEach-Object { "nginx entrypoint: $_" } | Out-Host } catch { "nginx entrypoint: down" | Out-Host }

Write-Host ""
Write-Host "Open: http://localhost"
