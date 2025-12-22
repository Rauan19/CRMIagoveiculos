# CRM IAGO Veículos

Sistema completo de gestão (CRM) para loja de veículos, desenvolvido com Node.js + Express e Next.js 14.

## 🚀 Funcionalidades

### Módulos Principais

1. **Gestão de Clientes**
   - Cadastro completo (nome, telefone, email, endereço)
   - Histórico de visitas e atendimentos
   - Status do lead (novo → negociação → aprovado → concluído)

2. **Gestão de Veículos**
   - Cadastro de carros e motos
   - Fotos (múltiplas imagens)
   - Quilometragem, ano, modelo, cor
   - Custo de compra e preço de venda
   - Status: em estoque, reservado, vendido

3. **Avaliação de Veículo como Entrada (Trade-In)**
   - Cadastro do veículo do cliente
   - Estado, fotos, valor FIPE, valor de avaliação
   - Definir valor aceito como entrada
   - Relacionado à venda em andamento

4. **Processo de Venda**
   - Fluxo completo de venda
   - Simulação de financiamento
   - Entrada em dinheiro + entrada com veículo
   - Comissão do vendedor
   - Contratos gerados em PDF

5. **Financeiro**
   - Contas a receber (parcelas, financiamentos, boletos)
   - Contas a pagar
   - Fechamento de caixa diário
   - Dashboard financeiro (gráfico de vendas, lucro por veículo)

6. **Estoque**
   - Quantos veículos na loja
   - Valor total do estoque
   - Relatórios (veículos parados há muito tempo)

7. **Relatórios / Dashboards**
   - Vendas por período
   - Ticket médio
   - Lucratividade por vendedor
   - Custo médio de aquisição
   - Margem por veículo

8. **Gerador de Anúncio**
   - Geração automática de anúncios para veículos
   - Múltiplos templates (padrão, curto, detalhado, premium)
   - Exportação e cópia fácil

## 🛠️ Tecnologias

### Backend
- Node.js + Express.js
- Prisma ORM
- SQLite (desenvolvimento) / PostgreSQL (produção)
- JWT + Refresh Token
- RBAC (Admin, Vendedor, Gerente)

### Frontend
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- React Query
- Zustand (gerenciamento de estado)
- Axios

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Backend

1. Entre na pasta do backend:
```bash
cd backend
```

2. Instale as dependências:

**⚠️ Se você encontrar erro `ENOENT spawn C:\Windows\system32\cmd.exe` no Windows, veja [INSTALACAO_WINDOWS.md](backend/INSTALACAO_WINDOWS.md)**

```bash
npm install
```

**Alternativa para Windows (se houver problemas):**
```powershell
# Instalar dependências básicas primeiro
npm install express cors dotenv bcryptjs jsonwebtoken pdf-lib
npm install nodemon --save-dev

# Instalar Prisma separadamente
npm install prisma @prisma/client --save

# Gerar Prisma Client manualmente
npx prisma generate
```

3. Configure o arquivo `.env` (copie do `.env.example`):
```bash
PORT=3001
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_super_seguro_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL="file:./dev.db"
```

4. Configure o Prisma:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Inicie o servidor:
```bash
npm run dev
```

O backend estará rodando em `http://localhost:3001`

### Frontend

1. Entre na pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## 👤 Primeiro Acesso

Após iniciar o backend, você precisa criar um usuário. Você pode fazer isso através da API:

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

Ou use o Prisma Studio para criar manualmente:
```bash
cd backend
npx prisma studio
```

## 📁 Estrutura do Projeto

