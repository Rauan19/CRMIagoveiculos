type Issuer = {
  nome: string
  cnpj?: string
  ie?: string
  endereco?: string
  cidadeUf?: string
  telefone?: string
}

function moneyBR(value: number | null | undefined): string {
  if (value == null) return '-'
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function safeText(v: any): string {
  if (v == null) return '-'
  const s = String(v).trim()
  return s ? s : '-'
}

function getIssuer(): Issuer {
  // Config opcional via env (sem quebrar se não existir)
  const env = (typeof process !== 'undefined' ? (process as any).env : undefined) || {}
  return {
    nome: env.NEXT_PUBLIC_ISSUER_NAME || 'Iago Veículos',
    cnpj: env.NEXT_PUBLIC_ISSUER_CNPJ,
    ie: env.NEXT_PUBLIC_ISSUER_IE,
    endereco: env.NEXT_PUBLIC_ISSUER_ADDRESS,
    cidadeUf: env.NEXT_PUBLIC_ISSUER_CITY_UF,
    telefone: env.NEXT_PUBLIC_ISSUER_PHONE,
  }
}

export async function downloadSaleNfPdf(sale: any) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  const issuer = getIssuer()
  const margin = 14
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RECIBO / NF (SIMPLIFICADA)', margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, margin, y)
  y += 5
  doc.text(`Venda #${safeText(sale?.id)}`, margin, y)
  y += 7

  // Emitente
  doc.setFont('helvetica', 'bold')
  doc.text('Emitente', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`${issuer.nome}`, margin, y); y += 4
  if (issuer.cnpj) { doc.text(`CNPJ: ${issuer.cnpj}`, margin, y); y += 4 }
  if (issuer.ie) { doc.text(`IE: ${issuer.ie}`, margin, y); y += 4 }
  if (issuer.endereco) { doc.text(`Endereço: ${issuer.endereco}`, margin, y); y += 4 }
  if (issuer.cidadeUf) { doc.text(`Cidade/UF: ${issuer.cidadeUf}`, margin, y); y += 4 }
  if (issuer.telefone) { doc.text(`Telefone: ${issuer.telefone}`, margin, y); y += 4 }
  y += 3

  // Destinatário
  doc.setFont('helvetica', 'bold')
  doc.text('Destinatário (Cliente)', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`Nome: ${safeText(sale?.customer?.name)}`, margin, y); y += 4
  if (sale?.customer?.cpf) { doc.text(`CPF: ${safeText(sale.customer.cpf)}`, margin, y); y += 4 }
  if (sale?.customer?.phone) { doc.text(`Telefone: ${safeText(sale.customer.phone)}`, margin, y); y += 4 }
  y += 3

  // Veículo
  doc.setFont('helvetica', 'bold')
  doc.text('Veículo', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${safeText(sale?.vehicle?.brand)} ${safeText(sale?.vehicle?.model)} ${safeText(sale?.vehicle?.year)}`,
    margin,
    y
  )
  y += 4
  if (sale?.vehicle?.plate) { doc.text(`Placa: ${safeText(sale.vehicle.plate)}`, margin, y); y += 4 }
  y += 3

  // Valores
  doc.setFont('helvetica', 'bold')
  doc.text('Valores', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`Valor de Venda: ${moneyBR(sale?.salePrice)}`, margin, y); y += 4
  if (sale?.purchasePrice != null) { doc.text(`Valor de Compra: ${moneyBR(sale.purchasePrice)}`, margin, y); y += 4 }
  if (sale?.profit != null) { doc.text(`Lucro: ${moneyBR(sale.profit)}`, margin, y); y += 4 }
  if (sale?.entryValue != null) { doc.text(`Entrada: ${moneyBR(sale.entryValue)}`, margin, y); y += 4 }
  if (sale?.remainingValue != null) { doc.text(`Restante: ${moneyBR(sale.remainingValue)}`, margin, y); y += 4 }
  y += 3

  // Pagamentos
  const pms: any[] = Array.isArray(sale?.paymentMethods) ? sale.paymentMethods : []
  if (pms.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('Formas de Pagamento', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    pms.slice(0, 12).forEach((pm) => {
      const d = pm?.date ? new Date(pm.date).toLocaleDateString('pt-BR') : '-'
      const tipo = safeText(pm?.type)
      const valor = pm?.value != null ? moneyBR(Number(pm.value)) : '-'
      const banco = pm?.bancoFinanceira ? ` • Banco/Fin.: ${pm.bancoFinanceira}` : ''
      const linha = `${d} • ${tipo} • ${valor}${banco}`
      const lines = doc.splitTextToSize(linha, 180)
      doc.text(lines, margin, y)
      y += 4 * lines.length
      if (y > 270) { doc.addPage(); y = 14 }
    })
    y += 2
  }

  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(
    'Observação: este documento é um recibo/NF simplificada para uso interno. Para NF-e oficial é necessário emissão fiscal via SEFAZ.',
    margin,
    285,
    { maxWidth: 180 }
  )

  const filename = `nf-venda-${safeText(sale?.id)}.pdf`
  doc.save(filename)
}

export async function downloadVehicleNfPdf(vehicle: any) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  const issuer = getIssuer()
  const margin = 14
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RECIBO / NF (SIMPLIFICADA) — VEÍCULO', margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, margin, y)
  y += 5
  doc.text(`Veículo #${safeText(vehicle?.id)}`, margin, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.text('Emitente', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`${issuer.nome}`, margin, y); y += 4
  if (issuer.cnpj) { doc.text(`CNPJ: ${issuer.cnpj}`, margin, y); y += 4 }
  if (issuer.endereco) { doc.text(`Endereço: ${issuer.endereco}`, margin, y); y += 4 }
  y += 3

  doc.setFont('helvetica', 'bold')
  doc.text('Dados do Veículo', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.text(`Marca: ${safeText(vehicle?.brand)}`, margin, y); y += 4
  doc.text(`Modelo: ${safeText(vehicle?.model)}`, margin, y); y += 4
  doc.text(`Ano: ${safeText(vehicle?.year)}`, margin, y); y += 4
  if (vehicle?.plate) { doc.text(`Placa: ${safeText(vehicle?.plate)}`, margin, y); y += 4 }
  if (vehicle?.renavam) { doc.text(`Renavam: ${safeText(vehicle?.renavam)}`, margin, y); y += 4 }
  if (vehicle?.chassi) { doc.text(`Chassi: ${safeText(vehicle?.chassi)}`, margin, y); y += 4 }
  if (vehicle?.color) { doc.text(`Cor: ${safeText(vehicle?.color)}`, margin, y); y += 4 }
  y += 3

  doc.setFont('helvetica', 'bold')
  doc.text('Valores', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  if (vehicle?.cost != null) { doc.text(`Custo: ${moneyBR(vehicle.cost)}`, margin, y); y += 4 }
  if (vehicle?.price != null) { doc.text(`Venda: ${moneyBR(vehicle.price)}`, margin, y); y += 4 }
  if (vehicle?.precoPromocional != null && Number(vehicle.precoPromocional) > 0) {
    doc.text(`Promoção: ${moneyBR(Number(vehicle.precoPromocional))}`, margin, y); y += 4
  }

  doc.setFontSize(9)
  doc.setTextColor(80)
  doc.text(
    'Observação: este documento é um recibo/NF simplificada para uso interno. Para NF-e oficial é necessário emissão fiscal via SEFAZ.',
    margin,
    285,
    { maxWidth: 180 }
  )

  const filename = `nf-veiculo-${safeText(vehicle?.id)}.pdf`
  doc.save(filename)
}

