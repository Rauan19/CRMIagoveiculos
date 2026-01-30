'use client'

import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import Layout from '@/components/Layout'
import api from '@/services/api'
import ConfirmModal from '@/components/ConfirmModal'
import Toast from '@/components/Toast'
import { FiPlus, FiEdit, FiTrash2, FiX, FiSearch, FiFilter, FiMoreVertical, FiEye, FiFileText } from 'react-icons/fi'
import { formatCPF, formatPhone, formatCNPJ, formatRG, formatCEP, removeMask, valorPorExtensoReais } from '@/utils/formatters'

const EMPRESA_NOME = 'Iago Veiculos'
const EMPRESA_CNPJ = '42.144.408/0001-87'
const EMPRESA_CIDADE = 'Cruz das Almas'

interface Despachante {
  id: number
  tipo: string
  despachanteNome?: string
  vehicleId?: number
  fornecedorId?: number
  customerId?: number
  dataEnvio?: string
  dataRetorno?: string
  dataEntrega?: string
  obsAdicional?: string
  municipioOrigem?: string
  municipioDestino?: string
  documentos?: any
  valores?: any
  vehicle?: {
    id: number
    brand: string
    model: string
    year: number
    plate?: string
    chassi?: string
    renavam?: string
  }
  customer?: {
    id: number
    name: string
    phone: string
  }
  createdAt: string
}

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
}

interface Customer {
  id: number
  name: string
  phone: string
}

const documentosList = [
  'Autorização do despachante',
  'Averbação de divórcio',
  'Certidão de casamento',
  'Certidão simplificada',
  'CNH',
  'Comp. Residência',
  'Contrato de alienação',
  'Contrato Social',
  'CPF',
  'Decalque Chassis',
  'Decalque Motor',
  'Declaração de extravio',
  'DUT',
  'Encerramento Leasing',
  'IPVA',
  'Laudo de transferência',
  'Licenciamento',
  'Multa',
  'Nota fiscal de entrada',
  'Nota fiscal de saída',
  'Outro',
  'Placa Mercosul',
  'Procuração Comprador',
  'Procuração Vendedor',
  'Recibo',
  'RG',
  'Seguro Obrigatório'
]

