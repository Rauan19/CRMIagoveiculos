import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001/api';

async function ensureUser(request: any) {
  const email = process.env.E2E_EMAIL || 'e2e.admin@example.com';
  const password = process.env.E2E_PASSWORD || 'Senha@123456';

  // Register (idempotente)
  const register = await request.post(`${API_URL}/auth/register`, {
    data: { name: 'E2E Admin', email, password, role: 'admin' },
  });
  if (!register.ok()) {
    // normalmente "Email já cadastrado"
  }
  return { email, password };
}

test('login -> dashboard carrega', async ({ page, request }) => {
  const { email, password } = await ensureUser(request);

  await page.goto('/login');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  // No dashboard o h1 é "Início"
  await expect(page.getByRole('heading', { name: /início/i })).toBeVisible({ timeout: 30_000 });
});

test('veiculos-a-venda carrega e mostra filtros', async ({ page, request }) => {
  const { email, password } = await ensureUser(request);

  await page.goto('/login');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.goto('/veiculos-a-venda');
  await expect(page.getByRole('heading', { name: /veículos à venda/i })).toBeVisible();

  // Filtros (labels)
  await expect(page.locator('label', { hasText: 'Status' })).toBeVisible();
  await expect(page.locator('label', { hasText: 'Tipo' })).toBeVisible();
  await expect(page.locator('label', { hasText: 'Marcador' })).toBeVisible();
  await expect(page.getByRole('button', { name: /limpar filtros/i })).toBeVisible();
});

