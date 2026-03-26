import { test, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3001/api';

function generateValidCPF() {
  // gera CPF válido (somente para teste)
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (n.every((d) => d === n[0])) n[8] = (n[8] + 1) % 10;

  const calcDigit = (digits: number[]) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (digits.length + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcDigit(n);
  const d2 = calcDigit([...n, d1]);
  return [...n, d1, d2].join('');
}

async function apiLogin(request: any) {
  const email = process.env.E2E_EMAIL || 'e2e.admin@example.com';
  const password = process.env.E2E_PASSWORD || 'Senha@123456';

  // register (idempotente)
  await request.post(`${API_URL}/auth/register`, {
    data: { name: 'E2E Admin', email, password, role: 'admin' },
  });

  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  expect(login.ok()).toBeTruthy();
  const data = await login.json();
  return { email, password, accessToken: data.accessToken as string, user: data.user };
}

async function setAuthStorage(page: any, auth: { accessToken: string; user: any }) {
  // Zustand persist usa "auth-storage" e schema { state: { accessToken, user, ... }, version }
  await page.addInitScript((payload: any) => {
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          user: payload.user,
          accessToken: payload.accessToken,
          refreshToken: null,
          isAuthenticated: true,
        },
        version: 0,
      })
    );
  }, auth);
}

