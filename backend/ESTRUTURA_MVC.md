# 📁 Estrutura MVC do Backend

O backend foi reorganizado seguindo o padrão **MVC (Model-View-Controller)** para melhor organização e manutenibilidade do código.

## 🏗️ Estrutura de Pastas

```
backend/
├── controllers/          # Lógica de negócio (Controllers)
│   ├── authController.js
│   ├── userController.js
│   ├── customerController.js
│   ├── vehicleController.js
│   ├── saleController.js
│   ├── tradeInController.js
│   ├── financialController.js
│   ├── reportController.js
│   └── announcementController.js
│
├── models/              # Camada de dados (Models)
│   └── prisma.js        # Instância do Prisma Client
│
├── routes/              # Definição de rotas (Routes)
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── customerRoutes.js
│   ├── vehicleRoutes.js
│   ├── saleRoutes.js
│   ├── tradeInRoutes.js
│   ├── financialRoutes.js
│   ├── reportRoutes.js
│   └── announcementRoutes.js
│
├── middleware/          # Middlewares
│   └── auth.js          # Autenticação e autorização
│
├── utils/               # Utilitários
│   ├── jwt.js           # Funções JWT
│   └── password.js      # Hash de senhas
│
├── prisma/              # Schema e migrações do Prisma
│   ├── schema.prisma
│   └── migrations/
│
└── server.js            # Arquivo principal do servidor
```

## 🎯 Padrão MVC Explicado

### **Models (Models/)**
- Responsáveis pelo acesso aos dados
- No nosso caso, usamos o Prisma como ORM
- `models/prisma.js` exporta uma instância única do PrismaClient

### **Views (Routes/)**
- As rotas servem como "views" no contexto de API REST
- Definem os endpoints e delegam para os controllers
- Aplicam middlewares de autenticação/autorização

### **Controllers (Controllers/)**
- Contêm toda a lógica de negócio
- Processam requisições e respostas
- Interagem com os models para buscar/atualizar dados
- Cada controller é uma classe com métodos para cada operação CRUD

## 📝 Exemplo de Fluxo

```
Requisição HTTP
    ↓
Routes (routes/userRoutes.js)
    ↓
Middleware (middleware/auth.js) - se necessário
    ↓
Controller (controllers/userController.js)
    ↓
Model (models/prisma.js)
    ↓
Banco de Dados (via Prisma)
    ↓
Resposta HTTP
```

## 🔧 Controllers Disponíveis

### **AuthController**
- `register()` - Registro de novos usuários
- `login()` - Autenticação e geração de tokens
- `refresh()` - Renovação de access token

### **UserController**
- `list()` - Listar usuários
- `getById()` - Buscar usuário por ID
- `update()` - Atualizar usuário
- `delete()` - Deletar usuário

### **CustomerController**
- `list()` - Listar clientes
- `getById()` - Buscar cliente por ID
- `create()` - Criar cliente
- `update()` - Atualizar cliente
- `delete()` - Deletar cliente

### **VehicleController**
- `list()` - Listar veículos
- `getById()` - Buscar veículo por ID
- `create()` - Criar veículo
- `update()` - Atualizar veículo
- `delete()` - Deletar veículo
- `getStockStats()` - Estatísticas de estoque

### **SaleController**
- `list()` - Listar vendas
- `getById()` - Buscar venda por ID
- `create()` - Criar venda
- `update()` - Atualizar venda
- `delete()` - Deletar venda

### **TradeInController**
- `list()` - Listar trade-ins
- `getById()` - Buscar trade-in por ID
- `create()` - Criar trade-in
- `update()` - Atualizar trade-in
- `delete()` - Deletar trade-in

### **FinancialController**
- `listTransactions()` - Listar transações financeiras
- `createTransaction()` - Criar transação
- `updateTransaction()` - Atualizar transação
- `getDashboard()` - Dashboard financeiro

### **ReportController**
- `getSalesReport()` - Relatório de vendas
- `getProfitabilityReport()` - Relatório de lucratividade
- `getVehiclesStuckReport()` - Relatório de veículos parados

### **AnnouncementController**
- `generate()` - Gerar anúncio para veículo
- `getTemplates()` - Listar templates disponíveis

## 🚀 Como Usar

### Iniciar o servidor:
```bash
node server.js
# ou
npm run dev
```

### Adicionar novo endpoint:

1. **Criar método no Controller:**
```javascript
// controllers/meuController.js
async meuMetodo(req, res) {
  try {
    // Lógica aqui
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. **Adicionar rota:**
```javascript
// routes/meuRoutes.js
router.get('/minha-rota', authenticateToken, (req, res) => 
  meuController.meuMetodo(req, res)
);
```

3. **Registrar rota no server.js:**
```javascript
app.use('/api/meu-recurso', meuRoutes);
```

## ✅ Vantagens da Arquitetura MVC

- **Separação de Responsabilidades**: Cada camada tem uma função específica
- **Manutenibilidade**: Código mais fácil de entender e modificar
- **Testabilidade**: Controllers podem ser testados isoladamente
- **Escalabilidade**: Fácil adicionar novos recursos seguindo o padrão
- **Reutilização**: Controllers podem ser reutilizados em diferentes contextos

## 📚 Boas Práticas

1. **Controllers** devem conter apenas lógica de negócio
2. **Models** devem ser responsáveis apenas pelo acesso aos dados
3. **Routes** devem ser simples, apenas definindo endpoints e middlewares
4. Sempre usar **try/catch** nos controllers para tratamento de erros
5. Validar dados de entrada antes de processar
6. Usar middlewares para autenticação/autorização nas rotas protegidas

