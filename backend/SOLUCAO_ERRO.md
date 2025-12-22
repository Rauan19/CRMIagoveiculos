# 🔧 Solução para Erro de Instalação no Windows

## Erro: `ENOENT spawn C:\Windows\system32\cmd.exe`

Este erro ocorre quando o Prisma tenta executar scripts pós-instalação. Siga estes passos:

### ✅ Solução Rápida (Recomendada)

Execute os comandos **um por vez** no PowerShell:

```powershell
# 1. Limpar cache
npm cache clean --force

# 2. Instalar dependências básicas (sem Prisma)
npm install express cors dotenv bcryptjs jsonwebtoken pdf-lib --save
npm install nodemon --save-dev

# 3. Instalar Prisma separadamente
npm install prisma @prisma/client --save --legacy-peer-deps

# 4. Gerar Prisma Client manualmente
npx prisma generate

# 5. Configurar banco de dados
npx prisma migrate dev --name init
```

### 🔄 Alternativa: Instalar sem scripts

```powershell
npm install --ignore-scripts
npx prisma generate
npx prisma migrate dev --name init
```

### 📦 Usar Yarn (se npm não funcionar)

```powershell
# Instalar Yarn
npm install -g yarn

# Instalar dependências
yarn install

# Gerar Prisma
yarn prisma generate

# Migrar banco
yarn prisma migrate dev
```

### 🛠️ Verificar Instalação

Após instalar, verifique:

```powershell
# Verificar versão do Prisma
npx prisma --version

# Verificar se o client foi gerado
dir node_modules\.prisma\client
```

### ⚠️ Se ainda não funcionar

1. **Execute PowerShell como Administrador**
2. **Verifique se `C:\Windows\system32` está no PATH do sistema**
3. **Tente usar WSL (Windows Subsystem for Linux)**

### 🚀 Após Instalação Bem-Sucedida

1. Configure o arquivo `.env`:
```env
PORT=3001
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL="file:./dev.db"
```

2. Inicie o servidor:
```powershell
npm run dev
```

---

**Dica:** Se o problema persistir, compartilhe a mensagem de erro completa para análise.