test('fluxo: cria veículo via API e valida custo/venda/margem em /veiculos-a-venda', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const brand = `E2E-${Date.now()}`;
  const model = 'TEST';
  const year = new Date().getFullYear();
  const cost = 10000;
  const price = 15000;

  const created = await request.post(`${API_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      brand,
      model,
      year,
      status: 'disponivel',
      conditionStatus: 'usado',
      canalEntrada: 'PROPRIO',
      cost,
      price,
      color: 'PRETO',
      plate: `E2E${String(Math.floor(Math.random() * 9000) + 1000)}`,
    },
  });
  expect(created.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });

  await page.goto('/veiculos-a-venda');
  await expect(page.getByRole('heading', { name: /veículos à venda/i })).toBeVisible();

  // busca pelo brand criado
  await page.getByPlaceholder(/procure aqui por/i).fill(brand);

  // valida que aparece uma linha com o modelo
  await expect(page.getByText(new RegExp(brand, 'i'))).toBeVisible({ timeout: 15_000 });

  // valida valores formatados
  // (mira na linha do veículo criado, pra evitar colisão com totais e substrings)
  const row = page.locator('tbody tr', { hasText: brand });
  await expect(row).toBeVisible();
  await expect(row.getByText('10.000,00', { exact: true })).toBeVisible();
  await expect(row.getByText('15.000,00', { exact: true })).toBeVisible();
  await expect(row.getByText('5.000,00', { exact: true })).toBeVisible();
});

test('fluxo: cria cliente via API e valida que aparece em /customers', async ({ page, request }) => {
  test.setTimeout(120_000);
  const auth = await apiLogin(request);

  const nome = `Cliente E2E ${Date.now()}`;
  const cpf = generateValidCPF();
  const phone = '11999999999';

  const created = await request.post(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      name: nome,
      phone,
      pessoaType: 'Física',
      cpf,
      status: 'novo',
    },
  });

  expect(created.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/customers', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page.getByRole('heading', { name: /clientes/i })).toBeVisible({ timeout: 60_000 });

  // procura pelo nome em tela
  await expect(page.getByText(nome)).toBeVisible({ timeout: 15_000 });
});

test('fluxo: cria venda via API e valida que aparece em /sales', async ({ page, request }) => {
  const auth = await apiLogin(request);

  // cria cliente
  const nome = `Cliente Venda E2E ${Date.now()}`;
  const cpf = generateValidCPF();
  const phone = '11999999999';
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { name: nome, phone, pessoaType: 'Física', cpf, status: 'novo' },
  });
  expect(customerRes.ok()).toBeTruthy();
  const customerJson = await customerRes.json();
  const customer = customerJson.customer || customerJson;

  // cria veículo disponível
  const brand = `VENDA-${Date.now()}`;
  const model = 'E2E';
  const year = new Date().getFullYear();
  const plate = `E2${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const vehicleRes = await request.post(`${API_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      brand,
      model,
      year,
      plate,
      status: 'disponivel',
      conditionStatus: 'usado',
      cost: 10000,
      price: 14000,
      color: 'BRANCO',
    },
  });
  expect(vehicleRes.ok()).toBeTruthy();
  const vehicleJson = await vehicleRes.json();
  const vehicle = vehicleJson.vehicle || vehicleJson;

  // cria venda (sellerId = usuário logado)
  const saleRes = await request.post(`${API_URL}/sales`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      sellerId: Number(auth.user.id),
      salePrice: 14000,
      status: 'em_andamento',
      paymentMethod: 'pix',
    },
  });
  if (!saleRes.ok()) {
    const body = await saleRes.text().catch(() => '');
    throw new Error(`Falha ao criar venda: status=${saleRes.status()} body=${body}`);
  }

  // abre UI
  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/sales');
  await expect(page.getByRole('heading', { name: /vendas/i })).toBeVisible();

  // valida que a venda aparece (por placa ou nome)
  await expect(page.getByText(plate, { exact: false })).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria movimentação financeira via API e valida que aparece em /financial', async ({ page, request }) => {
  test.setTimeout(120_000);
  const auth = await apiLogin(request);

  const desc = `MOV E2E ${Date.now()}`;
  const today = new Date().toISOString();

  const txRes = await request.post(`${API_URL}/financial/transactions`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      operacao: 'pagar',
      description: desc,
      valorTitulo: 123.45,
      dataVencimento: today,
      status: 'pendente',
    },
  });
  expect(txRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/financial');
  await expect(page.getByRole('heading', { name: /financeiro/i })).toBeVisible();

  // Com paginação, o item pode cair fora da 1ª página dependendo da ordenação.
  // Estratégia: aumenta pageSize e, se necessário, pula para a última página.
  await page.locator('select[aria-label="Itens por página"]').selectOption('120');

  const item = page.getByText(desc);
  try {
    await expect(item).toBeVisible({ timeout: 8_000 });
  } catch {
    await page.getByRole('button', { name: /^última$/i }).click();
    await expect(item).toBeVisible({ timeout: 20_000 });
  }
});

test('fluxo: gera relatório de vendas em /reports', async ({ page, request }) => {
  const auth = await apiLogin(request);
  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: /relatórios/i })).toBeVisible();

  // Seleciona tipo "sales" clicando no card/botão do tipo (label do card é "Vendas")
  await page.getByRole('button', { name: /^vendas$/i }).click();
  await page.getByRole('button', { name: /^gerar$/i }).click();

  // Não pode aparecer toast de erro
  await expect(page.getByText(/erro ao carregar relatório/i)).toHaveCount(0);
  await expect(page.getByText(/selecione um tipo de relatório/i)).toHaveCount(0);

  // Deve aparecer "Resumo" ou alguma área de dados
  await expect(page.getByText(/resumo/i)).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria trade-in via API e valida que aparece em /trade-ins', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const nome = `Cliente TradeIn E2E ${Date.now()}`;
  const cpf = generateValidCPF();
  const phone = '11999999999';
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { name: nome, phone, pessoaType: 'Física', cpf, status: 'novo' },
  });
  expect(customerRes.ok()).toBeTruthy();
  const customerJson = await customerRes.json();
  const customer = customerJson.customer || customerJson;

  const tradeBrand = 'HONDA';
  const tradeModel = `E2E-TI-${Date.now()}`;
  const tradeRes = await request.post(`${API_URL}/trade-ins`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      customerId: customer.id,
      brand: tradeBrand,
      model: tradeModel,
      year: 2020,
      valueFipe: 20000,
      valueOffer: 18000,
      status: 'pendente',
    },
  });
  expect(tradeRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/trade-ins');
  await expect(page.getByRole('heading', { name: /avaliações de entrada/i })).toBeVisible();
  await expect(page.getByText(tradeModel)).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria promoção via API e valida que aparece em /promotions', async ({ page, request }) => {
  const auth = await apiLogin(request);
  const promoName = `Promo E2E ${Date.now()}`;
  const now = new Date();
  const start = now.toISOString();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const promoRes = await request.post(`${API_URL}/promotions`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      name: promoName,
      discountType: 'fixed',
      discountValue: 500,
      startDate: start,
      endDate: end,
      applicableTo: 'all',
    },
  });
  expect(promoRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/promotions');
  await expect(page.getByRole('heading', { name: /promoç/i })).toBeVisible();
  await expect(page.getByText(promoName)).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria meta via API e valida que aparece em /goals', async ({ page, request }) => {
  const auth = await apiLogin(request);
  const goalRes = await request.post(`${API_URL}/goals`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      userId: auth.user.id,
      type: 'sales',
      targetValue: 5,
      period: 'monthly',
    },
  });
  expect(goalRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/goals');
  await expect(page.getByRole('heading', { name: /metas/i })).toBeVisible();
  // valida pela tabela (evita colisão com menu/links)
  await expect(page.locator('table').getByRole('cell', { name: 'Vendas' }).first()).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria location via API e valida que aparece em /locations', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const locName = `Oficina E2E ${Date.now()}`;
  const locRes = await request.post(`${API_URL}/locations`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      location: locName,
      status: 'previsto',
      notes: 'Criado por E2E',
    },
  });
  expect(locRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/locations');
  await expect(page.getByRole('heading', { name: /localiza/i })).toBeVisible();
  await expect(page.getByText(locName)).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria pendência via API e valida que aparece em /pendencias', async ({ page, request }) => {
  const auth = await apiLogin(request);

  // precisa de veículo e responsável
  const vehicleRes = await request.post(`${API_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      brand: `PEND-${Date.now()}`,
      model: 'E2E',
      year: new Date().getFullYear(),
      status: 'disponivel',
      conditionStatus: 'usado',
      cost: 1000,
      price: 1500,
      color: 'PRATA',
    },
  });
  expect(vehicleRes.ok()).toBeTruthy();
  const vehicleJson = await vehicleRes.json();
  const vehicle = vehicleJson.vehicle || vehicleJson;

  const desc = `Pendência E2E ${Date.now()}`;
  const pendRes = await request.post(`${API_URL}/pendencias`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      vehicleId: vehicle.id,
      responsavelId: auth.user.id,
      status: 'aberto',
      descricao: desc,
    },
  });
  expect(pendRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/pendencias');
  await expect(page.getByRole('heading', { name: /pendên/i })).toBeVisible();
  await expect(page.getByText(desc)).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria sinal de negócio via API e valida que aparece em /sinal-negocio', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const nome = `Cliente Sinal E2E ${Date.now()}`;
  const cpf = generateValidCPF();
  const phone = '11999999999';
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { name: nome, phone, pessoaType: 'Física', cpf, status: 'novo' },
  });
  expect(customerRes.ok()).toBeTruthy();
  const customerJson = await customerRes.json();
  const customer = customerJson.customer || customerJson;

  const valor = 1000;
  const sinalRes = await request.post(`${API_URL}/sinal-negocio`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      customerId: customer.id,
      sellerId: auth.user.id,
      valor,
      status: 'pendente',
      formaPagamento: 'pix',
      observacoes: 'E2E',
    },
  });
  expect(sinalRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/sinal-negocio');
  await expect(page.getByRole('heading', { name: /sinal/i })).toBeVisible();
  await expect(page.getByText(nome)).toBeVisible({ timeout: 20_000 });
});