```
iagoveiculos/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Schema do banco de dados
│   ├── routes/                    # Rotas da API
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── customerRoutes.js
│   │   ├── vehicleRoutes.js
│   │   ├── tradeInRoutes.js
│   │   ├── saleRoutes.js
│   │   ├── financialRoutes.js
│   │   ├── reportRoutes.js
│   │   └── announcementRoutes.js  # Gerador de anúncio
│   ├── middleware/
│   │   └── auth.js                # Middleware de autenticação
│   ├── utils/
│   │   ├── jwt.js                 # Utilitários JWT
│   │   └── password.js            # Hash de senhas
│   └── server.js                  # Servidor principal
│
└── frontend/
    ├── src/
    │   ├── app/                   # App Router do Next.js
    │   │   ├── login/
    │   │   ├── dashboard/
    │   │   ├── customers/
    │   │   ├── vehicles/
    │   │   ├── trade-ins/
    │   │   ├── sales/
    │   │   ├── financial/
    │   │   └── announcements/    # Página do gerador de anúncio
    │   ├── components/
    │   │   └── Layout.tsx          # Layout principal
    │   ├── services/
    │   │   └── api.ts             # Configuração do Axios
    │   └── store/
    │       └── authStore.ts       # Store Zustand
    └── package.json
```

## 🔐 Autenticação

O sistema usa JWT com refresh tokens:

- **Access Token**: Expira em 15 minutos
- **Refresh Token**: Expira em 7 dias

As rotas protegidas requerem o header:
```
Authorization: Bearer <access_token>
```

## 🎯 Roles (Permissões)

- **admin**: Acesso total ao sistema
- **gerente**: Pode gerenciar vendas, veículos e clientes
- **vendedor**: Pode criar vendas e gerenciar clientes

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar access token

### Clientes
- `GET /api/customers` - Listar clientes
- `GET /api/customers/:id` - Buscar cliente
- `POST /api/customers` - Criar cliente
- `PUT /api/customers/:id` - Atualizar cliente
- `DELETE /api/customers/:id` - Deletar cliente

### Veículos
- `GET /api/vehicles` - Listar veículos
- `GET /api/vehicles/:id` - Buscar veículo
- `POST /api/vehicles` - Criar veículo
- `PUT /api/vehicles/:id` - Atualizar veículo
- `DELETE /api/vehicles/:id` - Deletar veículo
- `GET /api/vehicles/stats/stock` - Estatísticas de estoque

### Trade-Ins
- `GET /api/trade-ins` - Listar trade-ins
- `GET /api/trade-ins/:id` - Buscar trade-in
- `POST /api/trade-ins` - Criar trade-in
- `PUT /api/trade-ins/:id` - Atualizar trade-in
- `DELETE /api/trade-ins/:id` - Deletar trade-in

### Vendas
- `GET /api/sales` - Listar vendas
- `GET /api/sales/:id` - Buscar venda
- `POST /api/sales` - Criar venda
- `PUT /api/sales/:id` - Atualizar venda
- `DELETE /api/sales/:id` - Deletar venda

### Financeiro
- `GET /api/financial/transactions` - Listar transações
- `POST /api/financial/transactions` - Criar transação
- `PUT /api/financial/transactions/:id` - Atualizar transação
- `GET /api/financial/dashboard` - Dashboard financeiro

### Relatórios
- `GET /api/reports/sales` - Relatório de vendas
- `GET /api/reports/profitability` - Relatório de lucratividade
- `GET /api/reports/vehicles-stuck` - Veículos parados

### Gerador de Anúncio
- `POST /api/announcements/generate` - Gerar anúncio
- `GET /api/announcements/templates` - Listar templates

## 🚀 Deploy

### Backend
O backend pode ser deployado em:
- Render
- Railway
- Heroku
- AWS EC2

Lembre-se de configurar as variáveis de ambiente e mudar o `DATABASE_URL` para PostgreSQL em produção.

### Frontend
O frontend pode ser deployado em:
- Vercel (recomendado para Next.js)
- Netlify
- AWS Amplify

## 📄 Licença

Este projeto é privado e de uso interno.

## 🤝 Contribuindo

Para contribuir com o projeto, entre em contato com a equipe de desenvolvimento.

---

Desenvolvido com ❤️ para IAGO Veículos

