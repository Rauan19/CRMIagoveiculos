# Script para gerar Prisma Client sem usar npx
Write-Host "Gerando Prisma Client..." -ForegroundColor Green

$prismaPath = Join-Path $PSScriptRoot "node_modules\prisma\build\index.js"

if (Test-Path $prismaPath) {
    Write-Host "Executando Prisma diretamente..." -ForegroundColor Yellow
    node $prismaPath generate
} else {
    Write-Host "Prisma não encontrado. Tentando instalar..." -ForegroundColor Red
    npm install prisma @prisma/client --save --ignore-scripts
    if (Test-Path $prismaPath) {
        node $prismaPath generate
    } else {
        Write-Host "Erro: Não foi possível encontrar o Prisma" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Prisma Client gerado com sucesso!" -ForegroundColor Green