export default function DespachantesPage() {
  const [despachantes, setDespachantes] = useState<Despachante[]>([])
  const [filteredDespachantes, setFilteredDespachantes] = useState<Despachante[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos' | 'valores'>('dados')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // Estados para filtros
  const [filterTipo, setFilterTipo] = useState<string>('')
  const [filterDataEnvioInicio, setFilterDataEnvioInicio] = useState<string>('')
  const [filterDataEnvioFim, setFilterDataEnvioFim] = useState<string>('')
  const [filterDataRetornoInicio, setFilterDataRetornoInicio] = useState<string>('')
  const [filterDataRetornoFim, setFilterDataRetornoFim] = useState<string>('')
  const [filterDataEntregaInicio, setFilterDataEntregaInicio] = useState<string>('')
  const [filterDataEntregaFim, setFilterDataEntregaFim] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [formData, setFormData] = useState({
    tipo: 'saida',
    despachanteNome: '',
    vehicleId: '',
    fornecedorId: '',
    customerId: '',
    dataEnvio: '',
    dataRetorno: '',
    dataEntrega: '',
    obsAdicional: '',
    municipioOrigem: '',
    municipioDestino: '',
    documentos: [] as string[],
    valores: {} as any,
  })

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [fornecedorSearch, setFornecedorSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [showCustosModal, setShowCustosModal] = useState(false)
  const [custos, setCustos] = useState<Array<{ descricao: string; valor: string }>>([{ descricao: '', valor: '' }])
  const [creatingCustomerFor, setCreatingCustomerFor] = useState<'fornecedor' | 'cliente' | null>(null)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [createCustomerActiveStep, setCreateCustomerActiveStep] = useState(1)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingDespachante, setViewingDespachante] = useState<Despachante | null>(null)
  const [imprimirExportarValue, setImprimirExportarValue] = useState('')
  const [newCustomerData, setNewCustomerData] = useState({
    pessoaType: 'Física' as 'Física' | 'Jurídica',
    cpf: '',
    name: '',
    apelido: '',
    rg: '',
    nomeMae: '',
    phone: '',
    email: '',
    facebook: '',
    instagram: '',
    website: '',
    nacionalidade: 'BRASILEIRA',
    naturalidade: '',
    birthDate: '',
    sexo: '',
    estadoCivil: '',
    profissao: '',
    cnh: '',
    cnhVencimento: '',
    cep: '',
    city: '',
    district: '',
    address: '',
    adicional: '',
    pendenciasFinanceiras: '',
    marcador: '',
    status: 'novo',
  })

  useEffect(() => {
    loadData()
    loadVehicles()
    loadCustomers()
  }, [])

  useEffect(() => {
    let filtered = [...despachantes]

    // Busca por despachante, veículo, placa ou cliente
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(d => 
        d.despachanteNome?.toLowerCase().includes(searchLower) ||
        d.vehicle?.brand?.toLowerCase().includes(searchLower) ||
        d.vehicle?.model?.toLowerCase().includes(searchLower) ||
        d.vehicle?.plate?.toLowerCase().includes(searchLower) ||
        d.customer?.name?.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por tipo
    if (filterTipo) {
      filtered = filtered.filter(d => d.tipo === filterTipo)
    }

    // Filtro por data de envio
    if (filterDataEnvioInicio) {
      const inicio = new Date(filterDataEnvioInicio)
      filtered = filtered.filter(d => {
        if (!d.dataEnvio) return false
        const dataEnvio = new Date(d.dataEnvio)
        return dataEnvio >= inicio
      })
    }
    if (filterDataEnvioFim) {
      const fim = new Date(filterDataEnvioFim)
      fim.setHours(23, 59, 59, 999)
      filtered = filtered.filter(d => {
        if (!d.dataEnvio) return false
        const dataEnvio = new Date(d.dataEnvio)
        return dataEnvio <= fim
      })
    }

    // Filtro por data de retorno
    if (filterDataRetornoInicio) {
      const inicio = new Date(filterDataRetornoInicio)
      filtered = filtered.filter(d => {
        if (!d.dataRetorno) return false
        const dataRetorno = new Date(d.dataRetorno)
        return dataRetorno >= inicio
      })
    }
    if (filterDataRetornoFim) {
      const fim = new Date(filterDataRetornoFim)
      fim.setHours(23, 59, 59, 999)
      filtered = filtered.filter(d => {
        if (!d.dataRetorno) return false
        const dataRetorno = new Date(d.dataRetorno)
        return dataRetorno <= fim
      })
    }

    // Filtro por data de entrega
    if (filterDataEntregaInicio) {
      const inicio = new Date(filterDataEntregaInicio)
      filtered = filtered.filter(d => {
        if (!d.dataEntrega) return false
        const dataEntrega = new Date(d.dataEntrega)
        return dataEntrega >= inicio
      })
    }
    if (filterDataEntregaFim) {
      const fim = new Date(filterDataEntregaFim)
      fim.setHours(23, 59, 59, 999)
      filtered = filtered.filter(d => {
        if (!d.dataEntrega) return false
        const dataEntrega = new Date(d.dataEntrega)
        return dataEntrega <= fim
      })
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'despachanteNome':
          aValue = (a.despachanteNome || '').toLowerCase()
          bValue = (b.despachanteNome || '').toLowerCase()
          break
        case 'dataEnvio':
          aValue = a.dataEnvio ? new Date(a.dataEnvio).getTime() : 0
          bValue = b.dataEnvio ? new Date(b.dataEnvio).getTime() : 0
          break
        case 'dataRetorno':
          aValue = a.dataRetorno ? new Date(a.dataRetorno).getTime() : 0
          bValue = b.dataRetorno ? new Date(b.dataRetorno).getTime() : 0
          break
        case 'dataEntrega':
          aValue = a.dataEntrega ? new Date(a.dataEntrega).getTime() : 0
          bValue = b.dataEntrega ? new Date(b.dataEntrega).getTime() : 0
          break
        case 'custosTotal':
          aValue = parseFloat(a.valores?.custosTotal || '0')
          bValue = parseFloat(b.valores?.custosTotal || '0')
          break
        case 'valorRecebidoCliente':
          aValue = parseFloat(a.valores?.valorRecebidoCliente || '0')
          bValue = parseFloat(b.valores?.valorRecebidoCliente || '0')
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    setFilteredDespachantes(filtered)
  }, [despachantes, searchTerm, filterTipo, filterDataEnvioInicio, filterDataEnvioFim, filterDataRetornoInicio, filterDataRetornoFim, filterDataEntregaInicio, filterDataEntregaFim, sortBy, sortOrder])

  const loadData = async () => {
    try {
      const response = await api.get('/despachantes')
      setDespachantes(response.data)
      setFilteredDespachantes(response.data)
    } catch (error) {
      console.error('Erro ao carregar despachantes:', error)
      setToast({ message: 'Erro ao carregar despachantes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadVehicles = async () => {
    try {
      const response = await api.get('/vehicles')
      setVehicles(response.data)
    } catch (error) {
      console.error('Erro ao carregar veículos:', error)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers')
      setCustomers(response.data)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dataToSend = {
        ...formData,
        vehicleId: formData.vehicleId ? parseInt(formData.vehicleId) : null,
        customerId: formData.customerId ? parseInt(formData.customerId) : null,
        dataEnvio: formData.dataEnvio || null,
        dataRetorno: formData.dataRetorno || null,
        dataEntrega: formData.dataEntrega || null,
        documentos: formData.documentos.length > 0 ? formData.documentos : null,
        valores: Object.keys(formData.valores).length > 0 ? formData.valores : null,
      }

      if (editingId) {
        await api.put(`/despachantes/${editingId}`, dataToSend)
        setToast({ message: 'Despachante atualizado com sucesso!', type: 'success' })
      } else {
        await api.post('/despachantes', dataToSend)
        setToast({ message: 'Despachante criado com sucesso!', type: 'success' })
      }

      setShowModal(false)
      resetForm()
      await loadData()
    } catch (error: any) {
      console.error('Erro ao salvar despachante:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar despachante', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (despachante: Despachante) => {
    setEditingId(despachante.id)
    setFormData({
      tipo: despachante.tipo || 'saida',
      despachanteNome: despachante.despachanteNome || '',
      vehicleId: despachante.vehicleId?.toString() || '',
      fornecedorId: despachante.fornecedorId?.toString() || '',
      customerId: despachante.customerId?.toString() || '',
      dataEnvio: despachante.dataEnvio ? new Date(despachante.dataEnvio).toISOString().split('T')[0] : '',
      dataRetorno: despachante.dataRetorno ? new Date(despachante.dataRetorno).toISOString().split('T')[0] : '',
      dataEntrega: despachante.dataEntrega ? new Date(despachante.dataEntrega).toISOString().split('T')[0] : '',
      obsAdicional: despachante.obsAdicional || '',
      municipioOrigem: despachante.municipioOrigem || '',
      municipioDestino: despachante.municipioDestino || '',
      documentos: Array.isArray(despachante.documentos) ? despachante.documentos : [],
      valores: despachante.valores || {},
    })
    // Carregar custos se existirem
    if (despachante.valores?.custos && Array.isArray(despachante.valores.custos)) {
      setCustos(despachante.valores.custos.length > 0 ? despachante.valores.custos : [{ descricao: '', valor: '' }])
    } else {
      setCustos([{ descricao: '', valor: '' }])
    }
    if (despachante.vehicle) {
      setVehicleSearch(`${despachante.vehicle.brand} ${despachante.vehicle.model} ${despachante.vehicle.year} ${despachante.vehicle.plate || ''}`)
    }
    if (despachante.customer) {
      setCustomerSearch(despachante.customer.name)
    }
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      await api.delete(`/despachantes/${id}`)
      setToast({ message: 'Despachante excluído com sucesso!', type: 'success' })
      await loadData()
    } catch (error: any) {
      console.error('Erro ao excluir despachante:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao excluir despachante', type: 'error' })
    } finally {
      setDeleting(null)
      setShowConfirmModal(false)
      setConfirmDeleteId(null)
    }
  }

  const handleView = (despachante: Despachante) => {
    setViewingDespachante(despachante)
    setShowViewModal(true)
  }

  const gerarPdfProtocoloEntregaDespachante = (despachante: Despachante) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = 20
    const lineHeight = 7
    const labelWidth = 55
    const valueX = margin + labelWidth + 5

    const formatDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : ''
    const formatMoney = (v: string | undefined) => v ? `R$ ${parseFloat(v || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'
    const situacaoLabel = (s: string | undefined) => {
      if (!s) return ''
      const map: Record<string, string> = {
        pago_cliente: 'Pago cliente',
        aberto_cliente: 'Aberto cliente',
        cortesia_cliente: 'Cortesia cliente',
        cliente_vai_transferir: 'Cliente vai transferir',
        embutido_nos_pagamento_veiculos: 'Embutido nos pagamento do veículos'
      }
      return map[s] || s.replace(/_/g, ' ')
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('PROTOCOLO ENTREGA DESPACHANTE', pageWidth / 2, y, { align: 'center' })
    y += lineHeight + 2

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth / 2, y, { align: 'center' })
    y += lineHeight + 6

    doc.setFont('helvetica', 'bold')
    doc.text('MARCA:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.brand || '-', valueX, y)
    doc.setFont('helvetica', 'bold')
    doc.text('PLACA:', margin + 95, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.plate || '-', valueX + 95, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('MODELO:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.model || '-', valueX, y)
    doc.setFont('helvetica', 'bold')
    doc.text('CHASSI:', margin + 95, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.chassi || '-', valueX + 95, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('ANO:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.year?.toString() || '-', valueX, y)
    doc.setFont('helvetica', 'bold')
    doc.text('RENAVAM:', margin + 95, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.renavam || '-', valueX + 95, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('TIPO:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text((despachante.tipo || '-').toUpperCase(), valueX, y)
    y += lineHeight + 4

    const linhas = [
      { label: 'DESPACHANTE:', value: despachante.despachanteNome || '' },
      { label: 'ENVIO:', value: formatDate(despachante.dataEnvio) },
      { label: 'RETORNO:', value: formatDate(despachante.dataRetorno) },
      { label: 'ENTREGA:', value: formatDate(despachante.dataEntrega) },
      { label: 'DATA DE PAGAMENTO:', value: despachante.valores?.dataPagamento ? formatDate(despachante.valores.dataPagamento) : '' },
      { label: 'VALOR CUSTO:', value: despachante.valores?.custosTotal ? formatMoney(despachante.valores.custosTotal) : '' },
      { label: 'SITUAÇÃO:', value: situacaoLabel(despachante.valores?.situacao) },
      { label: 'DATA DO RECEBIMENTO:', value: '' },
      { label: 'VALOR RECEBIDO:', value: despachante.valores?.valorRecebidoCliente ? formatMoney(despachante.valores.valorRecebidoCliente) : 'R$ 0,00' },
      { label: 'FORMA DE PAGAMENTO:', value: '' },
      { label: 'DOCUMENTOS:', value: Array.isArray(despachante.documentos) ? despachante.documentos.join(', ') : '' },
      { label: 'MUNICÍPIO ORIGEM:', value: despachante.municipioOrigem || '' },
      { label: 'MUNICÍPIO DESTINO:', value: despachante.municipioDestino || '' },
      { label: 'TRANSFERIR PARA:', value: '' },
      { label: 'MUNICÍPIO:', value: '' },
      { label: 'RESERVA:', value: '' },
      { label: 'OBS:', value: despachante.obsAdicional || '' },
    ]

    doc.setFont('helvetica', 'bold')
    for (const { label, value } of linhas) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(label, margin, y)
      doc.setFont('helvetica', 'normal')
      const val = String(value || '')
      if (val.length > 60) {
        const parts = doc.splitTextToSize(val, pageWidth - valueX - margin)
        doc.text(parts, valueX, y)
        y += lineHeight * (parts.length - 1)
      } else {
        doc.text(val || '', valueX, y)
      }
      y += lineHeight
    }

    y += 8
    doc.setFont('helvetica', 'normal')
    doc.text('SOLICITADO POR:', margin, y)
    doc.text('_________________________', margin, y + 10)
    doc.text('AUTORIZADO POR:', margin + 95, y)
    doc.text('_________________________', margin + 95, y + 10)

    doc.save(`protocolo-entrega-despachante-${despachante.id}-${new Date().toISOString().slice(0, 10)}.pdf`)
    setToast({ message: 'PDF gerado com sucesso!', type: 'success' })
  }

  const handleProtocoloEntrega = (despachante: Despachante) => {
    gerarPdfProtocoloEntregaDespachante(despachante)
  }

  const gerarPdfReciboPagamentoDespachante = (despachante: Despachante) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 25
    let y = 25
    const lineHeight = 7

    const valorNum = parseFloat(despachante.valores?.valorPagoDespachante || despachante.valores?.custosTotal || '0') || 0
    const valorFormatado = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const valorExtenso = valorPorExtensoReais(valorNum)
    const cnpjFormatado = EMPRESA_CNPJ.includes('.') ? EMPRESA_CNPJ : formatCNPJ(EMPRESA_CNPJ)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('RECIBO', pageWidth / 2, y, { align: 'center' })
    y += lineHeight + 4

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const paragrafo = `Recebemos de ${EMPRESA_NOME}, CNPJ: ${cnpjFormatado}, a quantia de R$ ${valorFormatado} (${valorExtenso}) referente ao serviço de despachante do veículo abaixo descrito`
    const linhas = doc.splitTextToSize(paragrafo, pageWidth - 2 * margin)
    doc.text(linhas, margin, y)
    y += lineHeight * linhas.length + 8

    doc.setFont('helvetica', 'bold')
    doc.text('MARCA', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.brand || '-', margin + 45, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('MODELO', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.model || '-', margin + 45, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('ANO', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.year?.toString() || '-', margin + 45, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('PLACA', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.plate || '-', margin + 45, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('CHASSI', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.chassi || '-', margin + 45, y)
    y += lineHeight

    doc.setFont('helvetica', 'bold')
    doc.text('RENAVAM', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(despachante.vehicle?.renavam || '-', margin + 45, y)
    y += lineHeight + 12

    const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const cidadeData = `${EMPRESA_CIDADE}, ${dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)}`
    doc.text(cidadeData, pageWidth / 2, y, { align: 'center' })

    doc.save(`recibo-pagamento-despachante-${despachante.id}-${new Date().toISOString().slice(0, 10)}.pdf`)
    setToast({ message: 'Recibo gerado com sucesso!', type: 'success' })
  }

  const handleReciboPagamentoDespachante = (despachante: Despachante) => {
    gerarPdfReciboPagamentoDespachante(despachante)
  }

  const handleReciboPagamentoCliente = (despachante: Despachante) => {
    // Preparar dados para geração de PDF
    const data = {
      tipo: 'Recibo de Pagamento - Cliente',
      cliente: despachante.customer?.name || '-',
      valorRecebido: despachante.valores?.valorRecebidoCliente || '0,00',
      situacao: despachante.valores?.situacao || '-',
      veiculo: despachante.vehicle ? `${despachante.vehicle.brand} ${despachante.vehicle.model} ${despachante.vehicle.year}` : '-',
      custosTotal: despachante.valores?.custosTotal || '0,00'
    }
    
    // TODO: Implementar geração de PDF
    console.log('Gerar Recibo Pagamento Cliente:', data)
    setToast({ message: 'Funcionalidade de geração de recibo de pagamento do cliente em desenvolvimento', type: 'info' })
  }

  const handleProtocoloEntregaDocumento = (despachante: Despachante) => {
    // Preparar dados para geração de PDF
    const data = {
      tipo: 'Protocolo de Entrega de Documento',
      despachante: despachante.despachanteNome,
      cliente: despachante.customer?.name || '-',
      veiculo: despachante.vehicle ? `${despachante.vehicle.brand} ${despachante.vehicle.model} ${despachante.vehicle.year} ${despachante.vehicle.plate || ''}` : '-',
      dataEntrega: despachante.dataEntrega ? new Date(despachante.dataEntrega).toLocaleDateString('pt-BR') : '-',
      documentos: Array.isArray(despachante.documentos) ? despachante.documentos : [],
      obsAdicional: despachante.obsAdicional || ''
    }
    
    // TODO: Implementar geração de PDF
    console.log('Gerar Protocolo Entrega Documento:', data)
    setToast({ message: 'Funcionalidade de geração de protocolo de entrega de documento em desenvolvimento', type: 'info' })
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerData.name || !newCustomerData.phone || !newCustomerData.cpf) {
      setToast({ message: 'Nome, telefone e CPF/CNPJ são obrigatórios', type: 'error' })
      return
    }

    setCreatingCustomer(true)
    try {
      const dataToSend = {
        ...newCustomerData,
        cpf: removeMask(newCustomerData.cpf),
        phone: removeMask(newCustomerData.phone),
        cep: newCustomerData.cep ? removeMask(newCustomerData.cep) : '',
        rg: newCustomerData.rg ? removeMask(newCustomerData.rg) : '',
        cnh: newCustomerData.cnh || '',
        birthDate: newCustomerData.birthDate || null,
        cnhVencimento: newCustomerData.cnhVencimento || null,
      }

      const response = await api.post('/customers', dataToSend)
      const newCustomer = response.data.customer || response.data

      // Atualizar lista de clientes
      await loadCustomers()

      // Preencher o campo correto baseado em qual botão foi clicado
      if (creatingCustomerFor === 'fornecedor') {
        setFornecedorSearch(newCustomer.name)
        setFormData({ ...formData, fornecedorId: newCustomer.id.toString() })
      } else if (creatingCustomerFor === 'cliente') {
        setCustomerSearch(newCustomer.name)
        setFormData({ ...formData, customerId: newCustomer.id.toString() })
      }

      setShowCreateCustomerModal(false)
      setCreateCustomerActiveStep(1)
      setCreatingCustomerFor(null)
      setNewCustomerData({
        pessoaType: 'Física',
        cpf: '',
        name: '',
        apelido: '',
        rg: '',
        nomeMae: '',
        phone: '',
        email: '',
        facebook: '',
        instagram: '',
        website: '',
        nacionalidade: 'BRASILEIRA',
        naturalidade: '',
        birthDate: '',
        sexo: '',
        estadoCivil: '',
        profissao: '',
        cnh: '',
        cnhVencimento: '',
        cep: '',
        city: '',
        district: '',
        address: '',
        adicional: '',
        pendenciasFinanceiras: '',
        marcador: '',
        status: 'novo',
      })
      setToast({ message: 'Cliente criado com sucesso!', type: 'success' })
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao criar cliente', type: 'error' })
    } finally {
      setCreatingCustomer(false)
    }
  }

  const resetForm = () => {
    setFormData({
      tipo: 'saida',
      despachanteNome: '',
      vehicleId: '',
      fornecedorId: '',
      customerId: '',
      dataEnvio: '',
      dataRetorno: '',
      dataEntrega: '',
      obsAdicional: '',
      municipioOrigem: '',
      municipioDestino: '',
      documentos: [],
      valores: {},
    })
    setVehicleSearch('')
    setFornecedorSearch('')
    setCustomerSearch('')
    setEditingId(null)
    setActiveTab('dados')
    setCustos([{ descricao: '', valor: '' }])
  }

  const toggleDocumento = (doc: string) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.includes(doc)
        ? prev.documentos.filter(d => d !== doc)
        : [...prev.documentos, doc]
    }))
  }

  const handleImprimirExportar = (value: string) => {
    if (!value) return
    setImprimirExportarValue(value)
    if (value === 'imprimir') {
      const janela = window.open('', '_blank')
      if (!janela) {
        setToast({ message: 'Permita pop-ups para imprimir.', type: 'error' })
        return
      }
      const lista = filteredDespachantes
      const html = `
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>Despachantes</title>
        <style>
          body{ font-family: Arial,sans-serif; font-size: 12px; padding: 16px; }
          table{ width:100%; border-collapse: collapse; }
          th,td{ border:1px solid #ddd; padding: 6px 8px; text-align: left; }
          th{ background:#f5f5f5; }
        </style></head><body>
        <h1>Despachantes</h1>
        <p>Total: ${lista.length} registro(s) | Emissão: ${new Date().toLocaleString('pt-BR')}</p>
        <table>
          <thead><tr>
            <th>Despachante</th><th>Veículo</th><th>Cliente</th><th>Data Envio</th><th>Data Retorno</th><th>Custo</th><th>Recebido</th>
          </tr></thead>
          <tbody>
          ${lista.map(d => `
            <tr>
              <td>${d.despachanteNome || '-'}</td>
              <td>${d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year} ${d.vehicle.plate || ''}` : '-'}</td>
              <td>${d.customer?.name || '-'}</td>
              <td>${d.dataEnvio ? new Date(d.dataEnvio).toLocaleDateString('pt-BR') : '-'}</td>
              <td>${d.dataRetorno ? new Date(d.dataRetorno).toLocaleDateString('pt-BR') : '-'}</td>
              <td>${d.valores?.custosTotal ? `R$ ${parseFloat(d.valores.custosTotal || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'}</td>
              <td>${d.valores?.valorRecebidoCliente ? `R$ ${parseFloat(d.valores.valorRecebidoCliente || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'}</td>
            </tr>
          `).join('')}
          </tbody>
        </table>
        </body></html>
      `
      janela.document.write(html)
      janela.document.close()
      janela.focus()
      setTimeout(() => { janela.print(); janela.close(); }, 300)
      setToast({ message: 'Impressão aberta.', type: 'success' })
    } else if (value === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const lista = filteredDespachantes
      const colWidths = [32, 42, 32, 22, 22, 22, 22]
      const headers = ['Despachante', 'Veículo', 'Cliente', 'Data Envio', 'Data Retorno', 'Custo', 'Recebido']
      let y = 12
      let x = 10
      doc.setFontSize(9)
      doc.text('Despachantes - ' + new Date().toLocaleString('pt-BR'), 10, y)
      y += 7
      doc.setFont(undefined, 'bold')
      doc.setFontSize(7)
      headers.forEach((h, i) => {
        doc.text(h, x, y)
        x += colWidths[i]
      })
      y += 5
      doc.setFont(undefined, 'normal')
      lista.forEach(d => {
        if (y > 195) { doc.addPage('a4', 'landscape'); y = 12 }
        x = 10
        const cells = [
          (d.despachanteNome || '-').substring(0, 18),
          d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year}`.substring(0, 25) : '-',
          (d.customer?.name || '-').substring(0, 18),
          d.dataEnvio ? new Date(d.dataEnvio).toLocaleDateString('pt-BR') : '-',
          d.dataRetorno ? new Date(d.dataRetorno).toLocaleDateString('pt-BR') : '-',
          d.valores?.custosTotal ? parseFloat(d.valores.custosTotal || '0').toFixed(2) : '0,00',
          d.valores?.valorRecebidoCliente ? parseFloat(d.valores.valorRecebidoCliente || '0').toFixed(2) : '0,00'
        ]
        cells.forEach((cell, i) => {
          doc.text(cell, x, y)
          x += colWidths[i]
        })
        y += 5
      })
      doc.save(`despachantes-${new Date().toISOString().slice(0, 10)}.pdf`)
      setToast({ message: 'PDF exportado com sucesso!', type: 'success' })
      setImprimirExportarValue('')
    } else if (value === 'csv') {
      const lista = filteredDespachantes
      const BOM = '\uFEFF'
      const header = 'Despachante;Veículo;Cliente;Data Envio;Data Retorno;Custo;Recebido\n'
      const rows = lista.map(d => {
        const veic = d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model} ${d.vehicle.year} ${d.vehicle.plate || ''}` : ''
        const custo = d.valores?.custosTotal || '0'
        const rec = d.valores?.valorRecebidoCliente || '0'
        const env = d.dataEnvio ? new Date(d.dataEnvio).toLocaleDateString('pt-BR') : ''
        const ret = d.dataRetorno ? new Date(d.dataRetorno).toLocaleDateString('pt-BR') : ''
        return `"${(d.despachanteNome || '').replace(/"/g, '""')}";"${veic.replace(/"/g, '""')}";"${(d.customer?.name || '').replace(/"/g, '""')}";"${env}";"${ret}";"${custo}";"${rec}"`
      }).join('\n')
      const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `despachantes-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setToast({ message: 'CSV exportado com sucesso!', type: 'success' })
    }
    ;(document.activeElement as HTMLSelectElement)?.blur()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h1 className="text-xl font-bold text-gray-900">Despachantes</h1>
          <div className="flex items-center gap-2">
            <select
              value={imprimirExportarValue}
              onChange={(e) => handleImprimirExportar(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 border border-primary-600 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")' }}
              title="Imprimir ou exportar lista"
            >
              <option value="" disabled>Imprimir / Exportar</option>
              <option value="imprimir">Imprimir tudo</option>
              <option value="pdf">Exportar PDF</option>
              <option value="csv">Exportar CSV</option>
            </select>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5"
            >
              <FiPlus className="w-4 h-4" />
              Criar
            </button>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="bg-white shadow rounded-lg p-3 mb-3">
          <div className="space-y-2">
            {/* Busca */}
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por despachante, veículo, placa ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Tipo</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Todos</option>
                  <option value="saida">Saída</option>
                  <option value="entrada">Entrada</option>
                  <option value="refinamento">Refinamento</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Envio (Início)</label>
                <input type="date" value={filterDataEnvioInicio} onChange={(e) => setFilterDataEnvioInicio(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Envio (Fim)</label>
                <input type="date" value={filterDataEnvioFim} onChange={(e) => setFilterDataEnvioFim(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Retorno (Início)</label>
                <input type="date" value={filterDataRetornoInicio} onChange={(e) => setFilterDataRetornoInicio(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Retorno (Fim)</label>
                <input type="date" value={filterDataRetornoFim} onChange={(e) => setFilterDataRetornoFim(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Entrega (Início)</label>
                <input type="date" value={filterDataEntregaInicio} onChange={(e) => setFilterDataEntregaInicio(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Entrega (Fim)</label>
                <input type="date" value={filterDataEntregaFim} onChange={(e) => setFilterDataEntregaFim(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Ordenar por</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500">
                  <option value="createdAt">Data Cadastro</option>
                  <option value="despachanteNome">Despachante</option>
                  <option value="dataEnvio">Data Envio</option>
                  <option value="dataRetorno">Data Retorno</option>
                  <option value="dataEntrega">Data Entrega</option>
                  <option value="custosTotal">Custo Total</option>
                  <option value="valorRecebidoCliente">Valor Recebido</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Ordem</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500">
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setSearchTerm(''); setFilterTipo(''); setFilterDataEnvioInicio(''); setFilterDataEnvioFim(''); setFilterDataRetornoInicio(''); setFilterDataRetornoFim(''); setFilterDataEntregaInicio(''); setFilterDataEntregaFim(''); setSortBy('createdAt'); setSortOrder('desc'); }} className="w-full px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                  Limpar
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {filteredDespachantes.length} de {despachantes.length} despachante(s)
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Despachante</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Envio</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Retorno</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recebido</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDespachantes.map((despachante) => (
                <tr key={despachante.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {despachante.despachanteNome || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {despachante.vehicle ? `${despachante.vehicle.brand} ${despachante.vehicle.model} ${despachante.vehicle.year} ${despachante.vehicle.plate || ''}` : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {despachante.customer?.name || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {despachante.dataEnvio ? new Date(despachante.dataEnvio).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {despachante.dataRetorno ? new Date(despachante.dataRetorno).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {despachante.valores?.custosTotal 
                      ? `R$ ${parseFloat(despachante.valores.custosTotal || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'R$ 0,00'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                    {despachante.valores?.valorRecebidoCliente 
                      ? `R$ ${parseFloat(despachante.valores.valorRecebidoCliente || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'R$ 0,00'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const menuWidth = 224 // w-56 = 224px
                        setMenuPosition({
                          top: rect.top + window.scrollY + (rect.height / 2) - 100,
                          left: rect.left + window.scrollX + (rect.width / 2) - (menuWidth / 2)
                        })
                        setOpenMenuId(despachante.id)
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-600 hover:text-gray-900 mx-auto"
                      title="Ações"
                    >
                      <FiMoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filteredDespachantes.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-500">
              Nenhum despachante encontrado
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? 'Editar Controle Despachante' : 'Incluir Controle Despachante'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-3">
                  <button
                    onClick={() => setActiveTab('dados')}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      activeTab === 'dados'
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Dados Básicos
                  </button>
                  <button
                    onClick={() => setActiveTab('documentos')}
                    className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'documentos' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Documentos
                  </button>
                  <button
                    onClick={() => setActiveTab('valores')}
                    className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'valores' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Valores
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {activeTab === 'dados' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo</label>
                        <select
                          value={formData.tipo}
                          onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="saida">Saida</option>
                          <option value="entrada">Entrada</option>
                          <option value="refinamento">Refinamento</option>
                          <option value="outros">Outros</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Despachante</label>
                        <select
                          value={formData.despachanteNome}
                          onChange={(e) => setFormData({ ...formData, despachanteNome: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Selecione</option>
                          {/* Adicionar lista de despachantes aqui se necessário */}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo *</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={vehicleSearch}
                            onChange={(e) => {
                              setVehicleSearch(e.target.value)
                              setShowVehicleDropdown(true)
                            }}
                            onFocus={() => setShowVehicleDropdown(true)}
                            placeholder="Digite o modelo ou a placa"
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          />
                          {showVehicleDropdown && vehicleSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {vehicles
                                .filter(v => 
                                  `${v.brand} ${v.model} ${v.year} ${v.plate || ''}`.toLowerCase().includes(vehicleSearch.toLowerCase())
                                )
                                .slice(0, 10)
                                .map(vehicle => (
                                  <div
                                    key={vehicle.id}
                                    onClick={() => {
                                      setVehicleSearch(`${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.plate || ''}`)
                                      setFormData({ ...formData, vehicleId: vehicle.id.toString() })
                                      setShowVehicleDropdown(false)
                                    }}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  >
                                    <div className="font-medium text-gray-900">{vehicle.brand} {vehicle.model} {vehicle.year}</div>
                                    {vehicle.plate && <div className="text-sm text-gray-500">{vehicle.plate}</div>}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Fornecedor</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={fornecedorSearch}
                            onChange={(e) => setFornecedorSearch(e.target.value)}
                            placeholder="Digite o nome do fornecedor"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingCustomerFor('fornecedor')
                              setShowCreateCustomerModal(true)
                            }}
                            className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                            title="Criar novo fornecedor"
                          >
                            <FiPlus className="w-4 h-4" />
                            Criar novo
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Cliente</label>
                        <div className="relative flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={customerSearch}
                              onChange={(e) => {
                                setCustomerSearch(e.target.value)
                                setShowCustomerDropdown(true)
                              }}
                              onFocus={() => setShowCustomerDropdown(true)}
                              placeholder="Digite o nome do cliente"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                            />
                            {showCustomerDropdown && customerSearch && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {customers
                                  .filter(c => 
                                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                    c.phone?.includes(customerSearch)
                                  )
                                  .slice(0, 10)
                                  .map(customer => (
                                    <div
                                      key={customer.id}
                                      onClick={() => {
                                        setCustomerSearch(customer.name)
                                        setFormData({ ...formData, customerId: customer.id.toString() })
                                        setShowCustomerDropdown(false)
                                      }}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                    >
                                      <div className="font-medium">{customer.name}</div>
                                      {customer.phone && <div className="text-sm text-gray-500">{customer.phone}</div>}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingCustomerFor('cliente')
                              setShowCreateCustomerModal(true)
                            }}
                            className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                            title="Criar novo cliente"
                          >
                            <FiPlus className="w-4 h-4" />
                            Criar novo
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Envio</label>
                          <input
                            type="date"
                            value={formData.dataEnvio}
                            onChange={(e) => setFormData({ ...formData, dataEnvio: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Retorno</label>
                          <input
                            type="date"
                            value={formData.dataRetorno}
                            onChange={(e) => setFormData({ ...formData, dataRetorno: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Entrega</label>
                          <input
                            type="date"
                            value={formData.dataEntrega}
                            onChange={(e) => setFormData({ ...formData, dataEntrega: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Obs Adicional</label>
                        <textarea
                          value={formData.obsAdicional}
                          onChange={(e) => setFormData({ ...formData, obsAdicional: e.target.value })}
                          rows={3}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab Documentos */}
                  {activeTab === 'documentos' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Documentos</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                          {documentosList.map((doc) => (
                            <label key={doc} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={formData.documentos.includes(doc)}
                                onChange={() => toggleDocumento(doc)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">{doc}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Município Origem</label>
                          <input
                            type="text"
                            value={formData.municipioOrigem}
                            onChange={(e) => setFormData({ ...formData, municipioOrigem: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Município Destino</label>
                          <input
                            type="text"
                            value={formData.municipioDestino}
                            onChange={(e) => setFormData({ ...formData, municipioDestino: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab Valores */}
                  {activeTab === 'valores' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor pago para o despachante</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.valores?.valorPagoDespachante || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              valores: { ...formData.valores, valorPagoDespachante: e.target.value }
                            })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de pagamento</label>
                          <input
                            type="date"
                            value={formData.valores?.dataPagamento || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              valores: { ...formData.valores, dataPagamento: e.target.value }
                            })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor Custo</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={formData.valores?.custosTotal ? `R$ ${parseFloat(formData.valores.custosTotal || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                // Carregar custos existentes se houver
                                if (formData.valores?.custos && Array.isArray(formData.valores.custos) && formData.valores.custos.length > 0) {
                                  setCustos(formData.valores.custos)
                                } else {
                                  setCustos([{ descricao: '', valor: '' }])
                                }
                                setShowCustosModal(true)
                              }}
                              className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                              title="Adicionar custos"
                            >
                              <FiPlus className="w-4 h-4" />
                              Adicionar
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.valores?.enviarFinanceiro || false}
                              onChange={(e) => setFormData({
                                ...formData,
                                valores: { ...formData.valores, enviarFinanceiro: e.target.checked }
                              })}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Enviar p/ financeiro</span>
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor recebido do cliente</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.valores?.valorRecebidoCliente || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              valores: { ...formData.valores, valorRecebidoCliente: e.target.value }
                            })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0,00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Situação</label>
                          <select
                            value={formData.valores?.situacao || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              valores: { ...formData.valores, situacao: e.target.value }
                            })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Selecione</option>
                            <option value="pago_cliente">Pago cliente</option>
                            <option value="aberto_cliente">Aberto cliente</option>
                            <option value="cortesia_cliente">Cortesia cliente</option>
                            <option value="cliente_vai_transferir">Cliente vai transferir</option>
                            <option value="embutido_nos_pagamento_veiculos">Embutido nos pagamento do veículos</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !formData.vehicleId}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Menu de Ações Flutuante */}
        {openMenuId !== null && menuPosition && despachantes.find(d => d.id === openMenuId) && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.stopPropagation()
                setOpenMenuId(null)
                setMenuPosition(null)
              }}
            />
            <div
              className="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] py-1"
              style={{
                top: `${Math.max(4, menuPosition.top)}px`,
                left: `${Math.max(4, Math.min(menuPosition.left, window.innerWidth - 240))}px`,
                transform: 'translateY(-50%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const despachante = despachantes.find(d => d.id === openMenuId)
                if (!despachante) return null
                return (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleView(despachante)
                        setOpenMenuId(null)
                        setMenuPosition(null)
                      }}
                      className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiEye className="w-3.5 h-3.5" /> Visualizar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(despachante)
                        setOpenMenuId(null)
                        setMenuPosition(null)
                      }}
                      className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FiEdit className="w-3.5 h-3.5" /> Editar
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProtocoloEntrega(despachante)
                        setOpenMenuId(null)
                        setMenuPosition(null)
                      }}
                      className="w-full px-3 py-1.5 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <FiFileText className="w-3.5 h-3.5" /> Protocolo de Entrega
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReciboPagamentoDespachante(despachante)
                        setOpenMenuId(null)
                        setMenuPosition(null)
                      }}
                      className="w-full px-3 py-1.5 text-left text-green-600 hover:bg-green-50 flex items-center gap-2"
                    >
                      <FiFileText className="w-3.5 h-3.5" /> Recibo Pagamento Despachante
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReciboPagamentoCliente(despachante)
                        setOpenMenuId(null)
                        setMenuPosition(null)
                      }}
                      className="w-full px-3 py-1.5 text-left text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                    >
                      <FiFileText className="w-3.5 h-3.5" /> Recibo Pagamento Cliente
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProtocoloEntregaDocumento(despachante)
                        setOpenMenuId(null)
                        setMenuPosition(null)
                      }}
                      className="w-full px-3 py-1.5 text-left text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"
                    >
                      <FiFileText className="w-3.5 h-3.5" /> Protocolo Entrega de Documento
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteId(despachante.id)
                        setShowConfirmModal(true)
                        setOpenMenuId(null)
                        setMenuPosition(null)
                      }}
                      disabled={deleting === despachante.id}
                      className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" /> {deleting === despachante.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </>
                )
              })()}
            </div>
          </>
        )}

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setConfirmDeleteId(null)
          }}
          onConfirm={() => {
            if (confirmDeleteId) {
              handleDelete(confirmDeleteId)
            }
          }}
          title="Confirmar exclusão"
          message="Tem certeza que deseja excluir este despachante?"
        />

        {/* Modal Custos */}
        {showCustosModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Custos</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustosModal(false)
                    setCustos([{ descricao: '', valor: '' }])
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {custos.map((custo, index) => (
                    <div key={index} className="border border-gray-300 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700">Custo {index + 1}</h3>
                        {custos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newCustos = custos.filter((_, i) => i !== index)
                              setCustos(newCustos)
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
                          <input
                            type="text"
                            value={custo.descricao}
                            onChange={(e) => {
                              const newCustos = [...custos]
                              newCustos[index].descricao = e.target.value
                              setCustos(newCustos)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                            placeholder="DESCRIÇÃO"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Valor</label>
                          <input
                            type="number"
                            step="0.01"
                            value={custo.valor}
                            onChange={(e) => {
                              const newCustos = [...custos]
                              newCustos[index].valor = e.target.value
                              setCustos(newCustos)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm"
                            placeholder="VALOR R$"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustos([...custos, { descricao: '', valor: '' }])}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    Adicionar Custo
                  </button>
                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        R$ {custos.reduce((total, custo) => {
                          const valor = parseFloat(custo.valor) || 0
                          return total + valor
                        }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustosModal(false)
                    setCustos([{ descricao: '', valor: '' }])
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const total = custos.reduce((sum, custo) => {
                      const valor = parseFloat(custo.valor) || 0
                      return sum + valor
                    }, 0)
                    
                    setFormData({
                      ...formData,
                      valores: {
                        ...formData.valores,
                        custos: custos.filter(c => c.descricao || c.valor),
                        custosTotal: total.toString()
                      }
                    })
                    setShowCustosModal(false)
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Criar Cliente */}
        {showCreateCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">Criar Novo {creatingCustomerFor === 'fornecedor' ? 'Fornecedor' : 'Cliente'}</h2>
              </div>
              
              {/* Navegação de Etapas */}
              <div className="px-4 pt-4 border-b border-gray-200">
                <div className="flex gap-2 overflow-x-auto">
                  {[
                    { id: 1, label: 'Dados Básicos' },
                    { id: 2, label: 'Contato' },
                    { id: 3, label: 'Dados Pessoais' },
                    { id: 4, label: 'CNH' },
                    { id: 5, label: 'Endereço' },
                    { id: 6, label: 'Adicional' }
                  ].map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCreateCustomerActiveStep(step.id)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                        createCustomerActiveStep === step.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto">
                <div className="p-3">
                  {/* Etapa 1: Dados Básicos */}
                  {createCustomerActiveStep === 1 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Pessoa *</label>
                          <select
                            required
                            value={newCustomerData.pessoaType}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, pessoaType: e.target.value as 'Física' | 'Jurídica', cpf: '' })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="Física">Física</option>
                            <option value="Jurídica">Jurídica</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">
                            {newCustomerData.pessoaType === 'Jurídica' ? 'CNPJ *' : 'CPF *'}
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={newCustomerData.pessoaType === 'Jurídica' ? 18 : 14}
                            value={newCustomerData.cpf}
                            onChange={(e) => {
                              const formatted = newCustomerData.pessoaType === 'Jurídica' 
                                ? formatCNPJ(e.target.value)
                                : formatCPF(e.target.value)
                              setNewCustomerData({ ...newCustomerData, cpf: formatted })
                            }}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder={newCustomerData.pessoaType === 'Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome Completo *</label>
                          <input
                            type="text"
                            required
                            value={newCustomerData.name}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Apelido</label>
                          <input
                            type="text"
                            value={newCustomerData.apelido}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, apelido: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">RG</label>
                          <input
                            type="text"
                            maxLength={12}
                            value={newCustomerData.rg}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, rg: formatRG(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="00.000.000-0"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome da Mãe</label>
                          <input
                            type="text"
                            value={newCustomerData.nomeMae}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, nomeMae: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 2: Contato */}
                  {createCustomerActiveStep === 2 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone *</label>
                          <input
                            type="text"
                            required
                            maxLength={15}
                            value={newCustomerData.phone}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: formatPhone(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Email</label>
                          <input
                            type="email"
                            value={newCustomerData.email}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Facebook</label>
                          <input
                            type="text"
                            value={newCustomerData.facebook}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, facebook: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="URL ou nome de usuário"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Instagram</label>
                          <input
                            type="text"
                            value={newCustomerData.instagram}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, instagram: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="@usuario"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Website</label>
                          <input
                            type="url"
                            value={newCustomerData.website}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, website: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 3: Dados Pessoais */}
                  {createCustomerActiveStep === 3 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Nacionalidade</label>
                          <input
                            type="text"
                            value={newCustomerData.nacionalidade}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, nacionalidade: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="BRASILEIRA"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Naturalidade</label>
                          <input
                            type="text"
                            value={newCustomerData.naturalidade}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, naturalidade: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Cidade/Estado"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Nascimento</label>
                          <input
                            type="date"
                            value={newCustomerData.birthDate}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, birthDate: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Sexo</label>
                          <select
                            value={newCustomerData.sexo}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, sexo: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="">Selecione</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Estado Civil</label>
                          <select
                            value={newCustomerData.estadoCivil}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, estadoCivil: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="">Selecione</option>
                            <option value="Solteiro">Solteiro</option>
                            <option value="Casado">Casado</option>
                            <option value="Divorciado">Divorciado</option>
                            <option value="Viúvo">Viúvo</option>
                            <option value="União Estável">União Estável</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Profissão</label>
                          <input
                            type="text"
                            value={newCustomerData.profissao}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, profissao: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 4: CNH */}
                  {createCustomerActiveStep === 4 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">CNH</label>
                          <input
                            type="text"
                            value={newCustomerData.cnh}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, cnh: e.target.value.replace(/\D/g, '') })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Número da CNH"
                            maxLength={11}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Data Vencimento CNH</label>
                          <input
                            type="date"
                            value={newCustomerData.cnhVencimento}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, cnhVencimento: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 5: Endereço */}
                  {createCustomerActiveStep === 5 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">CEP</label>
                          <input
                            type="text"
                            maxLength={9}
                            value={newCustomerData.cep}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, cep: formatCEP(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="00000-000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Cidade</label>
                          <input
                            type="text"
                            value={newCustomerData.city}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Bairro</label>
                          <input
                            type="text"
                            value={newCustomerData.district}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, district: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Endereço</label>
                          <input
                            type="text"
                            value={newCustomerData.address}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 6: Adicional */}
                  {createCustomerActiveStep === 6 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Adicional</label>
                          <textarea
                            value={newCustomerData.adicional}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, adicional: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            rows={2}
                            placeholder="Informações adicionais..."
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Pendências Financeiras</label>
                          <textarea
                            value={newCustomerData.pendenciasFinanceiras}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, pendenciasFinanceiras: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            rows={2}
                            placeholder="Descreva pendências financeiras..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador</label>
                          <input
                            type="text"
                            value={newCustomerData.marcador}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, marcador: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Tag/Marcador"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Status</label>
                          <select
                            value={newCustomerData.status}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, status: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="novo">Novo</option>
                            <option value="negociacao">Negociação</option>
                            <option value="aprovado">Aprovado</option>
                            <option value="concluido">Concluído</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões de Navegação */}
                <div className="p-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex gap-2">
                    {createCustomerActiveStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setCreateCustomerActiveStep(createCustomerActiveStep - 1)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Anterior
                      </button>
                    )}
                    {createCustomerActiveStep < 6 && (
                      <button
                        type="button"
                        onClick={() => setCreateCustomerActiveStep(createCustomerActiveStep + 1)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Próximo
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateCustomerModal(false)
                        setCreatingCustomerFor(null)
                        setCreateCustomerActiveStep(1)
                        setNewCustomerData({
                          pessoaType: 'Física',
                          cpf: '',
                          name: '',
                          apelido: '',
                          rg: '',
                          nomeMae: '',
                          phone: '',
                          email: '',
                          facebook: '',
                          instagram: '',
                          website: '',
                          nacionalidade: 'BRASILEIRA',
                          naturalidade: '',
                          birthDate: '',
                          sexo: '',
                          estadoCivil: '',
                          profissao: '',
                          cnh: '',
                          cnhVencimento: '',
                          cep: '',
                          city: '',
                          district: '',
                          address: '',
                          adicional: '',
                          pendenciasFinanceiras: '',
                          marcador: '',
                          status: 'novo',
                        })
                      }}
                      disabled={creatingCustomer}
                      className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCustomer}
                      className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {creatingCustomer ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Criando...
                        </>
                      ) : (
                        'Criar Cliente'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Visualização */}
        {showViewModal && viewingDespachante && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Despachante</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingDespachante(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Dados Básicos */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Básicos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Tipo</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{viewingDespachante.tipo || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Despachante</label>
                        <p className="mt-1 text-sm text-gray-900">{viewingDespachante.despachanteNome || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Veículo</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {viewingDespachante.vehicle 
                            ? `${viewingDespachante.vehicle.brand} ${viewingDespachante.vehicle.model} ${viewingDespachante.vehicle.year} ${viewingDespachante.vehicle.plate || ''}`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Cliente</label>
                        <p className="mt-1 text-sm text-gray-900">{viewingDespachante.customer?.name || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Data de Envio</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {viewingDespachante.dataEnvio ? new Date(viewingDespachante.dataEnvio).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Data de Retorno</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {viewingDespachante.dataRetorno ? new Date(viewingDespachante.dataRetorno).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Data de Entrega</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {viewingDespachante.dataEntrega ? new Date(viewingDespachante.dataEntrega).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Município Origem</label>
                        <p className="mt-1 text-sm text-gray-900">{viewingDespachante.municipioOrigem || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Município Destino</label>
                        <p className="mt-1 text-sm text-gray-900">{viewingDespachante.municipioDestino || '-'}</p>
                      </div>
                    </div>
                    {viewingDespachante.obsAdicional && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-500">Observações Adicionais</label>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {viewingDespachante.obsAdicional}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Documentos */}
                  {Array.isArray(viewingDespachante.documentos) && viewingDespachante.documentos.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentos</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {viewingDespachante.documentos.map((doc, index) => (
                          <div key={index} className="bg-gray-50 p-2 rounded-lg text-sm text-gray-900">
                            {doc}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valores */}
                  {viewingDespachante.valores && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Valores</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Valor Pago ao Despachante</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {viewingDespachante.valores?.valorPagoDespachante 
                              ? `R$ ${parseFloat(viewingDespachante.valores.valorPagoDespachante || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : 'R$ 0,00'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Data de Pagamento</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {viewingDespachante.valores?.dataPagamento 
                              ? new Date(viewingDespachante.valores.dataPagamento).toLocaleDateString('pt-BR')
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Custo Total</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {viewingDespachante.valores?.custosTotal 
                              ? `R$ ${parseFloat(viewingDespachante.valores.custosTotal || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : 'R$ 0,00'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Valor Recebido do Cliente</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {viewingDespachante.valores?.valorRecebidoCliente 
                              ? `R$ ${parseFloat(viewingDespachante.valores.valorRecebidoCliente || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : 'R$ 0,00'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Situação</label>
                          <p className="mt-1 text-sm text-gray-900 capitalize">
                            {viewingDespachante.valores?.situacao 
                              ? viewingDespachante.valores.situacao.replace(/_/g, ' ')
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Enviar p/ Financeiro</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {viewingDespachante.valores?.enviarFinanceiro ? 'Sim' : 'Não'}
                          </p>
                        </div>
                      </div>
                      {Array.isArray(viewingDespachante.valores.custos) && viewingDespachante.valores.custos.length > 0 && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-500 mb-2">Custos Detalhados</label>
                          <div className="space-y-2">
                            {viewingDespachante.valores.custos.map((custo: any, index: number) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                <span className="text-sm text-gray-900">{custo.descricao || 'Sem descrição'}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  R$ {parseFloat(custo.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingDespachante(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEdit(viewingDespachante)
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <FiEdit className="w-4 h-4" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  )
}
