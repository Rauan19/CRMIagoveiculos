/**
 * Smoke test rápido do backend (sem Jest).
 * Objetivo: validar que API sobe, conecta no DB, consegue autenticar e acessar rotas protegidas.
 *
 * Uso:
 * - BASE_URL=http://localhost:3001 node scripts/smoke.js
 */
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth({ timeoutMs = 30000 } = {}) {
  const start = Date.now();
  let lastErr = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
      if (res.status === 200) return true;
    } catch (e) {
      lastErr = e;
    }
    await sleep(750);
  }

  if (lastErr) throw lastErr;
  throw new Error('Healthcheck timeout');
}

async function main() {
  console.log(`[smoke] BASE_URL=${BASE_URL}`);

  await waitForHealth();
  console.log('[smoke] /health OK');

  // Register (idempotente: se já existir, seguimos pro login)
  const email = process.env.SMOKE_EMAIL || 'smoke.admin@example.com';
  const password = process.env.SMOKE_PASSWORD || 'Senha@123456';
  const name = process.env.SMOKE_NAME || 'Smoke Admin';

  try {
    await axios.post(
      `${BASE_URL}/api/auth/register`,
      { name, email, password, role: 'admin' },
      { timeout: 10000 }
    );
    console.log('[smoke] register OK');
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message;
    console.log(`[smoke] register skipped (${msg})`);
  }

  const loginRes = await axios.post(
    `${BASE_URL}/api/auth/login`,
    { email, password },
    { timeout: 10000 }
  );

  const accessToken = loginRes.data?.accessToken;
  if (!accessToken) {
    throw new Error('Login não retornou accessToken');
  }
  console.log('[smoke] login OK');

  const authed = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  // Rotas protegidas essenciais (verifica ao menos 200 e tipo esperado)
  const vehicles = await authed.get('/api/vehicles', { params: { status: 'disponivel' } });
  if (!Array.isArray(vehicles.data)) throw new Error('/api/vehicles não retornou array');
  console.log(`[smoke] /api/vehicles OK (count=${vehicles.data.length})`);

  const customers = await authed.get('/api/customers');
  if (!Array.isArray(customers.data)) throw new Error('/api/customers não retornou array');
  console.log(`[smoke] /api/customers OK (count=${customers.data.length})`);

  const users = await authed.get('/api/users');
  if (!Array.isArray(users.data)) throw new Error('/api/users não retornou array');
  console.log(`[smoke] /api/users OK (count=${users.data.length})`);

  const commissions = await authed.get('/api/commissions', { params: { quick: 'current' } });
  if (!Array.isArray(commissions.data)) throw new Error('/api/commissions não retornou array');
  console.log(`[smoke] /api/commissions OK (count=${commissions.data.length})`);

  const quitacoes = await authed.get('/api/quitacoes');
  if (!Array.isArray(quitacoes.data)) throw new Error('/api/quitacoes não retornou array');
  console.log(`[smoke] /api/quitacoes OK (count=${quitacoes.data.length})`);

  console.log('[smoke] SUCCESS');
}

main().catch((err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  console.error('[smoke] FAILED', status ? `status=${status}` : '', data ? JSON.stringify(data) : '');
  console.error(err?.stack || err);
  process.exit(1);
});

