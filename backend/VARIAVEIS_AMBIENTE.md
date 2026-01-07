# Variáveis de Ambiente - Backend

Documentação completa das variáveis de ambiente necessárias para o backend.

## Arquivo .env

Crie um arquivo `.env` na pasta `backend/` com as seguintes variáveis:

---

## 🔴 OBRIGATÓRIAS

### DATABASE_URL
**Descrição**: URL de conexão com o banco de dados PostgreSQL  
**Exemplo**:
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/crmiago?schema=public
```

### JWT_SECRET
**Descrição**: Chave secreta para assinar tokens JWT (use uma string longa e aleatória)  
**Exemplo**:
```env
JWT_SECRET=sua_chave_secreta_super_segura_aqui_123456789
```

### JWT_REFRESH_SECRET
**Descrição**: Chave secreta para assinar refresh tokens JWT (deve ser diferente do JWT_SECRET)  
**Exemplo**:
```env
JWT_REFRESH_SECRET=outra_chave_secreta_para_refresh_tokens_987654321
```

---

## 🟡 OPCIONAIS (com valores padrão)

### PORT
**Descrição**: Porta onde o servidor vai rodar  
**Padrão**: `3001`  
**Exemplo**:
```env
PORT=3001
```

### NODE_ENV
**Descrição**: Ambiente de execução (development ou production)  
**Padrão**: `development`  
**Exemplo**:
```env
NODE_ENV=development
```
ou
```env
NODE_ENV=production
```

### JWT_EXPIRES_IN
**Descrição**: Tempo de expiração do token de acesso  
**Padrão**: `24h`  
**Exemplo**:
```env
JWT_EXPIRES_IN=24h
```
Outros formatos: `1h`, `30m`, `7d`

### JWT_REFRESH_EXPIRES_IN
**Descrição**: Tempo de expiração do refresh token  
**Padrão**: `7d`  
**Exemplo**:
```env
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 🟢 OPCIONAIS (Email - para envio de aniversários)

### EMAIL_HOST
**Descrição**: Servidor SMTP para envio de emails  
**Padrão**: `smtp.gmail.com`  
**Exemplo**:
```env
EMAIL_HOST=smtp.gmail.com
```
Outros exemplos:
- `smtp-mail.outlook.com` (Outlook)
- `smtp.sendgrid.net` (SendGrid)
- `email-smtp.region.amazonaws.com` (Amazon SES)

### EMAIL_PORT
**Descrição**: Porta do servidor SMTP  
**Padrão**: `587`  
**Exemplo**:
```env
EMAIL_PORT=587
```
Outros valores comuns: `465` (SSL), `25`

### EMAIL_SECURE
**Descrição**: Se usa conexão SSL/TLS segura  
**Padrão**: `false`  
**Exemplo**:
```env
EMAIL_SECURE=false
```
Use `true` para porta 465, `false` para porta 587

### EMAIL_USER
**Descrição**: Email do remetente (usuário SMTP)  
**Padrão**: (vazio - emails desabilitados)  
**Exemplo**:
```env
EMAIL_USER=seu-email@gmail.com
```

### EMAIL_PASS
**Descrição**: Senha do email ou senha de app do Gmail  
**Padrão**: (vazio - emails desabilitados)  
**Exemplo**:
```env
EMAIL_PASS=sua_senha_de_app_aqui
```

### EMAIL_FROM_NAME
**Descrição**: Nome que aparece como remetente nos emails  
**Padrão**: `CRM IAGO Veículos`  
**Exemplo**:
```env
EMAIL_FROM_NAME="CRM IAGO Veículos"
```

---

## 📋 Exemplo Completo de .env

```env
# ============================================
# BANCO DE DADOS
# ============================================
DATABASE_URL=postgresql://usuario:senha@localhost:5432/crmiago?schema=public

# ============================================
# JWT - AUTENTICAÇÃO
# ============================================
JWT_SECRET=sua_chave_secreta_super_segura_aqui_123456789
JWT_REFRESH_SECRET=outra_chave_secreta_para_refresh_tokens_987654321
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# SERVIDOR
# ============================================
PORT=3001
NODE_ENV=development

# ============================================
# EMAIL (Opcional - para envio de aniversários)
# ============================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua_senha_de_app_aqui
EMAIL_FROM_NAME="CRM IAGO Veículos"
```

---

## 🔐 Gerando Chaves Secretas Seguras

Para gerar chaves secretas seguras para JWT, você pode usar:

### Node.js
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Online
- https://randomkeygen.com/
- https://www.grc.com/passwords.htm

### PowerShell (Windows)
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

---

## ⚠️ Importante

1. **NUNCA** commite o arquivo `.env` no Git
2. Use valores diferentes para `JWT_SECRET` e `JWT_REFRESH_SECRET`
3. Em produção, use valores seguros e aleatórios
4. Para Gmail, use **Senha de App** (não a senha normal da conta)
5. Mantenha o arquivo `.env` apenas localmente ou em variáveis de ambiente do servidor

---

## 📝 Checklist de Configuração

- [ ] `DATABASE_URL` configurada e testada
- [ ] `JWT_SECRET` gerado e configurado
- [ ] `JWT_REFRESH_SECRET` gerado e configurado (diferente do JWT_SECRET)
- [ ] `PORT` definida (ou usando padrão 3001)
- [ ] `NODE_ENV` definida
- [ ] Variáveis de email configuradas (se necessário)
- [ ] Arquivo `.env` adicionado ao `.gitignore`


