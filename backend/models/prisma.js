const { PrismaClient } = require('@prisma/client');

// Configura Prisma com logs mínimos para evitar spam de queries em dev
const prisma = new PrismaClient({
  log: ['info', 'warn', 'error']
});

module.exports = prisma;
