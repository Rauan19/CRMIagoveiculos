# API de Estoque - Documentação

## Rota GET - Listar Estoque

### Endpoint
```
GET /api/estoque
```

### Autenticação
**Não é necessária**: Esta rota é pública e não requer autenticação

### Parâmetros de Query (opcionais)
- `search` (string): Busca por marca ou modelo
  - Exemplo: `?search=Honda`
  - Filtra itens onde a marca OU modelo contém o termo pesquisado

### Resposta de Sucesso (200)

#### Estrutura
```json
{
  "items": [
    {
      "id": 1,
      "brand": "string",
      "model": "string",
      "year": 2024,
      "plate": "string | null",
      "km": 50000 | null,
      "color": "string | null",
      "value": 50000.00 | null,
      "promotionValue": 45000.00 | null,
      "discount": 10.0 | null,
      "notes": "string | null",
      "photos": "string | null",
      "totalSize": 1024000.0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "storage": {
    "totalUsed": 10737418240,
    "totalUsedGB": 10.0,
    "maxSize": 10737418240,
    "maxGB": 10.0,
    "available": 0,
    "availableGB": 0.0,
    "percentageUsed": "100.00"
  }
}
```

### Campos dos Itens (items[])

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | integer | Sim | ID único do item |
| `brand` | string | Sim | Marca do veículo (ex: "Honda", "Toyota") |
| `model` | string | Sim | Modelo do veículo (ex: "Civic", "Corolla") |
| `year` | integer | Sim | Ano do veículo |
| `plate` | string \| null | Não | Placa do veículo |
| `km` | integer \| null | Não | Quilometragem |
| `color` | string \| null | Não | Cor do veículo |
| `value` | float \| null | Não | Valor original do veículo |
| `promotionValue` | float \| null | Não | Valor promocional (quando houver promoção) |
| `discount` | float \| null | Não | Percentual de desconto (padrão: 0) |
| `notes` | string \| null | Não | Observações/notas sobre o veículo |
| `photos` | string \| null | Não | Fotos em base64 (JSON string com array de imagens) |
| `totalSize` | float | Sim | Tamanho total das imagens em bytes (padrão: 0) |
| `createdAt` | datetime | Sim | Data de criação (ISO 8601) |
| `updatedAt` | datetime | Sim | Data da última atualização (ISO 8601) |

### Informações de Armazenamento (storage)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `totalUsed` | integer | Tamanho total usado em bytes |
| `totalUsedGB` | float | Tamanho total usado em GB |
| `maxSize` | integer | Tamanho máximo permitido em bytes (10GB) |
| `maxGB` | float | Tamanho máximo permitido em GB (10.0) |
| `available` | integer | Espaço disponível em bytes |
| `availableGB` | float | Espaço disponível em GB |
| `percentageUsed` | string | Percentual usado (formato: "XX.XX") |

### Ordenação
Os itens são retornados ordenados por data de criação (mais recentes primeiro): `createdAt: 'desc'`

### Exemplos de Uso

#### 1. Listar todos os itens
```bash
curl -X GET "http://seu-dominio:3001/api/estoque"
```

#### 2. Buscar por marca/modelo
```bash
curl -X GET "http://seu-dominio:3001/api/estoque?search=Honda"
```

#### 3. JavaScript/Fetch
```javascript
const response = await fetch('http://seu-dominio:3001/api/estoque?search=Honda', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.items); // Array de itens
console.log(data.storage); // Informações de armazenamento
```

#### 4. JavaScript/Axios
```javascript
const axios = require('axios');

const response = await axios.get('http://seu-dominio:3001/api/estoque', {
  params: { search: 'Honda' }
});

console.log(response.data.items);
console.log(response.data.storage);
```

#### 5. HTML/Fetch (Site Normal)
```html
<script>
fetch('http://seu-dominio:3001/api/estoque')
  .then(response => response.json())
  .then(data => {
    console.log(data.items);
    console.log(data.storage);
  });
</script>
```

### Respostas de Erro

#### 500 Internal Server Error
```json
{
  "error": "Erro ao buscar estoque"
}
```

### Observações Importantes

1. **Fotos (photos)**: O campo `photos` é uma string JSON que contém um array de imagens em base64. Para usar, você precisa fazer `JSON.parse(item.photos)`.

2. **Valor Final**: Para calcular o valor final do veículo, use:
   - Se `promotionValue` existir: use `promotionValue`
   - Caso contrário, se `value` e `discount` existirem: `value * (1 - discount / 100)`
   - Caso contrário: use `value` ou null

3. **Limite de Armazenamento**: O limite máximo é de 10GB para todas as imagens do estoque.

4. **Ordenação**: Os itens são sempre retornados do mais recente para o mais antigo.

