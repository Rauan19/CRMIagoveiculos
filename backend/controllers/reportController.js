const prisma = require('../models/prisma');

class ReportController {
  async getDashboardStats(req, res) {
    try {
      const { period = 'all', startDate: customStartDate, endDate: customEndDate } = req.query; // 'day', 'week', 'month', 'year', 'all'
      
      // Calcular datas baseado no período ou usar datas customizadas
      let startDate = null;
      let endDate = null;
      const now = new Date();
      
      // Se houver datas customizadas, usar elas
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        // Adicionar 23:59:59 ao final do dia
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Caso contrário, usar o período pré-definido
        switch (period) {
          case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
          default:
            startDate = null;
            endDate = null;
        }
      }

      // Construir where para vendas
      const salesWhere = {};
      if (startDate && endDate) {
        salesWhere.date = { gte: startDate, lte: endDate };
      } else if (startDate) {
        salesWhere.date = { gte: startDate };
      }

      // Contar clientes (sempre total, independente do período)
      const totalCustomers = await prisma.customer.count();

      // Contar veículos por status (sempre total)
      const totalVehicles = await prisma.vehicle.count();
      const vehiclesDisponivel = await prisma.vehicle.count({ where: { status: 'disponivel' } });
      const vehiclesReservado = await prisma.vehicle.count({ where: { status: 'reservado' } });
      const vehiclesVendido = await prisma.vehicle.count({ where: { status: 'vendido' } });

      // Estatísticas de vendas com filtro de período
      const totalSales = await prisma.sale.count({ where: salesWhere });
      
      // Buscar vendas do período para calcular receita e lucro
      const sales = await prisma.sale.findMany({
        where: salesWhere,
        select: {
          salePrice: true,
          profit: true,
          date: true,
        },
        orderBy: { date: 'asc' }
      });

      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
      const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);

