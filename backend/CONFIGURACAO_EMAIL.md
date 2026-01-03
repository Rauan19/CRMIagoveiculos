# 📧 Configuração de Email para Lembretes de Aniversário

Para habilitar o envio automático de emails de aniversário, você precisa configurar as variáveis de ambiente no arquivo `.env` do backend.

## Configuração no arquivo `.env`

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Configurações de Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_FROM_NAME="CRM IAGO Veículos"
```

## Configuração para Gmail

### Opção 1: Senha de App (Recomendado)

1. Acesse sua conta do Google: https://myaccount.google.com/
2. Vá em **Segurança**
3. Ative a **Verificação em duas etapas** (se ainda não estiver ativada)
4. Procure por **Senhas de app** ou acesse: https://myaccount.google.com/apppasswords
5. Selecione **App**: Mail
6. Selecione **Dispositivo**: Outro (nomeie como "CRM IAGO")
7. Clique em **Gerar**
8. Copie a senha gerada (16 caracteres) e use como `EMAIL_PASS`

### Opção 2: Conta de Serviço

Você também pode criar uma conta de serviço dedicada para o CRM.

## Outros provedores de email

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=sua-api-key-do-sendgrid
```

### Amazon SES
```env
EMAIL_HOST=email-smtp.region.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

## Como funciona

O sistema verifica diariamente às 08:00 (horário de Brasília) se há clientes fazendo aniversário e envia automaticamente um email personalizado para cada um.

### Requisitos para envio

- O cliente deve ter um email cadastrado
- O cliente deve ter uma data de nascimento cadastrada
- O serviço de email deve estar configurado corretamente

## Testando o sistema

Após configurar, você pode testar manualmente através da API:

```bash
# Listar próximos aniversários (próximos 30 dias)
GET /api/customers/birthdays/upcoming?days=30
```

## Notas importantes

- ⚠️ Sem as configurações de email, o sistema não enviará emails, mas continuará funcionando normalmente
- ⚠️ O scheduler só funciona quando o servidor backend está rodando
- ⚠️ Em ambiente de desenvolvimento, você pode testar usando serviços como Mailtrap ou MailHog

