# Lance la validation dans un conteneur Docker depuis PowerShell (Windows).
# Seul prérequis : Docker Desktop. Contourne Smart App Control (go.exe n'est jamais lancé sur l'hôte)
# et l'absence de bash : tout s'exécute sous Linux dans le conteneur.
#
# Usage : .\scripts\docker-check.ps1                         check-all des exercices 00 à 10
#         .\scripts\docker-check.ps1 01 variations/01-alias  check-all sur des cibles choisies
#         .\scripts\docker-check.ps1 --variations 01         toutes les variantes 01-*
#         .\scripts\docker-check.ps1 --check 01              check.sh détaillé d'une cible
#         .\scripts\docker-check.ps1 --run pnpm test:lint    n'importe quelle commande
#         .\scripts\docker-check.ps1 --shell                 shell dans le conteneur
#   $env:DOCKER_REBUILD = "1" force la reconstruction de l'image.
#
# Si PowerShell refuse d'exécuter le script : powershell -ExecutionPolicy Bypass -File .\scripts\docker-check.ps1

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Image = "hackathon-duplojs-go:1"

docker info *> $null
if ($LASTEXITCODE -ne 0) {
	Write-Error "Docker n'est pas disponible : lancez Docker Desktop puis réessayez."
	exit 2
}

docker image inspect $Image *> $null
if ($env:DOCKER_REBUILD -eq "1" -or $LASTEXITCODE -ne 0) {
	Write-Host "Construction de l'image $Image (une seule fois)..."
	docker build -t $Image (Join-Path $Root "scripts/docker")
	if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$TtyArgs = @()
if (-not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected) {
	$TtyArgs = @("-it")
}

docker run --rm @TtyArgs `
	-v "${Root}:/work" `
	-v "hackathon-node-modules:/work/node_modules" `
	-v "hackathon-pnpm-store:/pnpm-store" `
	-v "hackathon-go-cache:/root/.cache/go-build" `
	-v "hackathon-go-mod:/go/pkg/mod" `
	$Image bash /work/scripts/docker/entrypoint.sh @args

exit $LASTEXITCODE
