# Instruções para Atualizar o Schema do Prisma

O schema foi atualizado com os seguintes campos:

1. **Modelo Sale**:
   - Adicionado campo `exitType` (String?) - Tipo de saída: transferencia, venda, pre_venda

2. **Modelo SalePaymentMethod**:
   - Adicionado campo `trocoData` (DateTime?) - Data do troco na troca
   - Adicionado campo `trocoDescricao` (String?) - Descrição do troco na troca
   - Adicionado campo `trocoValorTotal` (Float?) - Valor total do troco na troca
   - Adicionado campo `veiculoTrocaId` (Int?) - ID do veículo usado na troca
   - Adicionada relação `veiculoTroca` com o modelo Vehicle

3. **Modelo Vehicle**:
   - Adicionada relação `trocaPaymentMethods` com SalePaymentMethod

## Passos para aplicar as mudanças:

1. **Pare o servidor** se estiver rodando (Ctrl+C)

2. **Crie a migration**:
   ```powershell
   cd backend
   npx prisma migrate dev --name add_exit_type_and_payment_fields
   ```

3. **Regenere o Prisma Client**:
   ```powershell
   npx prisma generate
   ```

4. **Inicie o servidor novamente**:
   ```powershell
   npm start
   ```

## Nota:
Se houver erro de permissão ao executar `npx prisma generate`, tente:
- Fechar o servidor Node.js se estiver rodando
- Fechar o VS Code/Cursor temporariamente
- Executar o comando novamente
- Ou executar como administrador