test('fluxo: cria despachante via API e valida que aparece em /despachantes', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const vehicleRes = await request.post(`${API_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      brand: `DESP-${Date.now()}`,
      model: 'E2E',
      year: new Date().getFullYear(),
      status: 'disponivel',
      conditionStatus: 'usado',
      cost: 1000,
      price: 1500,
      color: 'PRETO',
      renavam: '12345678901',
      chassi: '9BWZZZ377VT004251',
      plate: `D${String(Math.floor(Math.random() * 90000) + 10000)}`,
    },
  });
  expect(vehicleRes.ok()).toBeTruthy();
  const vehicleJson = await vehicleRes.json();
  const vehicle = vehicleJson.vehicle || vehicleJson;

  const despachanteNome = `Despachante E2E ${Date.now()}`;
  const despRes = await request.post(`${API_URL}/despachantes`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      vehicleId: vehicle.id,
      despachanteNome,
      tipo: 'saida',
    },
  });
  expect(despRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/despachantes');
  await expect(page.getByRole('heading', { name: /despach/i })).toBeVisible();
  await expect(page.getByText(despachanteNome)).toBeVisible({ timeout: 20_000 });
});

test('fluxo: gera anúncio via API e valida em /announcements', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const vehicleRes = await request.post(`${API_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      brand: `ANUNC-${Date.now()}`,
      model: 'E2E',
      year: new Date().getFullYear(),
      status: 'disponivel',
      conditionStatus: 'usado',
      cost: 1000,
      price: 1500,
      color: 'VERMELHO',
    },
  });
  expect(vehicleRes.ok()).toBeTruthy();
  const vehicleJson = await vehicleRes.json();
  const vehicle = vehicleJson.vehicle || vehicleJson;

  const genRes = await request.post(`${API_URL}/announcements/generate`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { vehicleId: vehicle.id, template: 'default' },
  });
  expect(genRes.ok()).toBeTruthy();
  const gen = await genRes.json();
  expect(typeof gen.anuncio).toBe('string');

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/announcements');
  await expect(page.getByRole('heading', { name: 'Gerador de Anúncios' })).toBeVisible();
});

