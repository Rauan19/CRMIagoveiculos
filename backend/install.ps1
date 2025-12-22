# Script de instalação para Windows
Write-Host "Instalando dependências..." -ForegroundColor Green

# Limpar cache e node_modules
if (Test-Path "node_modules") {
    Write-Host "Removendo node_modules antigo..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules
}

if (Test-Path "package-lock.json") {
    Remove-Item package-lock.json
}

# Instalar dependências básicas primeiro (sem Prisma)
Write-Host "Instalando dependências básicas..." -ForegroundColor Green
npm install express cors dotenv bcryptjs jsonwebtoken pdf-lib --save
npm install nodemon --save-dev

# Instalar Prisma separadamente
Write-Host "Instalando Prisma..." -ForegroundColor Green
npm install prisma @prisma/client --save

# Gerar Prisma Client
Write-Host "Gerando Prisma Client..." -ForegroundColor Green
npx prisma generate

Write-Host "Instalação concluída!" -ForegroundColor Green
Write-Host "Execute 'npx prisma migrate dev' para configurar o banco de dados" -ForegroundColor Yellow


