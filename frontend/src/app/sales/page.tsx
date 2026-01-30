'use client'

import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { FiMoreVertical, FiEdit, FiTrash2, FiFileText, FiEye, FiPlus, FiImage, FiUpload, FiX, FiDownload } from 'react-icons/fi'
import { formatCPF, formatPhone, formatCEP, formatRG, formatCNPJ, formatPlate, removeMask } from '@/utils/formatters'
import { ESPECIES, COMBUSTIVEIS, PORTAS, CAMBIOS, BLINDADO, ORIGEM, PERICIA_CAUTELAR, OPCIONAIS_LIST } from '@/utils/vehicleOptions'

interface Customer {
  id: number
  name: string
  phone: string
  cpf?: string
}

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
  price?: number
  cost?: number
  status: string
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface FipeBrand {
  codigo: string
  nome: string
}

interface FipeModel {
  codigo: string
  nome: string
}

interface FipeYear {
  codigo: string
  nome: string
}

interface ParcelaDetalhe {
  data: string
  valor: string
  numeroDocumento: string
}

interface SalePaymentMethod {
  id?: number
  date: string
  type: string
  value: string
  valorFinanciado?: string
  quantidadeParcelas?: string
  frequencia15Dias?: boolean
  manterDataFixa?: boolean
  valorParcela?: string
  numeroPrimeiroDoc?: string
  numeroDocumento?: string
  descricao?: string
  avalista?: string
  avalistaAdicional?: string
  // Campo para forma de pagamento dentro do Financiamento Próprio
  formaPagamentoFinanciamentoProprio?: string
  // Parcelas (data, valor, nº doc) — só no frontend; gera ao selecionar quantidade
  parcelasDetalhe?: ParcelaDetalhe[]
  // Campos para Troco na troca
  trocoData?: string
  trocoDescricao?: string
  trocoValorTotal?: string
  // Campos para Veículo na troca
  veiculoTrocaId?: string
  // Campos para Cartão de crédito
  codigoAutorizacao?: string
  recebimentoLoja?: string  // 'parcelado' | 'a_vista'
}

interface Sale {
  id: number
  salePrice?: number
  purchasePrice?: number
  profit?: number
  entryValue?: number
  entryType?: string
  entryVehicleValue?: number
  entryAdditionalValue?: number
  entryCardInstallments?: number
  remainingValue?: number
  paymentMethod?: string
  paymentInstallments?: number
  paymentInstallmentValue?: number
  financedValue?: number
  financingBank?: string
  commission?: number
  status: string
  date: string
  customer: Customer
  vehicle: Vehicle
  seller: { id: number; name: string }
  contractClauses?: string
  notes?: string
  saleType?: string // Tipo de venda: consumidor_final, repasse
  transferStatus?: string // Status da transferência
  transferNotes?: string // Observações da transferência
  saleChannel?: string // Canal de venda
  saleChannelNotes?: string // Observações do canal de venda
  internalNotes?: string // Observações internas
  discountAmount?: number // Valor do desconto
  paymentMethods?: SalePaymentMethod[] // Múltiplas formas de pagamento
}

const paymentMethodOptions = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'carta_credito', label: 'Cartão de Crédito' },
  { value: 'financiamento_bancario', label: 'Financiamento Bancário' },
  { value: 'financiamento_proprio', label: 'Financiamento Próprio da Loja' },
  { value: 'consorcio', label: 'Consórcio' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'carne', label: 'Carnê' },
  { value: 'promissoria', label: 'Promissória' },
  { value: 'carta_credito_consorcio', label: 'Carta de crédito de consórcio' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'outros', label: 'Outros (Terrenos, permutas, etc. Não gera contas a receber)' },
  { value: 'sinal_negocio', label: 'Sinal de negócio' },
  { value: 'ted_doc_pix', label: 'TED, DOC, PIX, Transferência bancária' },
  { value: 'troco_troca', label: 'Troco na troca' },
  { value: 'veiculo_troca', label: 'Veículo na troca' },
]

// Opções específicas para o campo "Forma de pagamento" dentro do Financiamento Próprio
const formasPagamentoFinanciamentoProprio = [
  { value: 'boleto_bancario', label: 'Boleto Bancário' },
  { value: 'carta_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'debito_conta', label: 'Débito em Conta' },
  { value: 'deposito_bancario', label: 'Depósito Bancário' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'duplicata', label: 'Duplicata' },
  { value: 'financiamento_proprio', label: 'Financiamento Próprio' },
  { value: 'nota_promissoria', label: 'Nota Promissória' },
  { value: 'ted_doc_pix', label: 'TED/DOC ou PIX' },
  { value: 'transferencia', label: 'Transferência' },
]

const entryTypes = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
]

const banks = [
  { value: 'banco_pan', label: 'Banco PAN' },
  { value: 'banco_do_brasil', label: 'Banco do Brasil' },
  { value: 'caixa_economica', label: 'Caixa Econômica Federal' },
  { value: 'bradesco', label: 'Bradesco' },
  { value: 'itau', label: 'Itaú' },
  { value: 'santander', label: 'Santander' },
  { value: 'banco_safra', label: 'Banco Safra' },
  { value: 'banco_bv', label: 'Banco BV' },
  { value: 'banco_original', label: 'Banco Original' },
  { value: 'banco_daycoval', label: 'Banco Daycoval' },
  { value: 'banco_fibra', label: 'Banco Fibra' },
  { value: 'banco_votorantim', label: 'Banco Votorantim' },
  { value: 'banco_rendimento', label: 'Banco Rendimento' },
  { value: 'banco_topazio', label: 'Banco Topázio' },
  { value: 'banco_rci', label: 'Banco RCI' },
  { value: 'banco_psa', label: 'Banco PSA Finance' },
  { value: 'banco_toyota', label: 'Banco Toyota' },
  { value: 'banco_honda', label: 'Banco Honda' },
  { value: 'banco_yamaha', label: 'Banco Yamaha' },
  { value: 'banco_volvo', label: 'Banco Volvo' },
  { value: 'banrisul', label: 'Banrisul' },
  { value: 'sicredi', label: 'Sicredi' },
  { value: 'sicoob', label: 'Sicoob' },
  { value: 'outro', label: 'Outro' },
]

