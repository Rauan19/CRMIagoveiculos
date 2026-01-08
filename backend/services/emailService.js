const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configuração do transporter de email
    // Pode ser configurado via variáveis de ambiente
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para outras portas
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '', // Senha de app do Gmail ou senha normal
      },
    });

    // Verificar se as configurações estão completas
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️  EMAIL_USER e EMAIL_PASS não configurados. Emails não serão enviados.');
      console.warn('⚠️  Configure essas variáveis no arquivo .env para habilitar envio de emails.');
    }
  }

  /**
   * Envia email de aniversário para um cliente
   * @param {Object} customer - Dados do cliente
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendBirthdayEmail(customer) {
    if (!customer.email) {
      throw new Error('Cliente não possui email cadastrado');
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn(`⚠️  Email não enviado para ${customer.name}: EMAIL_USER/EMAIL_PASS não configurados`);
      return { success: false, message: 'Serviço de email não configurado' };
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'CRM IAGO Veículos'}" <${process.env.EMAIL_USER}>`,
      to: customer.email,
      subject: '🎉 Feliz Aniversário!',
      html: this.getBirthdayEmailTemplate(customer),
      text: this.getBirthdayEmailText(customer),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de aniversário enviado para ${customer.name} (${customer.email})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Erro ao enviar email de aniversário para ${customer.name}:`, error);
      throw error;
    }
  }

  /**
   * Template HTML do email de aniversário
   */
  getBirthdayEmailTemplate(customer) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            margin: -30px -30px 30px -30px;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            margin-top: 20px;
          }
          h1 {
            color: #667eea;
            margin-top: 0;
          }
          .message {
            font-size: 18px;
            margin: 20px 0;
            color: #555;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 14px;
            color: #888;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Feliz Aniversário, ${customer.name}! 🎉</h1>
          </div>
          <div class="content">
            <p class="message">
              Desejamos a você um dia muito especial repleto de alegria, saúde e muitas conquistas!
            </p>
            <p>
              Que este novo ano de vida traga muitas realizações e momentos felizes. 
              Estamos sempre à disposição para ajudar você a realizar seus sonhos!
            </p>
            <p>
              Mais uma vez, <strong>feliz aniversário!</strong> 🎂🎈
            </p>
            <p style="margin-top: 30px;">
              Atenciosamente,<br>
              <strong>Equipe IAGO Veículos</strong>
            </p>
          </div>
          <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Versão texto do email de aniversário (para clientes que não suportam HTML)
   */
  getBirthdayEmailText(customer) {
    return `
🎉 Feliz Aniversário, ${customer.name}! 🎉

Desejamos a você um dia muito especial repleto de alegria, saúde e muitas conquistas!

Que este novo ano de vida traga muitas realizações e momentos felizes. 
Estamos sempre à disposição para ajudar você a realizar seus sonhos!

Mais uma vez, feliz aniversário! 🎂🎈

Atenciosamente,
Equipe IAGO Veículos

---
Esta é uma mensagem automática. Por favor, não responda este email.
    `.trim();
  }

  /**
   * Verifica se o serviço de email está configurado
   */
  isConfigured() {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  }
}

module.exports = new EmailService();


