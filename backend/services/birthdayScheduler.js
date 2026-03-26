const cron = require('node-cron');
const prisma = require('../models/prisma');
const emailService = require('./emailService');

class BirthdayScheduler {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Inicia o scheduler de verificação de aniversários
   * Executa diariamente às 08:00
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Scheduler de aniversários já está rodando');
      return;
    }

    // Executa diariamente às 08:00
    this.task = cron.schedule('0 8 * * *', async () => {
      console.log('🔄 Verificando aniversários do dia...');
      await this.checkAndSendBirthdayEmails();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.isRunning = true;
    console.log('✅ Scheduler de aniversários iniciado (executa diariamente às 08:00)');

    // Executa imediatamente ao iniciar (para testes/desenvolvimento)
    // Comentar esta linha em produção se não quiser executar na inicialização
    // this.checkAndSendBirthdayEmails();
  }

  /**
   * Para o scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.isRunning = false;
      console.log('⏹️  Scheduler de aniversários parado');
    }
  }

  /**
   * Verifica clientes com aniversário hoje e envia emails
   */
  async checkAndSendBirthdayEmails() {
    try {
      const today = new Date();
      // usar UTC para comparar apenas mês/dia (evita problemas com timezone)
      const todayMonth = today.getUTCMonth() + 1; // getUTCMonth() retorna 0-11
      const todayDay = today.getUTCDate();

      // Buscar clientes com aniversário hoje
      const customers = await prisma.customer.findMany({
        where: {
          birthDate: {
            not: null,
          },
          email: {
            not: null,
          },
        },
      });

      // Filtrar clientes que fazem aniversário hoje usando partes UTC (mês/dia)
      const birthdayCustomers = customers.filter(customer => {
        if (!customer.birthDate) return false;
        const birthDate = new Date(customer.birthDate);
        const birthMonth = birthDate.getUTCMonth() + 1;
        const birthDay = birthDate.getUTCDate();
        return birthMonth === todayMonth && birthDay === todayDay;
      });

      console.log(`📅 Encontrados ${birthdayCustomers.length} cliente(s) com aniversário hoje`);

      if (birthdayCustomers.length === 0) {
        console.log('✅ Nenhum aniversário hoje');
        return;
      }

      // Enviar emails
      let successCount = 0;
      let errorCount = 0;

      for (const customer of birthdayCustomers) {
        try {
          await emailService.sendBirthdayEmail(customer);
          successCount++;
        } catch (error) {
          console.error(`❌ Erro ao enviar email para ${customer.name}:`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ Processo concluído: ${successCount} email(s) enviado(s), ${errorCount} erro(s)`);
    } catch (error) {
      console.error('❌ Erro ao verificar aniversários:', error);
    }
  }

  /**
   * Retorna clientes com aniversário nos próximos N dias
   * @param {number} days - Número de dias à frente para verificar
   * @returns {Promise<Array>} Lista de clientes
   */
  async getUpcomingBirthdays(days = 30) {
    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + days);

      const customers = await prisma.customer.findMany({
        where: {
          birthDate: {
            not: null,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          birthDate: true,
        },
      });

      // Filtrar e ordenar clientes com aniversário nos próximos dias
      const upcoming = customers
        .map(customer => {
          const birthDate = new Date(customer.birthDate);
          // usar UTC para extrair dia/mês e criar próxima data no calendário local
          const birthMonth = birthDate.getUTCMonth();
          const birthDay = birthDate.getUTCDate();
          const thisYear = today.getFullYear();
          let nextBirthday = new Date(thisYear, birthMonth, birthDay);

          // Comparar apenas pela data (início do dia) para evitar problemas de horário
          const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (nextBirthday < startOfToday) {
            nextBirthday.setFullYear(thisYear + 1);
          }

          const daysUntilBirthday = Math.floor((nextBirthday.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilBirthday <= days) {
            return {
              ...customer,
              daysUntilBirthday,
              nextBirthdayDate: nextBirthday,
            };
          }
          return null;
        })
        .filter(customer => customer !== null)
        .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

      return upcoming;
    } catch (error) {
      console.error('❌ Erro ao buscar próximos aniversários:', error);
      throw error;
    }
  }
}

module.exports = new BirthdayScheduler();


