# 🔧 Solução: Erro de Conexão com Banco de Dados

## ❌ Erro Atual
```
Can't reach database server at `31.97.170.143:5433`
```

## 🔍 Diagnóstico

O servidor PostgreSQL não está acessível no endereço `31.97.170.143:5433`.

## ✅ Possíveis Soluções

### 1. Verificar se o Servidor está Online

Teste a conectividade básica:
```powershell
# Testar se o servidor responde
Test-NetConnection -ComputerName 31.97.170.143 -Port 5433
```

Se retornar `TcpTestSucceeded: False`, o servidor está offline ou a porta está bloqueada.

### 2. Verificar Firewall

O firewall pode estar bloqueando a porta 5433:
- Verifique as regras do Windows Firewall
- Verifique se o firewall do servidor remoto permite conexões na porta 5433
- Se estiver em uma rede corporativa, verifique com o administrador

### 3. Verificar Credenciais e Configuração

Verifique o arquivo `.env` em `backend/.env`:
```env
DATABASE_URL=postgresql://iagoveiculos:crm4321@31.97.170.143:5433/iagoveiculos
```

Certifique-se de que:
- ✅ Usuário: `iagoveiculos`
- ✅ Senha: `crm4321`
- ✅ Host: `31.97.170.143`
- ✅ Porta: `5433`
- ✅ Database: `iagoveiculos`

### 4. Testar Conexão Manualmente

Se tiver o `psql` instalado:
```powershell
psql -h 31.97.170.143 -p 5433 -U iagoveiculos -d iagoveiculos
```

### 5. Verificar se o IP Mudou

O IP do servidor pode ter mudado. Verifique com o provedor do banco de dados.

### 6. Usar Banco Local (Desenvolvimento)

Se estiver em desenvolvimento, você pode usar um banco local:

1. Instale PostgreSQL localmente
2. Crie um banco de dados:
```sql
CREATE DATABASE iagoveiculos;
CREATE USER iagoveiculos WITH PASSWORD 'crm4321';
GRANT ALL PRIVILEGES ON DATABASE iagoveiculos TO iagoveiculos;
```

3. Atualize o `.env`:
```env
DATABASE_URL=postgresql://iagoveiculos:crm4321@localhost:5432/iagoveiculos?schema=public
```

4. Execute as migrações:
```powershell
cd backend
npx prisma migrate deploy
```

### 7. Verificar Status do Serviço de Banco

Se você tem acesso ao servidor, verifique se o PostgreSQL está rodando:
```bash
# Linux
sudo systemctl status postgresql

# Windows (se estiver rodando localmente)
Get-Service -Name postgresql*
```

## 🛠️ Script de Teste

Execute o script de teste criado:
```powershell
cd backend
node test-db-connection.js
```

## 📞 Próximos Passos

1. **Contate o provedor do banco de dados** para verificar:
   - Status do servidor
   - Se o IP mudou
   - Se há manutenção programada
   - Se as credenciais estão corretas

2. **Verifique a rede**:
   - Teste de outro computador/rede
   - Verifique VPN se necessário
   - Verifique proxy/firewall corporativo

3. **Use banco local temporariamente** (se for desenvolvimento):
   - Configure PostgreSQL local
   - Atualize o `.env`
   - Execute as migrações

## ⚠️ Importante

- **NÃO** commite o arquivo `.env` com credenciais reais
- Mantenha backups do banco de dados
- Use variáveis de ambiente diferentes para desenvolvimento e produção
