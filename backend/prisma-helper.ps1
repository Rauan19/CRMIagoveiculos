# Helper script para executar comandos Prisma sem usar npx
param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

$prismaPath = Join-Path $PSScriptRoot "node_modules\prisma\build\index.js"

if (-not (Test-Path $prismaPath)) {
    Write-Host "Erro: Prisma não encontrado. Execute 'npm install' primeiro." -ForegroundColor Red
    exit 1
}

$args = $Command -split ' '

Write-Host "Executando: prisma $Command" -ForegroundColor Green
node $prismaPath $args


