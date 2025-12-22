# 🚀 Início Rápido

## Problema: `npm run dev` não funciona

O problema é que o npm está tentando usar `nodemon` que também tem o mesmo erro do cmd.exe.

## ✅ SOLUÇÃO: Use uma destas opções

### Opção 1: Executar diretamente (RECOMENDADO)
```powershell
node server.js
```

### Opção 2: Usar o script PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

### Opção 3: Usar npm start (funciona)
```powershell
npm start
```

## 🔍 Verificar se está rodando

Abra outro terminal e teste:
```powershell
curl http://localhost:3001/api/health
```

Deve retornar: `{"status":"ok","message":"API funcionando"}`

## 📝 Por que npm run dev não funciona?

O npm está tentando executar scripts que dependem do cmd.exe, que não está acessível no seu ambiente. Por isso, use `node server.js` diretamente ou `npm start` (que também usa `node server.js`).

---

**Dica:** Para desenvolvimento, você pode simplesmente executar `node server.js` e quando precisar reiniciar, pare com Ctrl+C e execute novamente.


