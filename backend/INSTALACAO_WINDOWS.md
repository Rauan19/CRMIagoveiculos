# 🔧 Instalação no Windows - Solução para Erro Prisma

Se você está tendo o erro `ENOENT spawn C:\Windows\system32\cmd.exe` ao instalar, siga estes passos:

## Solução 1: Instalação Manual (Recomendado)

### Passo 1: Instalar dependências básicas
```powershell
npm install express cors dotenv bcryptjs jsonwebtoken pdf-lib
npm install nodemon --save-dev
```

### Passo 2: Instalar Prisma separadamente
```powershell
npm install prisma @prisma/client --save
```

### Passo 3: Gerar Prisma Client
```powershell
npx prisma generate
```

### Passo 4: Configurar banco de dados
```powershell
npx prisma migrate dev --name init
```

## Solução 2: Usar Yarn (Alternativa)

Se o npm continuar dando problema, use o Yarn:

```powershell
# Instalar Yarn globalmente (se não tiver)
npm install -g yarn

# Instalar dependências
yarn install

# Gerar Prisma
yarn prisma generate

# Migrar banco
yarn prisma migrate dev
```

## Solução 3: Instalar sem scripts

```powershell
npm install --ignore-scripts
npx prisma generate
```

## Solução 4: Verificar PATH do Windows

O erro pode ser causado por problemas no PATH do Windows. Verifique:

1. Abra "Variáveis de Ambiente" no Windows
2. Verifique se `C:\Windows\system32` está no PATH
3. Reinicie o terminal após alterações

## Solução 5: Usar WSL (Windows Subsystem for Linux)

Se nada funcionar, você pode usar WSL:

```bash
# No WSL
cd /mnt/c/Users/pcdev/Documents/iagoveiculos/backend
npm install
npx prisma generate
npx prisma migrate dev
```

## Verificação

Após a instalação, verifique se tudo está OK:

```powershell
# Verificar se Prisma está instalado
npx prisma --version

# Verificar se o client foi gerado
Test-Path node_modules\.prisma\client
```

## Próximos Passos

Depois de instalar com sucesso:

1. Configure o `.env` (veja README.md)
2. Execute `npx prisma migrate dev`
3. Inicie o servidor: `npm run dev`

---

**Dica:** Se o problema persistir, tente executar o PowerShell como Administrador.


