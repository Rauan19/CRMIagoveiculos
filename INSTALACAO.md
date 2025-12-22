# 🚀 Instalação Rápida - CRM IAGO Veículos

## Passo a Passo

### 1. Backend

```bash
cd backend
npm install
```

Crie o arquivo `.env`:
```env
PORT=3001
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_mude_em_producao
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro_aqui_mude_em_producao
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL="file:./dev.db"
```

Configure o Prisma:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

Inicie o servidor:
```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
```

Crie o arquivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Inicie o servidor:
```bash
npm run dev
```

### 3. Criar Primeiro Usuário

Abra o Prisma Studio:
```bash
cd backend
npx prisma studio
```

Ou use a API:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@example.com",
    "password": "senha123",
    "role": "admin"
  }'
```

### 4. Acessar o Sistema

1. Abra o navegador em `http://localhost:3000`
2. Faça login com o usuário criado
3. Pronto! 🎉

## Estrutura de Pastas

```
iagoveiculos/
├── backend/          # API Node.js + Express
│   ├── prisma/       # Schema do banco
│   ├── routes/       # Rotas da API
│   └── server.js     # Servidor principal
│
└── frontend/         # Next.js 14
    └── src/
        ├── app/      # Páginas (App Router)
        ├── components/
        └── services/
```

## Problemas Comuns

### Erro: "Cannot find module '@prisma/client'"
```bash
cd backend
npx prisma generate
```

### Erro: "Database not found"
```bash
cd backend
npx prisma migrate dev
```

### Porta já em uso
Altere a porta no arquivo `.env` do backend ou `.env.local` do frontend.

## Próximos Passos

1. ✅ Sistema instalado e funcionando
2. 📝 Criar usuários (admin, gerente, vendedor)
3. 🚗 Cadastrar veículos
4. 👥 Cadastrar clientes
5. 💰 Começar a registrar vendas

---

**Dúvidas?** Consulte o `README.md` para mais detalhes.


