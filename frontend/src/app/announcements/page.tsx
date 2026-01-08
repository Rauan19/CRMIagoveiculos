'use client'

import { useState, useRef, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import { FiUpload, FiDownload, FiRefreshCw, FiImage, FiX } from 'react-icons/fi'
import { formatPhone } from '@/utils/formatters'

interface EstoqueItem {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
  km?: number
  color?: string
  value?: number
  promotionValue?: number
  discount?: number
  photos?: string
}

export default function AnnouncementsPage() {
  const [estoqueItems, setEstoqueItems] = useState<EstoqueItem[]>([])
  const [selectedItem, setSelectedItem] = useState<EstoqueItem | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    modelYear: '',
    value: '',
    promotionValue: '',
    km: '',
    color: '',
    plate: '',
    phone: '',
    whatsapp: '',
    transmission: '',
    fuel: ''
  })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [loading, setLoading] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Função auxiliar para desenhar retângulo arredondado
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  useEffect(() => {
    loadEstoque()
  }, [])

  useEffect(() => {
    if (selectedItem) {
      setFormData({
        brand: selectedItem.brand || '',
        model: selectedItem.model || '',
        year: selectedItem.year?.toString() || '',
        modelYear: '',
        value: selectedItem.value?.toString() || '',
        promotionValue: selectedItem.promotionValue?.toString() || '',
        km: selectedItem.km?.toString() || '',
        color: selectedItem.color || '',
        plate: selectedItem.plate || '',
        phone: '',
        whatsapp: '',
        transmission: '',
        fuel: ''
      })
      
      // Carregar primeira foto se existir
      if (selectedItem.photos) {
        try {
          const photos = JSON.parse(selectedItem.photos)
          if (photos && photos.length > 0) {
            setUploadedImage(photos[0])
          }
        } catch (e) {
          console.error('Erro ao parsear fotos:', e)
        }
      }
    }
  }, [selectedItem])

  useEffect(() => {
    // Pequeno delay para garantir que o canvas esteja pronto
    const timer = setTimeout(() => {
      if (canvasRef.current && (uploadedImage || formData.brand || formData.model)) {
        drawAnnouncement()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [uploadedImage, formData.brand, formData.model, formData.year, formData.modelYear, formData.value, formData.promotionValue, formData.km, formData.color, formData.plate, formData.phone, formData.whatsapp, formData.transmission, formData.fuel])

  const loadEstoque = async () => {
    try {
      const response = await api.get('/estoque')
      setEstoqueItems(response.data.items || [])
    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
      setToast({ message: 'Erro ao carregar estoque', type: 'error' })
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Por favor, selecione uma imagem válida', type: 'error' })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setUploadedImage(result)
    }
    reader.readAsDataURL(file)
  }

  const drawAnnouncement = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Definir tamanho do canvas (1200x800 para redes sociais)
    canvas.width = 1200
    canvas.height = 800

    // Resetar transformações
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Fundo gradiente moderno
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    bgGradient.addColorStop(0, '#0f172a')
    bgGradient.addColorStop(0.5, '#1e293b')
    bgGradient.addColorStop(1, '#334155')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Imagem do veículo (se houver)
    if (uploadedImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        drawWithImage(img)
      }
      img.onerror = () => {
        drawWithoutImage(ctx)
      }
      img.src = uploadedImage
    } else {
      drawWithoutImage(ctx)
    }
  }

  // Função auxiliar para desenhar ícone de velocímetro (KM)
  const drawSpeedometerIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, size / 2, Math.PI * 0.25, Math.PI * 0.75)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -size / 2)
    ctx.lineTo(0, -size / 2 + 8)
    ctx.stroke()
    ctx.restore()
  }

  // Função auxiliar para desenhar ícone de câmbio
  const drawGearIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.strokeStyle = '#ffffff'
    ctx.fillStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, size / 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, 0, size / 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Função auxiliar para desenhar ícone de combustível
  const drawFuelIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-size / 3, size / 2)
    ctx.lineTo(-size / 3, -size / 2)
    ctx.lineTo(size / 3, -size / 2)
    ctx.lineTo(size / 3, size / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -size / 2)
    ctx.lineTo(0, -size / 2 - 4)
    ctx.stroke()
    ctx.restore()
  }

  const drawWithImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Desenhar imagem ocupando toda a área
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Overlay escuro no topo para melhorar legibilidade (altura reduzida)
    const topOverlay = ctx.createLinearGradient(0, 0, 0, 200)
    topOverlay.addColorStop(0, 'rgba(0, 0, 0, 0.85)')
    topOverlay.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)')
    topOverlay.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = topOverlay
    ctx.fillRect(0, 0, canvas.width, 200)

    // Logo da loja (DESENHADA DEPOIS do overlay para ficar por cima)
    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'
    logoImg.onload = () => {
      const logoWidth = 280
      const logoHeight = 120
      const logoX = canvas.width - 60 - logoWidth
      const logoY = 10 // Logo mais para cima
      
      // Desenhar logo sem fundo (por cima do overlay)
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight)
    }
    logoImg.onerror = () => {
      // Se a logo não carregar, usar texto como fallback
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'right'
      ctx.fillText('CRM IAGO VEÍCULOS', canvas.width - 60, 55)
    }
    logoImg.src = '/logo/logo2-Photoroom.png'

    // Overlay escuro na parte inferior (mais escuro, altura aumentada para valores)
    const bottomOverlay = ctx.createLinearGradient(0, canvas.height - 320, 0, canvas.height)
    bottomOverlay.addColorStop(0, 'rgba(0, 0, 0, 0)')
    bottomOverlay.addColorStop(0.3, 'rgba(0, 0, 0, 0.4)')
    bottomOverlay.addColorStop(0.6, 'rgba(0, 0, 0, 0.7)')
    bottomOverlay.addColorStop(1, 'rgba(0, 0, 0, 0.9)')
    ctx.fillStyle = bottomOverlay
    ctx.fillRect(0, canvas.height - 320, canvas.width, 320)

    // Configurar sombra para textos (mais destacada)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    const padding = 60
    let yPos = padding

    // Linha divisória mais visível no topo
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(padding, padding + 50)
    ctx.lineTo(canvas.width - padding, padding + 50)
    ctx.stroke()

    // Espaço suficiente para logo e linha divisória
    yPos = padding + 100

    // Marca e Modelo (tamanho reduzido) - com espaço adequado
    if (formData.brand || formData.model) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      
      ctx.fillStyle = '#ffffff'
      ctx.font = '300 56px Arial'
      ctx.textAlign = 'left'
      const brand = formData.brand || ''
      if (brand) {
        ctx.fillText(brand, padding, yPos)
        yPos += 70
      }
      
      ctx.font = 'bold 50px Arial'
      const model = formData.model || ''
      if (model) {
        ctx.fillText(model, padding, yPos)
        yPos += 85
      }
    }

    // Linha divisória mais visível (com mais espaço)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, yPos - 30)
    ctx.lineTo(padding + 450, yPos - 30)
    ctx.stroke()

    yPos += 10

    // Especificações organizadas em linhas
    const iconSize = 28
    const iconSpacing = 20
    let infoX = padding
    let infoY = yPos + 30
    const lineHeight = 60

    // Primeira linha: Ano (ano/anoModelo)
    if (formData.year) {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // Formato: Ano ano/anoModelo ou Ano ano se não tiver anoModelo
      const yearText = formData.modelYear ? `Ano ${formData.year}/${formData.modelYear}` : `Ano ${formData.year}`
      ctx.font = 'bold 30px Arial'
      const yearMetrics = ctx.measureText(yearText)
      const yearWidth = yearMetrics.width
      
      // Retângulo com corte inclinado no lado esquerdo (como os valores)
      const yearBoxWidth = yearWidth + 50
      const yearBoxHeight = 40
      const yearBoxX = infoX - 10
      const yearBoxY = infoY - 25
      
      ctx.beginPath()
      ctx.moveTo(yearBoxX + 20, yearBoxY) // Início do corte inclinado (canto superior esquerdo)
      ctx.lineTo(yearBoxX + yearBoxWidth, yearBoxY) // Canto superior direito
      ctx.lineTo(yearBoxX + yearBoxWidth, yearBoxY + yearBoxHeight) // Canto inferior direito
      ctx.lineTo(yearBoxX, yearBoxY + yearBoxHeight - 20) // Corte diagonal (ponto inclinado no canto inferior esquerdo)
      ctx.closePath()
      
      // Fundo transparente (sem fill)
      
      // Borda branca
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.stroke()
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 15
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 30px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(yearText, infoX, infoY)
    }

    // Segunda linha: KM (abaixo do ano)
    infoY += lineHeight
    infoX = padding
    
    if (formData.km) {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      const kmText = `KM ${parseInt(formData.km).toLocaleString('pt-BR')}`
      ctx.font = 'bold 30px Arial'
      const kmMetrics = ctx.measureText(kmText)
      const kmWidth = kmMetrics.width
      
      roundRect(ctx, infoX - 10, infoY - 25, kmWidth + 30, 40, 20)
      // Fundo transparente (sem fill)
      
      // Borda branca
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      roundRect(ctx, infoX - 10, infoY - 25, kmWidth + 30, 40, 20)
      ctx.stroke()
      
      // Removido ícone de velocímetro
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 15
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 30px Arial'
      ctx.fillText(kmText, infoX, infoY)
    }

    // Terceira linha: Câmbio e Combustível
    infoY += lineHeight
    infoX = padding

    // Câmbio com ícone
    if (formData.transmission) {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      drawGearIcon(ctx, infoX + iconSize / 2, infoY - 10, iconSize)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px Arial'
      ctx.fillText(formData.transmission, infoX + iconSize + iconSpacing, infoY)
      infoX += 200
    }

    // Combustível com ícone
    if (formData.fuel) {
      if (infoX > padding) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(infoX, infoY - 20)
        ctx.lineTo(infoX, infoY + 10)
        ctx.stroke()
        infoX += 30
      }
      
      drawFuelIcon(ctx, infoX + iconSize / 2, infoY - 10, iconSize)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px Arial'
      ctx.fillText(formData.fuel, infoX + iconSize + iconSpacing, infoY)
    }

    // Terceira linha: Cor
    if (formData.color) {
      infoY += lineHeight
      infoX = padding
      
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      const colorText = formData.color
      ctx.font = 'bold 30px Arial'
      const colorMetrics = ctx.measureText(colorText)
      const colorWidth = colorMetrics.width
      
      roundRect(ctx, infoX - 10, infoY - 25, colorWidth + 30, 40, 20)
      // Fundo transparente (sem fill)
      
      // Borda branca
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      roundRect(ctx, infoX - 10, infoY - 25, colorWidth + 30, 40, 20)
      ctx.stroke()
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 15
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 30px Arial'
      ctx.fillText(colorText, infoX, infoY)
    }

    // Câmbio com ícone (mais destacado)
    if (formData.transmission) {
      // Se está muito à direita, vai para nova linha
      if (infoX > padding + 300) {
        yPos += 60
        infoX = padding
      } else if (infoX > padding) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(infoX, infoY - 20)
        ctx.lineTo(infoX, infoY + 10)
        ctx.stroke()
        infoX += 30
      }
      
      drawGearIcon(ctx, infoX + iconSize / 2, infoY - 10, iconSize)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px Arial'
      ctx.fillText(formData.transmission, infoX + iconSize + iconSpacing, infoY)
      infoX += 150
    }

    // Combustível com ícone (mais destacado)
    if (formData.fuel) {
      // Se está muito à direita, vai para nova linha
      if (infoX > padding + 300) {
        yPos += 60
        infoX = padding
      } else if (infoX > padding) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(infoX, infoY - 20)
        ctx.lineTo(infoX, infoY + 10)
        ctx.stroke()
        infoX += 30
      }
      
      drawFuelIcon(ctx, infoX + iconSize / 2, infoY - 10, iconSize)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px Arial'
      ctx.fillText(formData.fuel, infoX + iconSize + iconSpacing, infoY)
      infoX += 150
    }

    // Cor (destacada, organizada) - sempre em nova linha se necessário
    if (formData.color) {
      // Se já tem muitos elementos na linha, vai para nova linha
      if (infoX > padding + 200) {
        yPos += 60
        infoX = padding
      } else if (infoX > padding) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(infoX, infoY - 20)
        ctx.lineTo(infoX, infoY + 10)
        ctx.stroke()
        infoX += 30
      }
      
      // Fundo destacado para cor
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      const colorText = formData.color
      ctx.font = 'bold 30px Arial'
      const colorMetrics = ctx.measureText(colorText)
      const colorWidth = colorMetrics.width
      
      roundRect(ctx, infoX - 10, infoY - 25, colorWidth + 30, 40, 20)
      // Fundo transparente (sem fill)
      
      // Borda branca
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      roundRect(ctx, infoX - 10, infoY - 25, colorWidth + 30, 40, 20)
      ctx.stroke()
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 15
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 30px Arial'
      ctx.fillText(colorText, infoX, infoY)
    }

    // Placa (se houver)
    if (formData.plate) {
      yPos += 50
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = '300 20px Arial'
      ctx.fillText(`Placa: ${formData.plate}`, padding, yPos)
    }

    // CTA destacado (parte inferior)
    const ctaY = canvas.height - padding - 50
    
    // Preço (valores bem embaixo, na mesma linha do telefone)
    if (formData.promotionValue || formData.value) {
      const priceX = canvas.width - padding
      let priceStartY = ctaY + 10 // Valores bem embaixo, na mesma altura do telefone/CTA
      
      // Se tiver valor promocional, mostra "De R$ X por R$ Y" com "Oferta Imperdível"
      if (formData.promotionValue && formData.value) {
        const originalPrice = parseFloat(formData.value).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })
        const promoPrice = parseFloat(formData.promotionValue).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })
        
        const deText = 'De'
        const porText = 'Por'
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.textAlign = 'right'
        
        // Calcular larguras dos textos
        ctx.font = 'bold 28px Arial'
        const deMetrics = ctx.measureText(deText)
        const originalMetrics = ctx.measureText(originalPrice)
        const porMetrics = ctx.measureText(porText)
        ctx.font = 'bold 42px Arial'
        const promoMetrics = ctx.measureText(promoPrice)
        
        const totalWidth = Math.max(
          deMetrics.width + 10 + originalMetrics.width,
          porMetrics.width + 10 + promoMetrics.width
        ) + 60
        
        let currentY = priceStartY
        
        // Badge "Oferta Imperdível"
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        
        ctx.font = 'bold 18px Arial'
        const ofertaText = 'OFERTA IMPERDÍVEL'
        const ofertaMetrics = ctx.measureText(ofertaText)
        const ofertaWidth = ofertaMetrics.width
        
        roundRect(ctx, priceX - ofertaWidth - 20, currentY - 45, ofertaWidth + 40, 28, 14)
        ctx.fillStyle = '#dc2626'
        ctx.fill()
        
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        roundRect(ctx, priceX - ofertaWidth - 20, currentY - 45, ofertaWidth + 40, 28, 14)
        ctx.stroke()
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 18px Arial'
        ctx.textAlign = 'right'
        ctx.fillText(ofertaText, priceX, currentY - 27)
        
        currentY += 5
        
        // Container para os preços (com corte inclinado no lado esquerdo, sem borda)
        const promoBoxWidth = totalWidth + 40 // Aumentar width
        const promoBoxHeight = 90
        const promoBoxX = priceX - promoBoxWidth
        const promoBoxY = currentY - 50
        
        // Desenhar retângulo com corte diagonal no lado esquerdo
        ctx.beginPath()
        ctx.moveTo(promoBoxX + 20, promoBoxY) // Início do corte inclinado (canto superior esquerdo)
        ctx.lineTo(promoBoxX + promoBoxWidth, promoBoxY) // Canto superior direito
        ctx.lineTo(promoBoxX + promoBoxWidth, promoBoxY + promoBoxHeight) // Canto inferior direito
        ctx.lineTo(promoBoxX, promoBoxY + promoBoxHeight - 20) // Corte diagonal (ponto inclinado no canto inferior esquerdo)
        ctx.closePath()
        
        ctx.fillStyle = 'rgba(220, 38, 38, 0.95)'
        ctx.fill()
        
        // Sem borda branca
        
        // "De" + Preço original riscado
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.font = 'bold 28px Arial'
        ctx.textAlign = 'right'
        ctx.fillText(deText, priceX - 15, currentY - 10)
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.font = 'bold 32px Arial'
        ctx.fillText(originalPrice, priceX - 15 - deMetrics.width - 10, currentY - 10)
        
        // Linha riscando o preço original
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.lineWidth = 4
        ctx.beginPath()
        const originalX = priceX - 15 - deMetrics.width - 10
        ctx.moveTo(originalX - originalMetrics.width - 5, currentY - 10)
        ctx.lineTo(originalX + 5, currentY - 10)
        ctx.stroke()
        
        // "Por" + Preço promocional em destaque
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px Arial'
        ctx.fillText(porText, priceX - 15, currentY + 35)
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 18
        ctx.shadowOffsetX = 3
        ctx.shadowOffsetY = 3
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 48px Arial'
        ctx.fillText(promoPrice, priceX - 15 - porMetrics.width - 10, currentY + 35)
      } else {
        // Preço normal (sem promoção)
        const price = parseFloat(formData.value || formData.promotionValue).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
        ctx.shadowBlur = 20
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 5
        
        ctx.font = 'bold 42px Arial'
        ctx.textAlign = 'right'
        const metrics = ctx.measureText(price)
        const textWidth = metrics.width
        
        // Aumentar mais a largura do fundo
        const boxWidth = textWidth + 140
        const boxHeight = 60
        const boxX = priceX - boxWidth
        const boxY = priceStartY - 40
        
        // Desenhar retângulo com corte diagonal no lado ESQUERDO (sem borda arredondada, sem borda branca)
        ctx.beginPath()
        ctx.moveTo(boxX + 20, boxY) // Início do corte inclinado (canto superior esquerdo)
        ctx.lineTo(boxX + boxWidth, boxY) // Canto superior direito
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight) // Canto inferior direito
        ctx.lineTo(boxX, boxY + boxHeight - 20) // Corte diagonal (ponto inclinado no canto inferior esquerdo)
        ctx.closePath()
        
        ctx.fillStyle = formData.promotionValue ? '#dc2626' : '#D4AF37' // Dourado em vez de verde
        ctx.fill()
        
        // Sem borda branca
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 48px Arial'
        ctx.fillText(price, priceX, priceStartY)
      }
    }
    
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // Linha divisória acima do CTA (mais visível)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, ctaY - 35)
    ctx.lineTo(canvas.width - padding, ctaY - 35)
    ctx.stroke()
    
    // Campo único com "FALE CONOSCO" e telefone juntos
    if (formData.whatsapp || formData.phone) {
      const contactRaw = formData.whatsapp || formData.phone
      const contact = formatPhone(contactRaw)
      
      // Medir textos
      ctx.font = 'bold 20px Arial'
      const faleConoscoText = 'FALE CONOSCO'
      const faleConoscoMetrics = ctx.measureText(faleConoscoText)
      
      ctx.font = 'bold 32px Arial'
      const contactMetrics = ctx.measureText(contact)
      
      // Calcular largura total do box (FALE CONOSCO + espaçamento + telefone)
      const spacing = 40
      const totalWidth = faleConoscoMetrics.width + spacing + contactMetrics.width + 80
      const contactBoxHeight = 50
      const contactBoxX = padding
      const contactBoxY = ctaY + 5 // Posição do box
      
      // Fundo destacado unificado
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      roundRect(ctx, contactBoxX, contactBoxY, totalWidth, contactBoxHeight, 18)
      // Fundo transparente (sem fill)
      
      // Borda branca
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      roundRect(ctx, contactBoxX, contactBoxY, totalWidth, contactBoxHeight, 18)
      ctx.stroke()
      
      // Calcular posição vertical centralizada dentro do box
      const textCenterY = contactBoxY + (contactBoxHeight / 2) + 8 // +8 para ajuste visual de centralização
      
      // Desenhar "FALE CONOSCO" à esquerda dentro do box
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(faleConoscoText, contactBoxX + 30, textCenterY)
      
      // Desenhar telefone à direita dentro do box
      ctx.font = 'bold 32px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(contact, contactBoxX + totalWidth - 30, textCenterY)
    }
  }

  const drawWithoutImage = (ctx: CanvasRenderingContext2D) => {
    // Fundo gradiente
    const bgGradient = ctx.createLinearGradient(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    bgGradient.addColorStop(0, '#1e3a8a')
    bgGradient.addColorStop(1, '#3b82f6')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)

    // Card central
    const cardWidth = canvasRef.current!.width - 100
    const cardHeight = 500
    const cardX = 50
    const cardY = (canvasRef.current!.height - cardHeight) / 2

    // Sombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 10

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 20)
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Conteúdo
    let yPos = cardY + 80

    // Badge removido

    // Título
    if (formData.brand || formData.model) {
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 52px Arial'
      ctx.textAlign = 'left'
      const title = `${formData.brand || ''} ${formData.model || ''}`.trim()
      if (title) {
        ctx.fillText(title, cardX + 40, yPos)
        yPos += 80
      }
    }

    // Informações
    const infoY = yPos
    let infoX = cardX + 40
    ctx.font = '24px Arial'

    if (formData.year) {
      ctx.fillStyle = '#64748b'
      ctx.fillText(`Ano ${formData.year}`, infoX, infoY)
      infoX += 120
    }

    if (formData.km) {
      if (infoX > cardX + 40) {
        ctx.fillStyle = '#cbd5e1'
        ctx.fillText('•', infoX, infoY)
        infoX += 30
      }
      ctx.fillStyle = '#64748b'
      ctx.fillText(`${parseInt(formData.km).toLocaleString('pt-BR')} km`, infoX, infoY)
      infoX += 150
    }

    if (formData.color) {
      if (infoX > cardX + 40) {
        ctx.fillStyle = '#cbd5e1'
        ctx.fillText('•', infoX, infoY)
        infoX += 30
      }
      ctx.fillStyle = '#64748b'
      ctx.fillText(formData.color, infoX, infoY)
    }

    // Preço
    if (formData.value) {
      yPos = cardY + 250
      ctx.fillStyle = '#D4AF37' // Dourado
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'left'
      const price = parseFloat(formData.value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })
      ctx.fillText(price, cardX + 40, yPos)
    }

    // Contato
    if (formData.phone || formData.whatsapp) {
      yPos = cardY + 350
      ctx.fillStyle = '#64748b'
      ctx.font = '20px Arial'
      ctx.textAlign = 'left'
      const contact = formData.whatsapp || formData.phone
      if (contact) {
        ctx.fillText(`📱 ${contact}`, cardX + 40, yPos)
      }
    }
  }

  const handleGenerate = () => {
    if (!formData.brand && !formData.model) {
      setToast({ message: 'Preencha pelo menos marca e modelo', type: 'error' })
      return
    }
    drawAnnouncement()
    setToast({ message: 'Anúncio gerado! Clique em Download para salvar', type: 'success' })
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      setToast({ message: 'Gere o anúncio primeiro', type: 'error' })
      return
    }

    const link = document.createElement('a')
    link.download = `anuncio-${formData.brand}-${formData.model}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setToast({ message: 'Anúncio baixado com sucesso!', type: 'success' })
  }

  const handleReset = () => {
    setSelectedItem(null)
    setUploadedImage(null)
      setFormData({
        brand: '',
        model: '',
        year: '',
        modelYear: '',
        value: '',
        promotionValue: '',
        km: '',
        color: '',
        plate: '',
        phone: '',
        whatsapp: '',
        transmission: '',
        fuel: ''
      })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gerador de Anúncios</h1>
          <p className="text-gray-600">Crie anúncios visuais profissionais para seus veículos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel Esquerdo - Formulário */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Informações do Veículo</h2>

            {/* Seleção de veículo do estoque */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar do Estoque (opcional)
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedItem?.id || ''}
                onChange={(e) => {
                  const item = estoqueItems.find(i => i.id === parseInt(e.target.value))
                  setSelectedItem(item || null)
                }}
              >
                <option value="">Selecione um veículo do estoque</option>
                {estoqueItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.brand} {item.model} {item.year} - {item.plate || 'Sem placa'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Ex: Honda"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Ex: Civic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="Ex: 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano do Modelo
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                    value={formData.modelYear}
                    onChange={(e) => setFormData({ ...formData, modelYear: e.target.value })}
                    placeholder="Ex: 2025"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Ex: 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Promocional (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.promotionValue}
                    onChange={(e) => setFormData({ ...formData, promotionValue: e.target.value })}
                    placeholder="Ex: 45000 (deixe vazio se não houver promoção)"
                  />
                </div>
              </div>
              
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mt-1">
                  Se preenchido, o valor original será mostrado riscado e este será o valor em destaque
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quilometragem
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.km}
                    onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                    placeholder="Ex: 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Ex: Branco"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  placeholder="Ex: ABC-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>

              {/* Upload de Imagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto do Veículo
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {uploadedImage ? (
                      <div className="relative">
                        <img
                          src={uploadedImage}
                          alt="Preview"
                          className="max-h-48 rounded-lg mb-2"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadedImage(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <FiUpload className="text-gray-400 mb-2" size={32} />
                        <span className="text-sm text-gray-600">
                          Clique para fazer upload
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleGenerate}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center justify-center gap-2"
                >
                  <FiRefreshCw size={18} />
                  Gerar Anúncio
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <FiDownload size={18} />
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Painel Direito - Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Preview do Anúncio</h2>
            <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto shadow-inner">
              <div className="flex justify-center items-center min-h-[400px]">
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto rounded-lg shadow-2xl border-2 border-white"
                  style={{ 
                    maxHeight: '600px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">
              <span className="font-medium">Tamanho:</span> 1200x800px (ideal para redes sociais)
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  )
}