      // Preparar dados para gráficos (agrupar por período)
      const chartData = [];
      if (sales.length > 0) {
        const grouped = {};
        
        sales.forEach(sale => {
          const saleDate = new Date(sale.date);
          let key;
          
          switch (period) {
            case 'day':
              key = saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              break;
            case 'week':
            case 'month':
              key = saleDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              break;
            case 'year':
              key = saleDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
              break;
            default:
              key = saleDate.toLocaleDateString('pt-BR');
          }
          
          if (!grouped[key]) {
            grouped[key] = { date: key, revenue: 0, profit: 0, count: 0 };
          }
          grouped[key].revenue += sale.salePrice || 0;
          grouped[key].profit += sale.profit || 0;
          grouped[key].count += 1;
        });
        
        chartData.push(...Object.values(grouped));
        // Ordenar por data
        chartData.sort((a, b) => {
          try {
            // Tentar converter para Date para ordenação correta
            const dateA = new Date(a.date.split('/').reverse().join('-'));
            const dateB = new Date(b.date.split('/').reverse().join('-'));
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              return dateA.getTime() - dateB.getTime();
            }
          } catch (e) {
            // Se falhar, usar ordenação alfabética
          }
          return a.date.localeCompare(b.date);
        });
      }

      res.json({
        customers: {
          total: totalCustomers
        },
        vehicles: {
          total: totalVehicles,
          disponivel: vehiclesDisponivel,
          reservado: vehiclesReservado,
          vendido: vehiclesVendido
        },
        sales: {
          total: totalSales,
          revenue: totalRevenue,
          profit: totalProfit
        },
        chartData: chartData
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
  async getSalesReport(req, res) {
    try {
      const { startDate, endDate, sellerId } = req.query;
      
      const where = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }
      if (sellerId) where.sellerId = parseInt(sellerId);

      const sales = await prisma.sale.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true }
          },
          vehicle: {
            select: { id: true, brand: true, model: true, year: true, cost: true }
          },
          seller: {
            select: { id: true, name: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      const totalVendas = sales.length;
      const valorTotal = sales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

      // Por vendedor
      const porVendedor = {};
      sales.forEach(sale => {
        const sellerName = sale.seller.name;
        if (!porVendedor[sellerName]) {
          porVendedor[sellerName] = { count: 0, total: 0 };
        }
        porVendedor[sellerName].count++;
        porVendedor[sellerName].total += sale.salePrice;
      });

      res.json({
        periodo: {
          startDate,
          endDate
        },
        resumo: {
          totalVendas,
          valorTotal,
          ticketMedio
        },
        vendas: sales,
        porVendedor
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de vendas:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  async getProfitabilityReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const where = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          vehicle: true,
          seller: {
            select: { id: true, name: true }
          }
        }
      });

      const lucratividade = sales.map(sale => {
        const custo = sale.vehicle?.cost || 0;
        const venda = sale.salePrice || 0;
        const lucro = venda - custo;
        const margem = venda > 0 ? ((lucro / venda) * 100) : 0;

        return {
          saleId: sale.id,
          vehicle: `${sale.vehicle?.brand} ${sale.vehicle?.model} ${sale.vehicle?.year}`,
          custo: custo,
          venda: venda,
          lucro: lucro,
          margem: margem.toFixed(2) + '%',
          vendedor: sale.seller.name,
          data: sale.date
        };
      });

      const totalLucro = lucratividade.reduce((sum, l) => sum + l.lucro, 0);
      const margemMedia = sales.length > 0 
        ? (lucratividade.reduce((sum, l) => sum + parseFloat(l.margem), 0) / sales.length).toFixed(2)
        : 0;

      res.json({
        resumo: {
          totalVendas: sales.length,
          totalLucro,
          margemMedia: margemMedia + '%'
        },
        detalhes: lucratividade
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de lucratividade:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  async getVehiclesStuckReport(req, res) {
    try {
      const { days = 30 } = req.query;
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(days));

      const vehicles = await prisma.vehicle.findMany({
        where: {
          status: 'disponivel',
          createdAt: {
            lte: dateLimit
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const totalValue = vehicles.reduce((sum, v) => sum + (v.cost || 0), 0);

      res.json({
        total: vehicles.length,
        valorTotal: totalValue,
        dias: parseInt(days),
        veiculos: vehicles.map(v => ({
          id: v.id,
          descricao: `${v.brand} ${v.model} ${v.year}`,
          custo: v.cost || 0,
          preco: v.price || 0,
          diasParado: Math.floor((new Date() - new Date(v.createdAt)) / (1000 * 60 * 60 * 24)),
          createdAt: v.createdAt
        }))
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de veículos parados:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  async getCustomersReport(req, res) {
    try {
      const { status, startDate, endDate } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const customers = await prisma.customer.findMany({
        where,
        include: {
          vehicles: {
            select: { id: true, brand: true, model: true, year: true }
          },
          sales: {
            select: { id: true, salePrice: true, date: true }
          },
          tradeIns: {
            select: { id: true, valueOffer: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalCompras = customers.reduce((sum, c) => sum + (c.sales?.length || 0), 0);
      const valorTotalCompras = customers.reduce((sum, c) => {
        const salesTotal = c.sales?.reduce((s, sale) => s + (sale.salePrice || 0), 0) || 0;
        return sum + salesTotal;
      }, 0);

      res.json({
        resumo: {
          totalClientes: customers.length,
          totalCompras,
          valorTotalCompras
        },
        porStatus: customers.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {}),
        clientes: customers.map(c => ({
          id: c.id,
          nome: c.name,
          telefone: c.phone,
          email: c.email,
          cpf: c.cpf,
          cidade: c.city,
          status: c.status,
          totalVeiculos: c.vehicles?.length || 0,
          totalCompras: c.sales?.length || 0,
          valorTotalCompras: c.sales?.reduce((s, sale) => s + (sale.salePrice || 0), 0) || 0,
          totalTradeIns: c.tradeIns?.length || 0,
          createdAt: c.createdAt
        }))
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de clientes:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  async getVehiclesReport(req, res) {
    try {
      const { status, brand, minYear, maxYear, minPrice, maxPrice } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (brand) where.brand = { contains: brand, mode: 'insensitive' };
      if (minYear || maxYear) {
        where.year = {};
        if (minYear) where.year.gte = parseInt(minYear);
        if (maxYear) where.year.lte = parseInt(maxYear);
      }
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }

      const vehicles = await prisma.vehicle.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          },
          sale: {
            select: { id: true, salePrice: true, date: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const porStatus = vehicles.reduce((acc, v) => {
        acc[v.status] = (acc[v.status] || 0) + 1;
        return acc;
      }, {});

      const valorTotalEstoque = vehicles
        .filter(v => v.status === 'disponivel')
        .reduce((sum, v) => sum + (v.cost || 0), 0);

      const valorTotalVenda = vehicles
        .filter(v => v.status === 'disponivel')
        .reduce((sum, v) => sum + (v.price || 0), 0);

      res.json({
        resumo: {
          total: vehicles.length,
          disponivel: porStatus.disponivel || 0,
          reservado: porStatus.reservado || 0,
          vendido: porStatus.vendido || 0,
          valorTotalEstoque,
          valorTotalVenda
        },
        porMarca: vehicles.reduce((acc, v) => {
          acc[v.brand] = (acc[v.brand] || 0) + 1;
          return acc;
        }, {}),
        veiculos: vehicles.map(v => ({
          id: v.id,
          descricao: `${v.brand} ${v.model} ${v.year}`,
          marca: v.brand,
          modelo: v.model,
          ano: v.year,
          placa: v.plate,
          km: v.km,
          cor: v.color,
          valorVenda: v.price || 0,
          valorCompra: v.cost || 0,
          valorTabela: v.tableValue || 0,
          tipoGasto: v.expenseType,
          valorGasto: v.expenseValue || 0,
          status: v.status,
          cliente: v.customer?.name || null,
          vendido: v.sale ? true : false,
          dataVenda: v.sale?.date || null,
          createdAt: v.createdAt
        }))
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de veículos:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  async getTradeInsReport(req, res) {
    try {
      const { status, startDate, endDate } = req.query;
      
      const where = {};
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const tradeIns = await prisma.tradeIn.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          },
          sale: {
            select: { id: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalValorFipe = tradeIns.reduce((sum, t) => sum + (t.valueFipe || 0), 0);
      const totalValorOferecido = tradeIns.reduce((sum, t) => sum + (t.valueOffer || 0), 0);
      const diferencaMedia = tradeIns.length > 0 
        ? (totalValorOferecido - totalValorFipe) / tradeIns.length 
        : 0;

      res.json({
        resumo: {
          total: tradeIns.length,
          totalValorFipe,
          totalValorOferecido,
          diferencaMedia,
          porStatus: tradeIns.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          }, {})
        },
        tradeIns: tradeIns.map(t => ({
          id: t.id,
          cliente: t.customer?.name || '',
          telefone: t.customer?.phone || '',
          veiculo: `${t.brand} ${t.model} ${t.year}`,
          marca: t.brand,
          modelo: t.model,
          ano: t.year,
          km: t.km || 0,
          valorFipe: t.valueFipe,
          valorOferecido: t.valueOffer,
          diferenca: t.valueOffer - t.valueFipe,
          percentual: t.valueFipe > 0 
            ? (((t.valueOffer - t.valueFipe) / t.valueFipe) * 100).toFixed(2) + '%'
            : '0%',
          status: t.status,
          vendido: t.sale ? true : false,
          createdAt: t.createdAt
        }))
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de trade-ins:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  /**
   * Relatório de performance por vendedor
   */
  async getSellerPerformanceReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const where = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          seller: {
            select: { id: true, name: true, email: true }
          },
          vehicle: {
            select: { brand: true, model: true, year: true, cost: true }
          }
        }
      });

      // Agrupar por vendedor
      const performanceBySeller = {};
      
      sales.forEach(sale => {
        const sellerId = sale.sellerId;
        const sellerName = sale.seller.name;
        
        if (!performanceBySeller[sellerId]) {
          performanceBySeller[sellerId] = {
            sellerId,
            sellerName: sellerName,
            sellerEmail: sale.seller.email,
            totalSales: 0,
            totalRevenue: 0,
            totalProfit: 0,
            averageTicket: 0,
            averageProfit: 0,
            commissionTotal: 0,
            sales: []
          };
        }

        const salePrice = sale.salePrice || 0;
        const profit = sale.profit || 0;
        const commission = sale.commission || 0;

        performanceBySeller[sellerId].totalSales++;
        performanceBySeller[sellerId].totalRevenue += salePrice;
        performanceBySeller[sellerId].totalProfit += profit;
        performanceBySeller[sellerId].commissionTotal += commission;
        
        performanceBySeller[sellerId].sales.push({
          id: sale.id,
          vehicle: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
          salePrice,
          profit,
          commission,
          date: sale.date
        });
      });

      // Calcular médias
      const performance = Object.values(performanceBySeller).map(seller => ({
        ...seller,
        averageTicket: seller.totalSales > 0 ? seller.totalRevenue / seller.totalSales : 0,
        averageProfit: seller.totalSales > 0 ? seller.totalProfit / seller.totalSales : 0
      }));

      // Ordenar por total de vendas
      performance.sort((a, b) => b.totalSales - a.totalSales);

      res.json({
        periodo: {
          startDate,
          endDate
        },
        resumo: {
          totalVendedores: performance.length,
          totalVendas: sales.length
        },
        performance
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de performance por vendedor:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  /**
   * Relatório de veículos mais vendidos
   */
  async getTopSellingVehiclesReport(req, res) {
    try {
      const { startDate, endDate, limit = 10 } = req.query;
      
      const where = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          vehicle: {
            select: { brand: true, model: true, year: true, cost: true }
          }
        }
      });

      // Agrupar por veículo (marca + modelo + ano)
      const vehiclesMap = {};
      
      sales.forEach(sale => {
        const key = `${sale.vehicle.brand}|${sale.vehicle.model}|${sale.vehicle.year}`;
        
        if (!vehiclesMap[key]) {
          vehiclesMap[key] = {
            brand: sale.vehicle.brand,
            model: sale.vehicle.model,
            year: sale.vehicle.year,
            description: `${sale.vehicle.brand} ${sale.vehicle.model} ${sale.vehicle.year}`,
            totalSold: 0,
            totalRevenue: 0,
            totalProfit: 0,
            averagePrice: 0,
            averageProfit: 0
          };
        }

        const salePrice = sale.salePrice || 0;
        const profit = sale.profit || 0;

        vehiclesMap[key].totalSold++;
        vehiclesMap[key].totalRevenue += salePrice;
        vehiclesMap[key].totalProfit += profit;
      });

      // Calcular médias e converter para array
      const topVehicles = Object.values(vehiclesMap).map(vehicle => ({
        ...vehicle,
        averagePrice: vehicle.totalSold > 0 ? vehicle.totalRevenue / vehicle.totalSold : 0,
        averageProfit: vehicle.totalSold > 0 ? vehicle.totalProfit / vehicle.totalSold : 0
      }));

      // Ordenar por quantidade vendida
      topVehicles.sort((a, b) => b.totalSold - a.totalSold);

      // Limitar quantidade
      const limited = topVehicles.slice(0, parseInt(limit));

      res.json({
        periodo: {
          startDate,
          endDate
        },
        limit: parseInt(limit),
        total: topVehicles.length,
        veiculos: limited
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de veículos mais vendidos:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  /**
   * Análise de lucratividade por período
   */
  async getProfitabilityAnalysisReport(req, res) {
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query; // 'day', 'week', 'month', 'year'
      
      const where = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          vehicle: {
            select: { cost: true }
          }
        },
        orderBy: { date: 'asc' }
      });

      // Agrupar por período
      const periods = {};
      
      sales.forEach(sale => {
        const date = new Date(sale.date);
        let periodKey;

        switch (groupBy) {
          case 'day':
            periodKey = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'year':
            periodKey = date.getFullYear().toString();
            break;
          default:
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!periods[periodKey]) {
          periods[periodKey] = {
            period: periodKey,
            totalSales: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            averageMargin: 0
          };
        }

        const salePrice = sale.salePrice || 0;
        const cost = sale.vehicle?.cost || 0;
        const profit = sale.profit || (salePrice - cost);

        periods[periodKey].totalSales++;
        periods[periodKey].totalRevenue += salePrice;
        periods[periodKey].totalCost += cost;
        periods[periodKey].totalProfit += profit;
      });

      // Calcular margem média
      const analysis = Object.values(periods).map(period => ({
        ...period,
        averageMargin: period.totalRevenue > 0 
          ? ((period.totalProfit / period.totalRevenue) * 100).toFixed(2) + '%'
          : '0%'
      }));

      // Ordenar por período
      analysis.sort((a, b) => a.period.localeCompare(b.period));

      // Calcular totais
      const totals = {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, s) => sum + (s.salePrice || 0), 0),
        totalProfit: sales.reduce((sum, s) => sum + (s.profit || 0), 0),
        averageMargin: sales.length > 0 
          ? ((sales.reduce((sum, s) => sum + (s.profit || 0), 0) / sales.reduce((sum, s) => sum + (s.salePrice || 0), 0)) * 100).toFixed(2) + '%'
          : '0%'
      };

      res.json({
        periodo: {
          startDate,
          endDate,
          groupBy
        },
        totals,
        analysis
      });
    } catch (error) {
      console.error('Erro ao gerar análise de lucratividade:', error);
      res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }
}

module.exports = new ReportController();

