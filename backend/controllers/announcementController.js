const prisma = require('../models/prisma');

class AnnouncementController {
  async generate(req, res) {
    try {
      const { vehicleId, template = 'default' } = req.body;

      if (!vehicleId) {
        return res.status(400).json({ error: 'vehicleId é obrigatório' });
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: parseInt(vehicleId) }
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Veículo não encontrado' });
      }

      // Gerar texto do anúncio
      const anuncio = this.generateAnnouncementText(vehicle, template);

      res.json({
        vehicleId: vehicle.id,
        anuncio,
        template,
        dados: {
          marca: vehicle.brand,
          modelo: vehicle.model,
          ano: vehicle.year,
          km: vehicle.km,
          cor: vehicle.color,
          preco: vehicle.price
        }
      });
    } catch (error) {
      console.error('Erro ao gerar anúncio:', error);
      res.status(500).json({ error: 'Erro ao gerar anúncio' });
    }
  }

  async getTemplates(req, res) {
    res.json({
      templates: [
        {
          id: 'default',
          name: 'Padrão',
          description: 'Anúncio padrão com todas as informações'
        },
        {
          id: 'short',
          name: 'Curto',
          description: 'Anúncio resumido para redes sociais'
        },
        {
          id: 'detailed',
          name: 'Detalhado',
          description: 'Anúncio completo com todos os detalhes'
        },
        {
          id: 'premium',
          name: 'Premium',
          description: 'Anúncio destacado para veículos premium'
        }
      ]
    });
  }

  generateAnnouncementText(vehicle, template) {
    const { brand, model, year, km, color, price } = vehicle;
    
    const kmText = km ? `${km.toLocaleString('pt-BR')} km` : 'KM não informado';
    const corText = color ? `Cor: ${color}` : '';
    const precoText = `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    switch (template) {
      case 'short':
        return `🚗 ${brand} ${model} ${year}\n${kmText}\n${precoText}\n\nEntre em contato!`;
      
      case 'detailed':
        return `🏎️ ${brand} ${model} ${year}

📊 Especificações:
• Ano: ${year}
• Quilometragem: ${kmText}
${color ? `• ${corText}` : ''}
• Preço: ${precoText}

✅ Veículo em ótimo estado!
✅ Documentação em dia!
✅ Pronto para transferência!

📞 Entre em contato para mais informações e agende sua visita!`;

      case 'premium':
        return `✨ ${brand} ${model} ${year} - VEÍCULO PREMIUM ✨

🎯 Destaques:
• Ano ${year}
• ${kmText}
${color ? `• ${corText}` : ''}
• Investimento: ${precoText}

💎 Características:
✅ Estado de conservação impecável
✅ Manutenção em dia
✅ Histórico completo
✅ Pronto para uso imediato

🏆 Não perca esta oportunidade única!

📱 Fale conosco e garanta seu veículo!`;

      case 'default':
      default:
        return `🚗 ${brand} ${model} ${year}

📋 Informações:
• Ano: ${year}
• Quilometragem: ${kmText}
${color ? `• ${corText}` : ''}
• Preço: ${precoText}

✅ Veículo disponível para venda
✅ Documentação em dia
✅ Aceitamos seu veículo como entrada

📞 Entre em contato para mais informações!`;
    }
  }
}

module.exports = new AnnouncementController();



