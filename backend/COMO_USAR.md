# 🚀 Como Usar o Sistema

## Problema com cmd.exe no Windows

Devido ao problema com `cmd.exe` no seu ambiente Windows, alguns comandos npm não funcionam diretamente. Use as alternativas abaixo:

## ✅ Comandos que Funcionam

### 1. Iniciar o Servidor

**Opção A - Diretamente com Node:**
```powershell
node server.js
```

**Opção B - Usando o script:**
```powershell
powershell -ExecutionPolicy Bypass -File start-server.ps1
```

**Opção C - Usando npm (agora configurado):**
```powershell
npm run dev
```
*Nota: O script `dev` agora usa `node` diretamente em vez de `nodemon`*

### 2. Comandos Prisma

**Gerar Prisma Client:**
```powershell
node node_modules\prisma\build\index.js generate
```

**Criar migração:**
```powershell
node node_modules\prisma\build\index.js migrate dev --name nome_da_migracao
```

**Abrir Prisma Studio:**
```powershell
node node_modules\prisma\build\index.js studio
```

**Ou use o helper script:**
```powershell
powershell -ExecutionPolicy Bypass -File prisma-helper.ps1 "generate"
powershell -ExecutionPolicy Bypass -File prisma-helper.ps1 "migrate dev"
powershell -ExecutionPolicy Bypass -File prisma-helper.ps1 "studio"
```

## 📋 Checklist de Inicialização

1. ✅ **Backend instalado** (já feito)
2. ✅ **Banco de dados criado** (já feito)
3. ⏭️ **Iniciar servidor backend:**
   ```powershell
   node server.js
   ```
   O servidor estará em: `http://localhost:3001`

4. ⏭️ **Criar primeiro usuário:**
   
   **Via Prisma Studio (mais fácil):**
   ```powershell
   node node_modules\prisma\build\index.js studio
   ```
   - Abra o navegador em `http://localhost:5555`
   - Vá na tabela `User`
   - Clique em "Add record"
   - Preencha: name, email, password (hash com bcrypt), role
   
   **Ou via API (após servidor rodar):**
   ```powershell
   curl -X POST http://localhost:3001/api/auth/register `
     -H "Content-Type: application/json" `
     -d '{\"name\":\"Admin\",\"email\":\"admin@test.com\",\"password\":\"senha123\",\"role\":\"admin\"}'
   ```

5. ⏭️ **Instalar e iniciar frontend:**
   ```powershell
   cd ../frontend
   npm install
   npm run dev
   ```

## 🔍 Verificar se está funcionando

**Testar API:**
```powershell
# Health check
curl http://localhost:3001/api/health

# Deve retornar: {"status":"ok","message":"API funcionando"}
```

## ⚠️ Notas Importantes

1. **Arrays no banco:** Os campos `photos` e `documents` são strings JSON. Use `JSON.stringify()` ao salvar e `JSON.parse()` ao ler.

2. **Nunca use `npx`:** Sempre use `node node_modules\prisma\build\index.js` diretamente.

3. **Nodemon não funciona:** Use `node server.js` diretamente. Para desenvolvimento, você pode usar ferramentas como `node --watch` (Node.js 18+) ou simplesmente reiniciar manualmente.

## 🆘 Problemas Comuns

**Servidor não inicia:**
- Verifique se a porta 3001 está livre
- Verifique se o arquivo `.env` existe e tem `DATABASE_URL` configurado
- Verifique os logs de erro no terminal

**Erro de autenticação:**
- Certifique-se de que o usuário foi criado corretamente
- A senha deve ser hasheada com bcrypt (use a API de registro ou Prisma Studio)

**Banco de dados não encontrado:**
- Execute: `node node_modules\prisma\build\index.js migrate dev`

---

**Sistema pronto!** 🎉


