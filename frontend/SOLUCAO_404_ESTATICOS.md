# Solução: 404 em /_next/static e em rotas (/vehicles, etc.)

## Sintomas
- `GET /_next/static/css/app/layout.css` → 404  
- `GET /_next/static/chunks/main-app.js` → 404  
- `GET /vehicles` ou outras rotas → 404  
- Página em branco ou "Compreenda este erro"

## Causas comuns no Windows
1. **Cache corrompido** (`.next`) ou chunks antigos no navegador  
2. **EPERM** ao compilar (Next.js não consegue gerar os arquivos estáticos)  
3. **Mais de um `next dev`** rodando ao mesmo tempo (ex.: duas portas)  
4. **Rodar o dev na pasta errada** (tem que ser dentro de `frontend`)

## Passo a passo

### 1. Parar tudo
- Feche **todos** os terminais com `npm run dev` ou `next dev`  
- Não pode haver dois Next rodando (nem em portas diferentes)

### 2. Rodar o frontend na pasta certa
```bash
cd frontend
```
Só depois:
```bash
npm run dev
```
Ou use um dos scripts alternativos (veja abaixo).

### 3. Limpar cache e subir de novo
```bash
cd frontend
npm run dev:clean
```
Isso apaga a pasta `.next` e sobe o `next dev` de novo.

### 4. Se ainda der 404, tentar Turbopack
O Turbopack pode evitar o EPERM do webpack no Windows:
```bash
cd frontend
npm run dev:turbo
```

### 5. Limpar cache do navegador
Depois de limpar o `.next` e reiniciar o dev:
- **Chrome/Edge:** `Ctrl + Shift + R` ou `Ctrl + F5` (hard refresh)  
- Ou abra uma **aba anónima** e acesse `http://localhost:3000`

### 6. EPERM / antivírus
Se aparecer `spawn EPERM` ou `EPERM: operation not permitted`:
- **Windows Defender:** adicione exclusão para a pasta do projeto  
- **OneDrive/Dropbox:** evite rodar o projeto dentro de pasta sincronizada  
- Tente rodar o terminal **como Administrador**

### 7. Conferir portas
- **Frontend (Next):** `http://localhost:3000`  
- **Backend (API):** `http://localhost:3001`  

Só um processo Next deve usar a porta 3000.

## Scripts disponíveis (dentro de `frontend`)
| Script        | Comando              | Uso                          |
|---------------|----------------------|------------------------------|
| `npm run dev` | `next dev`           | Modo normal                  |
| `npm run dev:clean` | Limpa `.next` + `next dev` | Quando há 404 ou cache estranho |
| `npm run dev:turbo` | `next dev --turbo`   | Alternativa se der EPERM     |

## Resumo rápido
1. `cd frontend`  
2. Feche qualquer outro `next dev`  
3. `npm run dev:clean`  
4. Hard refresh no navegador (`Ctrl + Shift + R`)  
5. Se continuar, testar `npm run dev:turbo`