test('fluxo: venda com comissão via API e valida em /commissions', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const nome = `Cliente Comissão E2E ${Date.now()}`;
  const cpf = generateValidCPF();
  const phone = '11999999999';
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { name: nome, phone, pessoaType: 'Física', cpf, status: 'novo' },
  });
  expect(customerRes.ok()).toBeTruthy();
  const customerJson = await customerRes.json();
  const customer = customerJson.customer || customerJson;

  const brand = `COM-${Date.now()}`;
  const plate = `C${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const vehicleRes = await request.post(`${API_URL}/vehicles`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      brand,
      model: 'E2E',
      year: new Date().getFullYear(),
      plate,
      status: 'disponivel',
      conditionStatus: 'usado',
      cost: 10000,
      price: 14000,
      color: 'BRANCO',
    },
  });
  expect(vehicleRes.ok()).toBeTruthy();
  const vehicleJson = await vehicleRes.json();
  const vehicle = vehicleJson.vehicle || vehicleJson;

  const commissionValue = 333.33;
  const saleRes = await request.post(`${API_URL}/sales`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      sellerId: Number(auth.user.id),
      salePrice: 14000,
      status: 'em_andamento',
      paymentMethod: 'pix',
      commission: commissionValue,
    },
  });
  expect(saleRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/commissions');
  await expect(page.getByRole('heading', { name: /comissões/i })).toBeVisible({ timeout: 30_000 });

  // Vendedor = usuário logado (ex.: E2E Admin)
  const sellerName = String(auth.user.name || 'E2E Admin');
  await expect(page.locator('table').getByRole('cell', { name: sellerName }).first()).toBeVisible({
    timeout: 25_000,
  });
  // Valor formatado pt-BR
  await expect(page.locator('table').getByText('333,33').first()).toBeVisible({ timeout: 15_000 });
});

test('fluxo: birthdays lista cliente com aniversário', async ({ page, request }) => {
  const auth = await apiLogin(request);

  const now = new Date();
  const birthDate = new Date(now.getFullYear() - 30, now.getMonth(), Math.min(now.getDate(), 28)).toISOString();
  const nome = `Aniver E2E ${Date.now()}`;
  const customerRes = await request.post(`${API_URL}/customers`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
    data: { name: nome, phone: '11999999999', pessoaType: 'Física', cpf: generateValidCPF(), birthDate },
  });
  expect(customerRes.ok()).toBeTruthy();

  await setAuthStorage(page, { accessToken: auth.accessToken, user: auth.user });
  await page.goto('/birthdays');
  await expect(page.getByRole('heading', { name: 'Aniversários' })).toBeVisible();
  await expect(page.getByText(nome, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
});

