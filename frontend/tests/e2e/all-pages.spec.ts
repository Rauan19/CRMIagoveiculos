import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001/api';

async function ensureUserAndLogin(page: any, request: any) {
  const email = process.env.E2E_EMAIL || 'e2e.admin@example.com';
  const password = process.env.E2E_PASSWORD || 'Senha@123456';

  // Register (idempotente)
  await request.post(`${API_URL}/auth/register`, {
    data: { name: 'E2E Admin', email, password, role: 'admin' },
  });

  await page.goto('/login');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

/**
 * Smoke de navegação: garante que as páginas carregam (sem 404 e sem redirect pro /login).
 * Observação: algumas páginas podem depender de dados; aqui a validação é “carregou a UI base”.
 */
test('todas as páginas principais carregam', async ({ page, request }) => {
  // Rotas públicas
  const publicRoutes = ['/', '/login', '/register'];

  // Rotas protegidas (todas as páginas do app que você tem hoje)
  const protectedRoutes = [
    '/dashboard',
    '/customers',
    '/users',
    '/vehicles',
    '/veiculos-a-venda',
    '/veiculos-vendidos',
    '/estoque',
    '/sales',
    '/financial',
    '/financings',
    '/refinanciamento',
    '/pendencias',
    '/goals',
    '/announcements',
    '/birthdays',
    '/locations',
    '/reports',
    '/promotions',
    '/trade-ins',
    '/fipe',
    '/despachantes',
    '/sinal-negocio',
    '/commissions',
    '/quitacao',
    '/quitacao/admin',
    '/lancamentos',
    '/my-account',
  ];

  // Públicas
  for (const route of publicRoutes) {
    await test.step(`abre ${route}`, async () => {
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(res?.ok()).toBeTruthy();
      await expect(page.getByText(/rota não encontrada/i)).toHaveCount(0);
    });
  }

  // Login
  await ensureUserAndLogin(page, request);

  // Protegidas
  for (const route of protectedRoutes) {
    await test.step(`abre ${route}`, async () => {
      // Algumas páginas podem fazer navegação interna/redirect; o importante é não crashar e não cair no login.
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      // não pode cair pro login
      await expect(page).not.toHaveURL(/\/login/);

      // não pode ser 404 do app
      await expect(page.getByText(/rota não encontrada/i)).toHaveCount(0);
      await expect(page.getByText(/not found/i)).toHaveCount(0);
    });
  }
});