export default function SalesPage() {
  const { user } = useAuthStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showNewSellerModal, setShowNewSellerModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [showCreateVehicleModal, setShowCreateVehicleModal] = useState(false)
  const [showFinanciamentoProprioModal, setShowFinanciamentoProprioModal] = useState(false)
  const [financiamentoProprioIndex, setFinanciamentoProprioIndex] = useState<number | null>(null)
  const [financiamentoProprioQty, setFinanciamentoProprioQty] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const [newSellerData, setNewSellerData] = useState({ name: '', email: '', password: '' })
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [creatingVehicle, setCreatingVehicle] = useState(false)
  const [customerActiveStep, setCustomerActiveStep] = useState(1)
  const [newCustomerData, setNewCustomerData] = useState({
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
  const [newVehicleData, setNewVehicleData] = useState({
    empresa: 'Iago Veiculos Ltda',
    posicao: '',
    conditionStatus: 'usado',
    plate: '',
    renavam: '',
    cadastroOutrasLojas: false,
    especie: 'AUTOMÓVEL',
    combustivel: '',
    brand: '',
    model: '',
    color: '',
    modeloDenatran: '',
    km: '',
    modeloBase: '',
    portas: '',
    carroceria: '',
    anoFabricacao: '',
    anoModelo: '',
    year: '',
    motorizacao: '',
    cambio: '',
    chassi: '',
    chassiRemarcado: false,
    modeloFipe: '',
    cidadeEmplacamento: '',
    numeroCambio: '',
    hpCv: '',
    periciaCautelar: '',
    passageiros: '',
    blindado: 'Não',
    origem: 'Nacional',
    numeroMotor: '',
    corInterna: '',
    price: '',
    cost: '',
    tableValue: '',
    expenseType: '',
    expenseValue: '',
    customerId: '',
    notes: '',
    status: 'disponivel',
    opcionais: [] as string[],
    photos: [] as string[],
  })
  const [opcionaisSearch, setOpcionaisSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [periodFilter, setPeriodFilter] = useState<string>('all') // 'all', 'today', 'week', 'month', 'year', 'date'
  const [specificDate, setSpecificDate] = useState<string>('') // Para filtro de data específica
  const [formData, setFormData] = useState({
    customerId: '',
    vehicleId: '',
    sellerId: '',
    salePrice: '',
    purchasePrice: '',
    tableValue: '',
    discount: '',
    entryValue: '',
    entryType: '',
    entryVehicleValue: '',
    entryAdditionalValue: '',
    entryCardInstallments: '',
    remainingValue: '',
    paymentMethod: '',
    paymentInstallments: '',
    paymentInstallmentValue: '',
    financedValue: '',
    financingBank: '',
    financingBankOther: '', // Nome do banco quando for "outro"
    // Campos específicos para novos métodos
    consorcioContemplado: '', // 'sim' ou 'nao'
    consorcioGrupo: '',
    boletoVencimento: '',
    carneParcelas: '',
    carneValorParcela: '',
    promissoriaVencimento: '',
    promissoriaNumero: '',
    commission: '',
    contractClauses: '',
    notes: '',
    exitType: 'venda', // Tipo de saída: transferencia, venda, pre_venda
    saleType: '',
    transferStatus: 'pago',
    transferNotes: '',
    saleChannel: '',
    saleChannelNotes: '',
    internalNotes: '',
    status: 'em_andamento',
    date: new Date().toISOString().split('T')[0],
  })
  const [paymentMethods, setPaymentMethods] = useState<SalePaymentMethod[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  // Estados para busca de avalistas
  const [avalistaSearch, setAvalistaSearch] = useState<{ [key: number]: string }>({})
  const [avalistaAdicionalSearch, setAvalistaAdicionalSearch] = useState<{ [key: number]: string }>({})
  const [filteredAvalistas, setFilteredAvalistas] = useState<{ [key: number]: Customer[] }>({})
  const [filteredAvalistasAdicional, setFilteredAvalistasAdicional] = useState<{ [key: number]: Customer[] }>({})
  const [showAvalistaDropdown, setShowAvalistaDropdown] = useState<{ [key: number]: boolean }>({})
  const [showAvalistaAdicionalDropdown, setShowAvalistaAdicionalDropdown] = useState<{ [key: number]: boolean }>({})
  const [creatingAvalistaForPaymentIndex, setCreatingAvalistaForPaymentIndex] = useState<{ paymentIndex: number; field: 'avalista' | 'avalistaAdicional' } | null>(null)
  // Estados para busca de veículos (usado em veículo na troca)
  const [vehicleSearchByPayment, setVehicleSearchByPayment] = useState<{ [key: number]: string }>({})
  const [filteredVehiclesByPayment, setFilteredVehiclesByPayment] = useState<{ [key: number]: Vehicle[] }>({})
  const [showVehicleDropdownByPayment, setShowVehicleDropdownByPayment] = useState<{ [key: number]: boolean }>({})
  const [creatingVehicleForPaymentIndex, setCreatingVehicleForPaymentIndex] = useState<number | null>(null)
  
  // Estados para modal completo de veículos (FIPE, fotos, documento)
  const [vehicleActiveStep, setVehicleActiveStep] = useState(1)
  const [vehicleDocumentFile, setVehicleDocumentFile] = useState<File | null>(null)
  const [isDraggingDoc, setIsDraggingDoc] = useState(false)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const [vehicleType, setVehicleType] = useState<string>('carros') // 'carros', 'motos', 'caminhoes'
  const [fipeBrands, setFipeBrands] = useState<FipeBrand[]>([])
  const [fipeModels, setFipeModels] = useState<FipeModel[]>([])
  const [fipeYears, setFipeYears] = useState<FipeYear[]>([])
  const [selectedBrandCode, setSelectedBrandCode] = useState<string>('')
  const [selectedModelCode, setSelectedModelCode] = useState<string>('')
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [yearSearch, setYearSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const MAX_PHOTOS = 3

  useEffect(() => {
    loadData()
  }, [periodFilter, specificDate])

  // Carregar marcas FIPE quando abrir o modal de veículo
  useEffect(() => {
    if (showCreateVehicleModal) {
      loadFipeBrands()
    }
  }, [showCreateVehicleModal, vehicleType])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const menuElement = menuRefs.current[openMenuId]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const getDateRange = (period: string, date?: string) => {
    const now = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'week':
        // Calcular início da semana (domingo)
        const dayOfWeek = now.getDay()
        const diff = dayOfWeek // Dias desde domingo
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - diff)
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        break
      case 'date':
        // Data específica
        if (date) {
          const selectedDate = new Date(date)
          startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0)
          endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59)
        }
        break
      default:
        return { startDate: null, endDate: null }
    }

    return {
      startDate: startDate ? startDate.toISOString().split('T')[0] : null,
      endDate: endDate ? endDate.toISOString().split('T')[0] : null
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange(periodFilter, specificDate)
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)

      const [salesRes, customersRes, vehiclesRes] = await Promise.all([
        api.get(`/sales?${params.toString()}`),
        api.get('/customers'),
        api.get('/vehicles?status=disponivel'),
      ])
      console.log('Vendas recebidas:', salesRes.data)
      setSales(salesRes.data || [])
      setCustomers(customersRes.data || [])
      setVehicles(vehiclesRes.data || [])
      
      // Tentar carregar vendedores (pode falhar se não tiver permissão)
      // Usar apenas o usuário atual para evitar 403
      if (user) {
        setSellers([{ id: parseInt(user.id as any), name: user.name, email: user.email || '', role: user.role }])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setPeriodFilter('all')
    setSpecificDate('')
  }

  const handleDateChange = (date: string) => {
    setSpecificDate(date)
    if (date) {
      setPeriodFilter('date')
    }
  }

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await api.post('/auth/register', {
        ...newSellerData,
        role: 'vendedor',
      })
      
      // Adicionar o novo vendedor à lista
      if (response.data.user) {
        setSellers([...sellers, response.data.user])
        setFormData({ ...formData, sellerId: response.data.user.id.toString() })
        setShowNewSellerModal(false)
        setNewSellerData({ name: '', email: '', password: '' })
        setToast({ message: 'Vendedor criado com sucesso!', type: 'success' })
      }
    } catch (error: any) {
      console.error('Erro ao criar vendedor:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao criar vendedor', type: 'error' })
    }
  }

  const calculateRemaining = (salePrice: string, entryValue: string, entryVehicleValue: string, entryAdditionalValue: string) => {
    const price = parseFloat(salePrice) || 0
    const entry = parseFloat(entryValue) || 0
    const vehicleEntry = parseFloat(entryVehicleValue) || 0
    const additionalEntry = parseFloat(entryAdditionalValue) || 0
    const totalEntry = entry + vehicleEntry + additionalEntry
    const remaining = price - totalEntry
    return remaining > 0 ? remaining.toString() : '0'
  }

  const calculateProfit = (salePrice: string, purchasePrice: string) => {
    const sale = parseFloat(salePrice) || 0
    const purchase = parseFloat(purchasePrice) || 0
    return (sale - purchase).toString()
  }

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === parseInt(vehicleId))
    if (vehicle) {
      const newSalePrice = vehicle.price?.toString() || ''
      const newPurchasePrice = vehicle.cost?.toString() || ''
      const remaining = calculateRemaining(newSalePrice, formData.entryValue, formData.entryVehicleValue, formData.entryAdditionalValue)
      setFormData({ 
        ...formData, 
        vehicleId, 
        salePrice: newSalePrice,
        purchasePrice: newPurchasePrice,
        remainingValue: remaining
      })
    }
  }

  const handleEntryTypeChange = (entryType: string) => {
    if (entryType !== 'veiculo') {
      setFormData({ ...formData, entryType, entryVehicleValue: '', entryAdditionalValue: '' })
    } else {
      setFormData({ ...formData, entryType })
    }
  }

  // Funções para gerenciar múltiplas formas de pagamento
  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { date: formData.date || new Date().toISOString().split('T')[0], type: '', value: '' }])
  }

  const removePaymentMethod = (index: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index))
  }

  const updatePaymentMethod = (index: number, field: string, value: string | boolean | ParcelaDetalhe[]) => {
    const updated = [...paymentMethods]
    updated[index] = { ...updated[index], [field]: value }
    setPaymentMethods(updated)
  }

  const addDays = (date: Date, days: number) => {
    const r = new Date(date)
    r.setDate(r.getDate() + days)
    return r
  }

  const addMonths = (date: Date, months: number) => {
    const r = new Date(date)
    r.setMonth(r.getMonth() + months)
    return r
  }

  const toYMD = (d: Date) => d.toISOString().split('T')[0]

  const computeParcelasRows = (pm: SalePaymentMethod, baseDate: string): ParcelaDetalhe[] => {
    try {
      const n = parseInt(pm.quantidadeParcelas || '0', 10) || 0
      if (n <= 0) return []
      const baseStr = (pm.date || baseDate || new Date().toISOString().split('T')[0]).trim()
      if (!baseStr) return []
      const parts = baseStr.split('-').map(Number)
      const [y, m, day] = parts.length >= 3 ? parts : [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()]
      const base = new Date(y, (m || 1) - 1, day || 1)
      if (isNaN(base.getTime())) return []
      const exist = pm.parcelasDetalhe || []
      const out: ParcelaDetalhe[] = []
      const defaultValor = pm.valorParcela || ''
      for (let i = 0; i < n; i++) {
        let data: string
        if (pm.frequencia15Dias) {
          data = toYMD(addDays(base, 15 * i))
        } else {
          data = toYMD(addMonths(base, i))
        }
        out.push({
          data: exist[i]?.data || data,
          valor: exist[i]?.valor ?? defaultValor,
          numeroDocumento: exist[i]?.numeroDocumento ?? '',
        })
      }
      return out
    } catch {
      return []
    }
  }

  const setQuantidadeParcelasFinanciamento = (paymentIndex: number, newQty: string) => {
    const updated = [...paymentMethods]
    const pm = { ...updated[paymentIndex], quantidadeParcelas: newQty }
    const parcelasDetalhe = computeParcelasRows(pm, formData.date)
    updated[paymentIndex] = { ...pm, parcelasDetalhe }
    setPaymentMethods(updated)
  }

  const updateParcela = (paymentIndex: number, parcelIndex: number, field: keyof ParcelaDetalhe, value: string) => {
    const updated = [...paymentMethods]
    const pm = updated[paymentIndex]
    const arr = [...(pm.parcelasDetalhe || [])]
    if (!arr[parcelIndex]) arr[parcelIndex] = { data: '', valor: '', numeroDocumento: '' }
    arr[parcelIndex] = { ...arr[parcelIndex], [field]: value }
    updated[paymentIndex] = { ...pm, parcelasDetalhe: arr }
    setPaymentMethods(updated)
  }

  const calculateTotalReceivable = () => {
    return paymentMethods.reduce((total, pm) => {
      return total + (parseFloat(pm.value) || 0)
    }, 0)
  }

  // Sincronizar quantidade no modal quando abre ou quando pm muda
  useEffect(() => {
    if (!showFinanciamentoProprioModal || financiamentoProprioIndex === null) {
      setFinanciamentoProprioQty('')
      return
    }
    const pm = paymentMethods[financiamentoProprioIndex]
    setFinanciamentoProprioQty(pm?.quantidadeParcelas ?? '')
  }, [showFinanciamentoProprioModal, financiamentoProprioIndex, paymentMethods])

  // Garantir parcelasDetalhe quando modal abre com quantidade já preenchida
  useEffect(() => {
    if (!showFinanciamentoProprioModal || financiamentoProprioIndex === null) return
    const pm = paymentMethods[financiamentoProprioIndex]
    if (!pm) return
    const n = parseInt(pm.quantidadeParcelas || '0', 10) || 0
    if (n <= 0 || (pm.parcelasDetalhe?.length ?? 0) >= n) return
    setQuantidadeParcelasFinanciamento(financiamentoProprioIndex, pm.quantidadeParcelas || '')
  }, [showFinanciamentoProprioModal, financiamentoProprioIndex, paymentMethods])

  // Buscar clientes
  useEffect(() => {
    if (customerSearch.length >= 3) {
      const filtered = customers.filter((c) => {
        const searchLower = customerSearch.toLowerCase()
        return (
          c.name.toLowerCase().includes(searchLower) ||
          (c.cpf && c.cpf.includes(customerSearch.replace(/\D/g, ''))) ||
          (c.phone && c.phone.includes(customerSearch.replace(/\D/g, '')))
        )
      })
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers([])
    }
  }, [customerSearch, customers])

  // Buscar avalistas para cada método de pagamento
  useEffect(() => {
    paymentMethods.forEach((pm, index) => {
      // Busca para Avalista
      const search = avalistaSearch[index] || ''
      if (search.length >= 3) {
        const filtered = customers.filter((c) => {
          const searchLower = search.toLowerCase()
          return (
            c.name.toLowerCase().includes(searchLower) ||
            (c.cpf && c.cpf.includes(search.replace(/\D/g, ''))) ||
            (c.phone && c.phone.includes(search.replace(/\D/g, '')))
          )
        })
        setFilteredAvalistas((prev) => ({ ...prev, [index]: filtered }))
      } else {
        setFilteredAvalistas((prev) => ({ ...prev, [index]: [] }))
      }
      
      // Busca para Avalista Adicional
      const searchAdicional = avalistaAdicionalSearch[index] || ''
      if (searchAdicional.length >= 3) {
        const filtered = customers.filter((c) => {
          const searchLower = searchAdicional.toLowerCase()
          return (
            c.name.toLowerCase().includes(searchLower) ||
            (c.cpf && c.cpf.includes(searchAdicional.replace(/\D/g, ''))) ||
            (c.phone && c.phone.includes(searchAdicional.replace(/\D/g, '')))
          )
        })
        setFilteredAvalistasAdicional((prev) => ({ ...prev, [index]: filtered }))
      } else {
        setFilteredAvalistasAdicional((prev) => ({ ...prev, [index]: [] }))
      }
    })
  }, [avalistaSearch, avalistaAdicionalSearch, customers, paymentMethods])

  // Função para criar cliente
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
      await loadData()

      // Se estiver criando para avalista, preencher o campo correto
      if (creatingAvalistaForPaymentIndex) {
        const { paymentIndex, field } = creatingAvalistaForPaymentIndex
        updatePaymentMethod(paymentIndex, field, newCustomer.name)
        if (field === 'avalista') {
          setAvalistaSearch((prev) => ({ ...prev, [paymentIndex]: newCustomer.name }))
        } else {
          setAvalistaAdicionalSearch((prev) => ({ ...prev, [paymentIndex]: newCustomer.name }))
        }
        setCreatingAvalistaForPaymentIndex(null)
      } else {
        // Selecionar o cliente recém-criado no formulário principal
        setFormData({ ...formData, customerId: newCustomer.id.toString() })
        setCustomerSearch(`${newCustomer.name} ${newCustomer.cpf || newCustomer.phone}`)
      }
      
      setShowCreateCustomerModal(false)
      setCustomerActiveStep(1)
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

  // Função para criar veículo
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    const yearVal = newVehicleData.year || newVehicleData.anoModelo || newVehicleData.anoFabricacao || ''
    if (!newVehicleData.brand || !newVehicleData.model || !yearVal) {
      setToast({ message: 'Preencha Marca, Modelo e Ano.', type: 'error' })
      setCreatingVehicle(false)
      return
    }

    setCreatingVehicle(true)
    try {
      const dataToSend = {
        brand: newVehicleData.brand,
        model: newVehicleData.model,
        year: parseInt(String(yearVal)) || new Date().getFullYear(),
        plate: newVehicleData.plate ? removeMask(newVehicleData.plate) : '',
        km: newVehicleData.km ? parseInt(newVehicleData.km) : null,
        color: newVehicleData.color || null,
        price: newVehicleData.price ? parseFloat(newVehicleData.price) : null,
        cost: newVehicleData.cost ? parseFloat(newVehicleData.cost) : null,
        tableValue: newVehicleData.tableValue ? parseFloat(newVehicleData.tableValue) : null,
        expenseType: newVehicleData.expenseType || null,
        expenseValue: newVehicleData.expenseValue ? parseFloat(newVehicleData.expenseValue) : null,
        customerId: newVehicleData.customerId || null,
        notes: newVehicleData.notes || null,
        status: newVehicleData.status,
        photos: newVehicleData.photos.length ? newVehicleData.photos : null,
        empresa: newVehicleData.empresa || null,
        posicao: newVehicleData.posicao ? parseInt(newVehicleData.posicao) : null,
        conditionStatus: newVehicleData.conditionStatus || null,
        renavam: newVehicleData.renavam || null,
        cadastroOutrasLojas: newVehicleData.cadastroOutrasLojas,
        especie: newVehicleData.especie || null,
        combustivel: newVehicleData.combustivel || null,
        modeloDenatran: newVehicleData.modeloDenatran || null,
        modeloBase: newVehicleData.modeloBase || null,
        portas: newVehicleData.portas || null,
        carroceria: newVehicleData.carroceria || null,
        anoFabricacao: newVehicleData.anoFabricacao ? parseInt(newVehicleData.anoFabricacao) : null,
        anoModelo: newVehicleData.anoModelo ? parseInt(newVehicleData.anoModelo) : null,
        motorizacao: newVehicleData.motorizacao || null,
        cambio: newVehicleData.cambio || null,
        chassi: newVehicleData.chassi || null,
        chassiRemarcado: newVehicleData.chassiRemarcado,
        modeloFipe: newVehicleData.modeloFipe || null,
        cidadeEmplacamento: newVehicleData.cidadeEmplacamento || null,
        numeroCambio: newVehicleData.numeroCambio || null,
        hpCv: newVehicleData.hpCv || null,
        periciaCautelar: newVehicleData.periciaCautelar || null,
        passageiros: newVehicleData.passageiros || null,
        blindado: newVehicleData.blindado || null,
        origem: newVehicleData.origem || null,
        numeroMotor: newVehicleData.numeroMotor || null,
        corInterna: newVehicleData.corInterna || null,
        opcionais: newVehicleData.opcionais.length ? newVehicleData.opcionais : null,
      }

      let savedVehicleId: number | null = null
      const res = await api.post('/vehicles', dataToSend)
      savedVehicleId = res.data?.vehicle?.id || res.data?.id || null
      const savedVehicle = res.data?.vehicle || res.data

      // Se houver documento PDF, enviar após criar o veículo
      if (vehicleDocumentFile && savedVehicleId) {
        const fd = new FormData()
        fd.append('document', vehicleDocumentFile)
        try {
          await api.post(`/vehicles/${savedVehicleId}/document`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (error) {
          console.error('Erro ao enviar documento:', error)
        }
      }

      // Atualizar lista de veículos
      await loadData()

      // Se estiver criando veículo para um método de pagamento específico
      if (creatingVehicleForPaymentIndex !== null) {
        const paymentIndex = creatingVehicleForPaymentIndex
        updatePaymentMethod(paymentIndex, 'veiculoTrocaId', savedVehicle.id.toString())
        setVehicleSearchByPayment({ ...vehicleSearchByPayment, [paymentIndex]: `${savedVehicle.brand} ${savedVehicle.model} ${savedVehicle.year} ${savedVehicle.plate || ''}` })
        setCreatingVehicleForPaymentIndex(null)
      } else {
        // Selecionar o veículo recém-criado no formulário principal
        setFormData({ ...formData, vehicleId: savedVehicle.id.toString() })
      }
      
      setShowCreateVehicleModal(false)
      resetVehicleForm()
      setToast({ message: 'Veículo criado com sucesso!', type: 'success' })
    } catch (error: any) {
      console.error('Erro ao criar veículo:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao criar veículo', type: 'error' })
    } finally {
      setCreatingVehicle(false)
    }
  }

  // Funções para modal completo de veículos (FIPE, fotos, documento)
  const loadFipeBrands = async () => {
    setLoadingBrands(true)
    try {
      const response = await api.get(`/fipe/brands?type=${vehicleType}`)
      setFipeBrands(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar marcas FIPE:', error)
      setFipeBrands([])
    } finally {
      setLoadingBrands(false)
    }
  }

  const loadFipeModels = async (brandCode: string) => {
    if (!brandCode) return
    setLoadingModels(true)
    try {
      const response = await api.get(`/fipe/brands/${brandCode}/models?type=${vehicleType}`)
      setFipeModels(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar modelos FIPE:', error)
      setFipeModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  const loadFipeYears = async (brandCode: string, modelCode: string) => {
    if (!brandCode || !modelCode) return
    setLoadingYears(true)
    try {
      const response = await api.get(`/fipe/brands/${brandCode}/models/${modelCode}/years?type=${vehicleType}`)
      setFipeYears(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar anos FIPE:', error)
      setFipeYears([])
    } finally {
      setLoadingYears(false)
    }
  }

  useEffect(() => {
    if (selectedBrandCode) {
      loadFipeModels(selectedBrandCode)
    } else {
      setFipeModels([])
      setSelectedModelCode('')
      setFipeYears([])
    }
  }, [selectedBrandCode, vehicleType])

  useEffect(() => {
    if (selectedBrandCode && selectedModelCode) {
      loadFipeYears(selectedBrandCode, selectedModelCode)
    } else {
      setFipeYears([])
    }
  }, [selectedBrandCode, selectedModelCode, vehicleType])

  useEffect(() => {
    // Quando trocar o tipo de veículo, limpar tudo e recarregar marcas
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    if (showCreateVehicleModal) {
      loadFipeBrands()
    }
  }, [vehicleType])

  useEffect(() => {
    // Fechar dropdowns ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.searchable-select')) {
        setShowBrandDropdown(false)
        setShowModelDropdown(false)
        setShowYearDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBrandSelect = (brand: FipeBrand) => {
    setSelectedBrandCode(brand.codigo)
    setBrandSearch(brand.nome)
    setNewVehicleData({ ...newVehicleData, brand: brand.nome, model: '', year: '' })
    setModelSearch('')
    setSelectedModelCode('')
    setYearSearch('')
    setShowBrandDropdown(false)
  }

  const handleModelSelect = (model: FipeModel) => {
    setSelectedModelCode(model.codigo)
    setNewVehicleData({ ...newVehicleData, model: model.nome, year: '' })
    setModelSearch(model.nome)
    setYearSearch('')
    setShowModelDropdown(false)
  }

  const handleYearSelect = (year: FipeYear) => {
    const yearNumber = year.nome.split('/')[0]?.split('-')[0] || year.nome.split('-')[0] || year.nome
    setNewVehicleData({ ...newVehicleData, year: yearNumber })
    setYearSearch(year.nome)
    setShowYearDropdown(false)
  }

  const filteredBrands = fipeBrands.filter(brand =>
    brand.nome.toLowerCase().includes(brandSearch.toLowerCase())
  )

  const filteredModels = fipeModels.filter(model =>
    model.nome.toLowerCase().includes(modelSearch.toLowerCase())
  )

  const filteredYears = fipeYears.filter(year =>
    year.nome.toLowerCase().includes(yearSearch.toLowerCase())
  )

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const toAdd = Math.min(MAX_PHOTOS - newVehicleData.photos.length, files.length)
    let added = 0
    if (toAdd <= 0) return
    Array.from(files).slice(0, toAdd).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onloadend = () => {
        const b64 = reader.result as string
        setNewVehicleData((prev) => ({ ...prev, photos: [...prev.photos, b64] }))
      }
      reader.readAsDataURL(file)
      added++
    })
    e.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setNewVehicleData((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
  }

  const addOpcional = (item: string) => {
    if (newVehicleData.opcionais.includes(item)) return
    setNewVehicleData((prev) => ({ ...prev, opcionais: [...prev.opcionais, item] }))
  }

  const removeOpcional = (item: string) => {
    setNewVehicleData((prev) => ({ ...prev, opcionais: prev.opcionais.filter((o) => o !== item) }))
  }

  const filteredOpcionais = OPCIONAIS_LIST.filter(
    (o) => !newVehicleData.opcionais.includes(o) && o.toLowerCase().includes(opcionaisSearch.toLowerCase())
  )

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
  }

  const handleSelectDocumentFile = (file: File | null) => {
    if (!file) {
      setVehicleDocumentFile(null)
      return
    }

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      setToast({ message: 'Envie apenas arquivo PDF.', type: 'error' })
      return
    }

    setVehicleDocumentFile(file)
  }

  const resetVehicleForm = () => {
    setVehicleActiveStep(1)
    setOpcionaisSearch('')
    setNewVehicleData({
      empresa: 'Iago Veiculos Ltda',
      posicao: '',
      conditionStatus: 'usado',
      plate: '',
      renavam: '',
      cadastroOutrasLojas: false,
      especie: 'AUTOMÓVEL',
      combustivel: '',
      brand: '',
      model: '',
      color: '',
      modeloDenatran: '',
      km: '',
      modeloBase: '',
      portas: '',
      carroceria: '',
      anoFabricacao: '',
      anoModelo: '',
      year: '',
      motorizacao: '',
      cambio: '',
      chassi: '',
      chassiRemarcado: false,
      modeloFipe: '',
      cidadeEmplacamento: '',
      numeroCambio: '',
      hpCv: '',
      periciaCautelar: '',
      passageiros: '',
      blindado: 'Não',
      origem: 'Nacional',
      numeroMotor: '',
      corInterna: '',
      price: '',
      cost: '',
      tableValue: '',
      expenseType: '',
      expenseValue: '',
      customerId: '',
      notes: '',
      status: 'disponivel',
      opcionais: [],
      photos: [],
    })
    setVehicleDocumentFile(null)
    setIsDraggingDoc(false)
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    setShowBrandDropdown(false)
    setShowModelDropdown(false)
    setShowYearDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Calcular entrada e restante baseado nas formas de pagamento
      let entryValue = 0
      let remainingValue = formData.salePrice ? parseFloat(formData.salePrice) : 0
      
      if (paymentMethods.length > 0) {
        paymentMethods.forEach((pm) => {
          const value = parseFloat(pm.value) || 0
          if (pm.type === 'dinheiro' || pm.type === 'pix' || pm.type === 'ted_doc_pix') {
            entryValue += value
          }
          remainingValue -= value
        })
      } else {
        // Fallback para campos antigos se não tiver paymentMethods
        if (formData.entryValue) entryValue = parseFloat(formData.entryValue)
        if (formData.entryVehicleValue) entryValue += parseFloat(formData.entryVehicleValue)
        if (formData.entryAdditionalValue) entryValue += parseFloat(formData.entryAdditionalValue)
        if (formData.salePrice) {
          remainingValue = parseFloat(formData.salePrice) - entryValue
        }
      }

      const dataToSend: any = {
        customerId: parseInt(formData.customerId),
        vehicleId: parseInt(formData.vehicleId),
        sellerId: formData.sellerId ? parseInt(formData.sellerId) : (user ? parseInt(user.id as any) : null),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        discountAmount: formData.discount ? parseFloat(formData.discount) : undefined,
        entryValue: entryValue > 0 ? entryValue : (formData.entryValue ? parseFloat(formData.entryValue) : undefined),
        entryType: formData.entryType || undefined,
        entryVehicleValue: formData.entryVehicleValue ? parseFloat(formData.entryVehicleValue) : undefined,
        entryAdditionalValue: formData.entryAdditionalValue ? parseFloat(formData.entryAdditionalValue) : undefined,
        entryCardInstallments: formData.entryCardInstallments ? parseInt(formData.entryCardInstallments) : undefined,
        remainingValue: remainingValue > 0 ? remainingValue : (formData.remainingValue ? parseFloat(formData.remainingValue) : undefined),
        paymentMethod: formData.paymentMethod || undefined,
        paymentInstallments: formData.paymentInstallments ? parseInt(formData.paymentInstallments) : undefined,
        paymentInstallmentValue: formData.paymentInstallmentValue ? parseFloat(formData.paymentInstallmentValue) : undefined,
        financedValue: formData.financedValue ? parseFloat(formData.financedValue) : undefined,
        financingBank: formData.financingBank === 'outro' && formData.financingBankOther 
          ? formData.financingBankOther 
          : (formData.financingBank || undefined),
        commission: formData.commission ? parseFloat(formData.commission) : undefined,
        contractClauses: formData.contractClauses || undefined,
        notes: formData.internalNotes || formData.notes || undefined,
        exitType: formData.exitType || undefined,
        saleType: formData.saleType || undefined,
        transferStatus: formData.transferStatus || undefined,
        transferNotes: formData.transferNotes || undefined,
        saleChannel: formData.saleChannel || undefined,
        saleChannelNotes: formData.saleChannelNotes || undefined,
        internalNotes: formData.internalNotes || undefined,
        status: formData.status,
        date: formData.date || new Date().toISOString(),
      }

      // Adicionar múltiplas formas de pagamento
      if (paymentMethods.length > 0) {
        dataToSend.paymentMethods = paymentMethods.map((pm) => ({
          date: pm.date || formData.date || new Date().toISOString().split('T')[0],
          type: pm.type,
          value: pm.value,
          valorFinanciado: pm.valorFinanciado || null,
          quantidadeParcelas: pm.quantidadeParcelas || null,
          frequencia15Dias: pm.frequencia15Dias || false,
          manterDataFixa: pm.manterDataFixa || false,
          valorParcela: pm.valorParcela || null,
          numeroPrimeiroDoc: pm.numeroPrimeiroDoc || null,
          numeroDocumento: pm.numeroDocumento || null,
          descricao: pm.descricao || null,
          avalista: pm.avalista || null,
          avalistaAdicional: pm.avalistaAdicional || null,
          // Campo para forma de pagamento dentro do Financiamento Próprio
          formaPagamentoFinanciamentoProprio: pm.formaPagamentoFinanciamentoProprio || null,
          // Campos para Troco na troca
          trocoData: pm.trocoData || null,
          trocoDescricao: pm.trocoDescricao || null,
          trocoValorTotal: pm.trocoValorTotal || null,
          // Campos para Veículo na troca
          veiculoTrocaId: pm.veiculoTrocaId || null,
          // Campos para Cartão de crédito
          codigoAutorizacao: pm.codigoAutorizacao || null,
          recebimentoLoja: pm.recebimentoLoja || null,
        }))
      }
      
      if (editingSale) {
        await api.put(`/sales/${editingSale.id}`, dataToSend)
        setToast({ message: 'Venda atualizada com sucesso!', type: 'success' })
      } else {
        const response = await api.post('/sales', dataToSend)
        console.log('Venda criada com sucesso:', response.data)
        setToast({ message: 'Venda criada com sucesso!', type: 'success' })
      }
      setShowModal(false)
      setEditingSale(null)
      resetForm()
      await loadData()
    } catch (error: any) {
      console.error('Erro ao criar venda:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao criar venda', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const formatPaymentMethod = (method?: string | null) => {
    if (!method) return 'Não informado'
    const methods: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'cartao_debito': 'Cartão de Débito',
      'carta_credito': 'Cartão de Crédito',
      'financiamento_bancario': 'Financiamento Bancário',
      'financiamento_proprio': 'Financiamento Próprio da Loja',
      'consorcio': 'Consórcio',
      'boleto': 'Boleto',
      'carne': 'Carnê',
      'promissoria': 'Promissória',
      'financiamento': 'Financiamento', // Para compatibilidade com dados antigos
      'cheque': 'Cheque', // Para compatibilidade com dados antigos
      'carta_credito_consorcio': 'Carta de crédito de consórcio',
      'outros': 'Outros',
      'sinal_negocio': 'Sinal de negócio',
      'ted_doc_pix': 'TED, DOC, PIX, Transferência bancária',
      'troco_troca': 'Troco na troca',
      'veiculo_troca': 'Veículo na troca',
    }
    return methods[method] || method
  }

  const formatEntryType = (type?: string | null) => {
    if (!type) return 'Não informado'
    const types: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'veiculo': 'Veículo',
      'cartao_credito': 'Cartão de Crédito'
    }
    return types[type] || type
  }

  const handleGenerateContract = (sale: Sale) => {
    setSelectedSale(sale)
    setShowContractModal(true)
  }

  const handleGeneratePDF = async () => {
    if (!selectedSale) return
    
    try {
      // Usar jsPDF para gerar o PDF
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      
      let y = 20
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)
      
      // Cabeçalho
      doc.setFontSize(20)
      doc.setFont(undefined, 'bold')
      doc.text('CONTRATO DE COMPRA E VENDA DE VEÍCULO', pageWidth / 2, y, { align: 'center' })
      y += 12
      
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(`Nº ${selectedSale.id}`, pageWidth / 2, y, { align: 'center' })
      y += 15
      
      // Data
      doc.setFontSize(11)
      const saleDate = selectedSale.date ? new Date(selectedSale.date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
      doc.text(`Data: ${saleDate}`, margin, y)
      y += 10
      
      // Linha separadora
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      
      // PARTES CONTRATANTES
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('1. PARTES CONTRATANTES', margin, y)
      y += 10
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      doc.text('VENDEDOR:', margin, y)
      y += 7
      doc.setFont(undefined, 'normal')
      doc.text(`Nome: ${selectedSale.seller?.name || ''}`, margin + 5, y)
      y += 6
      
      doc.setFont(undefined, 'bold')
      doc.text('COMPRADOR:', margin, y)
      y += 7
      doc.setFont(undefined, 'normal')
      doc.text(`Nome: ${selectedSale.customer?.name || ''}`, margin + 5, y)
      y += 6
      if (selectedSale.customer?.cpf) {
        doc.text(`CPF: ${selectedSale.customer.cpf}`, margin + 5, y)
        y += 6
      }
      doc.text(`Telefone: ${selectedSale.customer?.phone || ''}`, margin + 5, y)
      y += 12
      
      // Linha separadora
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      
      // OBJETO DO CONTRATO
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('2. OBJETO DO CONTRATO', margin, y)
      y += 10
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.text(`O presente contrato tem por objeto a venda do seguinte veículo:`, margin, y)
      y += 10
      
      doc.setFont(undefined, 'bold')
      doc.text('VEÍCULO:', margin, y)
      y += 7
      doc.setFont(undefined, 'normal')
      doc.text(`Marca: ${selectedSale.vehicle?.brand || ''}`, margin + 5, y)
      y += 6
      doc.text(`Modelo: ${selectedSale.vehicle?.model || ''}`, margin + 5, y)
      y += 6
      doc.text(`Ano: ${selectedSale.vehicle?.year || ''}`, margin + 5, y)
      y += 6
      if (selectedSale.vehicle?.plate) {
        doc.text(`Placa: ${selectedSale.vehicle.plate}`, margin + 5, y)
        y += 6
      }
      y += 8
      
      // Linha separadora
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      
      // VALOR E FORMA DE PAGAMENTO
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('3. VALOR E FORMA DE PAGAMENTO', margin, y)
      y += 10
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      
      if (selectedSale.salePrice) {
        doc.setFont(undefined, 'bold')
        doc.text(`Valor Total da Venda: R$ ${selectedSale.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin, y)
        y += 10
        doc.setFont(undefined, 'normal')
      }
      
      // Entrada
      if (selectedSale.entryType) {
        doc.setFont(undefined, 'bold')
        doc.text('ENTRADA:', margin, y)
        y += 7
        doc.setFont(undefined, 'normal')
        doc.text(`Tipo: ${formatEntryType(selectedSale.entryType)}`, margin + 5, y)
        y += 6
        
        if (selectedSale.entryType === 'dinheiro' && selectedSale.entryValue) {
          doc.text(`Valor: R$ ${selectedSale.entryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, y)
          y += 6
        }
        
        if (selectedSale.entryType === 'veiculo') {
          if (selectedSale.entryVehicleValue) {
            doc.text(`Valor do Veículo: R$ ${selectedSale.entryVehicleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, y)
            y += 6
          }
          if (selectedSale.entryAdditionalValue) {
            doc.text(`Valor Adicional em Dinheiro: R$ ${selectedSale.entryAdditionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, y)
            y += 6
          }
        }
        
        if (selectedSale.entryType === 'cartao_credito' && selectedSale.entryValue) {
          doc.text(`Valor: R$ ${selectedSale.entryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, y)
          y += 6
          if (selectedSale.entryCardInstallments) {
            doc.text(`Parcelas: ${selectedSale.entryCardInstallments}x`, margin + 5, y)
            y += 6
          }
        }
        y += 6
      }
      
      // Restante
      if (selectedSale.remainingValue) {
        doc.setFont(undefined, 'bold')
        doc.text(`Valor Restante: R$ ${selectedSale.remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin, y)
        y += 10
        doc.setFont(undefined, 'normal')
      }
      
      // Forma de pagamento do restante
      if (selectedSale.paymentMethod) {
        doc.setFont(undefined, 'bold')
        doc.text('FORMA DE PAGAMENTO DO RESTANTE:', margin, y)
        y += 7
        doc.setFont(undefined, 'normal')
        doc.text(`Método: ${formatPaymentMethod(selectedSale.paymentMethod)}`, margin + 5, y)
        y += 6
        
        if ((selectedSale.paymentMethod === 'carta_credito' || selectedSale.paymentMethod === 'financiamento') && selectedSale.paymentInstallments) {
          doc.text(`Parcelas: ${selectedSale.paymentInstallments}x`, margin + 5, y)
          y += 6
          if (selectedSale.paymentInstallmentValue) {
            doc.text(`Valor da Parcela: R$ ${selectedSale.paymentInstallmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, y)
            y += 6
          }
        }
        
        if (selectedSale.paymentMethod === 'financiamento' && selectedSale.financedValue) {
          doc.text(`Valor Financiado: R$ ${selectedSale.financedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 5, y)
          y += 6
        }
        y += 6
      }
      
      y += 5
      
      // Linha separadora
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      
      // CLÁUSULAS
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('4. CLÁUSULAS CONTRATUAIS', margin, y)
      y += 10
      
      if (selectedSale.contractClauses) {
        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        const clauses = selectedSale.contractClauses.split('\n').filter((c: string) => c.trim() !== '')
        clauses.forEach((clause: string, index: number) => {
          if (y > 260) {
            doc.addPage()
            y = 20
          }
          const clauseText = `${index + 1}. ${clause.trim()}`
          const lines = doc.splitTextToSize(clauseText, contentWidth)
          doc.text(lines, margin, y)
          y += lines.length * 5 + 3
        })
      } else {
        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        doc.text('As cláusulas específicas deste contrato serão definidas pelas partes.', margin, y)
        y += 10
      }
      
      y += 10
      
      // Linha separadora
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      
      // OBSERVAÇÕES
      if (selectedSale.notes) {
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('5. OBSERVAÇÕES', margin, y)
        y += 10
        
        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        const notesLines = doc.splitTextToSize(selectedSale.notes, contentWidth)
        doc.text(notesLines, margin, y)
        y += notesLines.length * 5 + 5
        
        if (y > 250) {
          doc.addPage()
          y = 20
        }
        doc.line(margin, y, pageWidth - margin, y)
        y += 10
      }
      
      // ASSINATURAS
      if (y > 220) {
        doc.addPage()
        y = 20
      }
      
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('6. ASSINATURAS', margin, y)
      y += 15
      
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      
      // Vendedor
      const signatureY = y + 30
      doc.line(margin, signatureY, margin + 80, signatureY)
      doc.text('VENDEDOR', margin, y)
      doc.text(selectedSale.seller?.name || '', margin, signatureY + 8)
      
      // Cliente
      doc.line(pageWidth - margin - 80, signatureY, pageWidth - margin, signatureY)
      doc.text('COMPRADOR', pageWidth - margin - 80, y)
      doc.text(selectedSale.customer?.name || '', pageWidth - margin - 80, signatureY + 8)
      
      y = signatureY + 20
      
      // Data e Local
      doc.setFontSize(10)
      doc.text(`Data: ${saleDate}`, margin, y)
      
      // Salvar PDF
      doc.save(`contrato-${selectedSale.id}-${selectedSale.customer.name.replace(/\s/g, '-')}.pdf`)
      setToast({ message: 'Contrato gerado com sucesso!', type: 'success' })
      setShowContractModal(false)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      setToast({ message: 'Erro ao gerar PDF. Tente novamente.', type: 'error' })
    }
  }

  const handleEdit = async (sale: Sale) => {
    setEditingSale(sale)
    // Verificar se o banco é "outro" ou um dos bancos padrão
    const isOtherBank = sale.financingBank && !banks.find(b => b.value === sale.financingBank)
    
    // Buscar o veículo específico da venda para incluí-lo na lista mesmo que esteja vendido
    try {
      const vehicleRes = await api.get(`/vehicles/${sale.vehicle.id}`)
      const saleVehicle = vehicleRes.data
      
      // Adicionar o veículo da venda à lista se não estiver lá
      setVehicles(prevVehicles => {
        const vehicleExists = prevVehicles.find(v => v.id === saleVehicle.id)
        if (!vehicleExists) {
          return [
            ...prevVehicles,
            {
              id: saleVehicle.id,
              brand: saleVehicle.brand,
              model: saleVehicle.model,
              year: saleVehicle.year,
              plate: saleVehicle.plate,
              price: saleVehicle.price,
              cost: saleVehicle.cost,
              status: saleVehicle.status
            }
          ]
        }
        return prevVehicles
      })
    } catch (error) {
      console.error('Erro ao buscar veículo da venda:', error)
      // Se não conseguir buscar, usar os dados do veículo que já estão na venda
      setVehicles(prevVehicles => {
        const vehicleExists = prevVehicles.find(v => v.id === sale.vehicle.id)
        if (!vehicleExists) {
          return [
            ...prevVehicles,
            {
              id: sale.vehicle.id,
              brand: sale.vehicle.brand,
              model: sale.vehicle.model,
              year: sale.vehicle.year,
              plate: sale.vehicle.plate,
              price: sale.vehicle.price || 0,
              cost: sale.vehicle.cost || 0,
              status: 'vendido'
            }
          ]
        }
        return prevVehicles
      })
    }
    
    setFormData({
      customerId: sale.customer.id.toString(),
      vehicleId: sale.vehicle.id.toString(),
      sellerId: sale.seller.id.toString(),
      salePrice: sale.salePrice?.toString() || '',
      purchasePrice: sale.purchasePrice?.toString() || '',
      tableValue: '',
      discount: sale.discountAmount?.toString() || '',
      entryValue: sale.entryValue?.toString() || '',
      entryType: sale.entryType || '',
      entryVehicleValue: sale.entryVehicleValue?.toString() || '',
      entryAdditionalValue: sale.entryAdditionalValue?.toString() || '',
      entryCardInstallments: sale.entryCardInstallments?.toString() || '',
      remainingValue: sale.remainingValue?.toString() || '',
      paymentMethod: sale.paymentMethod || '',
      paymentInstallments: sale.paymentInstallments?.toString() || '',
      paymentInstallmentValue: sale.paymentInstallmentValue?.toString() || '',
      financedValue: sale.financedValue?.toString() || '',
      financingBank: isOtherBank ? 'outro' : (sale.financingBank || ''),
      financingBankOther: isOtherBank ? (sale.financingBank || '') : '',
      consorcioContemplado: '',
      consorcioGrupo: '',
      boletoVencimento: '',
      carneParcelas: '',
      carneValorParcela: '',
      promissoriaVencimento: '',
      promissoriaNumero: '',
      commission: sale.commission?.toString() || '',
      contractClauses: sale.contractClauses || '',
      notes: sale.notes || '',
      exitType: (sale as any).exitType || (sale.saleType ? 'venda' : (sale.transferStatus ? 'transferencia' : 'venda')),
      saleType: sale.saleType || '',
      transferStatus: sale.transferStatus || 'pago',
      transferNotes: sale.transferNotes || '',
      saleChannel: sale.saleChannel || '',
      saleChannelNotes: sale.saleChannelNotes || '',
      internalNotes: sale.internalNotes || '',
      status: sale.status,
      date: sale.date ? new Date(sale.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
    
    // Carregar múltiplas formas de pagamento se existirem
    if (sale.paymentMethods && sale.paymentMethods.length > 0) {
      const baseDate = sale.date ? new Date(sale.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      setPaymentMethods(sale.paymentMethods.map((pm: any, index: number) => {
        const paymentMethod: SalePaymentMethod = {
          date: pm.date ? new Date(pm.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          type: pm.type || '',
          value: pm.value?.toString() || '',
          valorFinanciado: pm.valorFinanciado?.toString() || '',
          quantidadeParcelas: pm.quantidadeParcelas?.toString() || '',
          frequencia15Dias: pm.frequencia15Dias || false,
          manterDataFixa: pm.manterDataFixa || false,
          valorParcela: pm.valorParcela?.toString() || '',
          numeroPrimeiroDoc: pm.numeroPrimeiroDoc || '',
          numeroDocumento: pm.numeroDocumento || '',
          descricao: pm.descricao || '',
          avalista: pm.avalista || '',
          avalistaAdicional: pm.avalistaAdicional || '',
          formaPagamentoFinanciamentoProprio: pm.formaPagamentoFinanciamentoProprio || undefined,
          trocoData: pm.trocoData ? new Date(pm.trocoData).toISOString().split('T')[0] : undefined,
          trocoDescricao: pm.trocoDescricao || undefined,
          trocoValorTotal: pm.trocoValorTotal?.toString() || undefined,
          veiculoTrocaId: pm.veiculoTrocaId?.toString() || undefined,
          codigoAutorizacao: pm.codigoAutorizacao || undefined,
          recebimentoLoja: pm.recebimentoLoja || undefined,
        }
        if (pm.type === 'financiamento_proprio' && paymentMethod.quantidadeParcelas) {
          paymentMethod.parcelasDetalhe = computeParcelasRows(paymentMethod, baseDate)
        }
        
        // Se for veículo na troca, buscar o veículo e preencher a busca
        if (pm.type === 'veiculo_troca' && pm.veiculoTrocaId) {
          const vehicle = vehicles.find(v => v.id === parseInt(pm.veiculoTrocaId))
          if (vehicle) {
            setVehicleSearchByPayment(prev => ({
              ...prev,
              [index]: `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.plate || ''}`
            }))
          }
        }
        
        // Inicializar busca de avalistas se existirem
        if (pm.avalista) {
          setAvalistaSearch((prev) => ({ ...prev, [index]: pm.avalista }))
        }
        if (pm.avalistaAdicional) {
          setAvalistaAdicionalSearch((prev) => ({ ...prev, [index]: pm.avalistaAdicional }))
        }
        
        return paymentMethod
      }))
    } else {
      setPaymentMethods([])
    }
    
    setCustomerSearch(`${sale.customer.name} ${sale.customer.cpf || sale.customer.phone || ''}`)
    setShowModal(true)
  }

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id)
    setShowConfirmModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return
    setShowConfirmModal(false)
    setDeleting(confirmDeleteId)
    try {
      await api.delete(`/sales/${confirmDeleteId}`)
      setToast({ message: 'Venda excluída com sucesso!', type: 'success' })
      await loadData()
    } catch (error: any) {
      console.error('Erro ao excluir venda:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao excluir venda', type: 'error' })
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowConfirmModal(false)
    setConfirmDeleteId(null)
  }

  const resetForm = () => {
    setEditingSale(null)
    setPaymentMethods([])
    setCustomerSearch('')
    setFilteredCustomers([])
    setShowCustomerDropdown(false)
    setVehicleSearchByPayment({})
    setFilteredVehiclesByPayment({})
    setShowVehicleDropdownByPayment({})
    setCreatingVehicleForPaymentIndex(null)
    setAvalistaSearch({})
    setAvalistaAdicionalSearch({})
    setFilteredAvalistas({})
    setFilteredAvalistasAdicional({})
    setShowAvalistaDropdown({})
    setShowAvalistaAdicionalDropdown({})
    setCreatingAvalistaForPaymentIndex(null)
    setFormData({
      customerId: '',
      vehicleId: '',
      sellerId: user ? user.id.toString() : '',
      salePrice: '',
      purchasePrice: '',
      tableValue: '',
      discount: '',
      entryValue: '',
      entryType: '',
      entryVehicleValue: '',
      entryAdditionalValue: '',
      entryCardInstallments: '',
      remainingValue: '',
      paymentMethod: '',
      paymentInstallments: '',
      paymentInstallmentValue: '',
      financedValue: '',
      financingBank: '',
      financingBankOther: '',
      consorcioContemplado: '',
      consorcioGrupo: '',
      boletoVencimento: '',
      carneParcelas: '',
      carneValorParcela: '',
      promissoriaVencimento: '',
      promissoriaNumero: '',
      commission: '',
      contractClauses: '',
      notes: '',
      exitType: 'venda',
      saleType: '',
      transferStatus: 'pago',
      transferNotes: '',
      saleChannel: '',
      saleChannelNotes: '',
      internalNotes: '',
      status: 'em_andamento',
      date: new Date().toISOString().split('T')[0],
    })
  }

  const selectedVehicle = vehicles.find(v => v.id === parseInt(formData.vehicleId))
  const profit = formData.salePrice && formData.purchasePrice 
    ? calculateProfit(formData.salePrice, formData.purchasePrice) 
    : '0'

  return (
    <Layout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vendas</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              {sales.length} {sales.length === 1 ? 'venda encontrada' : 'vendas encontradas'}
              {periodFilter !== 'all' && ` no período selecionado`}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Nova Venda
          </button>
        </div>

        {/* Filtros de Período */}
        <div className="bg-white p-3 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Filtrar por período</h3>
            {periodFilter !== 'all' && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                periodFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setPeriodFilter('today')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                periodFilter === 'today'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodFilter('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                periodFilter === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                periodFilter === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriodFilter('year')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                periodFilter === 'year'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Este Ano
            </button>
          </div>
          <div className="flex items-center gap-2 border-t border-gray-200 pt-2">
            <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Data específica:</label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm"
            />
            {specificDate && (
              <span className="text-xs text-gray-600">
                {new Date(specificDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-700">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 max-h-[calc(100vh-280px)] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Veículo</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor Venda</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Valor Compra</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lucro</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vendedor</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-gray-500 text-sm">
                        Nenhuma venda cadastrada
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{sale.customer?.name || '-'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{sale.customer?.cpf || sale.customer?.phone || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.vehicle?.brand} {sale.vehicle?.model}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {sale.vehicle?.year} {sale.vehicle?.plate && `• ${sale.vehicle.plate}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {sale.salePrice ? `R$ ${sale.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {sale.purchasePrice ? `R$ ${sale.purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            {sale.profit ? `R$ ${sale.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {sale.seller?.name || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                            sale.status === 'concluida' 
                              ? 'bg-green-100 text-green-800' 
                              : sale.status === 'cancelada'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sale.status === 'concluida' ? 'Concluída' : sale.status === 'cancelada' ? 'Cancelada' : 'Em Andamento'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(openMenuId === sale.id ? null : sale.id)
                              }}
                              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <FiMoreVertical className="w-5 h-5 text-gray-600" />
                            </button>
                            
                            {openMenuId === sale.id && (
                              <div
                                ref={(el) => { menuRefs.current[sale.id] = el }}
                                className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(sale)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <FiEdit className="w-4 h-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSale(sale)
                                    setShowDetailsModal(true)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <FiEye className="w-4 h-4" />
                                  Ver Detalhes
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleGenerateContract(sale)
                                    setOpenMenuId(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <FiFileText className="w-4 h-4" />
                                  Contrato
                                </button>
                                <div className="border-t border-gray-200"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteClick(sale.id)
                                    setOpenMenuId(null)
                                  }}
                                  disabled={deleting === sale.id}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                  {deleting === sale.id ? 'Excluindo...' : 'Excluir'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Nova Venda */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-3">
                <h2 className="text-lg font-bold mb-3">Incluir Venda</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Veículo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo</label>
                    {formData.vehicleId ? (
                      <div className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900">
                        {(() => {
                          const vehicle = vehicles.find(v => v.id === parseInt(formData.vehicleId))
                          return vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.plate ? `- ${vehicle.plate}` : ''}` : 'Veículo selecionado'
                        })()}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          required
                          value={formData.vehicleId}
                          onChange={(e) => handleVehicleChange(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione um veículo</option>
                          {vehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.brand} {vehicle.model} {vehicle.year} {vehicle.plate ? `- ${vehicle.plate}` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCreateVehicleModal(true)}
                          className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                          title="Criar novo veículo"
                        >
                          <FiPlus className="w-3 h-3" />
                          Criar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Tipo de saída */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de saída *</label>
                    <select
                      required
                      value={formData.exitType}
                      onChange={(e) => setFormData({ ...formData, exitType: e.target.value, saleType: '' })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Selecione</option>
                      <option value="transferencia">Transferência</option>
                      <option value="venda">Venda</option>
                      <option value="pre_venda">Pré-venda</option>
                    </select>
                  </div>

                  {/* Tipo de venda (se for venda ou pré-venda) */}
                  {(formData.exitType === 'venda' || formData.exitType === 'pre_venda') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de venda *</label>
                      <select
                        required
                        value={formData.saleType}
                        onChange={(e) => setFormData({ ...formData, saleType: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="consumidor_final">Consumidor Final</option>
                        <option value="repasse">Repasse</option>
                      </select>
                    </div>
                  )}

                  {/* Dados de Saída */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Dados de Saída</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de saída *</label>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      {formData.exitType !== 'transferencia' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Cliente *</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                required
                                value={customerSearch}
                                onChange={(e) => {
                                  setCustomerSearch(e.target.value)
                                  setShowCustomerDropdown(e.target.value.length >= 3)
                                }}
                                onFocus={() => {
                                  if (customerSearch.length >= 3) {
                                    setShowCustomerDropdown(true)
                                  }
                                }}
                                placeholder="Digite no mínimo 3 caracteres para localizar o cliente (nome ou CPF)"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              />
                              {showCustomerDropdown && filteredCustomers.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {filteredCustomers.map((customer) => (
                                    <button
                                      key={customer.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, customerId: customer.id.toString() })
                                        setCustomerSearch(`${customer.name} ${customer.cpf || customer.phone}`)
                                        setShowCustomerDropdown(false)
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                    >
                                      <div className="font-medium">{customer.name}</div>
                                      <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCreateCustomerModal(true)}
                              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                              title="Criar novo cliente"
                            >
                              <FiPlus className="w-3 h-3" />
                              Criar
                            </button>
                          </div>
                        </div>
                      )}
                      {formData.exitType === 'transferencia' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Cliente</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={customerSearch}
                                onChange={(e) => {
                                  setCustomerSearch(e.target.value)
                                  setShowCustomerDropdown(e.target.value.length >= 3)
                                }}
                                onFocus={() => {
                                  if (customerSearch.length >= 3) {
                                    setShowCustomerDropdown(true)
                                  }
                                }}
                                placeholder="Digite no mínimo 3 caracteres para localizar o cliente (nome ou CPF)"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              />
                              {showCustomerDropdown && filteredCustomers.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {filteredCustomers.map((customer) => (
                                    <button
                                      key={customer.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, customerId: customer.id.toString() })
                                        setCustomerSearch(`${customer.name} ${customer.cpf || customer.phone}`)
                                        setShowCustomerDropdown(false)
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                    >
                                      <div className="font-medium">{customer.name}</div>
                                      <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCreateCustomerModal(true)}
                              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                              title="Criar novo cliente"
                            >
                              <FiPlus className="w-3 h-3" />
                              Criar
                            </button>
                          </div>
                        </div>
                      )}
                      {(formData.exitType === 'venda' || formData.exitType === 'pre_venda') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Vendedor *</label>
                          <div className="flex gap-2">
                            <select
                              required
                              value={formData.sellerId}
                              onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            >
                              <option value="">Selecione</option>
                              {sellers.map((seller) => (
                                <option key={seller.id} value={seller.id}>
                                  {seller.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setShowNewSellerModal(true)}
                              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                              title="Criar novo vendedor"
                            >
                              <FiPlus className="w-3 h-3" />
                              Criar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Valor da venda e formas de pagamento */}
                  {(formData.exitType === 'venda' || formData.exitType === 'pre_venda') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Valor da venda e formas de pagamento</h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor de tabela</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.tableValue}
                          onChange={(e) => setFormData({ ...formData, tableValue: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor de desconto</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da venda *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.salePrice}
                          onChange={(e) => {
                            const newSalePrice = e.target.value
                            const remaining = calculateRemaining(newSalePrice, formData.entryValue, formData.entryVehicleValue, formData.entryAdditionalValue)
                            setFormData({ ...formData, salePrice: newSalePrice, remainingValue: remaining })
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Formas de pagamento */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-medium text-gray-700">Inclusão de formas de pagamento *</label>
                        <button
                          type="button"
                          onClick={addPaymentMethod}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          + Adicionar
                        </button>
                      </div>
                      {paymentMethods.length === 0 ? (
                        <div className="text-xs text-gray-500 py-3 text-center border border-gray-200 rounded">
                          Nenhum resultado encontrado.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {paymentMethods.map((pm, index) => (
                            <div key={index} className="border border-gray-300 rounded p-2 space-y-2">
                              {pm.type === 'financiamento_proprio' ? (pm.valorFinanciado ? (
                                <>
                                  {/* Linha principal: Data e Tipo de pagamento (sem Valor) */}
                                  <div className="grid grid-cols-3 gap-2 items-end mb-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data</label>
                                      <input
                                        type="date"
                                        required
                                        value={pm.date}
                                        onChange={(e) => updatePaymentMethod(index, 'date', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de pagamento *</label>
                                      <select
                                        required
                                        value={pm.type}
                                        onChange={(e) => {
                                          const newType = e.target.value
                                          updatePaymentMethod(index, 'type', newType)
                                          if (newType === 'financiamento_proprio') {
                                            setFinanciamentoProprioIndex(index)
                                            setShowFinanciamentoProprioModal(true)
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      >
                                        <option value="">Selecione</option>
                                        {paymentMethodOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFinanciamentoProprioIndex(index)
                                          setShowFinanciamentoProprioModal(true)
                                        }}
                                        className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                      >
                                        Configurar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removePaymentMethod(index)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                  {pm.valorFinanciado && (
                                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                      <strong>Valor financiado:</strong> R$ {parseFloat(pm.valorFinanciado || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      {pm.quantidadeParcelas && <span> | <strong>Parcelas:</strong> {pm.quantidadeParcelas}</span>}
                                      {pm.formaPagamentoFinanciamentoProprio && (
                                        <span> | <strong>Forma:</strong> {formasPagamentoFinanciamentoProprio.find(f => f.value === pm.formaPagamentoFinanciamentoProprio)?.label || pm.formaPagamentoFinanciamentoProprio}</span>
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="grid grid-cols-4 gap-2 items-end">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor financiado *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={pm.valorFinanciado || ''}
                                        onChange={(e) => {
                                          const valor = e.target.value
                                          const updated = [...paymentMethods]
                                          const method = updated[index]
                                          if (method) {
                                            updated[index] = { ...method, valorFinanciado: valor, value: valor }
                                            setPaymentMethods(updated)
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                        placeholder="0,00"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data 1ª parcela *</label>
                                      <input
                                        type="date"
                                        required
                                        value={pm.date || formData.date || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'date', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                                      <select
                                        required
                                        value={pm.quantidadeParcelas || ''}
                                        onChange={(e) => setQuantidadeParcelasFinanciamento(index, e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      >
                                        <option value="">Selecione</option>
                                        {Array.from({ length: 60 }, (_, i) => i + 1).map(num => (
                                          <option key={num} value={num.toString()}>{num}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={pm.frequencia15Dias || false}
                                          onChange={(e) => updatePaymentMethod(index, 'frequencia15Dias', e.target.checked)}
                                          className="rounded border-gray-300"
                                        />
                                        <span className="text-xs text-gray-700">Parcelas com frequência de 15 dias</span>
                                      </label>
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={pm.manterDataFixa || false}
                                          onChange={(e) => updatePaymentMethod(index, 'manterDataFixa', e.target.checked)}
                                          className="rounded border-gray-300"
                                        />
                                        <span className="text-xs text-gray-700">Manter data fixa</span>
                                      </label>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da parcela</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={pm.valorParcela || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'valorParcela', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                        placeholder="0,00"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Número do 1º Doc</label>
                                      <input
                                        type="text"
                                        value={pm.numeroPrimeiroDoc || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'numeroPrimeiroDoc', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Nº documento</label>
                                      <input
                                        type="text"
                                        value={pm.numeroDocumento || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'numeroDocumento', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    {(() => {
                                      const n = parseInt(pm?.quantidadeParcelas || '0', 10) || 0
                                      if (n <= 0) return null
                                      const parcelas = computeParcelasRows(pm || {} as SalePaymentMethod, formData.date)
                                      if (!parcelas.length) return null
                                      return (
                                        <div className="space-y-2 col-span-full">
                                          <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-semibold text-gray-900">Parcelas</h4>
                                            <button
                                              type="button"
                                              onClick={() => setQuantidadeParcelasFinanciamento(index, pm?.quantidadeParcelas || '')}
                                              className="text-xs text-primary-600 hover:text-primary-800"
                                            >
                                              Recalcular datas
                                            </button>
                                          </div>
                                          {parcelas.map((p, idx) => (
                                            <div key={idx} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center border border-gray-200 rounded p-2 bg-gray-50/50">
                                              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Parcela {idx + 1} *</span>
                                              <div>
                                                <input
                                                  type="date"
                                                  required
                                                  value={p.data}
                                                  onChange={(e) => updateParcela(index, idx, 'data', e.target.value)}
                                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                                />
                                              </div>
                                              <div>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  required
                                                  value={p.valor}
                                                  onChange={(e) => updateParcela(index, idx, 'valor', e.target.value)}
                                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                                  placeholder="0,00"
                                                />
                                              </div>
                                              <div>
                                                <input
                                                  type="text"
                                                  value={p.numeroDocumento}
                                                  onChange={(e) => updateParcela(index, idx, 'numeroDocumento', e.target.value)}
                                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                                  placeholder="Nº documento"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )
                                    })()}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                                      <input
                                        type="text"
                                        value={pm.descricao || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'descricao', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Avalista</label>
                                      <div className="flex gap-2">
                                        <div className="relative flex-1">
                                          <input
                                            type="text"
                                            value={avalistaSearch[index] || pm.avalista || ''}
                                            onChange={(e) => {
                                              const searchValue = e.target.value
                                              setAvalistaSearch((prev) => ({ ...prev, [index]: searchValue }))
                                              setShowAvalistaDropdown((prev) => ({ ...prev, [index]: searchValue.length >= 3 }))
                                              updatePaymentMethod(index, 'avalista', searchValue)
                                            }}
                                            onFocus={() => {
                                              if ((avalistaSearch[index] || pm.avalista || '').length >= 3) {
                                                setShowAvalistaDropdown((prev) => ({ ...prev, [index]: true }))
                                              }
                                            }}
                                            placeholder="Digite no mínimo 3 caracteres para buscar (nome ou CPF)"
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                          />
                                          {showAvalistaDropdown[index] && filteredAvalistas[index] && filteredAvalistas[index].length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                              {filteredAvalistas[index].map((customer) => (
                                                <button
                                                  key={customer.id}
                                                  type="button"
                                                  onClick={() => {
                                                    updatePaymentMethod(index, 'avalista', customer.name)
                                                    setAvalistaSearch((prev) => ({ ...prev, [index]: customer.name }))
                                                    setShowAvalistaDropdown((prev) => ({ ...prev, [index]: false }))
                                                  }}
                                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                                >
                                                  <div className="font-medium">{customer.name}</div>
                                                  <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCreatingAvalistaForPaymentIndex({ paymentIndex: index, field: 'avalista' })
                                            setShowCreateCustomerModal(true)
                                          }}
                                          className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                                          title="Criar novo cliente como avalista"
                                        >
                                          <FiPlus className="w-3 h-3" />
                                          Criar
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Avalista adicional</label>
                                      <div className="flex gap-2">
                                        <div className="relative flex-1">
                                          <input
                                            type="text"
                                            value={avalistaAdicionalSearch[index] || pm.avalistaAdicional || ''}
                                            onChange={(e) => {
                                              const searchValue = e.target.value
                                              setAvalistaAdicionalSearch((prev) => ({ ...prev, [index]: searchValue }))
                                              setShowAvalistaAdicionalDropdown((prev) => ({ ...prev, [index]: searchValue.length >= 3 }))
                                              updatePaymentMethod(index, 'avalistaAdicional', searchValue)
                                            }}
                                            onFocus={() => {
                                              if ((avalistaAdicionalSearch[index] || pm.avalistaAdicional || '').length >= 3) {
                                                setShowAvalistaAdicionalDropdown((prev) => ({ ...prev, [index]: true }))
                                              }
                                            }}
                                            placeholder="Digite no mínimo 3 caracteres para buscar (nome ou CPF)"
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                          />
                                          {showAvalistaAdicionalDropdown[index] && filteredAvalistasAdicional[index] && filteredAvalistasAdicional[index].length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                              {filteredAvalistasAdicional[index].map((customer) => (
                                                <button
                                                  key={customer.id}
                                                  type="button"
                                                  onClick={() => {
                                                    updatePaymentMethod(index, 'avalistaAdicional', customer.name)
                                                    setAvalistaAdicionalSearch((prev) => ({ ...prev, [index]: customer.name }))
                                                    setShowAvalistaAdicionalDropdown((prev) => ({ ...prev, [index]: false }))
                                                  }}
                                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                                >
                                                  <div className="font-medium">{customer.name}</div>
                                                  <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCreatingAvalistaForPaymentIndex({ paymentIndex: index, field: 'avalistaAdicional' })
                                            setShowCreateCustomerModal(true)
                                          }}
                                          className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                                          title="Criar novo cliente como avalista adicional"
                                        >
                                          <FiPlus className="w-3 h-3" />
                                          Criar
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t">
                                      <button
                                        type="button"
                                        onClick={() => removePaymentMethod(index)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) ) : pm.type === 'troco_troca' ? (
                                <>
                                  <h4 className="text-xs font-semibold text-gray-900 mb-2">Inclusão de Troco na troca</h4>
                                  <div className="space-y-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                                      <input
                                        type="date"
                                        required
                                        value={pm.trocoData || pm.date}
                                        onChange={(e) => updatePaymentMethod(index, 'trocoData', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição *</label>
                                      <input
                                        type="text"
                                        required
                                        value={pm.trocoDescricao || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'trocoDescricao', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={pm.trocoValorTotal || pm.value}
                                        onChange={(e) => {
                                          const v = e.target.value
                                          const updated = [...paymentMethods]
                                          const m = updated[index]
                                          if (m) {
                                            updated[index] = { ...m, trocoValorTotal: v, value: v }
                                            setPaymentMethods(updated)
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div className="flex justify-end pt-2 border-t">
                                      <button
                                        type="button"
                                        onClick={() => removePaymentMethod(index)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) : pm.type === 'veiculo_troca' ? (
                                <>
                                  <h4 className="text-xs font-semibold text-gray-900 mb-2">Inclusão de Veículo na troca</h4>
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-600 mb-2">Busque um veículo avaliado ou cadastrado, ou cadastre um novo veículo.</p>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo</label>
                                      <div className="flex gap-2">
                                        <div className="relative flex-1">
                                          <input
                                            type="text"
                                            value={vehicleSearchByPayment[index] || ''}
                                            onChange={(e) => {
                                              const search = e.target.value
                                              setVehicleSearchByPayment({ ...vehicleSearchByPayment, [index]: search })
                                              if (search.length >= 2) {
                                                const filtered = vehicles.filter((v) => {
                                                  const searchLower = search.toLowerCase()
                                                  return (
                                                    v.brand.toLowerCase().includes(searchLower) ||
                                                    v.model.toLowerCase().includes(searchLower) ||
                                                    (v.plate && v.plate.toLowerCase().includes(searchLower)) ||
                                                    v.year.toString().includes(search)
                                                  )
                                                })
                                                setFilteredVehiclesByPayment({ ...filteredVehiclesByPayment, [index]: filtered })
                                                setShowVehicleDropdownByPayment({ ...showVehicleDropdownByPayment, [index]: true })
                                              } else {
                                                setShowVehicleDropdownByPayment({ ...showVehicleDropdownByPayment, [index]: false })
                                              }
                                            }}
                                            onFocus={() => {
                                              if (vehicleSearchByPayment[index] && vehicleSearchByPayment[index].length >= 2) {
                                                setShowVehicleDropdownByPayment({ ...showVehicleDropdownByPayment, [index]: true })
                                              }
                                            }}
                                            placeholder="Buscar veículo (marca, modelo, placa ou ano)"
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                          />
                                          {showVehicleDropdownByPayment[index] && filteredVehiclesByPayment[index] && filteredVehiclesByPayment[index].length > 0 && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                              {filteredVehiclesByPayment[index].map((vehicle) => (
                                                <button
                                                  key={vehicle.id}
                                                  type="button"
                                                  onClick={() => {
                                                    const updated = [...paymentMethods]
                                                    const m = updated[index]
                                                    if (m) {
                                                      updated[index] = { ...m, veiculoTrocaId: vehicle.id.toString(), value: (vehicle.price || 0).toString() }
                                                      setPaymentMethods(updated)
                                                    }
                                                    setVehicleSearchByPayment({ ...vehicleSearchByPayment, [index]: `${vehicle.brand} ${vehicle.model} ${vehicle.year} ${vehicle.plate || ''}` })
                                                    setShowVehicleDropdownByPayment({ ...showVehicleDropdownByPayment, [index]: false })
                                                  }}
                                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                                >
                                                  <div className="font-medium text-xs">{vehicle.brand} {vehicle.model} {vehicle.year}</div>
                                                  {vehicle.plate && <div className="text-xs text-gray-500">Placa: {vehicle.plate}</div>}
                                                  {vehicle.price && <div className="text-xs text-gray-500">R$ {vehicle.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCreatingVehicleForPaymentIndex(index)
                                            setShowCreateVehicleModal(true)
                                          }}
                                          className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                                          title="Criar novo veículo"
                                        >
                                          <FiPlus className="w-3 h-3" />
                                          Criar
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t">
                                      <button
                                        type="button"
                                        onClick={() => removePaymentMethod(index)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) : pm.type === 'carta_credito' || pm.type === 'cartao_credito' ? (
                                <>
                                  <h4 className="text-xs font-semibold text-gray-900 mb-2">Inclusão de Cartão de crédito</h4>
                                  <div className="space-y-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                                      <input
                                        type="date"
                                        required
                                        value={pm.date}
                                        onChange={(e) => updatePaymentMethod(index, 'date', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total a ser parcelado *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={pm.value}
                                        onChange={(e) => updatePaymentMethod(index, 'value', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                        placeholder="0,00"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                                      <select
                                        required
                                        value={pm.quantidadeParcelas || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'quantidadeParcelas', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      >
                                        <option value="">Selecione</option>
                                        {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => (
                                          <option key={num} value={num.toString()}>{num}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da parcela *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={pm.valorParcela || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'valorParcela', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                        placeholder="0,00"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                                      <input
                                        type="text"
                                        value={pm.descricao || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'descricao', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Código de autorização</label>
                                      <input
                                        type="text"
                                        value={pm.codigoAutorizacao || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'codigoAutorizacao', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Recebimento da loja *</label>
                                      <select
                                        required
                                        value={pm.recebimentoLoja || ''}
                                        onChange={(e) => updatePaymentMethod(index, 'recebimentoLoja', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      >
                                        <option value="">Selecione</option>
                                        <option value="parcelado">Parcelado</option>
                                        <option value="a_vista">À vista</option>
                                      </select>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t">
                                      <button
                                        type="button"
                                        onClick={() => removePaymentMethod(index)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="grid grid-cols-4 gap-2 items-end">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data</label>
                                      <input
                                        type="date"
                                        required
                                        value={pm.date}
                                        onChange={(e) => updatePaymentMethod(index, 'date', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Forma de pagamento *</label>
                                      <select
                                        required
                                        value={pm.type}
                                        onChange={(e) => updatePaymentMethod(index, 'type', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      >
                                        <option value="">Selecione</option>
                                        <option value="nota_promissoria">Nota Promissória</option>
                                        <option value="financiamento_proprio">Financiamento Próprio</option>
                                        <option value="debito_conta">Débito de Conta</option>
                                        <option value="carta_credito">Cartão de Crédito</option>
                                        <option value="cartao_debito">Cartão de Débito</option>
                                        <option value="ted_doc_pix">TED, DOC ou PIX</option>
                                        <option value="transferencia">Transferência</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="duplicata">Duplicata</option>
                                        <option value="debito_bancario">Débito Bancário</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="carta_credito_consorcio">Carta de crédito de consórcio</option>
                                        <option value="consorcio">Consórcio</option>
                                        <option value="financiamento">Financiamento</option>
                                        <option value="outros">Outros (Terrenos, permutas, etc. Não gera contas a receber)</option>
                                        <option value="sinal_negocio">Sinal de negócio</option>
                                        <option value="troco_troca">Troco na troca</option>
                                        <option value="veiculo_troca">Veículo na troca</option>
                                        <option value="boleto">Boleto</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={pm.value}
                                        onChange={(e) => updatePaymentMethod(index, 'value', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </div>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => removePaymentMethod(index)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          <div className="text-xs font-medium text-gray-700 mt-2">
                            A Receber: R$ {calculateTotalReceivable().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Transferência de documentos */}
                  {(formData.exitType === 'venda' || formData.exitType === 'pre_venda') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">
                      Transferência de documentos
                      <span className="text-xs text-gray-500 ml-2">💡 Informe abaixo como será feita a transferência desse veículo conforme as opções disponíveis.</span>
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Status Transferência</label>
                        <select
                          value={formData.transferStatus}
                          onChange={(e) => setFormData({ ...formData, transferStatus: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="pago">Pago</option>
                          <option value="aberto">Aberto</option>
                          <option value="cortesia">Cortesia</option>
                          <option value="cliente_vai_transferir">Cliente vai transferir</option>
                          <option value="embutido_pagamentos">Embutido nos pagamentos do veículo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações da transferência</label>
                        <textarea
                          value={formData.transferNotes}
                          onChange={(e) => setFormData({ ...formData, transferNotes: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Outras Informações */}
                  {formData.exitType === 'transferencia' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações internas</label>
                      <textarea
                        value={formData.internalNotes}
                        onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                  )}
                  {(formData.exitType === 'venda' || formData.exitType === 'pre_venda') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Outras Informações</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Canal Venda *</label>
                        <select
                          required
                          value={formData.saleChannel}
                          onChange={(e) => setFormData({ ...formData, saleChannel: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="anuncio_em_jornal">ANUNCIO EM JORNAL</option>
                          <option value="feirao">FEIRÃO</option>
                          <option value="indicacao_de_amigo">INDICAÇÃO DE AMIGO</option>
                          <option value="indicacao_de_funcionario">INDICAÇÃO DE FUNCIONARIO</option>
                          <option value="internet">INTERNET</option>
                          <option value="meu_carro_novo">MEU CARRO NOVO</option>
                          <option value="news_letter">NEWS LETTER</option>
                          <option value="outro">OUTRO</option>
                          <option value="panfleto">PANFLETO</option>
                          <option value="por_telefone">POR TELEFONE</option>
                          <option value="televisao">TELEVISÃO</option>
                          <option value="visita_a_loja">VISITA A LOJA</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Obs Canal Venda</label>
                        <textarea
                          value={formData.saleChannelNotes}
                          onChange={(e) => setFormData({ ...formData, saleChannelNotes: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          Observações do contrato
                          <span className="text-xs text-gray-500 ml-2">Atenção, este campo aparece nos contratos.</span>
                        </label>
                        <textarea
                          value={formData.contractClauses}
                          onChange={(e) => setFormData({ ...formData, contractClauses: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações internas</label>
                        <textarea
                          value={formData.internalNotes}
                          onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Salvando...
                        </>
                      ) : (
                        'Salvar Venda'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Novo Vendedor */}
        {showNewSellerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Novo Vendedor</h2>
                <form onSubmit={handleCreateSeller} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={newSellerData.name}
                      onChange={(e) => setNewSellerData({ ...newSellerData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newSellerData.email}
                      onChange={(e) => setNewSellerData({ ...newSellerData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                    <input
                      type="password"
                      required
                      value={newSellerData.password}
                      onChange={(e) => setNewSellerData({ ...newSellerData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSellerModal(false)
                        setNewSellerData({ name: '', email: '', password: '' })
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Criar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ver Detalhes */}
        {showDetailsModal && selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Detalhes da Venda #{selectedSale.id}</h2>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedSale(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Informações Básicas */}
                  <div className="border border-gray-300 p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Informações Básicas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Cliente</p>
                        <p className="font-medium text-gray-900">{selectedSale.customer.name}</p>
                        {selectedSale.customer.cpf && (
                          <p className="text-sm text-gray-500">CPF: {selectedSale.customer.cpf}</p>
                        )}
                        {selectedSale.customer.phone && (
                          <p className="text-sm text-gray-500">Telefone: {selectedSale.customer.phone}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vendedor</p>
                        <p className="font-medium text-gray-900">{selectedSale.seller.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Veículo</p>
                        <p className="font-medium text-gray-900">
                          {selectedSale.vehicle.brand} {selectedSale.vehicle.model} {selectedSale.vehicle.year}
                        </p>
                        {selectedSale.vehicle.plate && (
                          <p className="text-sm text-gray-500">Placa: {selectedSale.vehicle.plate}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          selectedSale.status === 'concluida' 
                            ? 'bg-green-100 text-green-800' 
                            : selectedSale.status === 'cancelada'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedSale.status === 'concluida' ? 'Concluída' : selectedSale.status === 'cancelada' ? 'Cancelada' : 'Em Andamento'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Data</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedSale.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="border border-gray-300 p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Valores</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedSale.salePrice && (
                        <div>
                          <p className="text-sm text-gray-600">Preço de Venda</p>
                          <p className="text-lg font-bold text-gray-900">
                            R$ {selectedSale.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {selectedSale.purchasePrice && (
                        <div>
                          <p className="text-sm text-gray-600">Preço de Compra</p>
                          <p className="text-lg font-medium text-gray-900">
                            R$ {selectedSale.purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {selectedSale.profit && (
                        <div>
                          <p className="text-sm text-gray-600">Lucro</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {selectedSale.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Entrada */}
                  {selectedSale.entryType && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <h3 className="font-bold text-lg mb-3 text-gray-900">Entrada</h3>
                      <div className="space-y-2">
                        <p><span className="text-gray-600">Tipo:</span> <span className="font-medium text-gray-900">{formatEntryType(selectedSale.entryType)}</span></p>
                        {selectedSale.entryType === 'dinheiro' && selectedSale.entryValue && (
                          <p><span className="text-gray-600">Valor:</span> <span className="font-medium text-gray-900">R$ {selectedSale.entryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        )}
                        {selectedSale.entryType === 'veiculo' && selectedSale.entryVehicleValue && (
                          <p><span className="text-gray-600">Valor do Veículo:</span> <span className="font-medium text-gray-900">R$ {selectedSale.entryVehicleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        )}
                        {selectedSale.entryType === 'cartao_credito' && selectedSale.entryCardInstallments && (
                          <p><span className="text-gray-600">Parcelas:</span> <span className="font-medium text-gray-900">{selectedSale.entryCardInstallments}x</span></p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pagamento do Restante */}
                  {selectedSale.paymentMethod && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <h3 className="font-bold text-lg mb-3 text-gray-900">Pagamento do Restante</h3>
                      <div className="space-y-2">
                        <p><span className="text-gray-600">Método:</span> <span className="font-medium text-gray-900">{formatPaymentMethod(selectedSale.paymentMethod)}</span></p>
                        {selectedSale.remainingValue && (
                          <p><span className="text-gray-600">Valor Restante:</span> <span className="font-medium text-gray-900">R$ {selectedSale.remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        )}
                        {(selectedSale.paymentMethod === 'carta_credito' || selectedSale.paymentMethod === 'financiamento') && selectedSale.paymentInstallments && (
                          <p><span className="text-gray-600">Parcelas:</span> <span className="font-medium text-gray-900">{selectedSale.paymentInstallments}x</span></p>
                        )}
                        {selectedSale.paymentInstallmentValue && (
                          <p><span className="text-gray-600">Valor da Parcela:</span> <span className="font-medium text-gray-900">R$ {selectedSale.paymentInstallmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        )}
                        {selectedSale.paymentMethod === 'financiamento' && selectedSale.financedValue && (
                          <p><span className="text-gray-600">Valor Financiado:</span> <span className="font-medium text-gray-900">R$ {selectedSale.financedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                        )}
                        {selectedSale.paymentMethod === 'financiamento' && selectedSale.financingBank && (
                          <p><span className="text-gray-600">Banco:</span> <span className="font-medium text-gray-900">
                            {banks.find(b => b.value === selectedSale.financingBank)?.label || selectedSale.financingBank}
                          </span></p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Comissão */}
                  {selectedSale.commission && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Comissão do Vendedor</p>
                      <p className="text-lg font-bold text-gray-900">
                        R$ {selectedSale.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  {/* Tipo de Venda e Transferência */}
                  {(selectedSale.saleType || selectedSale.transferStatus) && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <h3 className="font-bold text-lg mb-3 text-gray-900">Tipo de Venda e Transferência</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSale.saleType && (
                          <div>
                            <p className="text-sm text-gray-600">Tipo de Venda</p>
                            <p className="font-medium text-gray-900">
                              {selectedSale.saleType === 'consumidor_final' ? 'Consumidor Final' : 
                               selectedSale.saleType === 'repasse' ? 'Repasse' : selectedSale.saleType}
                            </p>
                          </div>
                        )}
                        {selectedSale.transferStatus && (
                          <div>
                            <p className="text-sm text-gray-600">Status da Transferência</p>
                            <p className="font-medium text-gray-900">
                              {selectedSale.transferStatus === 'pago' ? 'Pago' :
                               selectedSale.transferStatus === 'aberto' ? 'Aberto' :
                               selectedSale.transferStatus === 'cortesia' ? 'Cortesia' :
                               selectedSale.transferStatus === 'cliente_vai_transferir' ? 'Cliente vai transferir' :
                               selectedSale.transferStatus === 'embutido_pagamentos' ? 'Embutido nos pagamentos do veículo' :
                               selectedSale.transferStatus}
                            </p>
                          </div>
                        )}
                        {selectedSale.transferNotes && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Observações da Transferência</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedSale.transferNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Canal de Venda */}
                  {selectedSale.saleChannel && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <h3 className="font-bold text-lg mb-3 text-gray-900">Canal de Venda</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-600">Canal</p>
                          <p className="font-medium text-gray-900">
                            {selectedSale.saleChannel === 'anuncio_em_jornal' ? 'ANUNCIO EM JORNAL' :
                             selectedSale.saleChannel === 'feirao' ? 'FEIRÃO' :
                             selectedSale.saleChannel === 'indicacao_de_amigo' ? 'INDICAÇÃO DE AMIGO' :
                             selectedSale.saleChannel === 'indicacao_de_funcionario' ? 'INDICAÇÃO DE FUNCIONARIO' :
                             selectedSale.saleChannel === 'internet' ? 'INTERNET' :
                             selectedSale.saleChannel === 'meu_carro_novo' ? 'MEU CARRO NOVO' :
                             selectedSale.saleChannel === 'news_letter' ? 'NEWS LETTER' :
                             selectedSale.saleChannel === 'outro' ? 'OUTRO' :
                             selectedSale.saleChannel === 'panfleto' ? 'PANFLETO' :
                             selectedSale.saleChannel === 'por_telefone' ? 'POR TELEFONE' :
                             selectedSale.saleChannel === 'televisao' ? 'TELEVISÃO' :
                             selectedSale.saleChannel === 'visita_a_loja' ? 'VISITA A LOJA' :
                             selectedSale.saleChannel}
                          </p>
                        </div>
                        {selectedSale.saleChannelNotes && (
                          <div>
                            <p className="text-sm text-gray-600">Observações do Canal</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedSale.saleChannelNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Desconto */}
                  {selectedSale.discountAmount && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Desconto Aplicado</p>
                      <p className="text-lg font-bold text-gray-900">
                        R$ {selectedSale.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  {/* Observações */}
                  {selectedSale.notes && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <h3 className="font-bold text-lg mb-2 text-gray-900">Observações</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedSale.notes}</p>
                    </div>
                  )}

                  {/* Observações Internas */}
                  {selectedSale.internalNotes && (
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <h3 className="font-bold text-lg mb-2 text-gray-900">Observações Internas</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedSale.internalNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedSale(null)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Contrato */}
        {showContractModal && selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Contrato de Compra e Venda de Veículo</h2>
                  <button
                    onClick={() => {
                      setShowContractModal(false)
                      setSelectedSale(null)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Cabeçalho */}
                  <div className="text-center border-b pb-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">CONTRATO DE COMPRA E VENDA DE VEÍCULO</h3>
                    <p className="text-gray-900">Nº {selectedSale.id}</p>
                    <p className="text-sm text-gray-900 mt-2">Data: {new Date(selectedSale.date).toLocaleDateString('pt-BR')}</p>
                  </div>

                  {/* Partes Contratantes */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">1. PARTES CONTRATANTES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-gray-300 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">VENDEDOR</h4>
                        <div className="space-y-2">
                          <p><span className="text-gray-900">Nome:</span> <span className="font-medium text-gray-900">{selectedSale.seller.name}</span></p>
                        </div>
                      </div>
                      <div className="border border-gray-300 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">COMPRADOR</h4>
                        <div className="space-y-2">
                          <p><span className="text-gray-900">Nome:</span> <span className="font-medium text-gray-900">{selectedSale.customer.name}</span></p>
                          {selectedSale.customer.cpf && (
                            <p><span className="text-gray-900">CPF:</span> <span className="font-medium text-gray-900">{selectedSale.customer.cpf}</span></p>
                          )}
                          <p><span className="text-gray-900">Telefone:</span> <span className="font-medium text-gray-900">{selectedSale.customer.phone}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Objeto do Contrato */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">2. OBJETO DO CONTRATO</h3>
                    <p className="text-gray-900 mb-4">O presente contrato tem por objeto a venda do seguinte veículo:</p>
                    <div className="border border-gray-300 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-900">Marca</p>
                          <p className="font-semibold text-gray-900">{selectedSale.vehicle.brand}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">Modelo</p>
                          <p className="font-semibold text-gray-900">{selectedSale.vehicle.model}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">Ano</p>
                          <p className="font-semibold text-gray-900">{selectedSale.vehicle.year}</p>
                        </div>
                        {selectedSale.vehicle.plate && (
                          <div>
                            <p className="text-sm text-gray-900">Placa</p>
                            <p className="font-semibold text-gray-900">{selectedSale.vehicle.plate}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Valor e Forma de Pagamento */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">3. VALOR E FORMA DE PAGAMENTO</h3>
                    <div className="space-y-4">
                      {selectedSale.salePrice && (
                        <div className="border border-gray-300 p-4 rounded-lg">
                          <p className="text-sm text-gray-900 mb-1">Valor Total da Venda</p>
                          <p className="text-2xl font-bold text-gray-900">
                            R$ {selectedSale.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      {selectedSale.entryType && (
                        <div className="border border-gray-300 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">ENTRADA</h4>
                          <div className="space-y-2">
                            <p><span className="text-gray-900">Tipo:</span> <span className="font-medium text-gray-900">{formatEntryType(selectedSale.entryType)}</span></p>
                            {selectedSale.entryType === 'dinheiro' && selectedSale.entryValue && (
                              <p><span className="text-gray-900">Valor:</span> <span className="font-medium text-gray-900">R$ {selectedSale.entryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                            )}
                            {selectedSale.entryType === 'veiculo' && (
                              <>
                                {selectedSale.entryVehicleValue && (
                                  <p><span className="text-gray-900">Valor do Veículo:</span> <span className="font-medium text-gray-900">R$ {selectedSale.entryVehicleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                                )}
                                {selectedSale.entryAdditionalValue && (
                                  <p><span className="text-gray-900">Valor Adicional em Dinheiro:</span> <span className="font-medium text-gray-900">R$ {selectedSale.entryAdditionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                                )}
                              </>
                            )}
                            {selectedSale.entryType === 'cartao_credito' && selectedSale.entryValue && (
                              <>
                                <p><span className="text-gray-900">Valor:</span> <span className="font-medium text-gray-900">R$ {selectedSale.entryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                                {selectedSale.entryCardInstallments && (
                                  <p><span className="text-gray-900">Parcelas:</span> <span className="font-medium text-gray-900">{selectedSale.entryCardInstallments}x</span></p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedSale.remainingValue && (
                        <div className="border border-gray-300 p-4 rounded-lg">
                          <p className="text-sm text-gray-900 mb-1">Valor Restante</p>
                          <p className="text-xl font-bold text-gray-900">
                            R$ {selectedSale.remainingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      {selectedSale.paymentMethod && (
                        <div className="border border-gray-300 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-3">FORMA DE PAGAMENTO DO RESTANTE</h4>
                          <div className="space-y-2">
                            <p><span className="text-gray-900">Método:</span> <span className="font-medium text-gray-900">{formatPaymentMethod(selectedSale.paymentMethod)}</span></p>
                            {(selectedSale.paymentMethod === 'carta_credito' || selectedSale.paymentMethod === 'financiamento') && selectedSale.paymentInstallments && (
                              <p><span className="text-gray-900">Parcelas:</span> <span className="font-medium text-gray-900">{selectedSale.paymentInstallments}x</span></p>
                            )}
                            {selectedSale.paymentInstallmentValue && (
                              <p><span className="text-gray-900">Valor da Parcela:</span> <span className="font-medium text-gray-900">R$ {selectedSale.paymentInstallmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                            )}
                            {selectedSale.paymentMethod === 'financiamento' && selectedSale.financedValue && (
                              <p><span className="text-gray-900">Valor Financiado:</span> <span className="font-medium text-gray-900">R$ {selectedSale.financedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cláusulas */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">4. CLÁUSULAS CONTRATUAIS</h3>
                    {selectedSale.contractClauses ? (
                      <div className="border border-gray-300 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans leading-relaxed">
                          {selectedSale.contractClauses}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-gray-900 italic">As cláusulas específicas deste contrato serão definidas pelas partes.</p>
                    )}
                  </div>

                  {/* Observações */}
                  {selectedSale.notes && (
                    <div className="border-b pb-4">
                      <h3 className="font-bold text-lg mb-4 text-gray-900">5. OBSERVAÇÕES</h3>
                      <div className="border border-gray-300 p-4 rounded-lg">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSale.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Assinaturas */}
                  <div>
                    <h3 className="font-bold text-lg mb-4 text-gray-900">6. ASSINATURAS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                      <div className="text-center">
                        <div className="border-t-2 border-gray-900 pt-4">
                          <p className="text-sm font-semibold text-gray-900 mb-2">VENDEDOR</p>
                          <p className="text-lg font-bold text-gray-900">{selectedSale.seller.name}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="border-t-2 border-gray-900 pt-4">
                          <p className="text-sm font-semibold text-gray-900 mb-2">COMPRADOR</p>
                          <p className="text-lg font-bold text-gray-900">{selectedSale.customer.name}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-900 mt-6">
                      Data: {new Date(selectedSale.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowContractModal(false)
                      setSelectedSale(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleGeneratePDF}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Gerar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Criar Cliente */}
        {showCreateCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">Novo Cliente</h2>
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
                      onClick={() => setCustomerActiveStep(step.id)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                        customerActiveStep === step.id
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
                <div className="p-4">
                  {/* Etapa 1: Dados Básicos */}
                  {customerActiveStep === 1 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Pessoa *</label>
                          <select
                            required
                            value={newCustomerData.pessoaType}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, pessoaType: e.target.value, cpf: '' })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="Física">Física</option>
                            <option value="Jurídica">Jurídica</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
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
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder={newCustomerData.pessoaType === 'Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo *</label>
                          <input
                            type="text"
                            required
                            value={newCustomerData.name}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Apelido</label>
                          <input
                            type="text"
                            value={newCustomerData.apelido}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, apelido: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">RG</label>
                          <input
                            type="text"
                            maxLength={12}
                            value={newCustomerData.rg}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, rg: formatRG(e.target.value) })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="00.000.000-0"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Mãe</label>
                          <input
                            type="text"
                            value={newCustomerData.nomeMae}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, nomeMae: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 2: Contato */}
                  {customerActiveStep === 2 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Telefone *</label>
                          <input
                            type="text"
                            required
                            maxLength={15}
                            value={newCustomerData.phone}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: formatPhone(e.target.value) })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={newCustomerData.email}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 3: Dados Pessoais */}
                  {customerActiveStep === 3 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Data de Nascimento</label>
                          <input
                            type="date"
                            value={newCustomerData.birthDate}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, birthDate: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Sexo</label>
                          <select
                            value={newCustomerData.sexo}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, sexo: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="">Selecione</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 4: CNH */}
                  {customerActiveStep === 4 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">CNH</label>
                          <input
                            type="text"
                            value={newCustomerData.cnh}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, cnh: e.target.value.replace(/\D/g, '') })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Número da CNH"
                            maxLength={11}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Data Vencimento CNH</label>
                          <input
                            type="date"
                            value={newCustomerData.cnhVencimento}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, cnhVencimento: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 5: Endereço */}
                  {customerActiveStep === 5 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">CEP</label>
                          <input
                            type="text"
                            maxLength={9}
                            value={newCustomerData.cep}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, cep: formatCEP(e.target.value) })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="00000-000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                          <input
                            type="text"
                            value={newCustomerData.city}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Bairro</label>
                          <input
                            type="text"
                            value={newCustomerData.district}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, district: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
                          <input
                            type="text"
                            value={newCustomerData.address}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 6: Adicional */}
                  {customerActiveStep === 6 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Adicional</label>
                          <textarea
                            value={newCustomerData.adicional}
                            onChange={(e) => setNewCustomerData({ ...newCustomerData, adicional: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            rows={3}
                            placeholder="Informações adicionais..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões de Navegação */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex gap-2">
                    {customerActiveStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setCustomerActiveStep(customerActiveStep - 1)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Anterior
                      </button>
                    )}
                    {customerActiveStep < 6 && (
                      <button
                        type="button"
                        onClick={() => setCustomerActiveStep(customerActiveStep + 1)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
                        setCreatingAvalistaForPaymentIndex(null)
                        setCustomerActiveStep(1)
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
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creatingCustomer}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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

        {/* Modal Criar Veículo - Completo */}
        {showCreateVehicleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold">Novo Veículo</h2>
              </div>
              <div className="px-4 pt-4 border-b border-gray-200 overflow-x-auto">
                <div className="flex gap-2">
                  {[
                    { id: 1, label: 'Dados Básicos' },
                    { id: 2, label: 'Identificação' },
                    { id: 3, label: 'Especificações' },
                    { id: 4, label: 'Outros / Valores' },
                    { id: 5, label: 'Opcionais' },
                    { id: 6, label: 'Fotos / Documento' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setVehicleActiveStep(s.id)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap ${
                        vehicleActiveStep === s.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleCreateVehicle} className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {vehicleActiveStep === 1 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Empresa *</label>
                        <input
                          type="text"
                          value={newVehicleData.empresa}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, empresa: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Posição</label>
                        <input
                          type="number"
                          min={1}
                          value={newVehicleData.posicao}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, posicao: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                        <select
                          value={newVehicleData.conditionStatus}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, conditionStatus: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="usado">Usado</option>
                          <option value="novo">Novo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Placa *</label>
                        <input
                          type="text"
                          maxLength={8}
                          value={newVehicleData.plate}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, plate: formatPlate(e.target.value) })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="ABC1D23"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Renavam</label>
                        <input
                          type="text"
                          value={newVehicleData.renavam}
                          onChange={(e) => setNewVehicleData({ ...newVehicleData, renavam: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newVehicleData.cadastroOutrasLojas}
                            onChange={(e) => setNewVehicleData({ ...newVehicleData, cadastroOutrasLojas: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700">Cadastro feito por outras lojas</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {vehicleActiveStep === 2 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Veículo</label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                        >
                          <option value="carros">Carros</option>
                          <option value="motos">Motos</option>
                          <option value="caminhoes">Caminhões</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Espécie *</label>
                          <select
                            value={newVehicleData.especie}
                            onChange={(e) => setNewVehicleData({ ...newVehicleData, especie: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            {ESPECIES.map((e) => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Combustível *</label>
                          <select
                            value={newVehicleData.combustivel}
                            onChange={(e) => setNewVehicleData({ ...newVehicleData, combustivel: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="">Selecione</option>
                            {COMBUSTIVEIS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 searchable-select relative">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Marca *</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={brandSearch}
                              onChange={(e) => {
                                setBrandSearch(e.target.value)
                                setNewVehicleData({ ...newVehicleData, brand: e.target.value })
                                setShowBrandDropdown(true)
                              }}
                              onFocus={() => setShowBrandDropdown(true)}
                              placeholder="Digite para buscar marcas..."
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                            />
                            {showBrandDropdown && (loadingBrands || filteredBrands.length > 0 || brandSearch.length > 0) && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {loadingBrands ? (
                                  <div className="px-3 py-2 text-gray-500 text-sm">Carregando...</div>
                                ) : filteredBrands.length > 0 ? (
                                  filteredBrands.map((brand) => (
                                    <button
                                      key={brand.codigo}
                                      type="button"
                                      onClick={() => handleBrandSelect(brand)}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-900"
                                    >
                                      {brand.nome}
                                    </button>
                                  ))
                                ) : brandSearch.length > 0 ? (
                                  <div className="px-3 py-2 text-gray-500 text-sm">Digite livremente se não encontrar.</div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="searchable-select relative col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Modelo *</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={modelSearch}
                              onChange={(e) => {
                                setModelSearch(e.target.value)
                                setNewVehicleData({ ...newVehicleData, model: e.target.value })
                                setShowModelDropdown(true)
                              }}
                              onFocus={() => selectedBrandCode && setShowModelDropdown(true)}
                              disabled={!selectedBrandCode}
                              placeholder={selectedBrandCode ? 'Buscar modelos...' : 'Selecione marca'}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            {showModelDropdown && selectedBrandCode && (loadingModels || filteredModels.length > 0 || modelSearch.length > 0) && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {loadingModels ? <div className="px-3 py-2 text-gray-500 text-sm">Carregando...</div> : filteredModels.length > 0 ? (
                                  filteredModels.map((m) => (
                                    <button key={m.codigo} type="button" onClick={() => handleModelSelect(m)} className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-900">{m.nome}</button>
                                  ))
                                ) : modelSearch.length > 0 ? <div className="px-3 py-2 text-gray-500 text-sm">Digite livremente.</div> : null}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="searchable-select relative col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Ano Fabricação/Modelo *</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={yearSearch}
                              onChange={(e) => {
                                setYearSearch(e.target.value)
                                const n = e.target.value.replace(/\D/g, '')
                                if (n) setNewVehicleData({ ...newVehicleData, year: n })
                                setShowYearDropdown(true)
                              }}
                              onFocus={() => (selectedBrandCode && selectedModelCode) && setShowYearDropdown(true)}
                              disabled={!selectedBrandCode || !selectedModelCode}
                              placeholder={selectedBrandCode && selectedModelCode ? 'Buscar ano...' : 'Marca e modelo primeiro'}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            {showYearDropdown && selectedBrandCode && selectedModelCode && (loadingYears || filteredYears.length > 0 || yearSearch.length > 0) && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {loadingYears ? <div className="px-3 py-2 text-gray-500 text-sm">Carregando...</div> : filteredYears.length > 0 ? (
                                  filteredYears.map((y) => (
                                    <button key={y.codigo} type="button" onClick={() => handleYearSelect(y)} className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-900">{y.nome}</button>
                                  ))
                                ) : yearSearch.length > 0 ? <div className="px-3 py-2 text-gray-500 text-sm">Digite livremente.</div> : null}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Cor *</label>
                          <input type="text" value={newVehicleData.color} onChange={(e) => setNewVehicleData({ ...newVehicleData, color: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Selecione ou digite" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Modelo Denatran</label>
                          <input type="text" value={newVehicleData.modeloDenatran} onChange={(e) => setNewVehicleData({ ...newVehicleData, modeloDenatran: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quilometragem *</label>
                          <input type="number" value={newVehicleData.km} onChange={(e) => setNewVehicleData({ ...newVehicleData, km: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Modelo Base</label>
                          <input type="text" value={newVehicleData.modeloBase} onChange={(e) => setNewVehicleData({ ...newVehicleData, modeloBase: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Portas *</label>
                          <select value={newVehicleData.portas} onChange={(e) => setNewVehicleData({ ...newVehicleData, portas: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                            <option value="">Selecione</option>
                            {PORTAS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Carroceria</label>
                          <input type="text" value={newVehicleData.carroceria} onChange={(e) => setNewVehicleData({ ...newVehicleData, carroceria: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                      </div>
                    </div>
                  )}
                  {vehicleActiveStep === 3 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Motorização</label>
                        <input type="text" value={newVehicleData.motorizacao} onChange={(e) => setNewVehicleData({ ...newVehicleData, motorizacao: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Ex: 1.6" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Câmbio *</label>
                        <select value={newVehicleData.cambio} onChange={(e) => setNewVehicleData({ ...newVehicleData, cambio: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="">Selecione</option>
                          {CAMBIOS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Chassi</label>
                        <input type="text" value={newVehicleData.chassi} onChange={(e) => setNewVehicleData({ ...newVehicleData, chassi: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={newVehicleData.chassiRemarcado} onChange={(e) => setNewVehicleData({ ...newVehicleData, chassiRemarcado: e.target.checked })} className="rounded border-gray-300" />
                        <span className="text-xs text-gray-700">Chassi Remarcado</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Modelo FIPE</label>
                        <input type="text" value={newVehicleData.modeloFipe} onChange={(e) => setNewVehicleData({ ...newVehicleData, modeloFipe: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                    </div>
                  )}
                  {vehicleActiveStep === 4 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cidade Emplacamento</label>
                        <input type="text" value={newVehicleData.cidadeEmplacamento} onChange={(e) => setNewVehicleData({ ...newVehicleData, cidadeEmplacamento: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Número do Câmbio</label>
                        <input type="text" value={newVehicleData.numeroCambio} onChange={(e) => setNewVehicleData({ ...newVehicleData, numeroCambio: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">HP/CV</label>
                        <input type="text" value={newVehicleData.hpCv} onChange={(e) => setNewVehicleData({ ...newVehicleData, hpCv: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Perícia Cautelar</label>
                        <select value={newVehicleData.periciaCautelar} onChange={(e) => setNewVehicleData({ ...newVehicleData, periciaCautelar: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="">Selecione</option>
                          {PERICIA_CAUTELAR.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Passageiros</label>
                        <input type="text" value={newVehicleData.passageiros} onChange={(e) => setNewVehicleData({ ...newVehicleData, passageiros: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Blindado</label>
                        <select value={newVehicleData.blindado} onChange={(e) => setNewVehicleData({ ...newVehicleData, blindado: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          {BLINDADO.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
                        <select value={newVehicleData.origem} onChange={(e) => setNewVehicleData({ ...newVehicleData, origem: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          {ORIGEM.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Número do Motor</label>
                        <input type="text" value={newVehicleData.numeroMotor} onChange={(e) => setNewVehicleData({ ...newVehicleData, numeroMotor: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cor Interna</label>
                        <input type="text" value={newVehicleData.corInterna} onChange={(e) => setNewVehicleData({ ...newVehicleData, corInterna: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Venda</label>
                        <input type="number" step="0.01" value={newVehicleData.price} onChange={(e) => setNewVehicleData({ ...newVehicleData, price: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Compra</label>
                        <input type="number" step="0.01" value={newVehicleData.cost} onChange={(e) => setNewVehicleData({ ...newVehicleData, cost: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Tabela (FIPE)</label>
                        <input type="number" step="0.01" value={newVehicleData.tableValue} onChange={(e) => setNewVehicleData({ ...newVehicleData, tableValue: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Gasto</label>
                        <input type="text" value={newVehicleData.expenseType} onChange={(e) => setNewVehicleData({ ...newVehicleData, expenseType: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Ex: Pneu, Revisão" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Gasto</label>
                        <input type="number" step="0.01" value={newVehicleData.expenseValue} onChange={(e) => setNewVehicleData({ ...newVehicleData, expenseValue: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                        <select value={newVehicleData.customerId} onChange={(e) => setNewVehicleData({ ...newVehicleData, customerId: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="">Nenhum</option>
                          {customers.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.phone}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                        <select value={newVehicleData.status} onChange={(e) => setNewVehicleData({ ...newVehicleData, status: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="disponivel">Disponível</option>
                          <option value="reservado">Reservado</option>
                          <option value="vendido">Vendido</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                        <textarea value={newVehicleData.notes} onChange={(e) => setNewVehicleData({ ...newVehicleData, notes: e.target.value })} rows={3} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Observações" />
                      </div>
                    </div>
                  )}
                  {vehicleActiveStep === 5 && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-600">Selecione na caixa da esquerda e clique para adicionar. Clique na direita para remover.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <input type="text" value={opcionaisSearch} onChange={(e) => setOpcionaisSearch(e.target.value)} placeholder="Buscar..." className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg mb-2" />
                          <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                            {filteredOpcionais.slice(0, 80).map((o) => (
                              <button key={o} type="button" onClick={() => addOpcional(o)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 rounded">
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Selecionados ({newVehicleData.opcionais.length})</div>
                          <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                            {newVehicleData.opcionais.map((o) => (
                              <button key={o} type="button" onClick={() => removeOpcional(o)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-red-50 text-red-700 rounded">
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {vehicleActiveStep === 6 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Fotos</label>
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" id="vehicle-photos" disabled={newVehicleData.photos.length >= MAX_PHOTOS} />
                        {newVehicleData.photos.length >= MAX_PHOTOS ? (
                          <span className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900">
                            <FiImage /> Adicionar fotos ({newVehicleData.photos.length}/{MAX_PHOTOS})
                          </span>
                        ) : (
                          <label htmlFor="vehicle-photos" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-900">
                            <FiImage /> Adicionar fotos ({newVehicleData.photos.length}/{MAX_PHOTOS})
                          </label>
                        )}
                        {newVehicleData.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {newVehicleData.photos.map((p, i) => (
                              <div key={i} className="relative w-20 h-20 rounded overflow-hidden border border-gray-200">
                                <img src={p} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => handleRemoveImage(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5 text-xs">×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Documento PDF</label>
                        <div className="space-y-2 mt-2">
                        <input
                          ref={docInputRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => handleSelectDocumentFile(e.target.files?.[0] || null)}
                        />
                        <div
                          onDragEnter={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDraggingDoc(true)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDraggingDoc(true)
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDraggingDoc(false)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsDraggingDoc(false)
                            const file = e.dataTransfer.files?.[0] || null
                            handleSelectDocumentFile(file)
                          }}
                          className={[
                            'w-full rounded-lg border-2 border-dashed p-4 transition-colors',
                            isDraggingDoc ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={['h-10 w-10 rounded-lg flex items-center justify-center', isDraggingDoc ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'].join(' ')}>
                                <FiFileText />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {vehicleDocumentFile ? 'PDF selecionado' : 'Anexar PDF do veículo'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Arraste e solte aqui ou clique em "Selecionar PDF"
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => docInputRef.current?.click()}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-900"
                            >
                              <FiUpload />
                              Selecionar PDF
                            </button>
                          </div>
                          {vehicleDocumentFile && (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {vehicleDocumentFile.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatBytes(vehicleDocumentFile.size)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSelectDocumentFile(null)}
                                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                title="Remover arquivo selecionado"
                              >
                                <FiX />
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          O PDF será enviado automaticamente depois que você salvar o veículo.
                        </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex gap-2">
                    {vehicleActiveStep > 1 && (
                      <button type="button" onClick={() => setVehicleActiveStep(vehicleActiveStep - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Anterior
                      </button>
                    )}
                    {vehicleActiveStep < 6 && (
                      <button type="button" onClick={() => setVehicleActiveStep(vehicleActiveStep + 1)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        Próximo
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowCreateVehicleModal(false); setCreatingVehicleForPaymentIndex(null); resetVehicleForm(); }} disabled={creatingVehicle} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      Cancelar
                    </button>
                    <button type="submit" disabled={creatingVehicle} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center text-sm">
                      {creatingVehicle ? (
                        <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Salvando...</>
                      ) : (
                        'Salvar'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Financiamento Próprio */}
        {showFinanciamentoProprioModal && financiamentoProprioIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold">Configurar Financiamento Próprio</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinanciamentoProprioModal(false)
                    setFinanciamentoProprioIndex(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Inclusão de Financiamento Próprio (Duplicatas, promissórias, carnê, etc)</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Forma de pagamento *</label>
                        <select
                          required
                          value={paymentMethods[financiamentoProprioIndex]?.formaPagamentoFinanciamentoProprio || ''}
                          onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'formaPagamentoFinanciamentoProprio', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          {formasPagamentoFinanciamentoProprio.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor financiado *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={paymentMethods[financiamentoProprioIndex]?.valorFinanciado || ''}
                          onChange={(e) => {
                            const valor = e.target.value
                            const updated = [...paymentMethods]
                            const pm = updated[financiamentoProprioIndex]
                            if (pm) {
                              updated[financiamentoProprioIndex] = { ...pm, valorFinanciado: valor, value: valor }
                              setPaymentMethods(updated)
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Data 1ª parcela *</label>
                        <input
                          type="date"
                          required
                          value={paymentMethods[financiamentoProprioIndex]?.date || formData.date || ''}
                          onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'date', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                        <select
                          required
                          value={financiamentoProprioQty || paymentMethods[financiamentoProprioIndex]?.quantidadeParcelas || ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setFinanciamentoProprioQty(v)
                            setQuantidadeParcelasFinanciamento(financiamentoProprioIndex, v)
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          {Array.from({ length: 60 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num.toString()}>{num}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-4 items-center">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentMethods[financiamentoProprioIndex]?.frequencia15Dias || false}
                            onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'frequencia15Dias', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700">Parcelas com frequência de 15 dias</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentMethods[financiamentoProprioIndex]?.manterDataFixa || false}
                            onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'manterDataFixa', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700">Manter data fixa</span>
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da parcela</label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentMethods[financiamentoProprioIndex]?.valorParcela || ''}
                          onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'valorParcela', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Número do 1º Doc</label>
                        <input
                          type="text"
                          value={paymentMethods[financiamentoProprioIndex]?.numeroPrimeiroDoc || ''}
                          onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'numeroPrimeiroDoc', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Nº documento</label>
                        <input
                          type="text"
                          value={paymentMethods[financiamentoProprioIndex]?.numeroDocumento || ''}
                          onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'numeroDocumento', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      {(() => {
                        const pm = paymentMethods[financiamentoProprioIndex]
                        const qty = financiamentoProprioQty || pm?.quantidadeParcelas || ''
                        const n = parseInt(qty || '0', 10) || 0
                        if (n <= 0) return null
                        const pmForCompute = { ...(pm || {}), quantidadeParcelas: qty } as SalePaymentMethod
                        const parcelas = computeParcelasRows(pmForCompute, formData.date)
                        if (!parcelas.length) return null
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center mt-2 mb-1">
                              <h4 className="text-xs font-semibold text-gray-900">Parcelas</h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuantidadeParcelasFinanciamento(financiamentoProprioIndex, qty)
                                }}
                                className="text-xs text-primary-600 hover:text-primary-800"
                              >
                                Recalcular datas
                              </button>
                            </div>
                            {parcelas.map((p, idx) => (
                              <div key={idx} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center border border-gray-200 rounded p-2 bg-gray-50/50">
                                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Parcela {idx + 1} *</span>
                                <div>
                                  <input
                                    type="date"
                                    required
                                    value={p.data}
                                    onChange={(e) => updateParcela(financiamentoProprioIndex, idx, 'data', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={p.valor}
                                    onChange={(e) => updateParcela(financiamentoProprioIndex, idx, 'valor', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                    placeholder="0,00"
                                  />
                                </div>
                                <div>
                                  <label className="sr-only">Nº documento</label>
                                  <input
                                    type="text"
                                    value={p.numeroDocumento}
                                    onChange={(e) => updateParcela(financiamentoProprioIndex, idx, 'numeroDocumento', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                    placeholder="Nº documento"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                        <input
                          type="text"
                          value={paymentMethods[financiamentoProprioIndex]?.descricao || ''}
                          onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'descricao', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Avalista</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={avalistaSearch[financiamentoProprioIndex] || paymentMethods[financiamentoProprioIndex]?.avalista || ''}
                              onChange={(e) => {
                                const searchValue = e.target.value
                                setAvalistaSearch((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue }))
                                setShowAvalistaDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue.length >= 3 }))
                                updatePaymentMethod(financiamentoProprioIndex, 'avalista', searchValue)
                              }}
                              onFocus={() => {
                                if ((avalistaSearch[financiamentoProprioIndex] || paymentMethods[financiamentoProprioIndex]?.avalista || '').length >= 3) {
                                  setShowAvalistaDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: true }))
                                }
                              }}
                              placeholder="Digite no mínimo 3 caracteres para buscar (nome ou CPF)"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                            {showAvalistaDropdown[financiamentoProprioIndex] && filteredAvalistas[financiamentoProprioIndex] && filteredAvalistas[financiamentoProprioIndex].length > 0 && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredAvalistas[financiamentoProprioIndex].map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      updatePaymentMethod(financiamentoProprioIndex, 'avalista', customer.name)
                                      setAvalistaSearch((prev) => ({ ...prev, [financiamentoProprioIndex]: customer.name }))
                                      setShowAvalistaDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: false }))
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingAvalistaForPaymentIndex({ paymentIndex: financiamentoProprioIndex, field: 'avalista' })
                              setShowCreateCustomerModal(true)
                            }}
                            className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                            title="Criar novo cliente como avalista"
                          >
                            <FiPlus className="w-3 h-3" />
                            Criar
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Avalista adicional</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={avalistaAdicionalSearch[financiamentoProprioIndex] || paymentMethods[financiamentoProprioIndex]?.avalistaAdicional || ''}
                              onChange={(e) => {
                                const searchValue = e.target.value
                                setAvalistaAdicionalSearch((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue }))
                                setShowAvalistaAdicionalDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue.length >= 3 }))
                                updatePaymentMethod(financiamentoProprioIndex, 'avalistaAdicional', searchValue)
                              }}
                              onFocus={() => {
                                if ((avalistaAdicionalSearch[financiamentoProprioIndex] || paymentMethods[financiamentoProprioIndex]?.avalistaAdicional || '').length >= 3) {
                                  setShowAvalistaAdicionalDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: true }))
                                }
                              }}
                              placeholder="Digite no mínimo 3 caracteres para buscar (nome ou CPF)"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                            {showAvalistaAdicionalDropdown[financiamentoProprioIndex] && filteredAvalistasAdicional[financiamentoProprioIndex] && filteredAvalistasAdicional[financiamentoProprioIndex].length > 0 && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredAvalistasAdicional[financiamentoProprioIndex].map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      updatePaymentMethod(financiamentoProprioIndex, 'avalistaAdicional', customer.name)
                                      setAvalistaAdicionalSearch((prev) => ({ ...prev, [financiamentoProprioIndex]: customer.name }))
                                      setShowAvalistaAdicionalDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: false }))
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingAvalistaForPaymentIndex({ paymentIndex: financiamentoProprioIndex, field: 'avalistaAdicional' })
                              setShowCreateCustomerModal(true)
                            }}
                            className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                            title="Criar novo cliente como avalista adicional"
                          >
                            <FiPlus className="w-3 h-3" />
                            Criar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinanciamentoProprioModal(false)
                    setFinanciamentoProprioIndex(null)
                  }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={showConfirmModal}
          title="Confirmar Exclusão"
          message="Tem certeza que deseja excluir esta venda?"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmText="Sim, Excluir"
          cancelText="Cancelar"
          confirmColor="red"
        />
      </div>
    </Layout>
  )
}
