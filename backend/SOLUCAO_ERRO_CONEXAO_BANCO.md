# 🔧 Solução: Erro de Conexão com Banco de Dados

## Erro Encontrado
```
Can't reach database server at `31.97.170.143:5433`
```

## 🔍 Diagnóstico

O Prisma não consegue se conectar ao servidor de banco de dados PostgreSQL. Isso pode acontecer por vários motivos:

### 1. Verificar se o servidor está online
O servidor de banco de dados pode estar offline ou inacessível.

### 2. Verificar a URL de conexão
A URL no arquivo `.env` pode estar incorreta ou desatualizada.

### 3. Verificar rede/firewall
Pode haver bloqueio de firewall ou problemas de rede.

## ✅ Soluções

### Solução 1: Verificar a URL no arquivo .env

1. Abra o arquivo `backend/.env`
2. Verifique a variável `DATABASE_URL`
3. Formato esperado:
   ```
   DATABASE_URL=postgresql://usuario:senha@31.97.170.143:5433/nome_do_banco?schema=public
   ```

### Solução 2: Testar conexão com o banco

Você pode testar a conexão usando o comando:

```powershell
# No PowerShell
Test-NetConnection -ComputerName 31.97.170.143 -Port 5433
```

Se o teste falhar, o servidor pode estar offline ou a porta pode estar bloqueada.

### Solução 3: Verificar se o banco está rodando localmente

Se você tem um banco local, verifique:

1. **PostgreSQL local está rodando?**
   ```powershell
   # Verificar se o serviço PostgreSQL está rodando
   Get-Service -Name postgresql*
   ```

2. **Se estiver usando banco local, atualize o .env:**
   ```
   DATABASE_URL=postgresql://postgres:senha@localhost:5432/crmiago?schema=public
   ```

### Solução 4: Verificar credenciais

Certifique-se de que:
- ✅ O usuário está correto
- ✅ A senha está correta
- ✅ O nome do banco de dados está correto
- ✅ A porta está correta (5433 no erro, mas pode ser 5432)

### Solução 5: Verificar firewall/rede

Se o banco está em um servidor remoto:
- Verifique se o firewall permite conexões na porta 5433
- Verifique se o servidor está acessível da sua rede
- Verifique se há VPN necessária

### Solução 6: Usar banco local temporariamente

Se você precisa continuar trabalhando e o servidor remoto está offline:

1. Instale PostgreSQL localmente (se ainda não tiver)
2. Crie um banco de dados:
   ```sql
   CREATE DATABASE crmiago;
   ```
3. Atualize o `.env`:
   ```
   DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/crmiago?schema=public
   ```
4. Execute as migrações:
   ```powershell
   cd backend
   npx prisma migrate deploy
   ```

## 🔄 Após corrigir a conexão

1. **Reinicie o servidor backend:**
   ```powershell
   cd backend
   npm start
   ```

2. **Teste a conexão:**
   - Tente fazer login novamente
   - Verifique se não há mais erros no console

## 📝 Checklist de Verificação

- [ ] Arquivo `.env` existe e está configurado
- [ ] `DATABASE_URL` está no formato correto
- [ ] Servidor de banco de dados está online
- [ ] Credenciais (usuário/senha) estão corretas
- [ ] Porta do banco está correta
- [ ] Nome do banco de dados está correto
- [ ] Firewall/rede permite conexão
- [ ] Servidor backend foi reiniciado após mudanças

## 🆘 Se nada funcionar

1. Verifique com o administrador do banco de dados se:
   - O servidor está online
   - Sua IP está autorizada
   - As credenciais estão corretas

2. Considere usar um banco local para desenvolvimento

3. Verifique os logs do servidor de banco de dados para mais detalhes
