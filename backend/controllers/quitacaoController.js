const prisma = require('../models/prisma');

function formatVehicleLabel(v) {
  if (!v) return ''
  const parts = [
    v.brand,
    v.model,
    v.color,
    v.year,
    v.plate,
  ].filter(Boolean)
  return parts.join(' ').toUpperCase()
}

function situacaoLabel(status) {
  const s = (status || '').toLowerCase()
  const map = {
    vendido: 'Vendido',
    disponivel: 'Disponível',
    reservado: 'Reservado',
    excluido: 'Excluído',
    excluído: 'Excluído',
  }
  return map[s] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '—')
}

function rowToDto(p) {
  const v = p.vehicle
  return {
    id: p.id,
    vehicleId: p.vehicleId,
    data: p.primeiroVcto,
    veiculoTexto: formatVehicleLabel(v),
    situacao: situacaoLabel(v?.status),
    situacaoRaw: v?.status || '',
    valorQuitacao: p.valorQuitacao,
    qtdParcelas: p.qtdParcelas,
    valorParcela: p.valorParcela,
    valorPago: p.valorPago != null ? p.valorPago : 0,
    primeiroVcto: p.primeiroVcto,
    observacoesInternas: p.observacoesInternas || null,
    createdAt: p.createdAt,
    vehicle: v
      ? {
          id: v.id,
          brand: v.brand,
          model: v.model,
          year: v.year,
          color: v.color,
          plate: v.plate,
          status: v.status,
        }
      : null,
  }
}

class QuitacaoController {
  async list(req, res) {
    try {
      const { search, situacao } = req.query

      const whereVehicle = {}
      if (situacao && String(situacao).trim()) {
        whereVehicle.status = String(situacao).trim().toLowerCase()
      }

      const items = await prisma.parcelaQuitacao.findMany({
        where: Object.keys(whereVehicle).length ? { vehicle: whereVehicle } : {},
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              color: true,
              plate: true,
              status: true,
            },
          },
        },
        orderBy: { primeiroVcto: 'desc' },
      })

      let rows = items.map(rowToDto)

      if (search && String(search).trim()) {
        const q = String(search).trim().toLowerCase()
        rows = rows.filter((r) => {
          const t = `${r.veiculoTexto} ${r.vehicle?.plate || ''}`.toLowerCase()
          return t.includes(q)
        })
      }

      res.json(rows)
    } catch (e) {
      console.error('Erro ao listar quitações:', e)
      res.status(500).json({ error: 'Erro ao listar quitações' })
    }
  }

  async getById(req, res) {
    try {
      const id = parseInt(req.params.id, 10)
      if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

      const p = await prisma.parcelaQuitacao.findUnique({
        where: { id },
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              color: true,
              plate: true,
              status: true,
              chassi: true,
              renavam: true,
            },
          },
        },
      })
      if (!p) return res.status(404).json({ error: 'Quitação não encontrada' })
      res.json(rowToDto(p))
    } catch (e) {
      console.error('Erro ao buscar quitação:', e)
      res.status(500).json({ error: 'Erro ao buscar quitação' })
    }
  }

  async delete(req, res) {
    try {
      const id = parseInt(req.params.id, 10)
      if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

      await prisma.parcelaQuitacao.delete({ where: { id } })
      res.json({ ok: true })
    } catch (e) {
      if (e.code === 'P2025') {
        return res.status(404).json({ error: 'Quitação não encontrada' })
      }
      console.error('Erro ao excluir quitação:', e)
      res.status(500).json({ error: 'Erro ao excluir quitação' })
    }
  }
}

module.exports = new QuitacaoController()
