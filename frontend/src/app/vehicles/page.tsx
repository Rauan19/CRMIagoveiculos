'use client'

import { useRef, useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/services/api'
import ConfirmModal from '@/components/ConfirmModal'
import { formatPlate, removeMask, formatCPF, formatPhone, formatCNPJ, formatRG, formatCEP } from '@/utils/formatters'
import {
  ESPECIES,
  COMBUSTIVEIS,
  PORTAS,
  CAMBIOS,
  BLINDADO,
  ORIGEM,
  PERICIA_CAUTELAR,
  OPCIONAIS_LIST,
} from '@/utils/vehicleOptions'
import { FiFileText, FiUpload, FiX, FiDownload, FiTrash2, FiMoreVertical, FiEdit, FiEye, FiImage, FiPlus, FiCopy, FiShare2, FiMail, FiMessageCircle, FiSearch, FiFilter, FiRotateCcw } from 'react-icons/fi'
import Toast from '@/components/Toast'

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
  km?: number
  color?: string
  price?: number
  cost?: number
  tableValue?: number
  expenseType?: string
  expenseValue?: number
  customerId?: number
  customer?: Customer
  notes?: string
  photos?: string
  documentName?: string | null
  documentMime?: string | null
  documentUpdatedAt?: string | null
  hasDocument?: boolean
  status: string
  createdAt?: string
  updatedAt?: string
  sale?: {
    id?: number
    status?: string
    date?: string
    salePrice?: number
    purchasePrice?: number
    customer?: { id: number; name: string; phone: string }
    seller?: { id: number; name: string }
  }
  saleDate?: string | null
  // Campos adicionais
  empresa?: string
  posicao?: number
  conditionStatus?: string
  // Campos de entrada de estoque
  dataEntrada?: string
  canalEntrada?: string
  fornecedor?: string
  docEmNomeDe?: string
  intermediario?: string
  valorEntrada?: number
  valorQuitacao?: number
  valorDebitos?: number
  valorLiquido?: number
  precoPromocional?: number
  valorMinimoVenda?: number
  anoCRLV?: number
  valorIPVA?: number
  situacaoRecibo?: string
  vencimentoIPVA?: string
  valorLicencSeg?: number
  vencimentoGarantiaFabrica?: string
  documentoCRV?: string
  informacao1?: string
  marcador1?: string
  informacao2?: string
  marcador2?: string
  vendedorAngariador?: string
  observacaoEntrada?: string
  observacoesInternas?: string
  renavam?: string
  cadastroOutrasLojas?: boolean
  especie?: string
  combustivel?: string
  modeloDenatran?: string
  modeloBase?: string
  portas?: string
  carroceria?: string
  anoFabricacao?: number
  anoModelo?: number
  motorizacao?: string
  cambio?: string
  chassi?: string
  chassiRemarcado?: boolean
  modeloFipe?: string
  cidadeEmplacamento?: string
  numeroCambio?: string
  hpCv?: string
  periciaCautelar?: string
  passageiros?: string
  blindado?: string
  origem?: string
  numeroMotor?: string
  corInterna?: string
  opcionais?: string
}

const statusColors: Record<string, string> = {
  disponivel: 'bg-green-100 text-green-800',
  reservado: 'bg-yellow-100 text-yellow-800',
  vendido: 'bg-red-100 text-red-800',
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

function VehiclesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterBrand, setFilterBrand] = useState<string>('')
  const [filterYear, setFilterYear] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('') // 'proprio' ou 'consignado'
  const [filterCondition, setFilterCondition] = useState<string>('') // 'novo' ou 'usado'
  const [filterSaleStatus, setFilterSaleStatus] = useState<string>('') // Status da venda
  const [sortBy, setSortBy] = useState<string>('createdAt') // Campo para ordenação
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // Ordem da ordenação
  const [saving, setSaving] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [vehicleToShare, setVehicleToShare] = useState<Vehicle | null>(null)
  const [showAlterarEntradaModal, setShowAlterarEntradaModal] = useState(false)
  const [vehicleToAlterEntrada, setVehicleToAlterEntrada] = useState<Vehicle | null>(null)
  const [isNovaEntrada, setIsNovaEntrada] = useState(false)
  const [showFichaCadastralModal, setShowFichaCadastralModal] = useState(false)
  const [vehicleForFicha, setVehicleForFicha] = useState<Vehicle | null>(null)
  const [fichaCadastralFormData, setFichaCadastralFormData] = useState({
    // Dados do Veículo
    marca: '',
    modelo: '',
    anoFabricacao: '',
    anoModelo: '',
    placa: '',
    chassi: '',
    renavam: '',
    cor: '',
    valor: '',
    valorEntrada: '',
    valorFinanciado: '',
    parcelas: '',
    valorParcela: '',
    // Dados do Cliente
    tipoPessoa: 'Física',
    nomeCompleto: '',
    cpfCnpj: '',
    cnh: '',
    tipoCNH: '',
    dataEmissaoCNH: '',
    rg: '',
    orgaoEmissor: '',
    uf: '',
    dataEmissaoRG: '',
    dataNascimento: '',
    naturalidade: '',
    sexo: '',
    nomePai: '',
    nomeMae: '',
    estadoCivil: '',
    enderecoCorrespondencia: '',
    grauInstrucao: '',
    dependentes: '',
    // Dados Residenciais
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    estado: '',
    cidade: '',
    tempoResidencia: '',
    tipoResidencia: '',
    telefoneResidencial: '',
    falarCom: '',
    tipoTelefone: '',
    telefoneCelular: '',
    email: '',
    // Dados Profissionais
    empresa: '',
    cnpjEmpresa: '',
    rendaMensal: '',
    rendaExtra: '',
    rendaExtraOrigem: '',
    cargoFuncao: '',
    cepComercial: '',
    enderecoComercial: '',
    numeroComercial: '',
    complementoComercial: '',
    bairroComercial: '',
    ufComercial: '',
    cidadeComercial: '',
    telefoneComercial: '',
    tempoEmpresa: '',
    dataAdmissao: '',
    empresaAnterior: '',
    telefoneEmpresaAnterior: '',
    // Dados Cônjuge
    nomeConjuge: '',
    celularConjuge: '',
    cpfConjuge: '',
    rgConjuge: '',
    dataNascimentoConjuge: '',
    empresaConjuge: '',
    telefoneConjuge: '',
    ocupacaoConjuge: '',
    rendaConjuge: '',
    // Referências
    referenciasPessoais: [] as Array<{ nome: string; endereco: string; numero: string; complemento: string; telefone: string }>,
    possuiCartaoCredito: '',
    referenciasBancarias: [] as Array<{ banco: string; tipoConta: string; agencia: string; conta: string; tempoConta: string }>,
    bensPessoais: [] as Array<{ tipo: string; descricao: string; valor: string }>,
    vendedor: '',
    observacoes: '',
  })
  const [fichaCadastralActiveStep, setFichaCadastralActiveStep] = useState(1)
  const [fornecedorSearch, setFornecedorSearch] = useState('')
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false)
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null)
  const [entradaFormData, setEntradaFormData] = useState({
    dataEntrada: '',
    empresa: 'Iago Veiculos Ltda',
    tipoEntrada: 'proprio', // 'proprio' ou 'consignado'
    canalEntrada: '',
    fornecedor: '',
    docEmNomeDe: '',
    intermediario: '',
    valorEntrada: '',
    valorQuitacao: '',
    valorDebitos: '',
    valorLiquido: '',
    precoPromocional: '',
    valorMinimoVenda: '',
    anoCRLV: '',
    valorIPVA: '',
    situacaoRecibo: '',
    vencimentoIPVA: '',
    valorLicencSeg: '',
    vencimentoGarantiaFabrica: '',
    documentoCRV: '',
    informacao1: '',
    marcador1: '',
    informacao2: '',
    marcador2: '',
    vendedorAngariador: '',
    observacaoEntrada: '',
    observacoesInternas: '',
  })
  const [pendencias, setPendencias] = useState<Array<{ id: number; descricao: string }>>([])
  const [showQuitacaoModal, setShowQuitacaoModal] = useState(false)
  const [parcelasQuitacao, setParcelasQuitacao] = useState<Array<{
    id: number
    valorQuitacao: string
    qtdParcelas: string
    valorParcela: string
    primeiroVcto: string
    observacoesInternas: string
  }>>([])
  const [quitacaoFormData, setQuitacaoFormData] = useState({
    valorQuitacao: '',
    qtdParcelas: '',
    valorParcela: '',
    primeiroVcto: '',
    observacoesInternas: '',
  })
  const [editingQuitacaoIndex, setEditingQuitacaoIndex] = useState<number | null>(null)
  const [showDebitosModal, setShowDebitosModal] = useState(false)
  const [debitos, setDebitos] = useState<Array<{
    id: number
    data: string
    descricao: string
    valor: string
  }>>([])
  const [debitoFormData, setDebitoFormData] = useState({
    data: '',
    descricao: '',
    valor: '',
  })
  const [editingDebitoIndex, setEditingDebitoIndex] = useState<number | null>(null)
  const [debitosNoModal, setDebitosNoModal] = useState<Array<{
    data: string
    descricao: string
    valor: string
  }>>([{ data: '', descricao: '', valor: '' }])
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})
  const [vehicleDocumentFile, setVehicleDocumentFile] = useState<File | null>(null)
  const [isDraggingDoc, setIsDraggingDoc] = useState(false)
  const docInputRef = useRef<HTMLInputElement | null>(null)
  
  // Estados para FIPE
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
  
  // Estados para saída de estoque
  const [showExitModal, setShowExitModal] = useState(false)
  const [exitingVehicle, setExitingVehicle] = useState<Vehicle | null>(null)
  const [sellers, setSellers] = useState<{ id: number; name: string }[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<{ id: number; name: string; cpf?: string; phone: string }[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  // Estados para busca de avalistas
  const [avalistaSearch, setAvalistaSearch] = useState<{ [key: number]: string }>({})
  const [avalistaAdicionalSearch, setAvalistaAdicionalSearch] = useState<{ [key: number]: string }>({})
  const [filteredAvalistas, setFilteredAvalistas] = useState<{ [key: number]: { id: number; name: string; cpf?: string; phone: string }[] }>({})
  const [filteredAvalistasAdicional, setFilteredAvalistasAdicional] = useState<{ [key: number]: { id: number; name: string; cpf?: string; phone: string }[] }>({})
  const [showAvalistaDropdown, setShowAvalistaDropdown] = useState<{ [key: number]: boolean }>({})
  const [showAvalistaAdicionalDropdown, setShowAvalistaAdicionalDropdown] = useState<{ [key: number]: boolean }>({})
  const [creatingAvalistaForPaymentIndex, setCreatingAvalistaForPaymentIndex] = useState<{ paymentIndex: number; field: 'avalista' | 'avalistaAdicional' } | null>(null)
  const [exitFormData, setExitFormData] = useState({
    exitType: '',
    saleType: '',
    exitDate: new Date().toISOString().split('T')[0],
    customerId: '',
    sellerId: '',
    tableValue: '',
    discount: '',
    saleValue: '',
    paymentMethods: [] as Array<{ 
      date: string; 
      type: string; 
      value: string;
      // Campos específicos para Financiamento Próprio
      valorFinanciado?: string;
      quantidadeParcelas?: string;
      frequencia15Dias?: boolean;
      manterDataFixa?: boolean;
      valorParcela?: string;
      numeroPrimeiroDoc?: string;
      numeroDocumento?: string;
      descricao?: string;
      avalista?: string;
      avalistaAdicional?: string;
      formaPagamentoFinanciamentoProprio?: string;
      parcelasDetalhe?: Array<{ data: string; value: string; numeroDocumento?: string }>;
      dataPrimeiraParcela?: string;
      // Campos específicos para Cartão de crédito
      codigoAutorizacao?: string;
      recebimentoLoja?: string;
      // Campos para Carta de crédito de consórcio
      nomeConsorcio?: string;
      // Campos para Consórcio
      bancoFinanceira?: string;
      // Campos para Cheque
      agencia?: string;
      conta?: string;
      numeroCheque?: string;
      emNomeDe?: string;
      // Campos para Financiamento (bancário)
      tipoRetorno?: string;
      retorno?: string;
      tac?: string;
      plus?: string;
      tif?: string;
      taxaIntermediacaoFinanciamento?: string;
      veiculoTrocaId?: string;
    }>,
    transferStatus: 'pago',
    transferNotes: '',
    transferenciaValorEmbutido: '',
    transferenciaPagoFormasPagamento: [] as Array<Record<string, unknown> & { type: string; date: string; value: string }>,
    transferenciaPagoAddForma: 'Escolha',
    saleChannel: '',
    saleChannelNotes: '',
    contractNotes: '',
    internalNotes: '',
  })
  const [savingExit, setSavingExit] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [showFinanciamentoProprioModal, setShowFinanciamentoProprioModal] = useState(false)
  const [financiamentoProprioIndex, setFinanciamentoProprioIndex] = useState<number | null>(null)
  const [showCartaoCreditoModal, setShowCartaoCreditoModal] = useState(false)
  const [cartaoCreditoIndex, setCartaoCreditoIndex] = useState<number | null>(null)
  const [showCartaoDebitoModal, setShowCartaoDebitoModal] = useState(false)
  const [cartaoDebitoIndex, setCartaoDebitoIndex] = useState<number | null>(null)
  const [showCartaConsorcioModal, setShowCartaConsorcioModal] = useState(false)
  const [cartaConsorcioIndex, setCartaConsorcioIndex] = useState<number | null>(null)
  const [showBoletoModal, setShowBoletoModal] = useState(false)
  const [boletoIndex, setBoletoIndex] = useState<number | null>(null)
  const [showDinheiroModal, setShowDinheiroModal] = useState(false)
  const [dinheiroIndex, setDinheiroIndex] = useState<number | null>(null)
  const [showConsorcioModal, setShowConsorcioModal] = useState(false)
  const [consorcioIndex, setConsorcioIndex] = useState<number | null>(null)
  const [showChequeModal, setShowChequeModal] = useState(false)
  const [chequeIndex, setChequeIndex] = useState<number | null>(null)
  const [showFinanciamentoModal, setShowFinanciamentoModal] = useState(false)
  const [financiamentoIndex, setFinanciamentoIndex] = useState<number | null>(null)
  const [showEditarParcelasFinanciamento, setShowEditarParcelasFinanciamento] = useState(false)
  const [showOutrosModal, setShowOutrosModal] = useState(false)
  const [outrosIndex, setOutrosIndex] = useState<number | null>(null)
  const [showTedDocPixModal, setShowTedDocPixModal] = useState(false)
  const [tedDocPixIndex, setTedDocPixIndex] = useState<number | null>(null)
  const [showTrocoTrocaModal, setShowTrocoTrocaModal] = useState(false)
  const [trocoTrocaIndex, setTrocoTrocaIndex] = useState<number | null>(null)
  const [showVeiculoTrocaModal, setShowVeiculoTrocaModal] = useState(false)
  const [veiculoTrocaIndex, setVeiculoTrocaIndex] = useState<number | null>(null)
  const [vehicleSearchVeiculoTroca, setVehicleSearchVeiculoTroca] = useState('')
  const [filteredVehiclesVeiculoTroca, setFilteredVehiclesVeiculoTroca] = useState<Vehicle[]>([])
  const [showVehicleDropdownVeiculoTroca, setShowVehicleDropdownVeiculoTroca] = useState(false)
  const [creatingVehicleForVeiculoTrocaIndex, setCreatingVehicleForVeiculoTrocaIndex] = useState<number | null>(null)
  const [paymentModalContext, setPaymentModalContext] = useState<'sale' | 'transferenciaPago'>('sale')
  const [transferenciaPagoModalIsNew, setTransferenciaPagoModalIsNew] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [createCustomerActiveStep, setCreateCustomerActiveStep] = useState(1)
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
  
  const [activeStep, setActiveStep] = useState(1)
  const [opcionaisSearch, setOpcionaisSearch] = useState('')
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!searchParams) return
    if (searchParams.get('openModal') === 'create' && searchParams.get('returnTo') === 'sinal-negocio') {
      setShowModal(true)
      setEditingVehicle(null)
      setCreatingVehicleForVeiculoTrocaIndex(null)
      resetForm()
    }
  }, [searchParams])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const menuElement = menuRefs.current[openMenuId]
        const buttonElement = buttonRefs.current[openMenuId]
        if (
          menuElement && 
          !menuElement.contains(event.target as Node) &&
          buttonElement &&
          !buttonElement.contains(event.target as Node)
        ) {
          setOpenMenuId(null)
          setMenuPosition(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  useEffect(() => {
    if (showModal) {
      loadFipeBrands()
    }
  }, [showModal])

  function calculateBase64Size(base64String: string): number {
    if (!base64String) return 0
    const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String
    return (base64Data.length * 3) / 4
  }

  function calculateTotalSize(photos: string[]): number {
    if (!photos?.length) return 0
    return photos.reduce((t, p) => t + calculateBase64Size(p), 0)
  }

  const MAX_PHOTOS = 3
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const toAdd = Math.min(MAX_PHOTOS - formData.photos.length, files.length)
    let added = 0
    if (toAdd <= 0) return
    Array.from(files).slice(0, toAdd).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onloadend = () => {
        const b64 = reader.result as string
        setFormData((prev) => ({ ...prev, photos: [...prev.photos, b64] }))
      }
      reader.readAsDataURL(file)
      added++
    })
    e.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
  }

  const addOpcional = (item: string) => {
    if (formData.opcionais.includes(item)) return
    setFormData((prev) => ({ ...prev, opcionais: [...prev.opcionais, item] }))
  }

  const removeOpcional = (item: string) => {
    setFormData((prev) => ({ ...prev, opcionais: prev.opcionais.filter((o) => o !== item) }))
  }

  const filteredOpcionais = OPCIONAIS_LIST.filter(
    (o) => !formData.opcionais.includes(o) && o.toLowerCase().includes(opcionaisSearch.toLowerCase())
  )

  useEffect(() => {
    // Quando trocar o tipo de veículo, limpar tudo e recarregar marcas
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    if (showModal) {
      loadFipeBrands()
    }
  }, [vehicleType])

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
    // Fechar dropdowns ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.searchable-select')) {
        setShowBrandDropdown(false)
        setShowModelDropdown(false)
        setShowYearDropdown(false)
      }
      // Fechar dropdown de fornecedor
      if (!target.closest('.fornecedor-search-container')) {
        setShowFornecedorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadData = async () => {
    try {
      const [vehiclesRes, customersRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/customers'),
      ])
      setVehicles(vehiclesRes.data)
      setCustomers(customersRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar veículos baseado na busca e filtros
  useEffect(() => {
    let filtered = [...vehicles]

    // Busca por texto (marca, modelo, placa)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(vehicle => 
        vehicle.brand.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        (vehicle.plate && vehicle.plate.toLowerCase().includes(searchLower))
      )
    }

    // Filtro por status
    if (filterStatus) {
      filtered = filtered.filter(vehicle => vehicle.status === filterStatus)
    }

    // Filtro por marca
    if (filterBrand) {
      filtered = filtered.filter(vehicle => vehicle.brand.toLowerCase() === filterBrand.toLowerCase())
    }

    // Filtro por ano
    if (filterYear) {
      filtered = filtered.filter(vehicle => vehicle.year.toString() === filterYear)
    }

    // Filtro por tipo (próprio ou consignado)
    if (filterType === 'proprio') {
      filtered = filtered.filter(vehicle => !vehicle.customerId)
    } else if (filterType === 'consignado') {
      filtered = filtered.filter(vehicle => !!vehicle.customerId)
    }

    // Filtro por condição (novo ou usado)
    if (filterCondition) {
      filtered = filtered.filter(vehicle => vehicle.conditionStatus === filterCondition)
    }

    // Filtro por status da venda
    if (filterSaleStatus) {
      if (filterSaleStatus === 'com_venda') {
        filtered = filtered.filter(vehicle => !!vehicle.sale)
      } else if (filterSaleStatus === 'sem_venda') {
        filtered = filtered.filter(vehicle => !vehicle.sale)
      } else if (filterSaleStatus === 'devolvido') {
        // Assumindo que devolvido significa que tinha venda mas foi cancelada/devolvida
        filtered = filtered.filter(vehicle => vehicle.sale?.status === 'cancelada' || vehicle.sale?.status === 'devolvida')
      } else {
        filtered = filtered.filter(vehicle => vehicle.sale?.status === filterSaleStatus)
      }
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'brand':
          aValue = a.brand.toLowerCase()
          bValue = b.brand.toLowerCase()
          break
        case 'model':
          aValue = a.model.toLowerCase()
          bValue = b.model.toLowerCase()
          break
        case 'year':
          aValue = a.year
          bValue = b.year
          break
        case 'price':
          aValue = a.price || 0
          bValue = b.price || 0
          break
        case 'cost':
          aValue = a.cost || 0
          bValue = b.cost || 0
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          break
        case 'saleDate': {
          const aDateVal = a.saleDate ?? a.sale?.date
          const bDateVal = b.saleDate ?? b.sale?.date
          aValue = aDateVal != null ? new Date(aDateVal as string).getTime() : 0
          bValue = bDateVal != null ? new Date(bDateVal as string).getTime() : 0
          break
        }
        default:
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    setFilteredVehicles(filtered)
  }, [vehicles, searchTerm, filterStatus, filterBrand, filterYear, filterType, filterCondition, filterSaleStatus, sortBy, sortOrder])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const yearVal = formData.year || formData.anoModelo || formData.anoFabricacao || ''
      if (!formData.brand || !formData.model || !yearVal) {
        alert('Preencha Marca, Modelo e Ano.')
        setSaving(false)
        return
      }
      const dataToSend = {
        brand: formData.brand,
        model: formData.model,
        year: parseInt(String(yearVal)) || new Date().getFullYear(),
        plate: formData.plate ? removeMask(formData.plate) : '',
        km: formData.km ? parseInt(formData.km) : null,
        color: formData.color || null,
        price: formData.price ? parseFloat(formData.price) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        tableValue: formData.tableValue ? parseFloat(formData.tableValue) : null,
        expenseType: formData.expenseType || null,
        expenseValue: formData.expenseValue ? parseFloat(formData.expenseValue) : null,
        customerId: formData.customerId || null,
        notes: formData.notes || null,
        status: formData.status,
        photos: formData.photos.length ? formData.photos : null,
        empresa: formData.empresa || null,
        posicao: formData.posicao ? parseInt(formData.posicao) : null,
        conditionStatus: formData.conditionStatus || null,
        renavam: formData.renavam || null,
        cadastroOutrasLojas: formData.cadastroOutrasLojas,
        especie: formData.especie || null,
        combustivel: formData.combustivel || null,
        modeloDenatran: formData.modeloDenatran || null,
        modeloBase: formData.modeloBase || null,
        portas: formData.portas || null,
        carroceria: formData.carroceria || null,
        anoFabricacao: formData.anoFabricacao ? parseInt(formData.anoFabricacao) : null,
        anoModelo: formData.anoModelo ? parseInt(formData.anoModelo) : null,
        motorizacao: formData.motorizacao || null,
        cambio: formData.cambio || null,
        chassi: formData.chassi || null,
        chassiRemarcado: formData.chassiRemarcado,
        modeloFipe: formData.modeloFipe || null,
        cidadeEmplacamento: formData.cidadeEmplacamento || null,
        numeroCambio: formData.numeroCambio || null,
        hpCv: formData.hpCv || null,
        periciaCautelar: formData.periciaCautelar || null,
        passageiros: formData.passageiros || null,
        blindado: formData.blindado || null,
        origem: formData.origem || null,
        numeroMotor: formData.numeroMotor || null,
        corInterna: formData.corInterna || null,
        opcionais: formData.opcionais.length ? formData.opcionais : null,
      }

      let savedVehicleId: number | null = null
      let createdVehicle: { id: number; brand?: string; model?: string; year?: number; plate?: string; price?: number; cost?: number } | null = null
      if (editingVehicle) {
        const res = await api.put(`/vehicles/${editingVehicle.id}`, dataToSend)
        savedVehicleId = res.data?.vehicle?.id || editingVehicle.id
      } else {
        const res = await api.post('/vehicles', dataToSend)
        createdVehicle = res.data?.vehicle || null
        savedVehicleId = createdVehicle?.id ?? null
      }

      if (vehicleDocumentFile && savedVehicleId) {
        setUploadingDoc(true)
        const fd = new FormData()
        fd.append('document', vehicleDocumentFile)
        await api.post(`/vehicles/${savedVehicleId}/document`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      await loadData()
      const returnTo = searchParams?.get('returnTo')
      if (returnTo === 'sinal-negocio' && !editingVehicle && savedVehicleId) {
        router.push(`/sinal-negocio?newVehicleId=${savedVehicleId}&openModal=sinal`)
        setShowModal(false)
        setEditingVehicle(null)
        setCreatingVehicleForVeiculoTrocaIndex(null)
        resetForm()
        return
      }
      const forTrocaIndex = creatingVehicleForVeiculoTrocaIndex
      setCreatingVehicleForVeiculoTrocaIndex(null)
      setShowModal(false)
      setEditingVehicle(null)
      resetForm()
      if (!editingVehicle && forTrocaIndex !== null && savedVehicleId && createdVehicle) {
        const val = (createdVehicle.price ?? createdVehicle.cost ?? 0).toString()
        const display = `${createdVehicle.brand || ''} ${createdVehicle.model || ''} ${createdVehicle.year || ''} ${createdVehicle.plate || ''}`.trim()
        setExitFormData((prev) => {
          const u = [...prev.paymentMethods]
          u[forTrocaIndex] = { ...u[forTrocaIndex], veiculoTrocaId: savedVehicleId!.toString(), value: val, date: u[forTrocaIndex]?.date || prev.exitDate || '' }
          return { ...prev, paymentMethods: u }
        })
        setVehicleSearchVeiculoTroca(display)
        setVeiculoTrocaIndex(forTrocaIndex)
        setShowVeiculoTrocaModal(true)
      }
    } catch (error) {
      console.error('Erro ao salvar veículo:', error)
      alert('Erro ao salvar veículo')
    } finally {
      setSaving(false)
      setUploadingDoc(false)
    }
  }

  const handleViewDetails = async (vehicle: Vehicle) => {
    try {
      const response = await api.get(`/vehicles/${vehicle.id}`)
      setSelectedVehicle(response.data)
      setShowDetailsModal(true)
    } catch (error) {
      console.error('Erro ao buscar detalhes do veículo:', error)
      alert('Erro ao buscar detalhes do veículo')
    }
  }

  const handleDuplicate = async (vehicle: Vehicle) => {
    try {
      // Buscar detalhes completos do veículo
      const response = await api.get(`/vehicles/${vehicle.id}`)
      const vehicleData = response.data

      // Preparar dados para duplicação (removendo id e campos relacionados)
      const duplicateData = {
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: vehicleData.year,
        plate: vehicleData.plate || '',
        km: vehicleData.km || null,
        color: vehicleData.color || null,
        price: vehicleData.price || null,
        cost: vehicleData.cost || null,
        tableValue: vehicleData.tableValue || null,
        expenseType: vehicleData.expenseType || null,
        expenseValue: vehicleData.expenseValue || null,
        customerId: null, // Não duplicar cliente
        notes: vehicleData.notes || null,
        photos: vehicleData.photos || null,
        status: 'disponivel', // Sempre criar como disponível
        empresa: vehicleData.empresa || null,
        posicao: vehicleData.posicao || null,
        conditionStatus: vehicleData.conditionStatus || null,
        renavam: vehicleData.renavam || null,
        cadastroOutrasLojas: vehicleData.cadastroOutrasLojas || false,
        especie: vehicleData.especie || null,
        combustivel: vehicleData.combustivel || null,
        modeloDenatran: vehicleData.modeloDenatran || null,
        modeloBase: vehicleData.modeloBase || null,
        portas: vehicleData.portas || null,
        carroceria: vehicleData.carroceria || null,
        anoFabricacao: vehicleData.anoFabricacao || null,
        anoModelo: vehicleData.anoModelo || null,
        motorizacao: vehicleData.motorizacao || null,
        cambio: vehicleData.cambio || null,
        chassi: vehicleData.chassi || null,
        chassiRemarcado: vehicleData.chassiRemarcado || false,
        modeloFipe: vehicleData.modeloFipe || null,
        cidadeEmplacamento: vehicleData.cidadeEmplacamento || null,
        numeroCambio: vehicleData.numeroCambio || null,
        hpCv: vehicleData.hpCv || null,
        periciaCautelar: vehicleData.periciaCautelar || null,
        passageiros: vehicleData.passageiros || null,
        blindado: vehicleData.blindado || null,
        origem: vehicleData.origem || null,
        numeroMotor: vehicleData.numeroMotor || null,
        corInterna: vehicleData.corInterna || null,
        opcionais: vehicleData.opcionais || null,
      }

      // Criar novo veículo
      const res = await api.post('/vehicles', duplicateData)
      
      setToast({ message: 'Veículo duplicado com sucesso!', type: 'success' })
      await loadData()
    } catch (error) {
      console.error('Erro ao duplicar veículo:', error)
      setToast({ message: 'Erro ao duplicar veículo', type: 'error' })
    }
  }

  const getShareText = (vehicleData: any) => {
    return `🚗 *${vehicleData.brand} ${vehicleData.model} ${vehicleData.year}*\n\n` +
      `📋 *Detalhes:*\n` +
      `${vehicleData.plate ? `Placa: ${vehicleData.plate}\n` : ''}` +
      `${vehicleData.km ? `Quilometragem: ${vehicleData.km.toLocaleString('pt-BR')} km\n` : ''}` +
      `${vehicleData.color ? `Cor: ${vehicleData.color}\n` : ''}` +
      `${vehicleData.conditionStatus ? `Condição: ${vehicleData.conditionStatus}\n` : ''}` +
      `Status: ${vehicleData.status}\n\n` +
      `💰 *Valores:*\n` +
      `${vehicleData.price ? `Preço de Venda: R$ ${vehicleData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : ''}` +
      `${vehicleData.cost ? `Preço de Compra: R$ ${vehicleData.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : ''}` +
      `${vehicleData.tableValue ? `Tabela FIPE: R$ ${vehicleData.tableValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` : ''}\n` +
      `${vehicleData.notes ? `📝 *Observações:*\n${vehicleData.notes}\n\n` : ''}` +
      `ID: #${vehicleData.id}`
  }

  const handleShare = async (vehicle: Vehicle) => {
    try {
      // Buscar detalhes completos do veículo
      const response = await api.get(`/vehicles/${vehicle.id}`)
      setVehicleToShare(response.data)
      setShowShareModal(true)
    } catch (error) {
      console.error('Erro ao buscar detalhes do veículo:', error)
      setToast({ message: 'Erro ao buscar detalhes do veículo', type: 'error' })
    }
  }

  const shareViaWhatsApp = () => {
    if (!vehicleToShare) return
    
    const shareText = getShareText(vehicleToShare)
    const encodedText = encodeURIComponent(shareText)
    const whatsappUrl = `https://wa.me/?text=${encodedText}`
    window.open(whatsappUrl, '_blank')
    setShowShareModal(false)
    setVehicleToShare(null)
  }

  const shareViaEmail = () => {
    if (!vehicleToShare) return
    
    const shareText = getShareText(vehicleToShare)
    const subject = encodeURIComponent(`Veículo: ${vehicleToShare.brand} ${vehicleToShare.model} ${vehicleToShare.year}`)
    const body = encodeURIComponent(shareText.replace(/\*/g, '')) // Remove formatação markdown para email
    const emailUrl = `mailto:?subject=${subject}&body=${body}`
    window.location.href = emailUrl
    setShowShareModal(false)
    setVehicleToShare(null)
  }

  const copyToClipboard = async () => {
    if (!vehicleToShare) return
    
    try {
      const shareText = getShareText(vehicleToShare)
      await navigator.clipboard.writeText(shareText)
      setToast({ message: 'Informações copiadas para área de transferência!', type: 'success' })
      setShowShareModal(false)
      setVehicleToShare(null)
    } catch (error) {
      console.error('Erro ao copiar:', error)
      setToast({ message: 'Erro ao copiar informações', type: 'error' })
    }
  }

  const handleDownloadDocument = async (vehicleId: number, filename?: string | null) => {
    try {
      const res = await api.get(`/vehicles/${vehicleId}/document`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `documento-veiculo-${vehicleId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar documento:', error)
      alert('Erro ao baixar documento do veículo')
    }
  }

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
      alert('Envie apenas arquivo PDF.')
      return
    }

    setVehicleDocumentFile(file)
  }

  const handleDeleteDocument = async (vehicleId: number) => {
    if (!confirm('Remover o documento PDF deste veículo?')) return
    try {
      await api.delete(`/vehicles/${vehicleId}/document`)
      await loadData()
      setEditingVehicle((prev) => (prev && prev.id === vehicleId ? { ...prev, hasDocument: false, documentName: null } : prev))
      alert('Documento removido com sucesso')
    } catch (error) {
      console.error('Erro ao remover documento:', error)
      alert('Erro ao remover documento do veículo')
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setVehicleDocumentFile(null)
    setIsDraggingDoc(false)
    setActiveStep(1)
    const v = vehicle as any
    let photos: string[] = []
    if (vehicle.photos) {
      try {
        photos = typeof vehicle.photos === 'string' ? JSON.parse(vehicle.photos) : vehicle.photos
      } catch (_) {}
    }
    let opcionais: string[] = []
    if (v?.opcionais) {
      try {
        opcionais = typeof v.opcionais === 'string' ? JSON.parse(v.opcionais) : v.opcionais
      } catch (_) {}
    }
    setFormData({
      empresa: v?.empresa || 'Iago Veiculos Ltda',
      posicao: v?.posicao?.toString() || '',
      conditionStatus: v?.conditionStatus || 'usado',
      plate: vehicle.plate ? formatPlate(vehicle.plate) : '',
      renavam: v?.renavam || '',
      cadastroOutrasLojas: !!v?.cadastroOutrasLojas,
      especie: v?.especie || 'AUTOMÓVEL',
      combustivel: v?.combustivel || '',
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color || '',
      modeloDenatran: v?.modeloDenatran || '',
      km: vehicle.km?.toString() || '',
      modeloBase: v?.modeloBase || '',
      portas: v?.portas || '',
      carroceria: v?.carroceria || '',
      anoFabricacao: v?.anoFabricacao?.toString() || '',
      anoModelo: v?.anoModelo?.toString() || '',
      year: vehicle.year.toString(),
      motorizacao: v?.motorizacao || '',
      cambio: v?.cambio || '',
      chassi: v?.chassi || '',
      chassiRemarcado: !!v?.chassiRemarcado,
      modeloFipe: v?.modeloFipe || '',
      cidadeEmplacamento: v?.cidadeEmplacamento || '',
      numeroCambio: v?.numeroCambio || '',
      hpCv: v?.hpCv || '',
      periciaCautelar: v?.periciaCautelar || '',
      passageiros: v?.passageiros || '',
      blindado: v?.blindado || 'Não',
      origem: v?.origem || 'Nacional',
      numeroMotor: v?.numeroMotor || '',
      corInterna: v?.corInterna || '',
      price: vehicle.price?.toString() || '',
      cost: vehicle.cost?.toString() || '',
      tableValue: vehicle.tableValue?.toString() || '',
      expenseType: vehicle.expenseType || '',
      expenseValue: vehicle.expenseValue?.toString() || '',
      customerId: vehicle.customerId?.toString() || '',
      notes: vehicle.notes || '',
      status: vehicle.status,
      opcionais,
      photos,
    })
    setBrandSearch(vehicle.brand)
    setModelSearch(vehicle.model)
    setYearSearch(vehicle.year.toString())
    setSelectedBrandCode('')
    setSelectedModelCode('')
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
      await api.delete(`/vehicles/${confirmDeleteId}`)
      loadData()
    } catch (error) {
      console.error('Erro ao excluir veículo:', error)
      alert('Erro ao excluir veículo')
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowConfirmModal(false)
    setConfirmDeleteId(null)
  }

  const handleEstornarVenda = async (vehicle: Vehicle) => {
    if (!vehicle.sale) {
      setToast({ message: 'Este veículo não possui venda registrada', type: 'error' })
      return
    }

    // Buscar detalhes completos do veículo para obter o ID da venda
    let saleId: number | null = null
    try {
      const response = await api.get(`/vehicles/${vehicle.id}`)
      saleId = response.data.sale?.id || null
    } catch (error) {
      console.error('Erro ao buscar detalhes do veículo:', error)
    }

    if (!saleId) {
      setToast({ message: 'Não foi possível encontrar a venda deste veículo', type: 'error' })
      return
    }

    if (!confirm(`Tem certeza que deseja estornar a venda do veículo ${vehicle.brand} ${vehicle.model} ${vehicle.year}?`)) {
      return
    }

    try {
      // Deletar a venda (o backend já atualiza o status do veículo para disponível)
      await api.delete(`/sales/${saleId}`)

      setToast({ message: 'Venda estornada com sucesso! Veículo voltou para disponível.', type: 'success' })
      await loadData()
    } catch (error: any) {
      console.error('Erro ao estornar venda:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao estornar venda', type: 'error' })
    }
  }

  const handleEstornarCompra = async (vehicle: Vehicle) => {
    if (!vehicle.cost || vehicle.cost <= 0) {
      setToast({ message: 'Este veículo não possui compra registrada', type: 'error' })
      return
    }

    if (!confirm(`Tem certeza que deseja estornar a compra do veículo ${vehicle.brand} ${vehicle.model} ${vehicle.year}? O valor de R$ ${vehicle.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} será removido.`)) {
      return
    }

    try {
      // Criar transação financeira de entrada (reembolso)
      await api.post('/financial/transactions', {
        type: 'receber',
        description: `Estorno de compra - Veículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year}${vehicle.plate ? ` - ${vehicle.plate}` : ''}`,
        amount: vehicle.cost,
        status: 'pendente'
      })

      // Remover o custo do veículo
      await api.put(`/vehicles/${vehicle.id}`, {
        cost: null
      })

      setToast({ message: 'Compra estornada com sucesso! Transação de reembolso criada.', type: 'success' })
      await loadData()
    } catch (error: any) {
      console.error('Erro ao estornar compra:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao estornar compra', type: 'error' })
    }
  }

  const handleIncluirFichaCadastral = async (vehicle: Vehicle) => {
    try {
      // Buscar detalhes completos do veículo
      const response = await api.get(`/vehicles/${vehicle.id}`)
      const vehicleData = response.data

      // Preencher formulário com dados do veículo
      setFichaCadastralFormData({
        marca: vehicleData.brand || '',
        modelo: vehicleData.model || '',
        anoFabricacao: vehicleData.anoFabricacao?.toString() || vehicleData.year?.toString() || '',
        anoModelo: vehicleData.anoModelo?.toString() || vehicleData.year?.toString() || '',
        placa: vehicleData.plate || '',
        chassi: vehicleData.chassi || '',
        renavam: vehicleData.renavam || '',
        cor: vehicleData.color || '',
        valor: vehicleData.price?.toString() || '',
        valorEntrada: vehicleData.valorEntrada?.toString() || '',
        valorFinanciado: '',
        parcelas: '',
        valorParcela: '',
        tipoPessoa: 'Física',
        nomeCompleto: '',
        cpfCnpj: '',
        cnh: '',
        tipoCNH: '',
        dataEmissaoCNH: '',
        rg: '',
        orgaoEmissor: '',
        uf: '',
        dataEmissaoRG: '',
        dataNascimento: '',
        naturalidade: '',
        sexo: '',
        nomePai: '',
        nomeMae: '',
        estadoCivil: '',
        enderecoCorrespondencia: '',
        grauInstrucao: '',
        dependentes: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        estado: '',
        cidade: '',
        tempoResidencia: '',
        tipoResidencia: '',
        telefoneResidencial: '',
        falarCom: '',
        tipoTelefone: '',
        telefoneCelular: '',
        email: '',
        empresa: '',
        cnpjEmpresa: '',
        rendaMensal: '',
        rendaExtra: '',
        rendaExtraOrigem: '',
        cargoFuncao: '',
        cepComercial: '',
        enderecoComercial: '',
        numeroComercial: '',
        complementoComercial: '',
        bairroComercial: '',
        ufComercial: '',
        cidadeComercial: '',
        telefoneComercial: '',
        tempoEmpresa: '',
        dataAdmissao: '',
        empresaAnterior: '',
        telefoneEmpresaAnterior: '',
        nomeConjuge: '',
        celularConjuge: '',
        cpfConjuge: '',
        rgConjuge: '',
        dataNascimentoConjuge: '',
        empresaConjuge: '',
        telefoneConjuge: '',
        ocupacaoConjuge: '',
        rendaConjuge: '',
        referenciasPessoais: [],
        possuiCartaoCredito: '',
        referenciasBancarias: [],
        bensPessoais: [],
        vendedor: '',
        observacoes: '',
      })

      setVehicleForFicha(vehicleData)
      setFichaCadastralActiveStep(1)
      setShowFichaCadastralModal(true)
    } catch (error) {
      console.error('Erro ao buscar detalhes do veículo:', error)
      setToast({ message: 'Erro ao buscar detalhes do veículo', type: 'error' })
    }
  }

  const handleSalvarFichaCadastral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicleForFicha) return

    setSaving(true)
    try {
      const dataToSend: any = {
        vehicleId: vehicleForFicha.id,
        marca: fichaCadastralFormData.marca || null,
        modelo: fichaCadastralFormData.modelo || null,
        anoFabricacao: fichaCadastralFormData.anoFabricacao ? parseInt(fichaCadastralFormData.anoFabricacao) : null,
        anoModelo: fichaCadastralFormData.anoModelo ? parseInt(fichaCadastralFormData.anoModelo) : null,
        placa: fichaCadastralFormData.placa || null,
        chassi: fichaCadastralFormData.chassi || null,
        renavam: fichaCadastralFormData.renavam || null,
        cor: fichaCadastralFormData.cor || null,
        valor: fichaCadastralFormData.valor ? parseFloat(fichaCadastralFormData.valor) : null,
        valorEntrada: fichaCadastralFormData.valorEntrada ? parseFloat(fichaCadastralFormData.valorEntrada) : null,
        valorFinanciado: fichaCadastralFormData.valorFinanciado ? parseFloat(fichaCadastralFormData.valorFinanciado) : null,
        parcelas: fichaCadastralFormData.parcelas ? parseInt(fichaCadastralFormData.parcelas) : null,
        valorParcela: fichaCadastralFormData.valorParcela ? parseFloat(fichaCadastralFormData.valorParcela) : null,
        tipoPessoa: fichaCadastralFormData.tipoPessoa || null,
        nomeCompleto: fichaCadastralFormData.nomeCompleto || null,
        cpfCnpj: fichaCadastralFormData.cpfCnpj || null,
        cnh: fichaCadastralFormData.cnh || null,
        tipoCNH: fichaCadastralFormData.tipoCNH || null,
        dataEmissaoCNH: fichaCadastralFormData.dataEmissaoCNH || null,
        rg: fichaCadastralFormData.rg || null,
        orgaoEmissor: fichaCadastralFormData.orgaoEmissor || null,
        uf: fichaCadastralFormData.uf || null,
        dataEmissaoRG: fichaCadastralFormData.dataEmissaoRG || null,
        dataNascimento: fichaCadastralFormData.dataNascimento || null,
        naturalidade: fichaCadastralFormData.naturalidade || null,
        sexo: fichaCadastralFormData.sexo || null,
        nomePai: fichaCadastralFormData.nomePai || null,
        nomeMae: fichaCadastralFormData.nomeMae || null,
        estadoCivil: fichaCadastralFormData.estadoCivil || null,
        enderecoCorrespondencia: fichaCadastralFormData.enderecoCorrespondencia || null,
        grauInstrucao: fichaCadastralFormData.grauInstrucao || null,
        dependentes: fichaCadastralFormData.dependentes ? parseInt(fichaCadastralFormData.dependentes) : null,
        cep: fichaCadastralFormData.cep || null,
        endereco: fichaCadastralFormData.endereco || null,
        numero: fichaCadastralFormData.numero || null,
        complemento: fichaCadastralFormData.complemento || null,
        bairro: fichaCadastralFormData.bairro || null,
        estado: fichaCadastralFormData.estado || null,
        cidade: fichaCadastralFormData.cidade || null,
        tempoResidencia: fichaCadastralFormData.tempoResidencia || null,
        tipoResidencia: fichaCadastralFormData.tipoResidencia || null,
        telefoneResidencial: fichaCadastralFormData.telefoneResidencial || null,
        falarCom: fichaCadastralFormData.falarCom || null,
        tipoTelefone: fichaCadastralFormData.tipoTelefone || null,
        telefoneCelular: fichaCadastralFormData.telefoneCelular || null,
        email: fichaCadastralFormData.email || null,
        empresa: fichaCadastralFormData.empresa || null,
        cnpjEmpresa: fichaCadastralFormData.cnpjEmpresa || null,
        rendaMensal: fichaCadastralFormData.rendaMensal ? parseFloat(fichaCadastralFormData.rendaMensal) : null,
        rendaExtra: fichaCadastralFormData.rendaExtra ? parseFloat(fichaCadastralFormData.rendaExtra) : null,
        rendaExtraOrigem: fichaCadastralFormData.rendaExtraOrigem || null,
        cargoFuncao: fichaCadastralFormData.cargoFuncao || null,
        cepComercial: fichaCadastralFormData.cepComercial || null,
        enderecoComercial: fichaCadastralFormData.enderecoComercial || null,
        numeroComercial: fichaCadastralFormData.numeroComercial || null,
        complementoComercial: fichaCadastralFormData.complementoComercial || null,
        bairroComercial: fichaCadastralFormData.bairroComercial || null,
        ufComercial: fichaCadastralFormData.ufComercial || null,
        cidadeComercial: fichaCadastralFormData.cidadeComercial || null,
        telefoneComercial: fichaCadastralFormData.telefoneComercial || null,
        tempoEmpresa: fichaCadastralFormData.tempoEmpresa || null,
        dataAdmissao: fichaCadastralFormData.dataAdmissao || null,
        empresaAnterior: fichaCadastralFormData.empresaAnterior || null,
        telefoneEmpresaAnterior: fichaCadastralFormData.telefoneEmpresaAnterior || null,
        nomeConjuge: fichaCadastralFormData.nomeConjuge || null,
        celularConjuge: fichaCadastralFormData.celularConjuge || null,
        cpfConjuge: fichaCadastralFormData.cpfConjuge || null,
        rgConjuge: fichaCadastralFormData.rgConjuge || null,
        dataNascimentoConjuge: fichaCadastralFormData.dataNascimentoConjuge || null,
        empresaConjuge: fichaCadastralFormData.empresaConjuge || null,
        telefoneConjuge: fichaCadastralFormData.telefoneConjuge || null,
        ocupacaoConjuge: fichaCadastralFormData.ocupacaoConjuge || null,
        rendaConjuge: fichaCadastralFormData.rendaConjuge ? parseFloat(fichaCadastralFormData.rendaConjuge) : null,
        referenciasPessoais: fichaCadastralFormData.referenciasPessoais.length > 0 ? JSON.stringify(fichaCadastralFormData.referenciasPessoais) : null,
        possuiCartaoCredito: fichaCadastralFormData.possuiCartaoCredito || null,
        referenciasBancarias: fichaCadastralFormData.referenciasBancarias.length > 0 ? JSON.stringify(fichaCadastralFormData.referenciasBancarias) : null,
        bensPessoais: fichaCadastralFormData.bensPessoais.length > 0 ? JSON.stringify(fichaCadastralFormData.bensPessoais) : null,
        vendedor: fichaCadastralFormData.vendedor || null,
        observacoes: fichaCadastralFormData.observacoes || null,
      }

      await api.post('/ficha-cadastral', dataToSend)
      setToast({ message: 'Ficha cadastral criada com sucesso!', type: 'success' })
      setShowFichaCadastralModal(false)
      setVehicleForFicha(null)
      setFichaCadastralActiveStep(1)
    } catch (error: any) {
      console.error('Erro ao salvar ficha cadastral:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar ficha cadastral', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEntradaStock = async (vehicle: Vehicle) => {
    try {
      // Buscar detalhes completos do veículo
      const response = await api.get(`/vehicles/${vehicle.id}`)
      const vehicleData = response.data

      // Preencher formulário com dados iniciais (data de hoje, empresa padrão)
      setFornecedorSearch('')
      setSelectedFornecedorId(null)
      setEntradaFormData({
        dataEntrada: new Date().toISOString().split('T')[0],
        empresa: 'Iago Veiculos Ltda',
        tipoEntrada: 'proprio',
        canalEntrada: '',
        fornecedor: '',
        docEmNomeDe: '',
        intermediario: '',
        valorEntrada: '',
        valorQuitacao: '',
        valorDebitos: '',
        valorLiquido: '',
        precoPromocional: '',
        valorMinimoVenda: '',
        anoCRLV: '',
        valorIPVA: '',
        situacaoRecibo: '',
        vencimentoIPVA: '',
        valorLicencSeg: '',
        vencimentoGarantiaFabrica: '',
        documentoCRV: '',
        informacao1: '',
        marcador1: '',
        informacao2: '',
        marcador2: '',
        vendedorAngariador: '',
        observacaoEntrada: '',
        observacoesInternas: '',
      })
      setPendencias([])
      setParcelasQuitacao([])
      setDebitos([])

      setVehicleToAlterEntrada(vehicleData)
      setShowAlterarEntradaModal(true)
    } catch (error) {
      console.error('Erro ao buscar detalhes do veículo:', error)
      setToast({ message: 'Erro ao buscar detalhes do veículo', type: 'error' })
    }
  }

  const handleAlterarEntrada = async (vehicle: Vehicle) => {
    try {
      // Buscar detalhes completos do veículo
      const response = await api.get(`/vehicles/${vehicle.id}`)
      const vehicleData = response.data

      // Preencher formulário com dados existentes
      const fornecedorNome = vehicleData.fornecedor || ''
      setFornecedorSearch(fornecedorNome)
      setSelectedFornecedorId(null)
      setEntradaFormData({
        dataEntrada: vehicleData.dataEntrada ? new Date(vehicleData.dataEntrada).toISOString().split('T')[0] : (vehicleData.createdAt ? new Date(vehicleData.createdAt).toISOString().split('T')[0] : ''),
        empresa: vehicleData.empresa || 'Iago Veiculos Ltda',
        tipoEntrada: vehicleData.customerId ? 'consignado' : 'proprio',
        canalEntrada: vehicleData.canalEntrada || '',
        fornecedor: fornecedorNome,
        docEmNomeDe: vehicleData.docEmNomeDe || '',
        intermediario: vehicleData.intermediario || '',
        valorEntrada: vehicleData.valorEntrada?.toString() || '',
        valorQuitacao: vehicleData.valorQuitacao?.toString() || '',
        valorDebitos: vehicleData.valorDebitos?.toString() || '',
        valorLiquido: vehicleData.valorLiquido?.toString() || '',
        precoPromocional: vehicleData.precoPromocional?.toString() || '',
        valorMinimoVenda: vehicleData.valorMinimoVenda?.toString() || '',
        anoCRLV: vehicleData.anoCRLV?.toString() || '',
        valorIPVA: vehicleData.valorIPVA?.toString() || '',
        situacaoRecibo: vehicleData.situacaoRecibo || '',
        vencimentoIPVA: vehicleData.vencimentoIPVA ? new Date(vehicleData.vencimentoIPVA).toISOString().split('T')[0] : '',
        valorLicencSeg: vehicleData.valorLicencSeg?.toString() || '',
        vencimentoGarantiaFabrica: vehicleData.vencimentoGarantiaFabrica ? new Date(vehicleData.vencimentoGarantiaFabrica).toISOString().split('T')[0] : '',
        documentoCRV: vehicleData.documentoCRV || '',
        informacao1: vehicleData.informacao1 || '',
        marcador1: vehicleData.marcador1 || '',
        informacao2: vehicleData.informacao2 || '',
        marcador2: vehicleData.marcador2 || '',
        vendedorAngariador: vehicleData.vendedorAngariador || '',
        observacaoEntrada: vehicleData.observacaoEntrada || '',
        observacoesInternas: vehicleData.observacoesInternas || '',
      })
      // Carregar pendências se existirem (pode ser um campo JSON ou array)
      setPendencias([])
      setParcelasQuitacao([])
      setDebitos([])
      setIsNovaEntrada(false)

      setVehicleToAlterEntrada(vehicleData)
      setShowAlterarEntradaModal(true)
    } catch (error) {
      console.error('Erro ao buscar detalhes do veículo:', error)
      setToast({ message: 'Erro ao buscar detalhes do veículo', type: 'error' })
    }
  }

  // Calcular valor líquido automaticamente
  useEffect(() => {
    const valorEntrada = parseFloat(entradaFormData.valorEntrada) || 0
    const valorQuitacao = parseFloat(entradaFormData.valorQuitacao) || 0
    const valorDebitos = parseFloat(entradaFormData.valorDebitos) || 0
    
    const valorLiquidoCalculado = valorEntrada - valorQuitacao - valorDebitos
    
    if (entradaFormData.valorEntrada || entradaFormData.valorQuitacao || entradaFormData.valorDebitos) {
      setEntradaFormData(prev => ({
        ...prev,
        valorLiquido: valorLiquidoCalculado > 0 ? valorLiquidoCalculado.toFixed(2) : ''
      }))
    }
  }, [entradaFormData.valorEntrada, entradaFormData.valorQuitacao, entradaFormData.valorDebitos, parcelasQuitacao, debitos])

  const handleSalvarEntrada = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicleToAlterEntrada) return

    setSaving(true)
    try {
      const dataToSend: any = {
        dataEntrada: entradaFormData.dataEntrada || null,
        empresa: entradaFormData.empresa || null,
        canalEntrada: entradaFormData.canalEntrada || null,
        fornecedor: entradaFormData.fornecedor || null,
        docEmNomeDe: entradaFormData.docEmNomeDe || null,
        intermediario: entradaFormData.intermediario || null,
        valorEntrada: entradaFormData.valorEntrada ? parseFloat(entradaFormData.valorEntrada) : null,
        valorQuitacao: entradaFormData.valorQuitacao ? parseFloat(entradaFormData.valorQuitacao) : null,
        valorDebitos: entradaFormData.valorDebitos ? parseFloat(entradaFormData.valorDebitos) : null,
        valorLiquido: entradaFormData.valorLiquido ? parseFloat(entradaFormData.valorLiquido) : null,
        precoPromocional: entradaFormData.precoPromocional ? parseFloat(entradaFormData.precoPromocional) : null,
        valorMinimoVenda: entradaFormData.valorMinimoVenda ? parseFloat(entradaFormData.valorMinimoVenda) : null,
        anoCRLV: entradaFormData.anoCRLV ? parseInt(entradaFormData.anoCRLV) : null,
        valorIPVA: entradaFormData.valorIPVA ? parseFloat(entradaFormData.valorIPVA) : null,
        situacaoRecibo: entradaFormData.situacaoRecibo || null,
        vencimentoIPVA: entradaFormData.vencimentoIPVA || null,
        valorLicencSeg: entradaFormData.valorLicencSeg ? parseFloat(entradaFormData.valorLicencSeg) : null,
        vencimentoGarantiaFabrica: entradaFormData.vencimentoGarantiaFabrica || null,
        documentoCRV: entradaFormData.documentoCRV || null,
        informacao1: entradaFormData.informacao1 || null,
        marcador1: entradaFormData.marcador1 || null,
        informacao2: entradaFormData.informacao2 || null,
        marcador2: entradaFormData.marcador2 || null,
        vendedorAngariador: entradaFormData.vendedorAngariador || null,
        observacaoEntrada: entradaFormData.observacaoEntrada || null,
        observacoesInternas: (() => {
          let obs = entradaFormData.observacoesInternas || ''
          
          // Adicionar informações de quitação parcelada
          if (parcelasQuitacao.length > 0) {
            const quitacaoText = parcelasQuitacao
              .map((p, idx) => {
                const primeiroVcto = p.primeiroVcto ? new Date(p.primeiroVcto).toLocaleDateString('pt-BR') : 'N/A'
                const obsInternas = p.observacoesInternas ? `\n  Obs: ${p.observacoesInternas}` : ''
                return `Quitação ${idx + 1}: ${p.qtdParcelas}x de R$ ${parseFloat(p.valorParcela || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Total: R$ ${parseFloat(p.valorQuitacao || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - 1º vcto: ${primeiroVcto}${obsInternas}`
              })
              .join('\n')
            obs = obs ? `${obs}\n\nQuitações Parceladas:\n${quitacaoText}` : `Quitações Parceladas:\n${quitacaoText}`
          }
          
          // Adicionar débitos
          if (debitos.length > 0) {
            const debitosText = debitos
              .map((d, idx) => {
                const data = d.data ? new Date(d.data).toLocaleDateString('pt-BR') : 'N/A'
                return `${idx + 1}. ${data} - ${d.descricao} - R$ ${parseFloat(d.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              })
              .join('\n')
            obs = obs ? `${obs}\n\nDébitos:\n${debitosText}` : `Débitos:\n${debitosText}`
          }
          
          // Adicionar pendências
          if (pendencias.length > 0) {
            const pendenciasText = pendencias
              .filter(p => p.descricao.trim())
              .map((p, idx) => `${idx + 1}. ${p.descricao}`)
              .join('\n')
            if (pendenciasText) {
              obs = obs ? `${obs}\n\nPendências:\n${pendenciasText}` : `Pendências:\n${pendenciasText}`
            }
          }
          
          return obs || null
        })(),
      }

      // Se mudou o tipo, atualizar customerId
      if (entradaFormData.tipoEntrada === 'proprio') {
        dataToSend.customerId = null
      } else if (entradaFormData.tipoEntrada === 'consignado' && !vehicleToAlterEntrada.customerId) {
        // Se mudou para consignado mas não tem cliente, manter o customerId atual
        // O usuário precisará associar um cliente depois
      }

      await api.put(`/vehicles/${vehicleToAlterEntrada.id}`, dataToSend)
      setToast({ message: isNovaEntrada ? 'Entrada de estoque registrada com sucesso!' : 'Entrada de estoque alterada com sucesso!', type: 'success' })
      setShowAlterarEntradaModal(false)
      setVehicleToAlterEntrada(null)
      setFornecedorSearch('')
      setSelectedFornecedorId(null)
      setShowFornecedorDropdown(false)
      setPendencias([])
      setParcelasQuitacao([])
      setDebitos([])
      setIsNovaEntrada(false)
      await loadData()
    } catch (error: any) {
      console.error('Erro ao salvar entrada de estoque:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar entrada de estoque', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setActiveStep(1)
    setOpcionaisSearch('')
    setFormData({
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

  // Funções para saída de estoque
  const loadCustomersAndSellers = async () => {
    try {
      const [customersRes, sellersRes] = await Promise.all([
        api.get('/customers'),
        api.get('/users/sellers'),
      ])
      setCustomers(customersRes.data || [])
      setSellers(sellersRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes e vendedores:', error)
    }
  }

  useEffect(() => {
    // Filtrar clientes quando a busca mudar
    if (customerSearch.length >= 3) {
      const filtered = customers.filter((customer: any) => {
        const searchLower = customerSearch.toLowerCase()
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          (customer.cpf && customer.cpf.includes(customerSearch)) ||
          customer.phone.includes(customerSearch)
        )
      })
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers([])
    }
  }, [customerSearch, customers])

  // Buscar avalistas para cada método de pagamento
  useEffect(() => {
    exitFormData.paymentMethods.forEach((pm, index) => {
      // Busca para Avalista
      const search = avalistaSearch[index] || ''
      if (search.length >= 3) {
        const filtered = customers.filter((customer: any) => {
          const searchLower = search.toLowerCase()
          return (
            customer.name.toLowerCase().includes(searchLower) ||
            (customer.cpf && customer.cpf.includes(search.replace(/\D/g, ''))) ||
            customer.phone.includes(search.replace(/\D/g, ''))
          )
        })
        setFilteredAvalistas((prev) => ({ ...prev, [index]: filtered }))
      } else {
        setFilteredAvalistas((prev) => ({ ...prev, [index]: [] }))
      }
      
      // Busca para Avalista Adicional
      const searchAdicional = avalistaAdicionalSearch[index] || ''
      if (searchAdicional.length >= 3) {
        const filtered = customers.filter((customer: any) => {
          const searchLower = searchAdicional.toLowerCase()
          return (
            customer.name.toLowerCase().includes(searchLower) ||
            (customer.cpf && customer.cpf.includes(searchAdicional.replace(/\D/g, ''))) ||
            customer.phone.includes(searchAdicional.replace(/\D/g, ''))
          )
        })
        setFilteredAvalistasAdicional((prev) => ({ ...prev, [index]: filtered }))
      } else {
        setFilteredAvalistasAdicional((prev) => ({ ...prev, [index]: [] }))
      }
    })
  }, [avalistaSearch, avalistaAdicionalSearch, customers, exitFormData.paymentMethods])

  const handleExitStock = async (vehicle: Vehicle) => {
    setExitingVehicle(vehicle)
    await loadCustomersAndSellers()
    setExitFormData({
      exitType: '',
      saleType: '',
      exitDate: new Date().toISOString().split('T')[0],
      customerId: '',
      sellerId: '',
      tableValue: vehicle.tableValue?.toString() || '',
      discount: '0',
      saleValue: vehicle.price?.toString() || '',
      paymentMethods: [],
      transferStatus: 'pago',
      transferNotes: '',
      transferenciaValorEmbutido: '',
      transferenciaPagoFormasPagamento: [],
      transferenciaPagoAddForma: 'Escolha',
      saleChannel: '',
      saleChannelNotes: '',
      contractNotes: '',
      internalNotes: '',
    })
    setCustomerSearch('')
    setAvalistaSearch({})
    setAvalistaAdicionalSearch({})
    setFilteredAvalistas({})
    setFilteredAvalistasAdicional({})
    setShowAvalistaDropdown({})
    setShowAvalistaAdicionalDropdown({})
    setCreatingAvalistaForPaymentIndex(null)
    setShowExitModal(true)
  }

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exitingVehicle) return

    setSavingExit(true)
    try {
      // Para veículos, vamos criar uma venda diretamente
      if (exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') {
        if (!exitFormData.customerId || !exitFormData.sellerId) {
          setToast({ message: 'Cliente e vendedor são obrigatórios para venda/pré-venda', type: 'error' })
          setSavingExit(false)
          return
        }

        const saleData: any = {
          customerId: parseInt(exitFormData.customerId),
          vehicleId: exitingVehicle.id,
          sellerId: parseInt(exitFormData.sellerId),
          salePrice: exitFormData.saleValue ? parseFloat(exitFormData.saleValue) : null,
          purchasePrice: exitingVehicle.cost || null,
          profit: exitFormData.saleValue && exitingVehicle.cost 
            ? parseFloat(exitFormData.saleValue) - (exitingVehicle.cost || 0)
            : null,
          discountAmount: exitFormData.discount ? parseFloat(exitFormData.discount) : null,
          status: exitFormData.exitType === 'pre_venda' ? 'em_andamento' : 'concluida',
          date: exitFormData.exitDate ? new Date(exitFormData.exitDate) : new Date(),
          contractClauses: exitFormData.contractNotes || null,
          notes: exitFormData.internalNotes || null,
          saleType: exitFormData.saleType || null,
          transferStatus: exitFormData.transferStatus || null,
          transferNotes: exitFormData.transferNotes || null,
          transferenciaValorEmbutido: exitFormData.transferenciaValorEmbutido ? parseFloat(exitFormData.transferenciaValorEmbutido) : null,
          transferenciaPagoFormasPagamento: exitFormData.transferenciaPagoFormasPagamento?.length ? exitFormData.transferenciaPagoFormasPagamento : null,
          saleChannel: exitFormData.saleChannel || null,
          saleChannelNotes: exitFormData.saleChannelNotes || null,
          internalNotes: exitFormData.internalNotes || null,
        }

        // Processar formas de pagamento
        if (exitFormData.paymentMethods && exitFormData.paymentMethods.length > 0) {
          let entryValue = 0
          let remainingValue = exitFormData.saleValue ? parseFloat(exitFormData.saleValue) : 0
          
          exitFormData.paymentMethods.forEach((pm) => {
            const value = parseFloat(pm.value) || 0
            if (pm.type === 'dinheiro' || pm.type === 'pix' || pm.type === 'ted_doc_pix') {
              entryValue += value
            }
            remainingValue -= value
          })

          saleData.entryValue = entryValue > 0 ? entryValue : null
          saleData.remainingValue = remainingValue > 0 ? remainingValue : null
          
          const financing = exitFormData.paymentMethods.find((pm) => pm.type === 'financiamento' || pm.type === 'financiamento_bancario')
          if (financing) {
            saleData.financedValue = parseFloat(financing.value) || null
            saleData.paymentMethod = 'financiamento_bancario'
          }
        }

        // Adicionar múltiplas formas de pagamento ao saleData
        if (exitFormData.paymentMethods && exitFormData.paymentMethods.length > 0) {
          saleData.paymentMethods = exitFormData.paymentMethods.map((pm) => ({
            date: pm.date || exitFormData.exitDate,
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
            formaPagamentoFinanciamentoProprio: pm.formaPagamentoFinanciamentoProprio || null,
            parcelasDetalhe: pm.parcelasDetalhe && Array.isArray(pm.parcelasDetalhe) && pm.parcelasDetalhe.length > 0 ? pm.parcelasDetalhe : null,
            codigoAutorizacao: pm.codigoAutorizacao || null,
            recebimentoLoja: pm.recebimentoLoja || null,
            nomeConsorcio: pm.nomeConsorcio || null,
            bancoFinanceira: pm.bancoFinanceira || null,
            agencia: pm.agencia || null,
            conta: pm.conta || null,
            numeroCheque: pm.numeroCheque || null,
            emNomeDe: pm.emNomeDe || null,
            tipoRetorno: pm.tipoRetorno || null,
            retorno: pm.retorno ?? null,
            tac: pm.tac ?? null,
            plus: pm.plus ?? null,
            tif: pm.tif ?? null,
            taxaIntermediacaoFinanciamento: pm.taxaIntermediacaoFinanciamento ?? null,
          }))
        }

        const sale = await api.post('/sales', saleData)

        // Criar transações financeiras (exclui "outros" – não gera contas a receber)
        if (exitFormData.paymentMethods && exitFormData.paymentMethods.length > 0) {
          const transactions = exitFormData.paymentMethods
            .filter((pm) => pm.type !== 'outros')
            .map((pm) => ({
              type: 'receita',
              description: `Venda - ${pm.type} - ${exitingVehicle.brand} ${exitingVehicle.model}`,
              amount: parseFloat(pm.value) || 0,
              dueDate: pm.date ? new Date(pm.date) : new Date(),
              status: 'pendente',
              saleId: sale.data?.id || sale.data?.sale?.id || null
            }))

          for (const transaction of transactions) {
            await api.post('/financial/transactions', transaction)
          }
        }

        // Atualizar status do veículo
        await api.put(`/vehicles/${exitingVehicle.id}`, {
          status: exitFormData.exitType === 'pre_venda' ? 'reservado' : 'vendido'
        })

        setToast({ message: 'Saída de estoque registrada com sucesso! Venda criada.', type: 'success' })
      } else if (exitFormData.exitType === 'transferencia') {
        // Para transferência, apenas atualizar observações
        await api.put(`/vehicles/${exitingVehicle.id}`, {
          notes: exitFormData.internalNotes || exitingVehicle.notes || null
        })
        setToast({ message: 'Transferência registrada com sucesso!', type: 'success' })
      }

      setShowExitModal(false)
      setExitingVehicle(null)
      await loadData()
    } catch (error: any) {
      console.error('Erro ao processar saída de estoque:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao processar saída de estoque', type: 'error' })
    } finally {
      setSavingExit(false)
    }
  }

  const addPaymentMethod = () => {
    setExitFormData({
      ...exitFormData,
      paymentMethods: [...exitFormData.paymentMethods, { date: '', type: '', value: '' }]
    })
  }

  const removePaymentMethod = (index: number) => {
    setExitFormData({
      ...exitFormData,
      paymentMethods: exitFormData.paymentMethods.filter((_, i) => i !== index)
    })
  }

  const generateParcelas = (quantidade: number, dataPrimeiraParcela: string, frequencia15Dias: boolean, manterDataFixa: boolean, valorParcela: string, numeroPrimeiroDoc: string): Array<{ data: string; value: string; numeroDocumento?: string }> => {
    if (!quantidade || quantidade <= 0 || !dataPrimeiraParcela) return []
    
    const parcelas: Array<{ data: string; value: string; numeroDocumento?: string }> = []
    const primeiraData = new Date(dataPrimeiraParcela)
    
    for (let i = 0; i < quantidade; i++) {
      const dataParcela = new Date(primeiraData)
      
      if (frequencia15Dias) {
        // Adiciona 15 dias para cada parcela
        dataParcela.setDate(primeiraData.getDate() + (i * 15))
      } else if (manterDataFixa) {
        // Mantém o mesmo dia do mês, apenas incrementa o mês
        dataParcela.setMonth(primeiraData.getMonth() + i)
      } else {
        // Incrementa 1 mês para cada parcela
        dataParcela.setMonth(primeiraData.getMonth() + i)
      }
      
      const numeroDoc = numeroPrimeiroDoc && !isNaN(parseInt(numeroPrimeiroDoc)) ? (parseInt(numeroPrimeiroDoc) + i).toString() : ''
      
      parcelas.push({
        data: dataParcela.toISOString().split('T')[0],
        value: valorParcela || '0',
        numeroDocumento: numeroDoc || undefined
      })
    }
    
    return parcelas
  }

  const updatePaymentMethod = (index: number, field: string, value: string | number | boolean) => {
    const updated = [...exitFormData.paymentMethods]
    const currentMethod = updated[index]
    
    // Se mudou a quantidade de parcelas, gerar parcelas automaticamente
    if (field === 'quantidadeParcelas' && currentMethod?.type === 'financiamento_proprio') {
      const quantidade = parseInt(String(value)) || 0
      const dataPrimeiraParcela = currentMethod.dataPrimeiraParcela || exitFormData.exitDate || ''
      const frequencia15Dias = currentMethod.frequencia15Dias || false
      const manterDataFixa = currentMethod.manterDataFixa || false
      const valorParcela = currentMethod.valorParcela || '0'
      const numeroPrimeiroDoc = currentMethod.numeroPrimeiroDoc || ''
      
      const parcelas = generateParcelas(quantidade, dataPrimeiraParcela, frequencia15Dias, manterDataFixa, valorParcela, numeroPrimeiroDoc)
      
      updated[index] = { ...currentMethod, [field]: (value as unknown) as string | undefined, parcelasDetalhe: parcelas }
    }
    // Se mudou a data da primeira parcela, frequência ou manter data fixa, recalcular parcelas
    else if ((field === 'dataPrimeiraParcela' || field === 'frequencia15Dias' || field === 'manterDataFixa' || field === 'valorParcela' || field === 'numeroPrimeiroDoc') && currentMethod?.type === 'financiamento_proprio') {
      const quantidade = parseInt(String(currentMethod.quantidadeParcelas)) || 0
      const dataPrimeiraParcela = field === 'dataPrimeiraParcela' ? String(value) : (currentMethod.dataPrimeiraParcela || exitFormData.exitDate || '')
      const frequencia15Dias = field === 'frequencia15Dias' ? Boolean(value) : (currentMethod.frequencia15Dias || false)
      const manterDataFixa = field === 'manterDataFixa' ? Boolean(value) : (currentMethod.manterDataFixa || false)
      const valorParcela = field === 'valorParcela' ? String(value) : (currentMethod.valorParcela || '0')
      const numeroPrimeiroDoc = field === 'numeroPrimeiroDoc' ? String(value) : (currentMethod.numeroPrimeiroDoc || '')
      
      if (quantidade > 0 && dataPrimeiraParcela) {
        const parcelas = generateParcelas(quantidade, dataPrimeiraParcela, frequencia15Dias, manterDataFixa, valorParcela, numeroPrimeiroDoc)
        updated[index] = { ...currentMethod, [field]: (value as unknown) as string | undefined, parcelasDetalhe: parcelas }
      } else {
        updated[index] = { ...currentMethod, [field]: value as string | undefined }
      }
    } else {
      updated[index] = { ...currentMethod, [field]: value as string | undefined }
    }
    
    setExitFormData({ ...exitFormData, paymentMethods: updated })
  }

  const updateTransferenciaPagoForma = (index: number, field: string, value: string | number | boolean) => {
    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
    if (!arr[index]) return
    ;(arr[index] as Record<string, unknown>)[field] = value
    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
  }

  type PaymentItem = { type: string; date: string; value: string; [k: string]: unknown }
  const defaultPaymentForType = (type: string): PaymentItem => {
    const base: PaymentItem = { type, date: exitFormData.exitDate || '', value: '' }
    if (type === 'cartao_credito' || type === 'carta_credito') {
      return { ...base, quantidadeParcelas: '', valorParcela: '', descricao: '', codigoAutorizacao: '', recebimentoLoja: '' }
    }
    if (type === 'cartao_debito') return { ...base, codigoAutorizacao: '', descricao: '' }
    if (type === 'carta_credito_consorcio') return { ...base, nomeConsorcio: '', descricao: '' }
    if (type === 'boleto') return { ...base, codigoAutorizacao: '', descricao: '' }
    if (type === 'dinheiro') return { ...base, descricao: '' }
    if (type === 'consorcio') return { ...base, bancoFinanceira: '', quantidadeParcelas: '', valorParcela: '', descricao: '', valorFinanciado: '' }
    if (type === 'cheque') return { ...base, bancoFinanceira: '', agencia: '', conta: '', numeroCheque: '', emNomeDe: '', descricao: '' }
    if (type === 'financiamento') return { ...base, bancoFinanceira: '', valorFinanciado: '', quantidadeParcelas: '', valorParcela: '', tipoRetorno: '', retorno: '', tac: '', plus: '', tif: '', taxaIntermediacaoFinanciamento: '', parcelasDetalhe: null }
    if (type === 'financiamento_proprio') return { ...base, valorFinanciado: '', quantidadeParcelas: '', frequencia15Dias: false, manterDataFixa: false, valorParcela: '', numeroPrimeiroDoc: '', numeroDocumento: '', descricao: '', avalista: '', avalistaAdicional: '', formaPagamentoFinanciamentoProprio: '', parcelasDetalhe: [], dataPrimeiraParcela: '' }
    if (type === 'outros') return { ...base, descricao: '' }
    if (type === 'ted_doc_pix') return { ...base, descricao: '' }
    if (type === 'troco_troca') return { ...base, descricao: '' }
    if (type === 'veiculo_troca') return { ...base, veiculoTrocaId: '' }
    return base
  }

  const getPaymentItem = (context: 'sale' | 'transferenciaPago', index: number) => {
    if (context === 'transferenciaPago') return (exitFormData.transferenciaPagoFormasPagamento || [])[index]
    return exitFormData.paymentMethods[index]
  }
  const updatePaymentItem = (context: 'sale' | 'transferenciaPago', index: number, field: string, value: string | number | boolean) => {
    if (context === 'transferenciaPago') updateTransferenciaPagoForma(index, field, value)
    else updatePaymentMethod(index, field, value)
  }

  const transferenciaPagoResumo = (fp: Record<string, unknown> & { type: string; date: string; value: string }): string => {
    const v = parseFloat(String(fp.value)) || 0
    const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    const q = String(fp.quantidadeParcelas ?? '')
    const rl = String(fp.recebimentoLoja ?? '')
    const cod = String(fp.codigoAutorizacao ?? '')
    const nc = String(fp.nomeConsorcio ?? '')
    const bf = String(fp.bancoFinanceira ?? '')
    const vf = parseFloat(String(fp.valorFinanciado ?? fp.value)) || 0
    const nch = String(fp.numeroCheque ?? '')
    const d = String(fp.descricao ?? '')
    const vid = fp.veiculoTrocaId != null ? String(fp.veiculoTrocaId) : ''
    if ((fp.type === 'carta_credito' || fp.type === 'cartao_credito') && fp.value) return `R$ ${fmt(v)} | ${q || '-'}x | ${rl === 'a_vista' ? 'À vista' : rl === 'parcelado' ? 'Parcelado' : '-'}`
    if (fp.type === 'cartao_debito' && fp.value) return `R$ ${fmt(v)}${cod ? ` | Cód. ${cod}` : ''}`
    if (fp.type === 'carta_credito_consorcio') return (nc || '-') + (fp.value ? ` | R$ ${fmt(parseFloat(String(fp.value)) || 0)}` : '')
    if (fp.type === 'boleto' && fp.value) return `R$ ${fmt(v)}${cod ? ` | Cód. ${cod}` : ''}`
    if (fp.type === 'dinheiro') return d || '-'
    if (fp.type === 'consorcio') return `${bf || '-'} | R$ ${fmt(vf)} | ${q || '-'}x`
    if (fp.type === 'cheque') return `${bf || '-'} | ${nch || '-'} | R$ ${fmt(v)}`
    if (fp.type === 'financiamento') return `${bf || '-'} | R$ ${fmt(vf)} | ${q || '-'}x`
    if (fp.type === 'outros' || fp.type === 'ted_doc_pix' || fp.type === 'troco_troca') return d || '-'
    if (fp.type === 'veiculo_troca' && vid) {
      const ve = vehicles.find((x) => x.id === parseInt(vid, 10))
      return ve ? `${ve.brand} ${ve.model} ${ve.year} ${ve.plate || ''}`.trim() : `ID ${vid}`
    }
    if (fp.type === 'financiamento_proprio') return d || `R$ ${fmt(parseFloat(String(fp.valorFinanciado ?? fp.value)) || 0)} | ${q || '-'}x`
    return d || '-'
  }

  const calculateTotalReceivable = () => {
    return exitFormData.paymentMethods.reduce((total, pm) => {
      if (pm.type === 'outros') return total // Não gera contas a receber
      return total + (parseFloat(pm.value) || 0)
    }, 0)
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
      await loadCustomersAndSellers()

      // Se estiver criando para avalista, preencher o campo correto
      if (creatingAvalistaForPaymentIndex) {
        const { paymentIndex, field } = creatingAvalistaForPaymentIndex
        const updatedPaymentMethods = [...exitFormData.paymentMethods]
        updatedPaymentMethods[paymentIndex] = { ...updatedPaymentMethods[paymentIndex], [field]: newCustomer.name }
        setExitFormData({ ...exitFormData, paymentMethods: updatedPaymentMethods })
        if (field === 'avalista') {
          setAvalistaSearch((prev) => ({ ...prev, [paymentIndex]: newCustomer.name }))
        } else {
          setAvalistaAdicionalSearch((prev) => ({ ...prev, [paymentIndex]: newCustomer.name }))
        }
        setCreatingAvalistaForPaymentIndex(null)
      } else {
        // Selecionar o cliente recém-criado no formulário principal
        setExitFormData({ ...exitFormData, customerId: newCustomer.id.toString() })
        setCustomerSearch(`${newCustomer.name} ${newCustomer.cpf || newCustomer.phone}`)
      }
      
      // Se estava criando cliente para fornecedor no modal de entrada
      if (creatingCustomer && showAlterarEntradaModal) {
        setFornecedorSearch(newCustomer.name)
        setSelectedFornecedorId(newCustomer.id)
        setEntradaFormData({ ...entradaFormData, fornecedor: newCustomer.name })
        setCreatingCustomer(false)
      }
      
      setShowCreateCustomerModal(false)
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
      setToast({ message: 'Cliente criado com sucesso!', type: 'success' })
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao criar cliente', type: 'error' })
    } finally {
      setCreatingCustomer(false)
    }
  }

  const handleBrandSelect = (brand: FipeBrand) => {
    setSelectedBrandCode(brand.codigo)
    setBrandSearch(brand.nome)
    setFormData({ ...formData, brand: brand.nome, model: '', year: '' }) // Limpar modelo e ano quando trocar marca
    setModelSearch('')
    setSelectedModelCode('')
    setYearSearch('')
    setShowBrandDropdown(false)
  }

  const handleModelSelect = (model: FipeModel) => {
    setSelectedModelCode(model.codigo)
    setFormData({ ...formData, model: model.nome, year: '' }) // Limpar ano quando trocar modelo
    setModelSearch(model.nome)
    setYearSearch('')
    setShowModelDropdown(false)
  }

  const handleYearSelect = (year: FipeYear) => {
    // Extrair apenas o ano (primeira parte antes de / ou -)
    const yearNumber = year.nome.split('/')[0]?.split('-')[0] || year.nome.split('-')[0] || year.nome
    setFormData({ ...formData, year: yearNumber })
    setYearSearch(year.nome) // Mostrar ano/ano modelo no input
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

  const openModal = () => {
    resetForm()
    setEditingVehicle(null)
    setShowModal(true)
  }

  return (
    <Layout>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-900">Veículos</h1>
          <button onClick={openModal} className="bg-primary-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-primary-700 transition-colors">
            Novo Veículo
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-sm text-gray-500">Carregando...</div>
        ) : (
          <>
            {/* Busca e Filtros */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="space-y-2">
                {/* Busca */}
                <div className="relative">
                  <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Buscar por marca, modelo ou placa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todos</option>
                      <option value="disponivel">Disponível</option>
                      <option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todos</option>
                      <option value="proprio">Próprio</option>
                      <option value="consignado">Consignado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Condição</label>
                    <select
                      value={filterCondition}
                      onChange={(e) => setFilterCondition(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todas</option>
                      <option value="novo">Novo</option>
                      <option value="usado">Usado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Situação</label>
                    <select
                      value={filterSaleStatus}
                      onChange={(e) => setFilterSaleStatus(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todas</option>
                      <option value="sem_venda">Sem Venda</option>
                      <option value="com_venda">Com Venda</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluida">Concluída</option>
                      <option value="cancelada">Cancelada</option>
                      <option value="devolvida">Devolvida</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Marca</label>
                    <select
                      value={filterBrand}
                      onChange={(e) => setFilterBrand(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todas</option>
                      {Array.from(new Set(vehicles.map(v => v.brand))).sort().map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Ano</label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todos</option>
                      {Array.from(new Set(vehicles.map(v => v.year))).sort((a, b) => b - a).map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Ordenar</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="createdAt">Data Cadastro</option>
                      <option value="brand">Marca</option>
                      <option value="model">Modelo</option>
                      <option value="year">Ano</option>
                      <option value="price">Preço Venda</option>
                      <option value="cost">Preço Compra</option>
                      <option value="status">Status</option>
                      <option value="saleDate">Data Venda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Ordem</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </div>
                </div>

                {/* Botão Limpar Filtros e Contador */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Mostrando {filteredVehicles.length} de {vehicles.length} veículo(s)
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setFilterStatus('')
                      setFilterBrand('')
                      setFilterYear('')
                      setFilterType('')
                      setFilterCondition('')
                      setFilterSaleStatus('')
                      setSortBy('createdAt')
                      setSortOrder('desc')
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FiFilter className="w-3 h-3" />
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden max-h-[calc(100vh-200px)] flex flex-col">
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Marca/Modelo</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Ano</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Placa</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Valor Venda</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Valor Compra</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Valor Tabela</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Saída</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-2 py-3 text-center text-gray-500">
                        {vehicles.length === 0 ? 'Nenhum veículo cadastrado' : 'Nenhum veículo encontrado com os filtros aplicados'}
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{vehicle.brand} {vehicle.model}</div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500">{vehicle.year}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500">{vehicle.plate || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap font-medium text-gray-900">
                          {vehicle.price ? `R$ ${vehicle.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                          {vehicle.cost ? `R$ ${vehicle.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                          {vehicle.tableValue ? `R$ ${vehicle.tableValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                          {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                          {(() => { const d = vehicle.saleDate ?? vehicle.sale?.date; return d ? new Date(d).toLocaleDateString('pt-BR') : '-' })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-500">{vehicle.customer?.name || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 font-medium rounded-full ${statusColors[vehicle.status] || 'bg-gray-100 text-gray-800'}`}>
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap font-medium">
                          <button
                            ref={(el) => { buttonRefs.current[vehicle.id] = el }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (openMenuId === vehicle.id) {
                                setOpenMenuId(null)
                                setMenuPosition(null)
                              } else {
                                const button = buttonRefs.current[vehicle.id]
                                if (button) {
                                  const rect = button.getBoundingClientRect()
                                  // Posicionar acima do botão, alinhado à direita
                                  setMenuPosition({
                                    top: rect.top, // Topo do botão
                                    left: rect.right - 192 // 192px é aproximadamente a largura do menu (w-48)
                                  })
                                }
                                setOpenMenuId(vehicle.id)
                              }
                            }}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            <FiMoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {/* Menu de Ações Flutuante */}
        {openMenuId !== null && menuPosition && vehicles.find(v => v.id === openMenuId) && (
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
              ref={(el) => { menuRefs.current[openMenuId] = el }}
              className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] py-1"
              style={{
                top: `${Math.max(4, menuPosition.top)}px`, // Garantir que não fique acima da tela
                left: `${menuPosition.left}px`,
                transform: 'translateY(-100%)', // Posicionar acima do botão
              }}
              onClick={(e) => e.stopPropagation()}
            >
            {(() => {
              const vehicle = vehicles.find(v => v.id === openMenuId)
              if (!vehicle) return null
              return (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FiEdit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleViewDetails(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FiEye className="w-3.5 h-3.5" /> Ver Detalhes
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDuplicate(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FiCopy className="w-3.5 h-3.5" /> Duplicar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleShare(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FiShare2 className="w-3.5 h-3.5" /> Compartilhar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleAlterarEntrada(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-purple-600 hover:bg-purple-50 flex items-center gap-2">
                    <FiEdit className="w-3.5 h-3.5" /> Alterar Entrada de Estoque
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleIncluirFichaCadastral(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                    <FiFileText className="w-3.5 h-3.5" /> Incluir Ficha Cadastral
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleEntradaStock(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-green-600 hover:bg-green-50 flex items-center gap-2">
                    <FiPlus className="w-3.5 h-3.5" /> Entrada de Estoque
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleExitStock(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                    <FiFileText className="w-3.5 h-3.5" /> Saída de Estoque
                  </button>
                  {vehicle.hasDocument && (
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadDocument(vehicle.id, vehicle.documentName || undefined); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <FiFileText className="w-3.5 h-3.5" /> Ver Documento
                    </button>
                  )}
                  <div className="border-t border-gray-200 my-1" />
                  {vehicle.sale && (
                    <button onClick={(e) => { e.stopPropagation(); handleEstornarVenda(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-orange-600 hover:bg-orange-50 flex items-center gap-2">
                      <FiRotateCcw className="w-3.5 h-3.5" /> Estornar Venda
                    </button>
                  )}
                  {vehicle.cost && vehicle.cost > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); handleEstornarCompra(vehicle); setOpenMenuId(null); setMenuPosition(null); }} className="w-full px-3 py-1.5 text-left text-orange-600 hover:bg-orange-50 flex items-center gap-2">
                      <FiRotateCcw className="w-3.5 h-3.5" /> Estornar Compra
                    </button>
                  )}
                  <div className="border-t border-gray-200 my-1" />
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(vehicle.id); setOpenMenuId(null); setMenuPosition(null); }} disabled={deleting === vehicle.id} className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <FiTrash2 className="w-3.5 h-3.5" /> {deleting === vehicle.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </>
              )
            })()}
          </div>
          </>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold">
                  {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                </h2>
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
                      onClick={() => setActiveStep(s.id)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap ${
                        activeStep === s.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {activeStep === 1 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Empresa *</label>
                        <input
                          type="text"
                          value={formData.empresa}
                          onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Posição</label>
                        <input
                          type="number"
                          min={1}
                          value={formData.posicao}
                          onChange={(e) => setFormData({ ...formData, posicao: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                        <select
                          value={formData.conditionStatus}
                          onChange={(e) => setFormData({ ...formData, conditionStatus: e.target.value })}
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
                          value={formData.plate}
                          onChange={(e) => setFormData({ ...formData, plate: formatPlate(e.target.value) })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="ABC1D23"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Renavam</label>
                        <input
                          type="text"
                          value={formData.renavam}
                          onChange={(e) => setFormData({ ...formData, renavam: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.cadastroOutrasLojas}
                            onChange={(e) => setFormData({ ...formData, cadastroOutrasLojas: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700">Cadastro feito por outras lojas</span>
                        </label>
                      </div>
                    </div>
                  )}
                  {activeStep === 2 && (
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
                            value={formData.especie}
                            onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
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
                            value={formData.combustivel}
                            onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
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
                                setFormData({ ...formData, brand: e.target.value })
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
                                setFormData({ ...formData, model: e.target.value })
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
                                if (n) setFormData({ ...formData, year: n })
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
                          <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Selecione ou digite" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Modelo Denatran</label>
                          <input type="text" value={formData.modeloDenatran} onChange={(e) => setFormData({ ...formData, modeloDenatran: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quilometragem *</label>
                          <input type="number" value={formData.km} onChange={(e) => setFormData({ ...formData, km: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Modelo Base</label>
                          <input type="text" value={formData.modeloBase} onChange={(e) => setFormData({ ...formData, modeloBase: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Portas *</label>
                          <select value={formData.portas} onChange={(e) => setFormData({ ...formData, portas: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                            <option value="">Selecione</option>
                            {PORTAS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Carroceria</label>
                          <input type="text" value={formData.carroceria} onChange={(e) => setFormData({ ...formData, carroceria: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                        </div>
                      </div>
                    </div>
                  )}
                  {activeStep === 3 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Motorização</label>
                        <input type="text" value={formData.motorizacao} onChange={(e) => setFormData({ ...formData, motorizacao: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Ex: 1.6" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Câmbio *</label>
                        <select value={formData.cambio} onChange={(e) => setFormData({ ...formData, cambio: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="">Selecione</option>
                          {CAMBIOS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Chassi</label>
                        <input type="text" value={formData.chassi} onChange={(e) => setFormData({ ...formData, chassi: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={formData.chassiRemarcado} onChange={(e) => setFormData({ ...formData, chassiRemarcado: e.target.checked })} className="rounded border-gray-300" />
                        <span className="text-xs text-gray-700">Chassi Remarcado</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Modelo FIPE</label>
                        <input type="text" value={formData.modeloFipe} onChange={(e) => setFormData({ ...formData, modeloFipe: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                    </div>
                  )}
                  {activeStep === 4 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cidade Emplacamento</label>
                        <input type="text" value={formData.cidadeEmplacamento} onChange={(e) => setFormData({ ...formData, cidadeEmplacamento: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Número do Câmbio</label>
                        <input type="text" value={formData.numeroCambio} onChange={(e) => setFormData({ ...formData, numeroCambio: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">HP/CV</label>
                        <input type="text" value={formData.hpCv} onChange={(e) => setFormData({ ...formData, hpCv: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Perícia Cautelar</label>
                        <select value={formData.periciaCautelar} onChange={(e) => setFormData({ ...formData, periciaCautelar: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="">Selecione</option>
                          {PERICIA_CAUTELAR.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Passageiros</label>
                        <input type="text" value={formData.passageiros} onChange={(e) => setFormData({ ...formData, passageiros: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Blindado</label>
                        <select value={formData.blindado} onChange={(e) => setFormData({ ...formData, blindado: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          {BLINDADO.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
                        <select value={formData.origem} onChange={(e) => setFormData({ ...formData, origem: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          {ORIGEM.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Número do Motor</label>
                        <input type="text" value={formData.numeroMotor} onChange={(e) => setFormData({ ...formData, numeroMotor: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cor Interna</label>
                        <input type="text" value={formData.corInterna} onChange={(e) => setFormData({ ...formData, corInterna: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Venda</label>
                        <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Compra</label>
                        <input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Tabela (FIPE)</label>
                        <input type="number" step="0.01" value={formData.tableValue} onChange={(e) => setFormData({ ...formData, tableValue: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Gasto</label>
                        <input type="text" value={formData.expenseType} onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Ex: Pneu, Revisão" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Valor Gasto</label>
                        <input type="number" step="0.01" value={formData.expenseValue} onChange={(e) => setFormData({ ...formData, expenseValue: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                        <select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="">Nenhum</option>
                          {customers.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.phone}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900">
                          <option value="disponivel">Disponível</option>
                          <option value="reservado">Reservado</option>
                          <option value="vendido">Vendido</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900" placeholder="Observações" />
                      </div>
                    </div>
                  )}
                  {activeStep === 5 && (
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
                          <div className="text-xs text-gray-500 mb-2">Selecionados ({formData.opcionais.length})</div>
                          <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                            {formData.opcionais.map((o) => (
                              <button key={o} type="button" onClick={() => removeOpcional(o)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-red-50 text-red-700 rounded">
                                {o}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeStep === 6 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Fotos</label>
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" id="vehicle-photos" disabled={formData.photos.length >= MAX_PHOTOS} />
                        {formData.photos.length >= MAX_PHOTOS ? (
                          <span className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900">
                            <FiImage /> Adicionar fotos ({formData.photos.length}/{MAX_PHOTOS})
                          </span>
                        ) : (
                          <label htmlFor="vehicle-photos" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-900">
                            <FiImage /> Adicionar fotos ({formData.photos.length}/{MAX_PHOTOS})
                          </label>
                        )}
                        {formData.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.photos.map((p, i) => (
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
                        {/* Input oculto */}
                        <input
                          ref={docInputRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => handleSelectDocumentFile(e.target.files?.[0] || null)}
                        />

                        {/* Dropzone */}
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
                                  Arraste e solte aqui ou clique em “Selecionar PDF”
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

                        {editingVehicle?.hasDocument && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(editingVehicle.id, editingVehicle.documentName)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-900"
                            >
                              <FiDownload />
                              Baixar documento
                              {editingVehicle.documentName ? (
                                <span className="text-gray-500 font-normal">({editingVehicle.documentName})</span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(editingVehicle.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-sm font-medium text-red-700"
                            >
                              <FiTrash2 />
                              Remover documento
                            </button>
                          </div>
                        )}

                        {!editingVehicle && (
                          <div className="text-xs text-gray-500">
                            O PDF será enviado automaticamente depois que você salvar o veículo.
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex gap-2">
                    {activeStep > 1 && (
                      <button type="button" onClick={() => setActiveStep(activeStep - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Anterior
                      </button>
                    )}
                    {activeStep < 6 && (
                      <button type="button" onClick={() => setActiveStep(activeStep + 1)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        Próximo
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowModal(false); setEditingVehicle(null); setCreatingVehicleForVeiculoTrocaIndex(null); resetForm(); }} disabled={saving} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving || uploadingDoc} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center text-sm">
                      {saving || uploadingDoc ? (
                        <><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{uploadingDoc ? 'Enviando PDF...' : 'Salvando...'}</>
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

      </div>

      {/* Modal Ver Detalhes */}
      {showDetailsModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Veículo #{selectedVehicle.id}</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedVehicle(null)
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Marca</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.brand || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Modelo</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.model || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ano</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.year || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Placa</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.plate || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quilometragem</p>
                      <p className="font-medium text-gray-900">
                        {selectedVehicle.km !== null && selectedVehicle.km !== undefined 
                          ? `${selectedVehicle.km.toLocaleString('pt-BR')} km` 
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cor</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.color || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        statusColors[selectedVehicle.status] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedVehicle.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Condição</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.conditionStatus || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cliente</p>
                      {selectedVehicle.customer ? (
                        <>
                          <p className="font-medium text-gray-900">{selectedVehicle.customer.name}</p>
                          <p className="text-sm text-gray-500">{selectedVehicle.customer.phone}</p>
                        </>
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Identificação */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Identificação</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">RENAVAM</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.renavam || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Chassi</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.chassi || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Número do Motor</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.numeroMotor || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Chassi Remarcado</p>
                      <p className="font-medium text-gray-900">
                        {selectedVehicle.chassiRemarcado !== undefined 
                          ? (selectedVehicle.chassiRemarcado ? 'Sim' : 'Não')
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cidade de Emplacamento</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.cidadeEmplacamento || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Empresa</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.empresa || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Posição</p>
                      <p className="font-medium text-gray-900">
                        {selectedVehicle.posicao !== null && selectedVehicle.posicao !== undefined 
                          ? selectedVehicle.posicao 
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cadastro em Outras Lojas</p>
                      <p className="font-medium text-gray-900">
                        {selectedVehicle.cadastroOutrasLojas !== undefined 
                          ? (selectedVehicle.cadastroOutrasLojas ? 'Sim' : 'Não')
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Especificações Técnicas */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Especificações Técnicas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Espécie</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.especie || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Combustível</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.combustivel || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Modelo DENATRAN</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.modeloDenatran || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Modelo Base</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.modeloBase || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Modelo FIPE</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.modeloFipe || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Portas</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.portas || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Carroceria</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.carroceria || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ano de Fabricação</p>
                      <p className="font-medium text-gray-900">
                        {selectedVehicle.anoFabricacao || <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ano do Modelo</p>
                      <p className="font-medium text-gray-900">
                        {selectedVehicle.anoModelo || <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Motorização</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.motorizacao || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Câmbio</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.cambio || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Número do Câmbio</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.numeroCambio || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">HP/CV</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.hpCv || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Passageiros</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.passageiros || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Blindado</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.blindado || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Origem</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.origem || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Cor Interna</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.corInterna || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Perícia Cautelar</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.periciaCautelar || <span className="text-gray-400">-</span>}</p>
                    </div>
                  </div>
                </div>

                {/* Fotos */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Fotos</h3>
                  {selectedVehicle.photos ? (
                    (() => {
                      try {
                        const photos = typeof selectedVehicle.photos === 'string' 
                          ? JSON.parse(selectedVehicle.photos) 
                          : selectedVehicle.photos;
                        if (Array.isArray(photos) && photos.length > 0) {
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {photos.map((photo: string, index: number) => (
                                <div key={index} className="relative">
                                  <img 
                                    src={photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`}
                                    alt={`Foto ${index + 1}`}
                                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return <p className="text-gray-400">Nenhuma foto cadastrada</p>;
                      } catch {
                        return <p className="text-gray-400">Erro ao carregar fotos</p>;
                      }
                    })()
                  ) : (
                    <p className="text-gray-400">Nenhuma foto cadastrada</p>
                  )}
                </div>

                {/* Opcionais */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Opcionais</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVehicle.opcionais ? (
                      (() => {
                        try {
                          const opcionais = typeof selectedVehicle.opcionais === 'string' 
                            ? JSON.parse(selectedVehicle.opcionais) 
                            : selectedVehicle.opcionais;
                          if (Array.isArray(opcionais) && opcionais.length > 0) {
                            return opcionais.map((opcional: string, index: number) => (
                              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {opcional}
                              </span>
                            ));
                          }
                          return <span className="text-gray-400">Nenhum opcional cadastrado</span>;
                        } catch {
                          return <p className="text-gray-700">{selectedVehicle.opcionais}</p>;
                        }
                      })()
                    ) : (
                      <span className="text-gray-400">Nenhum opcional cadastrado</span>
                    )}
                  </div>
                </div>

                {/* Valores */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Valores e Gastos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Preço de Venda</p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedVehicle.price 
                          ? `R$ ${selectedVehicle.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preço de Compra</p>
                      <p className="text-lg font-medium text-gray-900">
                        {selectedVehicle.cost 
                          ? `R$ ${selectedVehicle.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Valor da Tabela (FIPE)</p>
                      <p className="text-lg font-medium text-gray-900">
                        {selectedVehicle.tableValue 
                          ? `R$ ${selectedVehicle.tableValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipo de Gasto</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.expenseType || <span className="text-gray-400">-</span>}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Valor do Gasto</p>
                      <p className="font-medium text-gray-900">
                        {selectedVehicle.expenseValue 
                          ? `R$ ${selectedVehicle.expenseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : <span className="text-gray-400">-</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documento */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Documento</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Nome do Documento</p>
                      <p className="font-medium text-gray-900">{selectedVehicle.documentName || <span className="text-gray-400">-</span>}</p>
                    </div>
                    {selectedVehicle.documentUpdatedAt && (
                      <div>
                        <p className="text-sm text-gray-600">Data de Upload</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedVehicle.documentUpdatedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {selectedVehicle.hasDocument ? (
                      <button
                        onClick={() => handleDownloadDocument(selectedVehicle.id, selectedVehicle.documentName || undefined)}
                        className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                      >
                        <FiFileText className="w-4 h-4" />
                        Abrir Documento
                      </button>
                    ) : (
                      <p className="text-gray-400 text-sm">Nenhum documento anexado</p>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 text-gray-900">Observações</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedVehicle.notes || <span className="text-gray-400">Nenhuma observação</span>}</p>
                </div>

                {/* Informações de Venda */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Informações de Venda</h3>
                  {selectedVehicle.sale ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Data da Venda</p>
                        <p className="font-medium text-gray-900">
                          {selectedVehicle.sale.date 
                            ? new Date(selectedVehicle.sale.date).toLocaleDateString('pt-BR')
                            : <span className="text-gray-400">-</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status da Venda</p>
                        <p className="font-medium text-gray-900">{selectedVehicle.sale.status || <span className="text-gray-400">-</span>}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Preço de Venda</p>
                        <p className="font-medium text-gray-900">
                          {selectedVehicle.sale.salePrice 
                            ? `R$ ${selectedVehicle.sale.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : <span className="text-gray-400">-</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Preço de Compra</p>
                        <p className="font-medium text-gray-900">
                          {selectedVehicle.sale.purchasePrice 
                            ? `R$ ${selectedVehicle.sale.purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : <span className="text-gray-400">-</span>}
                        </p>
                      </div>
                      {selectedVehicle.sale.customer && (
                        <div>
                          <p className="text-sm text-gray-600">Cliente da Venda</p>
                          <p className="font-medium text-gray-900">{selectedVehicle.sale.customer.name}</p>
                          <p className="text-sm text-gray-500">{selectedVehicle.sale.customer.phone}</p>
                        </div>
                      )}
                      {selectedVehicle.sale.seller && (
                        <div>
                          <p className="text-sm text-gray-600">Vendedor</p>
                          <p className="font-medium text-gray-900">{selectedVehicle.sale.seller.name}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">Nenhuma venda registrada</p>
                  )}
                </div>

                {/* Datas */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Datas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVehicle.createdAt && (
                      <div>
                        <p className="text-sm text-gray-600">Data de Cadastro</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedVehicle.createdAt as string).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                    {selectedVehicle.updatedAt && (
                      <div>
                        <p className="text-sm text-gray-600">Última Atualização</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedVehicle.updatedAt as string).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedVehicle(null)
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

      {/* Modal de Saída de Estoque */}
      {showExitModal && exitingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-bold mb-3">Incluir Saída</h2>
              <form onSubmit={handleExitSubmit} className="space-y-3">
                {/* Veículo */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo</label>
                  <div className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900">
                    {exitingVehicle.brand} {exitingVehicle.model} {exitingVehicle.year} {exitingVehicle.plate ? `- ${exitingVehicle.plate}` : ''}
                  </div>
                </div>

                {/* Tipo de saída */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de saída *</label>
                  <select
                    required
                    value={exitFormData.exitType}
                    onChange={(e) => setExitFormData({ ...exitFormData, exitType: e.target.value, saleType: '' })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione</option>
                    <option value="transferencia">Transferência</option>
                    <option value="venda">Venda</option>
                    <option value="pre_venda">Pré-venda</option>
                  </select>
                </div>

                {/* Tipo de venda (se for venda ou pré-venda) */}
                {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de venda *</label>
                    <select
                      required
                      value={exitFormData.saleType}
                      onChange={(e) => setExitFormData({ ...exitFormData, saleType: e.target.value })}
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
                        value={exitFormData.exitDate}
                        onChange={(e) => setExitFormData({ ...exitFormData, exitDate: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    {exitFormData.exitType !== 'transferencia' && (
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
                                      setExitFormData({ ...exitFormData, customerId: customer.id.toString() })
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
                    {exitFormData.exitType === 'transferencia' && (
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
                                      setExitFormData({ ...exitFormData, customerId: customer.id.toString() })
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
                    {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Vendedor *</label>
                        <select
                          required
                          value={exitFormData.sellerId}
                          onChange={(e) => setExitFormData({ ...exitFormData, sellerId: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          {sellers.map((seller) => (
                            <option key={seller.id} value={seller.id}>
                              {seller.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Valor da venda e formas de pagamento */}
                {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Valor da venda e formas de pagamento</h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor de tabela</label>
                        <input
                          type="number"
                          step="0.01"
                          value={exitFormData.tableValue}
                          onChange={(e) => setExitFormData({ ...exitFormData, tableValue: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor de desconto</label>
                        <input
                          type="number"
                          step="0.01"
                          value={exitFormData.discount}
                          onChange={(e) => setExitFormData({ ...exitFormData, discount: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da venda *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={exitFormData.saleValue}
                          onChange={(e) => setExitFormData({ ...exitFormData, saleValue: e.target.value })}
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
                      {exitFormData.paymentMethods.length === 0 ? (
                        <div className="text-xs text-gray-500 py-3 text-center border border-gray-200 rounded">
                          Nenhum resultado encontrado.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Tipo de pagamento</th>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {exitFormData.paymentMethods.map((pm, index) => (
                                <>
                                  <tr key={index}>
                                    <td className="px-2 py-1">
                                      <input
                                        type="date"
                                        required
                                        value={pm.date}
                                        onChange={(e) => updatePaymentMethod(index, 'date', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <select
                                        required
                                        value={pm.type}
                                        onChange={(e) => {
                                          const newType = e.target.value
                                          updatePaymentMethod(index, 'type', newType)
                                          setPaymentModalContext('sale')
                                          if (newType === 'financiamento_proprio') {
                                            setFinanciamentoProprioIndex(index)
                                            setShowFinanciamentoProprioModal(true)
                                          } else if (newType === 'carta_credito' || newType === 'cartao_credito') {
                                            setCartaoCreditoIndex(index)
                                            setShowCartaoCreditoModal(true)
                                          } else if (newType === 'cartao_debito') {
                                            setCartaoDebitoIndex(index)
                                            setShowCartaoDebitoModal(true)
                                          } else if (newType === 'carta_credito_consorcio') {
                                            setCartaConsorcioIndex(index)
                                            setShowCartaConsorcioModal(true)
                                          } else if (newType === 'boleto') {
                                            setBoletoIndex(index)
                                            setShowBoletoModal(true)
                                          } else if (newType === 'dinheiro') {
                                            setDinheiroIndex(index)
                                            setShowDinheiroModal(true)
                                          } else if (newType === 'consorcio') {
                                            setConsorcioIndex(index)
                                            setShowConsorcioModal(true)
                                          } else if (newType === 'cheque') {
                                            setChequeIndex(index)
                                            setShowChequeModal(true)
                                          } else if (newType === 'financiamento') {
                                            setFinanciamentoIndex(index)
                                            setShowFinanciamentoModal(true)
                                          } else if (newType === 'outros') {
                                            setOutrosIndex(index)
                                            setShowOutrosModal(true)
                                          } else if (newType === 'ted_doc_pix') {
                                            setTedDocPixIndex(index)
                                            setShowTedDocPixModal(true)
                                          } else if (newType === 'troco_troca') {
                                            setTrocoTrocaIndex(index)
                                            setShowTrocoTrocaModal(true)
                                          } else if (newType === 'veiculo_troca') {
                                            setVeiculoTrocaIndex(index)
                                            setShowVeiculoTrocaModal(true)
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      >
                                        <option value="">Selecione</option>
                                        <option value="carta_credito_consorcio">Carta de crédito de consórcio</option>
                                        <option value="carta_credito">Cartão de crédito</option>
                                        <option value="cartao_debito">Cartão de débito</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="consorcio">Consórcio</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="financiamento">Financiamento</option>
                                        <option value="financiamento_proprio">Financiamento Próprio (Duplicatas, promissórias, carnê, etc)</option>
                                        <option value="outros">Outros (Terrenos, permutas, etc. Não gera contas a receber)</option>
                                        <option value="sinal_negocio">Sinal de negócio</option>
                                        <option value="ted_doc_pix">TED, DOC, PIX, Transferência bancária</option>
                                        <option value="troco_troca">Troco na troca</option>
                                        <option value="veiculo_troca">Veículo na troca</option>
                                        <option value="boleto">Boleto</option>
                                      </select>
                                    </td>
                                    <td className="px-2 py-1">
                                      {pm.type !== 'financiamento_proprio' && pm.type !== 'financiamento' && pm.type !== 'carta_credito' && pm.type !== 'cartao_credito' && pm.type !== 'cartao_debito' && pm.type !== 'carta_credito_consorcio' && pm.type !== 'boleto' && pm.type !== 'dinheiro' && pm.type !== 'consorcio' && pm.type !== 'cheque' && pm.type !== 'outros' && pm.type !== 'ted_doc_pix' && pm.type !== 'troco_troca' && pm.type !== 'veiculo_troca' ? (
                                        <input
                                          type="number"
                                          step="0.01"
                                          required
                                          value={pm.value}
                                          onChange={(e) => updatePaymentMethod(index, 'value', e.target.value)}
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                        />
                                      ) : (
                                        <span className="text-xs text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1">
                                      <div className="flex gap-2">
                                        {pm.type === 'financiamento_proprio' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setFinanciamentoProprioIndex(index)
                                              setShowFinanciamentoProprioModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'financiamento' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setFinanciamentoIndex(index)
                                              setShowFinanciamentoModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {(pm.type === 'carta_credito' || pm.type === 'cartao_credito') && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setCartaoCreditoIndex(index)
                                              setShowCartaoCreditoModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'cartao_debito' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setCartaoDebitoIndex(index)
                                              setShowCartaoDebitoModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'carta_credito_consorcio' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setCartaConsorcioIndex(index)
                                              setShowCartaConsorcioModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'boleto' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setBoletoIndex(index)
                                              setShowBoletoModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'dinheiro' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setDinheiroIndex(index)
                                              setShowDinheiroModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'consorcio' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setConsorcioIndex(index)
                                              setShowConsorcioModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'cheque' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setChequeIndex(index)
                                              setShowChequeModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'outros' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOutrosIndex(index)
                                              setShowOutrosModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'ted_doc_pix' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setTedDocPixIndex(index)
                                              setShowTedDocPixModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'troco_troca' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setTrocoTrocaIndex(index)
                                              setShowTrocoTrocaModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        {pm.type === 'veiculo_troca' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPaymentModalContext('sale')
                                              setVeiculoTrocaIndex(index)
                                              setShowVeiculoTrocaModal(true)
                                            }}
                                            className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                                          >
                                            Configurar
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => removePaymentMethod(index)}
                                          className="text-red-600 hover:text-red-800 text-xs"
                                        >
                                          Remover
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {pm.type === 'financiamento_proprio' && pm.valorFinanciado && (
                                    <tr key={`${index}-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          <strong>Valor financiado:</strong> R$ {parseFloat(pm.valorFinanciado || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          {pm.quantidadeParcelas && <span> | <strong>Parcelas:</strong> {pm.quantidadeParcelas}</span>}
                                          {pm.formaPagamentoFinanciamentoProprio && (
                                            <span> | <strong>Forma:</strong> {formasPagamentoFinanciamentoProprio.find(f => f.value === pm.formaPagamentoFinanciamentoProprio)?.label || pm.formaPagamentoFinanciamentoProprio}</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'financiamento' && (pm.valorFinanciado || pm.value) && (
                                    <tr key={`${index}-financiamento-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          {pm.bancoFinanceira && <span><strong>Banco/Financeira:</strong> {pm.bancoFinanceira}</span>}
                                          {pm.bancoFinanceira && ' | '}
                                          <span><strong>Valor financiado:</strong> R$ {parseFloat(pm.valorFinanciado || pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          {pm.quantidadeParcelas && <span> | <strong>Parcelas:</strong> {pm.quantidadeParcelas}</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {(pm.type === 'carta_credito' || pm.type === 'cartao_credito') && pm.value && (
                                    <tr key={`${index}-cartao-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          <strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          {pm.quantidadeParcelas && <span> | <strong>Parcelas:</strong> {pm.quantidadeParcelas}</span>}
                                          {pm.recebimentoLoja && <span> | <strong>Recebimento:</strong> {pm.recebimentoLoja === 'parcelado' ? 'Parcelado' : 'À vista'}</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'cartao_debito' && pm.value && (
                                    <tr key={`${index}-debito-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          <strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          {pm.codigoAutorizacao && <span> | <strong>Cód. autorização:</strong> {pm.codigoAutorizacao}</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'carta_credito_consorcio' && pm.value && (
                                    <tr key={`${index}-consorcio-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          {pm.nomeConsorcio && <span><strong>Consórcio:</strong> {pm.nomeConsorcio}</span>}
                                          {pm.nomeConsorcio && ' | '}
                                          <span><strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'boleto' && pm.value && (
                                    <tr key={`${index}-boleto-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          <strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          {pm.codigoAutorizacao && <span> | <strong>Cód. autorização:</strong> {pm.codigoAutorizacao}</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'dinheiro' && pm.value && (
                                    <tr key={`${index}-dinheiro-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          <strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          {pm.descricao && <span> | <strong>Descrição:</strong> {pm.descricao}</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'cheque' && pm.value && (
                                    <tr key={`${index}-cheque-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          {pm.bancoFinanceira && <span><strong>Banco/Financeira:</strong> {pm.bancoFinanceira}</span>}
                                          {pm.bancoFinanceira && pm.numeroCheque && ' | '}
                                          {pm.numeroCheque && <span><strong>No. Cheque:</strong> {pm.numeroCheque}</span>}
                                          {(pm.bancoFinanceira || pm.numeroCheque) && ' | '}
                                          <span><strong>Valor:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'outros' && pm.value && (
                                    <tr key={`${index}-outros-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          {pm.descricao && <span><strong>Descrição:</strong> {pm.descricao}</span>}
                                          {pm.descricao && ' | '}
                                          <span><strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'ted_doc_pix' && pm.value && (
                                    <tr key={`${index}-ted-doc-pix-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          <strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          {pm.descricao && <span> | <strong>Descrição:</strong> {pm.descricao}</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'troco_troca' && pm.value && (
                                    <tr key={`${index}-troco-troca-summary`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="text-xs text-gray-600">
                                          {pm.descricao && <span><strong>Descrição:</strong> {pm.descricao}</span>}
                                          {pm.descricao && ' | '}
                                          <span><strong>Valor total:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  {pm.type === 'veiculo_troca' && pm.veiculoTrocaId && (() => {
                                    const v = vehicles.find((x) => x.id === parseInt(pm.veiculoTrocaId!))
                                    return v ? (
                                      <tr key={`${index}-veiculo-troca-summary`} className="bg-gray-50">
                                        <td colSpan={4} className="px-2 py-2">
                                          <div className="text-xs text-gray-600">
                                            <strong>Veículo:</strong> {v.brand} {v.model} {v.year}
                                            {v.plate && ` - ${v.plate}`}
                                            {' | '}
                                            <strong>Valor:</strong> R$ {parseFloat(pm.value || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          </div>
                                        </td>
                                      </tr>
                                    ) : null
                                  })()}
                                </>
                              ))}
                            </tbody>
                          </table>
                          <div className="text-xs font-medium text-gray-700 mt-2">
                            A Receber: R$ {calculateTotalReceivable().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transferência de documentos */}
                {(exitFormData.exitType === 'transferencia' || exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">
                      Transferência de documentos
                      <span className="text-xs text-gray-500 ml-2">💡 Informe abaixo como será feita a transferência desse veículo conforme as opções disponíveis.</span>
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Status Transferência</label>
                        <select
                          value={exitFormData.transferStatus}
                          onChange={(e) => setExitFormData({ ...exitFormData, transferStatus: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="pago">Pago</option>
                          <option value="aberto">Aberto</option>
                          <option value="cortesia">Cortesia</option>
                          <option value="cliente_vai_transferir">Cliente vai transferir</option>
                          <option value="embutido_pagamentos">Embutido nos pagamentos do veículo</option>
                        </select>
                      </div>
                      {exitFormData.transferStatus === 'embutido_pagamentos' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor a mais (valor embutido da transferência no valor do veículo)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={exitFormData.transferenciaValorEmbutido || ''}
                            onChange={(e) => setExitFormData({ ...exitFormData, transferenciaValorEmbutido: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="0,00"
                          />
                        </div>
                      )}
                      {exitFormData.transferStatus === 'pago' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Adicionar forma de pagamento *</label>
                            <select
                              value={exitFormData.transferenciaPagoAddForma || 'Escolha'}
                              onChange={(e) => {
                                const v = e.target.value
                                if (!v || v === 'Escolha' || v === 'sinal_negocio') {
                                  setExitFormData((prev) => ({ ...prev, transferenciaPagoAddForma: v || 'Escolha' }))
                                  return
                                }
                                const arr = [...(exitFormData.transferenciaPagoFormasPagamento || []), defaultPaymentForType(v)]
                                setExitFormData((prev) => ({ ...prev, transferenciaPagoFormasPagamento: arr, transferenciaPagoAddForma: 'Escolha' }))
                                setPaymentModalContext('transferenciaPago')
                                setTransferenciaPagoModalIsNew(true)
                                const idx = arr.length - 1
                                if (v === 'financiamento_proprio') { setFinanciamentoProprioIndex(idx); setShowFinanciamentoProprioModal(true) }
                                else if (v === 'carta_credito' || v === 'cartao_credito') { setCartaoCreditoIndex(idx); setShowCartaoCreditoModal(true) }
                                else if (v === 'cartao_debito') { setCartaoDebitoIndex(idx); setShowCartaoDebitoModal(true) }
                                else if (v === 'carta_credito_consorcio') { setCartaConsorcioIndex(idx); setShowCartaConsorcioModal(true) }
                                else if (v === 'boleto') { setBoletoIndex(idx); setShowBoletoModal(true) }
                                else if (v === 'dinheiro') { setDinheiroIndex(idx); setShowDinheiroModal(true) }
                                else if (v === 'consorcio') { setConsorcioIndex(idx); setShowConsorcioModal(true) }
                                else if (v === 'cheque') { setChequeIndex(idx); setShowChequeModal(true) }
                                else if (v === 'financiamento') { setFinanciamentoIndex(idx); setShowFinanciamentoModal(true) }
                                else if (v === 'outros') { setOutrosIndex(idx); setShowOutrosModal(true) }
                                else if (v === 'ted_doc_pix') { setTedDocPixIndex(idx); setShowTedDocPixModal(true) }
                                else if (v === 'troco_troca') { setTrocoTrocaIndex(idx); setShowTrocoTrocaModal(true) }
                                else if (v === 'veiculo_troca') { setVeiculoTrocaIndex(idx); setShowVeiculoTrocaModal(true) }
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            >
                              <option value="Escolha">Escolha</option>
                              <option value="carta_credito_consorcio">Carta de crédito de consórcio</option>
                              <option value="carta_credito">Cartão de crédito</option>
                              <option value="cartao_debito">Cartão de débito</option>
                              <option value="cheque">Cheque</option>
                              <option value="consorcio">Consórcio</option>
                              <option value="dinheiro">Dinheiro</option>
                              <option value="outros">Outros</option>
                              <option value="ted_doc_pix">TED, DOC, PIX</option>
                              <option value="troco_troca">Troco na troca</option>
                              <option value="boleto">Boleto</option>
                            </select>
                          </div>
                          <div className="border border-gray-200 rounded overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-1.5 px-2 font-medium text-gray-700">Data</th>
                                  <th className="text-left py-1.5 px-2 font-medium text-gray-700">Tipo</th>
                                  <th className="text-left py-1.5 px-2 font-medium text-gray-700">Descrição / Resumo</th>
                                  <th className="text-left py-1.5 px-2 font-medium text-gray-700">Valor</th>
                                  <th className="text-left py-1.5 px-2 font-medium text-gray-700 w-28">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-900">
                                {(!exitFormData.transferenciaPagoFormasPagamento || exitFormData.transferenciaPagoFormasPagamento.length === 0) ? (
                                  <tr>
                                    <td colSpan={5} className="py-3 px-2 text-gray-500 text-center">Nenhuma forma de pagamento cadastrada.</td>
                                  </tr>
                                ) : (
                                  exitFormData.transferenciaPagoFormasPagamento.map((fp, idx) => (
                                      <tr key={idx} className="border-t border-gray-100">
                                        <td className="py-1.5 px-2">{fp.date ? new Date(fp.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="py-1.5 px-2">{fp.type === 'carta_credito' || fp.type === 'cartao_credito' ? 'Cartão de crédito' : fp.type === 'carta_credito_consorcio' ? 'Carta consórcio' : fp.type === 'ted_doc_pix' ? 'TED/DOC/PIX' : fp.type === 'troco_troca' ? 'Troco na troca' : fp.type === 'veiculo_troca' ? 'Veículo na troca' : fp.type === 'financiamento_proprio' ? 'Financ. Próprio' : fp.type === 'financiamento' ? 'Financiamento' : fp.type === 'outros' ? 'Outros' : fp.type ? fp.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-'}</td>
                                        <td className="py-1.5 px-2">{transferenciaPagoResumo(fp)}</td>
                                        <td className="py-1.5 px-2">R$ {(parseFloat(fp.value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-1.5 px-2">
                                          <span className="inline-flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setPaymentModalContext('transferenciaPago')
                                                setTransferenciaPagoModalIsNew(false)
                                                const t = fp.type
                                                if (t === 'financiamento_proprio') { setFinanciamentoProprioIndex(idx); setShowFinanciamentoProprioModal(true) }
                                                else if (t === 'carta_credito' || t === 'cartao_credito') { setCartaoCreditoIndex(idx); setShowCartaoCreditoModal(true) }
                                                else if (t === 'cartao_debito') { setCartaoDebitoIndex(idx); setShowCartaoDebitoModal(true) }
                                                else if (t === 'carta_credito_consorcio') { setCartaConsorcioIndex(idx); setShowCartaConsorcioModal(true) }
                                                else if (t === 'boleto') { setBoletoIndex(idx); setShowBoletoModal(true) }
                                                else if (t === 'dinheiro') { setDinheiroIndex(idx); setShowDinheiroModal(true) }
                                                else if (t === 'consorcio') { setConsorcioIndex(idx); setShowConsorcioModal(true) }
                                                else if (t === 'cheque') { setChequeIndex(idx); setShowChequeModal(true) }
                                                else if (t === 'financiamento') { setFinanciamentoIndex(idx); setShowFinanciamentoModal(true) }
                                                else if (t === 'outros') { setOutrosIndex(idx); setShowOutrosModal(true) }
                                                else if (t === 'ted_doc_pix') { setTedDocPixIndex(idx); setShowTedDocPixModal(true) }
                                                else if (t === 'troco_troca') { setTrocoTrocaIndex(idx); setShowTrocoTrocaModal(true) }
                                                else if (t === 'veiculo_troca') { setVeiculoTrocaIndex(idx); setShowVeiculoTrocaModal(true) }
                                              }}
                                              className="text-blue-600 hover:underline text-xs"
                                            >
                                              Configurar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const u = (exitFormData.transferenciaPagoFormasPagamento || []).filter((_, i) => i !== idx)
                                                setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: u })
                                                if (financiamentoProprioIndex === idx) { setShowFinanciamentoProprioModal(false); setFinanciamentoProprioIndex(null) }
                                                else if (cartaoCreditoIndex === idx) { setShowCartaoCreditoModal(false); setCartaoCreditoIndex(null) }
                                                else if (cartaoDebitoIndex === idx) { setShowCartaoDebitoModal(false); setCartaoDebitoIndex(null) }
                                                else if (cartaConsorcioIndex === idx) { setShowCartaConsorcioModal(false); setCartaConsorcioIndex(null) }
                                                else if (boletoIndex === idx) { setShowBoletoModal(false); setBoletoIndex(null) }
                                                else if (dinheiroIndex === idx) { setShowDinheiroModal(false); setDinheiroIndex(null) }
                                                else if (consorcioIndex === idx) { setShowConsorcioModal(false); setConsorcioIndex(null) }
                                                else if (chequeIndex === idx) { setShowChequeModal(false); setChequeIndex(null) }
                                                else if (financiamentoIndex === idx) { setShowFinanciamentoModal(false); setFinanciamentoIndex(null) }
                                                else if (outrosIndex === idx) { setShowOutrosModal(false); setOutrosIndex(null) }
                                                else if (tedDocPixIndex === idx) { setShowTedDocPixModal(false); setTedDocPixIndex(null) }
                                                else if (trocoTrocaIndex === idx) { setShowTrocoTrocaModal(false); setTrocoTrocaIndex(null) }
                                                else if (veiculoTrocaIndex === idx) { setShowVeiculoTrocaModal(false); setVeiculoTrocaIndex(null) }
                                                if (financiamentoProprioIndex !== null && financiamentoProprioIndex > idx) setFinanciamentoProprioIndex(financiamentoProprioIndex - 1)
                                                if (cartaoCreditoIndex !== null && cartaoCreditoIndex > idx) setCartaoCreditoIndex(cartaoCreditoIndex - 1)
                                                if (cartaoDebitoIndex !== null && cartaoDebitoIndex > idx) setCartaoDebitoIndex(cartaoDebitoIndex - 1)
                                                if (cartaConsorcioIndex !== null && cartaConsorcioIndex > idx) setCartaConsorcioIndex(cartaConsorcioIndex - 1)
                                                if (boletoIndex !== null && boletoIndex > idx) setBoletoIndex(boletoIndex - 1)
                                                if (dinheiroIndex !== null && dinheiroIndex > idx) setDinheiroIndex(dinheiroIndex - 1)
                                                if (consorcioIndex !== null && consorcioIndex > idx) setConsorcioIndex(consorcioIndex - 1)
                                                if (chequeIndex !== null && chequeIndex > idx) setChequeIndex(chequeIndex - 1)
                                                if (financiamentoIndex !== null && financiamentoIndex > idx) setFinanciamentoIndex(financiamentoIndex - 1)
                                                if (outrosIndex !== null && outrosIndex > idx) setOutrosIndex(outrosIndex - 1)
                                                if (tedDocPixIndex !== null && tedDocPixIndex > idx) setTedDocPixIndex(tedDocPixIndex - 1)
                                                if (trocoTrocaIndex !== null && trocoTrocaIndex > idx) setTrocoTrocaIndex(trocoTrocaIndex - 1)
                                                if (veiculoTrocaIndex !== null && veiculoTrocaIndex > idx) setVeiculoTrocaIndex(veiculoTrocaIndex - 1)
                                              }}
                                              className="text-red-600 hover:underline text-xs"
                                            >
                                              Remover
                                            </button>
                                          </span>
                                        </td>
                                      </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                            {exitFormData.transferenciaPagoFormasPagamento?.length ? (
                              <div className="text-xs font-medium text-gray-700 px-2 py-1.5 bg-gray-50 border-t border-gray-200">
                                Total: R$ {(exitFormData.transferenciaPagoFormasPagamento || []).reduce((s, fp) => s + (parseFloat(fp.value) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            ) : (
                              <div className="text-xs font-medium text-gray-700 px-2 py-1.5 bg-gray-50 border-t border-gray-200">
                                Total: R$ 0,00
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações da transferência</label>
                        <textarea
                          value={exitFormData.transferNotes}
                          onChange={(e) => setExitFormData({ ...exitFormData, transferNotes: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Outras Informações */}
                {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda' || exitFormData.exitType === 'transferencia') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Outras Informações</h3>
                    <div className="space-y-2">
                      {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Canal Venda *</label>
                            <select
                              required
                              value={exitFormData.saleChannel}
                              onChange={(e) => setExitFormData({ ...exitFormData, saleChannel: e.target.value })}
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
                              value={exitFormData.saleChannelNotes}
                              onChange={(e) => setExitFormData({ ...exitFormData, saleChannelNotes: e.target.value })}
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
                              value={exitFormData.contractNotes}
                              onChange={(e) => setExitFormData({ ...exitFormData, contractNotes: e.target.value })}
                              rows={2}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações internas</label>
                        <textarea
                          value={exitFormData.internalNotes}
                          onChange={(e) => setExitFormData({ ...exitFormData, internalNotes: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExitModal(false)
                      setExitingVehicle(null)
                      setCustomerSearch('')
                      setAvalistaSearch({})
                      setAvalistaAdicionalSearch({})
                      setFilteredAvalistas({})
                      setFilteredAvalistasAdicional({})
                      setShowAvalistaDropdown({})
                      setShowAvalistaAdicionalDropdown({})
                      setCreatingAvalistaForPaymentIndex(null)
                      setShowFinanciamentoProprioModal(false)
                      setFinanciamentoProprioIndex(null)
                      setShowCartaoCreditoModal(false)
                      setCartaoCreditoIndex(null)
                      setShowCartaoDebitoModal(false)
                      setCartaoDebitoIndex(null)
                      setShowCartaConsorcioModal(false)
                      setCartaConsorcioIndex(null)
                      setShowBoletoModal(false)
                      setBoletoIndex(null)
                      setShowDinheiroModal(false)
                      setDinheiroIndex(null)
                      setShowConsorcioModal(false)
                      setConsorcioIndex(null)
                      setShowChequeModal(false)
                      setChequeIndex(null)
                      setShowFinanciamentoModal(false)
                      setFinanciamentoIndex(null)
                      setShowEditarParcelasFinanciamento(false)
                      setShowOutrosModal(false)
                      setOutrosIndex(null)
                      setShowTedDocPixModal(false)
                      setTedDocPixIndex(null)
                      setShowTrocoTrocaModal(false)
                      setTrocoTrocaIndex(null)
                      setShowVeiculoTrocaModal(false)
                      setVeiculoTrocaIndex(null)
                      setCreatingVehicleForVeiculoTrocaIndex(null)
                      setPaymentModalContext('sale')
                      setTransferenciaPagoModalIsNew(false)
                    }}
                    disabled={savingExit}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingExit}
                    className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {savingExit ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                      </>
                    ) : (
                      'Confirmar Saída'
                    )}
                  </button>
                </div>
              </form>
            </div>
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
                        value={exitFormData.paymentMethods[financiamentoProprioIndex]?.formaPagamentoFinanciamentoProprio || ''}
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
                        value={exitFormData.paymentMethods[financiamentoProprioIndex]?.valorFinanciado || ''}
                        onChange={(e) => {
                          const valor = e.target.value
                          const updated = [...exitFormData.paymentMethods]
                          const pm = updated[financiamentoProprioIndex]
                          if (pm) {
                            updated[financiamentoProprioIndex] = { ...pm, valorFinanciado: valor, value: valor }
                            setExitFormData({ ...exitFormData, paymentMethods: updated })
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data da primeira parcela *</label>
                      <input
                        type="date"
                        required
                        value={exitFormData.paymentMethods[financiamentoProprioIndex]?.dataPrimeiraParcela || exitFormData.exitDate || ''}
                        onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'dataPrimeiraParcela', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                      <select
                        required
                        value={exitFormData.paymentMethods[financiamentoProprioIndex]?.quantidadeParcelas || ''}
                        onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'quantidadeParcelas', e.target.value)}
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
                          checked={exitFormData.paymentMethods[financiamentoProprioIndex]?.frequencia15Dias || false}
                          onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'frequencia15Dias', e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-700">Parcelas com frequência de 15 dias</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exitFormData.paymentMethods[financiamentoProprioIndex]?.manterDataFixa || false}
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
                        value={exitFormData.paymentMethods[financiamentoProprioIndex]?.valorParcela || ''}
                        onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'valorParcela', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Número do 1º Doc</label>
                      <input
                        type="text"
                        value={exitFormData.paymentMethods[financiamentoProprioIndex]?.numeroPrimeiroDoc || ''}
                        onChange={(e) => updatePaymentMethod(financiamentoProprioIndex, 'numeroPrimeiroDoc', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    
                    {/* Campos dinâmicos de parcelas */}
                    {exitFormData.paymentMethods[financiamentoProprioIndex]?.parcelasDetalhe && exitFormData.paymentMethods[financiamentoProprioIndex]?.parcelasDetalhe.length > 0 && (
                      <div className="mt-4 border-t border-gray-300 pt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Detalhamento das Parcelas</h4>
                        <div className="space-y-3">
                          {exitFormData.paymentMethods[financiamentoProprioIndex].parcelasDetalhe.map((parcela, index) => (
                            <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                                    Parcela {index + 1} *
                                  </label>
                                  <input
                                    type="date"
                                    required
                                    value={parcela.data}
                                    onChange={(e) => {
                                      const updated = [...exitFormData.paymentMethods]
                                      const pm = updated[financiamentoProprioIndex]
                                      if (pm?.parcelasDetalhe) {
                                        const parcelasUpdated = [...pm.parcelasDetalhe]
                                        parcelasUpdated[index] = { ...parcelasUpdated[index], data: e.target.value }
                                        updated[financiamentoProprioIndex] = { ...pm, parcelasDetalhe: parcelasUpdated }
                                        setExitFormData({ ...exitFormData, paymentMethods: updated })
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={parcela.value}
                                    onChange={(e) => {
                                      const updated = [...exitFormData.paymentMethods]
                                      const pm = updated[financiamentoProprioIndex]
                                      if (pm?.parcelasDetalhe) {
                                        const parcelasUpdated = [...pm.parcelasDetalhe]
                                        parcelasUpdated[index] = { ...parcelasUpdated[index], value: e.target.value }
                                        updated[financiamentoProprioIndex] = { ...pm, parcelasDetalhe: parcelasUpdated }
                                        setExitFormData({ ...exitFormData, paymentMethods: updated })
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                    placeholder="0,00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Nº documento</label>
                                  <input
                                    type="text"
                                    value={parcela.numeroDocumento || ''}
                                    onChange={(e) => {
                                      const updated = [...exitFormData.paymentMethods]
                                      const pm = updated[financiamentoProprioIndex]
                                      if (pm?.parcelasDetalhe) {
                                        const parcelasUpdated = [...pm.parcelasDetalhe]
                                        parcelasUpdated[index] = { ...parcelasUpdated[index], numeroDocumento: e.target.value }
                                        updated[financiamentoProprioIndex] = { ...pm, parcelasDetalhe: parcelasUpdated }
                                        setExitFormData({ ...exitFormData, paymentMethods: updated })
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                      <input
                        type="text"
                        value={exitFormData.paymentMethods[financiamentoProprioIndex]?.descricao || ''}
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
                            value={avalistaSearch[financiamentoProprioIndex] || exitFormData.paymentMethods[financiamentoProprioIndex]?.avalista || ''}
                            onChange={(e) => {
                              const searchValue = e.target.value
                              setAvalistaSearch((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue }))
                              setShowAvalistaDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue.length >= 3 }))
                              updatePaymentMethod(financiamentoProprioIndex, 'avalista', searchValue)
                            }}
                            onFocus={() => {
                              if ((avalistaSearch[financiamentoProprioIndex] || exitFormData.paymentMethods[financiamentoProprioIndex]?.avalista || '').length >= 3) {
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
                            value={avalistaAdicionalSearch[financiamentoProprioIndex] || exitFormData.paymentMethods[financiamentoProprioIndex]?.avalistaAdicional || ''}
                            onChange={(e) => {
                              const searchValue = e.target.value
                              setAvalistaAdicionalSearch((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue }))
                              setShowAvalistaAdicionalDropdown((prev) => ({ ...prev, [financiamentoProprioIndex]: searchValue.length >= 3 }))
                              updatePaymentMethod(financiamentoProprioIndex, 'avalistaAdicional', searchValue)
                            }}
                            onFocus={() => {
                              if ((avalistaAdicionalSearch[financiamentoProprioIndex] || exitFormData.paymentMethods[financiamentoProprioIndex]?.avalistaAdicional || '').length >= 3) {
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

      {/* Modal Inclusão de Cartão de crédito */}
      {showCartaoCreditoModal && cartaoCreditoIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Cartão de crédito</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(cartaoCreditoIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowCartaoCreditoModal(false)
                  setCartaoCreditoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={(getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { date?: string })?.date || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoCreditoIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total a ser parcelado *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoCreditoIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                  <select
                    required
                    value={(getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { quantidadeParcelas?: string })?.quantidadeParcelas || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoCreditoIndex, 'quantidadeParcelas', e.target.value)}
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
                    value={(getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { valorParcela?: string })?.valorParcela || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoCreditoIndex, 'valorParcela', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoCreditoIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Código de autorização</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { codigoAutorizacao?: string })?.codigoAutorizacao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoCreditoIndex, 'codigoAutorizacao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Recebimento da loja *</label>
                  <select
                    required
                    value={(getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { recebimentoLoja?: string })?.recebimentoLoja || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoCreditoIndex, 'recebimentoLoja', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione</option>
                    <option value="parcelado">Parcelado</option>
                    <option value="a_vista">À vista</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(cartaoCreditoIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowCartaoCreditoModal(false)
                  setCartaoCreditoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, cartaoCreditoIndex) as { date?: string; value?: string; quantidadeParcelas?: string; valorParcela?: string; recebimentoLoja?: string }
                  if (!pm?.date || !pm?.value || !pm?.quantidadeParcelas || !pm?.valorParcela || !pm?.recebimentoLoja) {
                    setToast({ message: 'Preencha Data, Valor total, Quantidade de parcelas, Valor da parcela e Recebimento da loja.', type: 'error' })
                    return
                  }
                  setShowCartaoCreditoModal(false)
                  setCartaoCreditoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Dinheiro */}
      {showDinheiroModal && dinheiroIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Dinheiro</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(dinheiroIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowDinheiroModal(false)
                  setDinheiroIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={(getPaymentItem(paymentModalContext, dinheiroIndex) as { date?: string })?.date || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, dinheiroIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, dinheiroIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, dinheiroIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, dinheiroIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, dinheiroIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(dinheiroIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowDinheiroModal(false)
                  setDinheiroIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, dinheiroIndex) as { date?: string; value?: string }
                  if (!pm?.date || !pm?.value) {
                    setToast({ message: 'Preencha Data e Valor total.', type: 'error' })
                    return
                  }
                  setShowDinheiroModal(false)
                  setDinheiroIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Outros (Terrenos, permutas, etc. Não gera contas a receber) */}
      {showOutrosModal && outrosIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Outros (Terrenos, permutas, etc. Não gera contas a receber)</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(outrosIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowOutrosModal(false)
                  setOutrosIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={(getPaymentItem(paymentModalContext, outrosIndex) as { date?: string })?.date || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, outrosIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição *</label>
                  <input
                    type="text"
                    required
                    value={(getPaymentItem(paymentModalContext, outrosIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, outrosIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, outrosIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, outrosIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(outrosIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowOutrosModal(false)
                  setOutrosIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, outrosIndex) as { date?: string; descricao?: string; value?: string }
                  if (!pm?.date || !pm?.descricao || !pm?.value) {
                    setToast({ message: 'Preencha Data, Descrição e Valor total.', type: 'error' })
                    return
                  }
                  setShowOutrosModal(false)
                  setOutrosIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de TED, DOC, PIX, Transferência bancária */}
      {showTedDocPixModal && tedDocPixIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de TED, DOC, PIX, Transferência bancária</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(tedDocPixIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowTedDocPixModal(false)
                  setTedDocPixIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={(getPaymentItem(paymentModalContext, tedDocPixIndex) as { date?: string })?.date || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, tedDocPixIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, tedDocPixIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, tedDocPixIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, tedDocPixIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, tedDocPixIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(tedDocPixIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowTedDocPixModal(false)
                  setTedDocPixIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, tedDocPixIndex) as { date?: string; value?: string }
                  if (!pm?.date || !pm?.value) {
                    setToast({ message: 'Preencha Data e Valor total.', type: 'error' })
                    return
                  }
                  setShowTedDocPixModal(false)
                  setTedDocPixIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Troco na troca */}
      {showTrocoTrocaModal && trocoTrocaIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Troco na troca</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(trocoTrocaIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowTrocoTrocaModal(false)
                  setTrocoTrocaIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={(getPaymentItem(paymentModalContext, trocoTrocaIndex) as { date?: string })?.date || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, trocoTrocaIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição *</label>
                  <input
                    type="text"
                    required
                    value={(getPaymentItem(paymentModalContext, trocoTrocaIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, trocoTrocaIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, trocoTrocaIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, trocoTrocaIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(trocoTrocaIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowTrocoTrocaModal(false)
                  setTrocoTrocaIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, trocoTrocaIndex) as { date?: string; descricao?: string; value?: string }
                  if (!pm?.date || !pm?.descricao || !pm?.value) {
                    setToast({ message: 'Preencha Data, Descrição e Valor total.', type: 'error' })
                    return
                  }
                  setShowTrocoTrocaModal(false)
                  setTrocoTrocaIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Veículo na troca */}
      {showVeiculoTrocaModal && veiculoTrocaIndex !== null && (() => {
        const idx = veiculoTrocaIndex
        const pm = exitFormData.paymentMethods[idx] || {}
        const selectedVehicle = pm.veiculoTrocaId ? vehicles.find((v) => v.id === parseInt(pm.veiculoTrocaId!)) : null
        const list = exitingVehicle ? vehicles.filter((v) => v.id !== exitingVehicle.id) : vehicles
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Inclusão de Veículo na troca</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowVeiculoTrocaModal(false)
                    setVeiculoTrocaIndex(null)
                    setVehicleSearchVeiculoTroca('')
                    setShowVehicleDropdownVeiculoTroca(false)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs text-gray-600 mb-3">Busque um veículo avaliado ou cadastrado, ou cadastre um novo veículo.</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={vehicleSearchVeiculoTroca || (selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.year} ${selectedVehicle.plate || ''}`.trim() : '')}
                        onChange={(e) => {
                          const search = e.target.value
                          setVehicleSearchVeiculoTroca(search)
                          if (search.length >= 2) {
                            const sl = search.toLowerCase()
                            const f = list.filter((v) =>
                              v.brand.toLowerCase().includes(sl) ||
                              v.model.toLowerCase().includes(sl) ||
                              (v.plate && v.plate.toLowerCase().includes(sl)) ||
                              v.year.toString().includes(search)
                            )
                            setFilteredVehiclesVeiculoTroca(f)
                            setShowVehicleDropdownVeiculoTroca(true)
                          } else {
                            setShowVehicleDropdownVeiculoTroca(false)
                          }
                        }}
                        onFocus={() => {
                          if (vehicleSearchVeiculoTroca.length >= 2) setShowVehicleDropdownVeiculoTroca(true)
                        }}
                        placeholder="Buscar veículo (marca, modelo, placa ou ano)"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                      {showVehicleDropdownVeiculoTroca && filteredVehiclesVeiculoTroca.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredVehiclesVeiculoTroca.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                const updated = [...exitFormData.paymentMethods]
                                updated[idx] = { ...updated[idx], veiculoTrocaId: v.id.toString(), value: (v.price ?? v.cost ?? 0).toString(), date: updated[idx].date || exitFormData.exitDate || '' }
                                setExitFormData({ ...exitFormData, paymentMethods: updated })
                                setVehicleSearchVeiculoTroca(`${v.brand} ${v.model} ${v.year} ${v.plate || ''}`.trim())
                                setShowVehicleDropdownVeiculoTroca(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                            >
                              <div className="font-medium text-xs">{v.brand} {v.model} {v.year}</div>
                              {v.plate && <div className="text-xs text-gray-500">Placa: {v.plate}</div>}
                              {(v.price ?? v.cost) != null && <div className="text-xs text-gray-500">R$ {(v.price ?? v.cost)!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingVehicleForVeiculoTrocaIndex(idx)
                        setShowVeiculoTrocaModal(false)
                        setVeiculoTrocaIndex(null)
                        setVehicleSearchVeiculoTroca('')
                        setShowVehicleDropdownVeiculoTroca(false)
                        setShowModal(true)
                        setEditingVehicle(null)
                        resetForm()
                      }}
                      className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                      title="Cadastrar novo veículo"
                    >
                      <FiPlus className="w-3 h-3" />
                      Criar
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVeiculoTrocaModal(false)
                    setVeiculoTrocaIndex(null)
                    setVehicleSearchVeiculoTroca('')
                    setShowVehicleDropdownVeiculoTroca(false)
                  }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Inclusão de Consórcio */}
      {showConsorcioModal && consorcioIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Consórcio</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(consorcioIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowConsorcioModal(false)
                  setConsorcioIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Banco/Financeira *</label>
                  <input
                    type="text"
                    required
                    value={String((getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)?.bancoFinanceira ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, consorcioIndex, 'bancoFinanceira', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={String((getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)?.date ?? '') || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, consorcioIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                  <select
                    required
                    value={String((getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)?.quantidadeParcelas ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, consorcioIndex, 'quantidadeParcelas', e.target.value)}
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
                    value={String((getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)?.valorParcela ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, consorcioIndex, 'valorParcela', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={String((getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)?.descricao ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, consorcioIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor financiado *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={String((getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)?.valorFinanciado ?? (getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)?.value ?? '')}
                    onChange={(e) => {
                      const v = e.target.value
                      if (paymentModalContext === 'transferenciaPago') {
                        const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                        if (arr[consorcioIndex]) {
                          arr[consorcioIndex] = { ...arr[consorcioIndex], valorFinanciado: v, value: v }
                          setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                        }
                      } else {
                        const u = [...exitFormData.paymentMethods]
                        u[consorcioIndex] = { ...u[consorcioIndex], valorFinanciado: v, value: v }
                        setExitFormData({ ...exitFormData, paymentMethods: u })
                      }
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(consorcioIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowConsorcioModal(false)
                  setConsorcioIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = (getPaymentItem(paymentModalContext, consorcioIndex) as Record<string, unknown>)
                  const vf = pm?.valorFinanciado ?? pm?.value
                  if (!pm?.bancoFinanceira || !pm?.date || !pm?.quantidadeParcelas || !pm?.valorParcela || !vf) {
                    setToast({ message: 'Preencha Banco/Financeira, Data, Quantidade de parcelas, Valor da parcela e Valor financiado.', type: 'error' })
                    return
                  }
                  setShowConsorcioModal(false)
                  setConsorcioIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Cheque */}
      {showChequeModal && chequeIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Cheque</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(chequeIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowChequeModal(false)
                  setChequeIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.date ?? '') || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Banco/Financeira *</label>
                  <input
                    type="text"
                    required
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.bancoFinanceira ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'bancoFinanceira', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Agência *</label>
                  <input
                    type="text"
                    required
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.agencia ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'agencia', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Conta *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.conta ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'conta', e.target.value.replace(/\D/g, ''))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="Somente números"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">No. Cheque *</label>
                  <input
                    type="text"
                    required
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.numeroCheque ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'numeroCheque', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Em nome de *</label>
                  <input
                    type="text"
                    required
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.emNomeDe ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'emNomeDe', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.descricao ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={String((getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)?.value ?? '')}
                    onChange={(e) => updatePaymentItem(paymentModalContext, chequeIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(chequeIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowChequeModal(false)
                  setChequeIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = (getPaymentItem(paymentModalContext, chequeIndex) as Record<string, unknown>)
                  if (!pm?.date || !pm?.bancoFinanceira || !pm?.agencia || !pm?.conta || !pm?.numeroCheque || !pm?.emNomeDe || !pm?.value) {
                    setToast({ message: 'Preencha Data, Banco/Financeira, Agência, Conta, No. Cheque, Em nome de e Valor.', type: 'error' })
                    return
                  }
                  setShowChequeModal(false)
                  setChequeIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Financiamento */}
      {showFinanciamentoModal && financiamentoIndex !== null && (() => {
        const idx = financiamentoIndex
        const pm = exitFormData.paymentMethods[idx] || {}
        const qty = parseInt(pm.quantidadeParcelas || '0', 10) || 0
        const firstDate = pm.date || exitFormData.exitDate || ''
        const valorParc = pm.valorParcela || '0'
        const buildParcelas = () => {
          if (!firstDate || !qty) return []
          return Array.from({ length: qty }, (_, i) => {
            const d = new Date(firstDate)
            d.setMonth(d.getMonth() + i)
            return { data: d.toISOString().slice(0, 10), value: valorParc, numeroDocumento: '' }
          })
        }
        const parcelas = (pm.parcelasDetalhe && pm.parcelasDetalhe.length === qty)
          ? pm.parcelasDetalhe
          : buildParcelas()
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Inclusão de Financiamento</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinanciamentoModal(false)
                    setFinanciamentoIndex(null)
                    setShowEditarParcelasFinanciamento(false)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Banco/Financeira *</label>
                    <input
                      type="text"
                      required
                      value={pm.bancoFinanceira || ''}
                      onChange={(e) => updatePaymentMethod(idx, 'bancoFinanceira', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Data primeiro vencimento *</label>
                    <input
                      type="date"
                      required
                      value={firstDate}
                      onChange={(e) => updatePaymentMethod(idx, 'date', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                    <select
                      required
                      value={pm.quantidadeParcelas || ''}
                      onChange={(e) => updatePaymentMethod(idx, 'quantidadeParcelas', e.target.value)}
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
                      value={valorParc}
                      onChange={(e) => updatePaymentMethod(idx, 'valorParcela', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                    <input
                      type="text"
                      value={pm.descricao || ''}
                      onChange={(e) => updatePaymentMethod(idx, 'descricao', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor financiado *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={pm.valorFinanciado ?? pm.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        const updated = [...exitFormData.paymentMethods]
                        updated[idx] = { ...updated[idx], valorFinanciado: v, value: v }
                        setExitFormData({ ...exitFormData, paymentMethods: updated })
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const willOpen = !showEditarParcelasFinanciamento
                        if (willOpen && qty > 0 && (!pm.parcelasDetalhe || pm.parcelasDetalhe.length !== qty)) {
                          const init = buildParcelas()
                          const u = [...exitFormData.paymentMethods]
                          u[idx] = { ...(u[idx] || {}), parcelasDetalhe: init }
                          setExitFormData({ ...exitFormData, paymentMethods: u })
                        }
                        setShowEditarParcelasFinanciamento(willOpen)
                      }}
                      className="text-xs text-primary-600 hover:underline font-medium"
                    >
                      Editar parcelas
                    </button>
                  </div>
                  {showEditarParcelasFinanciamento && qty > 0 && (
                    <div className="border border-gray-200 rounded p-2 space-y-2">
                      <div className="text-xs font-medium text-gray-700">Parcelas</div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {parcelas.map((p, i) => (
                          <div key={i} className="grid grid-cols-4 gap-2 items-end text-xs">
                            <div>
                              <label className="block text-gray-600 mb-0.5">Parcela {i + 1}</label>
                              <input
                                type="date"
                                value={p.data}
                                onChange={(e) => {
                                  const updated = [...exitFormData.paymentMethods]
                                  const pd = [...(updated[idx].parcelasDetalhe || buildParcelas())]
                                  if (pd[i]) pd[i] = { ...pd[i], data: e.target.value }
                                  updated[idx] = { ...updated[idx], parcelasDetalhe: pd }
                                  setExitFormData({ ...exitFormData, paymentMethods: updated })
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-0.5">Valor</label>
                              <input
                                type="number"
                                step="0.01"
                                value={p.value}
                                onChange={(e) => {
                                  const updated = [...exitFormData.paymentMethods]
                                  const pd = [...(updated[idx].parcelasDetalhe || buildParcelas())]
                                  if (pd[i]) pd[i] = { ...pd[i], value: e.target.value }
                                  updated[idx] = { ...updated[idx], parcelasDetalhe: pd }
                                  setExitFormData({ ...exitFormData, paymentMethods: updated })
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-gray-600 mb-0.5">Nº documento</label>
                              <input
                                type="text"
                                value={p.numeroDocumento || ''}
                                onChange={(e) => {
                                  const updated = [...exitFormData.paymentMethods]
                                  const pd = [...(updated[idx].parcelasDetalhe || buildParcelas())]
                                  if (pd[i]) pd[i] = { ...pd[i], numeroDocumento: e.target.value }
                                  updated[idx] = { ...updated[idx], parcelasDetalhe: pd }
                                  setExitFormData({ ...exitFormData, paymentMethods: updated })
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de retorno</label>
                    <select
                      value={pm.tipoRetorno ?? ''}
                      onChange={(e) => updatePaymentMethod(idx, 'tipoRetorno', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Selecione</option>
                      {Array.from({ length: 21 }, (_, i) => (
                        <option key={i} value={i.toString()}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Retorno</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pm.retorno ?? ''}
                        onChange={(e) => updatePaymentMethod(idx, 'retorno', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tac</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pm.tac ?? ''}
                        onChange={(e) => updatePaymentMethod(idx, 'tac', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Plus</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pm.plus ?? ''}
                        onChange={(e) => updatePaymentMethod(idx, 'plus', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">TIF</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pm.tif ?? ''}
                        onChange={(e) => updatePaymentMethod(idx, 'tif', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Taxa de intermediação de financiamento</label>
                    <input
                      type="number"
                      step="0.01"
                      value={pm.taxaIntermediacaoFinanciamento ?? ''}
                      onChange={(e) => updatePaymentMethod(idx, 'taxaIntermediacaoFinanciamento', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinanciamentoModal(false)
                    setFinanciamentoIndex(null)
                    setShowEditarParcelasFinanciamento(false)
                  }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const px = exitFormData.paymentMethods[idx]
                    const vf = px?.valorFinanciado ?? px?.value
                    if (!px?.bancoFinanceira || !px?.date || !px?.quantidadeParcelas || !px?.valorParcela || !vf) {
                      setToast({ message: 'Preencha Banco/Financeira, Data primeiro vencimento, Quantidade de parcelas, Valor da parcela e Valor financiado.', type: 'error' })
                      return
                    }
                    setShowFinanciamentoModal(false)
                    setFinanciamentoIndex(null)
                    setShowEditarParcelasFinanciamento(false)
                  }}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Inclusão de Boleto */}
      {showBoletoModal && boletoIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Boleto</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(boletoIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowBoletoModal(false)
                  setBoletoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={(getPaymentItem(paymentModalContext, boletoIndex) as { date?: string })?.date || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, boletoIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, boletoIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, boletoIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Código de autorização</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, boletoIndex) as { codigoAutorizacao?: string })?.codigoAutorizacao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, boletoIndex, 'codigoAutorizacao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, boletoIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, boletoIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(boletoIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowBoletoModal(false)
                  setBoletoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, boletoIndex) as { date?: string; value?: string }
                  if (!pm?.date || !pm?.value) {
                    setToast({ message: 'Preencha Data e Valor total.', type: 'error' })
                    return
                  }
                  setShowBoletoModal(false)
                  setBoletoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Cartão de débito */}
      {showCartaoDebitoModal && cartaoDebitoIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Cartão de débito</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(cartaoDebitoIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowCartaoDebitoModal(false)
                  setCartaoDebitoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                  <input
                    type="date"
                    required
                    value={(getPaymentItem(paymentModalContext, cartaoDebitoIndex) as { date?: string })?.date || exitFormData.exitDate || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoDebitoIndex, 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, cartaoDebitoIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoDebitoIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Código de autorização</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, cartaoDebitoIndex) as { codigoAutorizacao?: string })?.codigoAutorizacao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoDebitoIndex, 'codigoAutorizacao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, cartaoDebitoIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaoDebitoIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(cartaoDebitoIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowCartaoDebitoModal(false)
                  setCartaoDebitoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, cartaoDebitoIndex) as { date?: string; value?: string }
                  if (!pm?.date || !pm?.value) {
                    setToast({ message: 'Preencha Data e Valor total.', type: 'error' })
                    return
                  }
                  setShowCartaoDebitoModal(false)
                  setCartaoDebitoIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inclusão de Carta de crédito de consórcio */}
      {showCartaConsorcioModal && cartaConsorcioIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Inclusão de Carta de crédito de consórcio</h2>
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(cartaConsorcioIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowCartaConsorcioModal(false)
                  setCartaConsorcioIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome do Consórcio *</label>
                  <input
                    type="text"
                    required
                    value={(getPaymentItem(paymentModalContext, cartaConsorcioIndex) as { nomeConsorcio?: string })?.nomeConsorcio || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaConsorcioIndex, 'nomeConsorcio', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                  <input
                    type="text"
                    value={(getPaymentItem(paymentModalContext, cartaConsorcioIndex) as { descricao?: string })?.descricao || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaConsorcioIndex, 'descricao', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={(getPaymentItem(paymentModalContext, cartaConsorcioIndex) as { value?: string })?.value || ''}
                    onChange={(e) => updatePaymentItem(paymentModalContext, cartaConsorcioIndex, 'value', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (paymentModalContext === 'transferenciaPago' && transferenciaPagoModalIsNew) {
                    const arr = [...(exitFormData.transferenciaPagoFormasPagamento || [])]
                    arr.splice(cartaConsorcioIndex, 1)
                    setExitFormData({ ...exitFormData, transferenciaPagoFormasPagamento: arr })
                  }
                  setShowCartaConsorcioModal(false)
                  setCartaConsorcioIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const pm = getPaymentItem(paymentModalContext, cartaConsorcioIndex) as { nomeConsorcio?: string; value?: string }
                  if (!pm?.nomeConsorcio || !pm?.value) {
                    setToast({ message: 'Preencha Nome do Consórcio e Valor total.', type: 'error' })
                    return
                  }
                  setShowCartaConsorcioModal(false)
                  setCartaConsorcioIndex(null)
                  setTransferenciaPagoModalIsNew(false)
                }}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
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
              <h2 className="text-lg font-bold">Criar Novo Cliente</h2>
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
                      setCreatingAvalistaForPaymentIndex(null)
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal Alterar Entrada de Estoque */}
      {showAlterarEntradaModal && vehicleToAlterEntrada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {isNovaEntrada ? 'Entrada de Estoque' : `Alterar entrada de estoque #${vehicleToAlterEntrada.id}`}
                </h2>
                <button
                  onClick={() => {
                    setShowAlterarEntradaModal(false)
                    setVehicleToAlterEntrada(null)
                    setPendencias([])
                    setParcelasQuitacao([])
                    setDebitos([])
                    setIsNovaEntrada(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSalvarEntrada} className="space-y-4">
                {/* Dados de Entrada */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Dados de Entrada</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de entrada *</label>
                      <input
                        type="date"
                        required
                        value={entradaFormData.dataEntrada}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, dataEntrada: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Empresa *</label>
                      <input
                        type="text"
                        required
                        value={entradaFormData.empresa}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, empresa: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo *</label>
                      <select
                        required
                        value={entradaFormData.tipoEntrada}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, tipoEntrada: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="proprio">Próprio</option>
                        <option value="consignado">Consignado</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo</label>
                      <div className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900">
                        {vehicleToAlterEntrada.brand} {vehicleToAlterEntrada.model} {vehicleToAlterEntrada.year} {vehicleToAlterEntrada.plate ? `- ${vehicleToAlterEntrada.plate}` : ''}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Canal da Entrada *</label>
                      <select
                        required
                        value={entradaFormData.canalEntrada}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, canalEntrada: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="REPASSE">REPASSE</option>
                        <option value="COMPRA_DIRETA">COMPRA DIRETA</option>
                        <option value="LEILAO">LEILÃO</option>
                        <option value="CONSIGNADOS">CONSIGNADOS</option>
                        <option value="CONSESSIONARIA">CONSESSIONÁRIA</option>
                        <option value="LOJA">LOJA</option>
                        <option value="INDICACAO">INDICAÇÃO</option>
                        <option value="CLIENTE">CLIENTE</option>
                        <option value="OUTROS">OUTROS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Fornecedor *</label>
                      <div className="flex gap-2 fornecedor-search-container">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            required
                            value={fornecedorSearch}
                            onChange={(e) => {
                              setFornecedorSearch(e.target.value)
                              setEntradaFormData({ ...entradaFormData, fornecedor: e.target.value })
                              setShowFornecedorDropdown(true)
                            }}
                            onFocus={() => {
                              if (fornecedorSearch) {
                                setShowFornecedorDropdown(true)
                              }
                            }}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Buscar cliente..."
                          />
                          {showFornecedorDropdown && fornecedorSearch && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                              {customers
                                .filter(c => 
                                  c.name.toLowerCase().includes(fornecedorSearch.toLowerCase()) ||
                                  c.phone?.includes(fornecedorSearch)
                                )
                                .slice(0, 10)
                                .map(customer => (
                                  <div
                                    key={customer.id}
                                    onClick={() => {
                                      setFornecedorSearch(customer.name)
                                      setSelectedFornecedorId(customer.id)
                                      setEntradaFormData({ ...entradaFormData, fornecedor: customer.name })
                                      setShowFornecedorDropdown(false)
                                    }}
                                    className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{customer.name}</div>
                                    {customer.phone && (
                                      <div className="text-gray-500 text-xs">{customer.phone}</div>
                                    )}
                                  </div>
                                ))}
                              {customers.filter(c => 
                                c.name.toLowerCase().includes(fornecedorSearch.toLowerCase()) ||
                                c.phone?.includes(fornecedorSearch)
                              ).length === 0 && (
                                <div className="px-3 py-2 text-xs text-gray-500">Nenhum cliente encontrado</div>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateCustomerModal(true)
                            setCreatingCustomer(true)
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
                          className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 whitespace-nowrap"
                          title="Criar novo cliente"
                        >
                          + Novo
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Doc. em nome de *</label>
                      <input
                        type="text"
                        required
                        value={entradaFormData.docEmNomeDe}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, docEmNomeDe: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Intermediário</label>
                      <input
                        type="text"
                        value={entradaFormData.intermediario}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, intermediario: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Valores */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Valores</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor de entrada *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={entradaFormData.valorEntrada}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, valorEntrada: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da quitação *</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={entradaFormData.valorQuitacao}
                          onChange={(e) => setEntradaFormData({ ...entradaFormData, valorQuitacao: e.target.value })}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="0,00"
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQuitacaoFormData({
                              valorQuitacao: '',
                              qtdParcelas: '',
                              valorParcela: '',
                              primeiroVcto: '',
                              observacoesInternas: '',
                            })
                            setEditingQuitacaoIndex(null)
                            setShowQuitacaoModal(true)
                          }}
                          className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center"
                          title="Adicionar quitação parcelada"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                      {parcelasQuitacao.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {parcelasQuitacao.map((parcela, index) => (
                            <div key={parcela.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded flex justify-between items-center">
                              <span>
                                {parcela.qtdParcelas}x de R$ {parseFloat(parcela.valorParcela || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                                {parcela.primeiroVcto && ` - 1º vcto: ${new Date(parcela.primeiroVcto).toLocaleDateString('pt-BR')}`}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuitacaoFormData(parcela)
                                    setEditingQuitacaoIndex(index)
                                    setShowQuitacaoModal(true)
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Editar"
                                >
                                  <FiEdit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = parcelasQuitacao.filter((_, i) => i !== index)
                                    setParcelasQuitacao(updated)
                                    const total = updated.reduce((sum, p) => sum + (parseFloat(p.valorQuitacao) || 0), 0)
                                    setEntradaFormData({ ...entradaFormData, valorQuitacao: total.toFixed(2) })
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  title="Remover"
                                >
                                  <FiX className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor de débitos *</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={entradaFormData.valorDebitos}
                          onChange={(e) => setEntradaFormData({ ...entradaFormData, valorDebitos: e.target.value })}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="0,00"
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDebitosNoModal([{ data: '', descricao: '', valor: '' }])
                            setEditingDebitoIndex(null)
                            setShowDebitosModal(true)
                          }}
                          className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center"
                          title="Adicionar débito"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                      {debitos.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs font-medium text-gray-700 mb-1">Débitos:</div>
                          {debitos.map((debito, index) => (
                            <div key={debito.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded flex justify-between items-center">
                              <span>
                                {debito.data ? new Date(debito.data).toLocaleDateString('pt-BR') : 'N/A'} - {debito.descricao} - R$ {parseFloat(debito.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Carregar todos os débitos a partir do índice selecionado para edição em lote
                                    const debitosParaEditar = debitos.slice(index)
                                    setDebitosNoModal(debitosParaEditar.length > 0 ? debitosParaEditar.map(d => ({ data: d.data || '', descricao: d.descricao || '', valor: d.valor || '' })) : [{ data: '', descricao: '', valor: '' }])
                                    setEditingDebitoIndex(index)
                                    setShowDebitosModal(true)
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Editar"
                                >
                                  <FiEdit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = debitos.filter((_, i) => i !== index)
                                    setDebitos(updated)
                                    const total = updated.reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0)
                                    setEntradaFormData({ ...entradaFormData, valorDebitos: total.toFixed(2) })
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                  title="Remover"
                                >
                                  <FiX className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor líquido</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entradaFormData.valorLiquido}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, valorLiquido: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-gray-50"
                        placeholder="0,00"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-0.5">Calculado automaticamente</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor para venda</label>
                      <div className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900">
                        {vehicleToAlterEntrada.price ? `R$ ${vehicleToAlterEntrada.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Preço promocional</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entradaFormData.precoPromocional}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, precoPromocional: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor mínimo de venda</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entradaFormData.valorMinimoVenda}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, valorMinimoVenda: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                {/* Documentação */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Documentação</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Ano CRLV</label>
                      <input
                        type="number"
                        value={entradaFormData.anoCRLV}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, anoCRLV: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="2026"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor IPVA</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entradaFormData.valorIPVA}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, valorIPVA: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Situação do recibo</label>
                      <select
                        value={entradaFormData.situacaoRecibo}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, situacaoRecibo: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Pago">Pago</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Isento">Isento</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Vencimento IPVA</label>
                      <input
                        type="date"
                        value={entradaFormData.vencimentoIPVA}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, vencimentoIPVA: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor Licenc. + Seg</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entradaFormData.valorLicencSeg}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, valorLicencSeg: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Vencimento Garantia Fábrica</label>
                      <input
                        type="date"
                        value={entradaFormData.vencimentoGarantiaFabrica}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, vencimentoGarantiaFabrica: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Documento CRV</label>
                      <input
                        type="text"
                        value={entradaFormData.documentoCRV}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, documentoCRV: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Organização */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Organização</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Informação 1</label>
                      <input
                        type="text"
                        value={entradaFormData.informacao1}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, informacao1: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador 1</label>
                      <select
                        value={entradaFormData.marcador1}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, marcador1: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Destaque">Destaque</option>
                        <option value="Promoção">Promoção</option>
                        <option value="Novo">Novo</option>
                        <option value="Usado">Usado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Informação 2</label>
                      <input
                        type="text"
                        value={entradaFormData.informacao2}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, informacao2: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador 2</label>
                      <select
                        value={entradaFormData.marcador2}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, marcador2: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Destaque">Destaque</option>
                        <option value="Promoção">Promoção</option>
                        <option value="Novo">Novo</option>
                        <option value="Usado">Usado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Vendedor/Angariador</label>
                      <select
                        value={entradaFormData.vendedorAngariador}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, vendedorAngariador: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        {sellers.map(seller => (
                          <option key={seller.id} value={seller.name}>{seller.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Outras informações */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Outras informações</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Observação de entrada</label>
                      <textarea
                        value={entradaFormData.observacaoEntrada}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, observacaoEntrada: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        rows={3}
                        placeholder="Observações sobre a entrada do veículo..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações Internas</label>
                      <textarea
                        value={entradaFormData.observacoesInternas}
                        onChange={(e) => setEntradaFormData({ ...entradaFormData, observacoesInternas: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        rows={3}
                        placeholder="Observações internas..."
                      />
                    </div>
                  </div>
                </div>

                {/* Pendências */}
                <div className="border border-gray-300 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-gray-900">Pendências</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = pendencias.length > 0 ? Math.max(...pendencias.map(p => p.id)) + 1 : 1
                        setPendencias([...pendencias, { id: newId, descricao: '' }])
                      }}
                      className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1"
                    >
                      <FiPlus className="w-3 h-3" />
                      Adicionar item
                    </button>
                  </div>
                  {pendencias.length === 0 ? (
                    <p className="text-xs text-gray-500">Nenhuma pendência adicionada</p>
                  ) : (
                    <div className="space-y-2">
                      {pendencias.map((pendencia, index) => (
                        <div key={pendencia.id} className="flex gap-2 items-start">
                          <input
                            type="text"
                            value={pendencia.descricao}
                            onChange={(e) => {
                              const updated = [...pendencias]
                              updated[index] = { ...updated[index], descricao: e.target.value }
                              setPendencias(updated)
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Descreva a pendência..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPendencias(pendencias.filter((_, i) => i !== index))
                            }}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remover"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAlterarEntradaModal(false)
                      setVehicleToAlterEntrada(null)
                      setPendencias([])
                      setParcelasQuitacao([])
                      setDebitos([])
                      setIsNovaEntrada(false)
                      setEntradaFormData({ ...entradaFormData, valorQuitacao: '', valorDebitos: '' })
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Quitação */}
      {showQuitacaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingQuitacaoIndex !== null ? 'Editar Quitação' : 'Adicionar Quitação'}
                </h2>
                <button
                  onClick={() => {
                    setShowQuitacaoModal(false)
                    setQuitacaoFormData({
                      valorQuitacao: '',
                      qtdParcelas: '',
                      valorParcela: '',
                      primeiroVcto: '',
                      observacoesInternas: '',
                    })
                    setEditingQuitacaoIndex(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const valorQuitacao = parseFloat(quitacaoFormData.valorQuitacao) || 0
                  
                  if (editingQuitacaoIndex !== null) {
                    // Editar parcela existente
                    const updated = [...parcelasQuitacao]
                    updated[editingQuitacaoIndex] = {
                      ...quitacaoFormData,
                      id: parcelasQuitacao[editingQuitacaoIndex].id,
                    }
                    setParcelasQuitacao(updated)
                  } else {
                    // Adicionar nova parcela
                    const newId = parcelasQuitacao.length > 0 ? Math.max(...parcelasQuitacao.map(p => p.id)) + 1 : 1
                    setParcelasQuitacao([...parcelasQuitacao, { ...quitacaoFormData, id: newId }])
                  }
                  
                  // Calcular total de quitação
                  const allParcelas = editingQuitacaoIndex !== null 
                    ? parcelasQuitacao.map((p, i) => i === editingQuitacaoIndex ? quitacaoFormData : p)
                    : [...parcelasQuitacao, quitacaoFormData]
                  const total = allParcelas.reduce((sum, p) => sum + (parseFloat(p.valorQuitacao) || 0), 0)
                  setEntradaFormData({ ...entradaFormData, valorQuitacao: total.toFixed(2) })
                  
                  setShowQuitacaoModal(false)
                  setQuitacaoFormData({
                    valorQuitacao: '',
                    qtdParcelas: '',
                    valorParcela: '',
                    primeiroVcto: '',
                    observacoesInternas: '',
                  })
                  setEditingQuitacaoIndex(null)
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da quitação *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quitacaoFormData.valorQuitacao}
                    onChange={(e) => {
                      const valor = e.target.value
                      const qtdParcelas = parseFloat(quitacaoFormData.qtdParcelas) || 1
                      const valorParcela = qtdParcelas > 0 ? (parseFloat(valor) / qtdParcelas).toFixed(2) : ''
                      setQuitacaoFormData({
                        ...quitacaoFormData,
                        valorQuitacao: valor,
                        valorParcela,
                      })
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Qtd. Parcelas *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quitacaoFormData.qtdParcelas}
                    onChange={(e) => {
                      const qtd = e.target.value
                      const valorQuitacao = parseFloat(quitacaoFormData.valorQuitacao) || 0
                      const valorParcela = parseFloat(qtd) > 0 ? (valorQuitacao / parseFloat(qtd)).toFixed(2) : ''
                      setQuitacaoFormData({
                        ...quitacaoFormData,
                        qtdParcelas: qtd,
                        valorParcela,
                      })
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da Parcela *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quitacaoFormData.valorParcela}
                    onChange={(e) => {
                      const valorParcela = e.target.value
                      const qtdParcelas = parseFloat(quitacaoFormData.qtdParcelas) || 1
                      const valorQuitacao = (parseFloat(valorParcela) * qtdParcelas).toFixed(2)
                      setQuitacaoFormData({
                        ...quitacaoFormData,
                        valorParcela,
                        valorQuitacao,
                      })
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-gray-50"
                    placeholder="0,00"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Calculado automaticamente</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Primeiro vcto. *</label>
                  <input
                    type="date"
                    required
                    value={quitacaoFormData.primeiroVcto}
                    onChange={(e) => setQuitacaoFormData({ ...quitacaoFormData, primeiroVcto: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações internas</label>
                  <textarea
                    value={quitacaoFormData.observacoesInternas}
                    onChange={(e) => setQuitacaoFormData({ ...quitacaoFormData, observacoesInternas: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    rows={3}
                    placeholder="Observações internas..."
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Informação apenas para consulta, não sairá nos contratos.</p>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuitacaoModal(false)
                      setQuitacaoFormData({
                        valorQuitacao: '',
                        qtdParcelas: '',
                        valorParcela: '',
                        primeiroVcto: '',
                        observacoesInternas: '',
                      })
                      setEditingQuitacaoIndex(null)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                  >
                    {editingQuitacaoIndex !== null ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Débitos */}
      {showDebitosModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingDebitoIndex !== null ? 'Editar Débitos' : 'Adicionar Débitos'}
                </h2>
                <button
                  onClick={() => {
                    setShowDebitosModal(false)
                    setDebitosNoModal([{ data: '', descricao: '', valor: '' }])
                    setEditingDebitoIndex(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  
                  // Validar que pelo menos um débito tenha todos os campos preenchidos
                  const debitosValidos = debitosNoModal.filter(d => d.data && d.descricao && d.valor && parseFloat(d.valor) > 0)
                  
                  if (debitosValidos.length === 0) {
                    setToast({ message: 'Adicione pelo menos um débito válido com todos os campos preenchidos', type: 'error' })
                    return
                  }
                  
                  let updatedDebitos: Array<{ id: number; data: string; descricao: string; valor: string }>
                  
                  if (editingDebitoIndex !== null) {
                    // Editar débitos existentes - substituir a partir do índice
                    const debitosAntes = debitos.slice(0, editingDebitoIndex)
                    const debitosDepois = debitos.slice(editingDebitoIndex + debitosNoModal.length)
                    const novosDebitos = debitosValidos.map((debito, idx) => {
                      const idExistente = debitos[editingDebitoIndex + idx]?.id
                      return {
                        ...debito,
                        id: idExistente || (debitos.length > 0 ? Math.max(...debitos.map(d => d.id)) + idx + 1 : idx + 1),
                      }
                    })
                    updatedDebitos = [...debitosAntes, ...novosDebitos, ...debitosDepois]
                  } else {
                    // Adicionar novos débitos
                    const newId = debitos.length > 0 ? Math.max(...debitos.map(d => d.id)) + 1 : 1
                    const novosDebitos = debitosValidos.map((debito, idx) => ({
                      ...debito,
                      id: newId + idx,
                    }))
                    updatedDebitos = [...debitos, ...novosDebitos]
                  }
                  
                  setDebitos(updatedDebitos)
                  
                  // Calcular total de débitos
                  const total = updatedDebitos.reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0)
                  setEntradaFormData({ ...entradaFormData, valorDebitos: total.toFixed(2) })
                  
                  setShowDebitosModal(false)
                  setDebitosNoModal([{ data: '', descricao: '', valor: '' }])
                  setEditingDebitoIndex(null)
                }}
                className="space-y-4"
              >
                <div className="space-y-4">
                  {debitosNoModal.map((debito, index) => (
                    <div key={index} className="border border-gray-300 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700">Débito {index + 1}</h3>
                        {debitosNoModal.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDebitosNoModal(debitosNoModal.filter((_, i) => i !== index))
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Remover"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Data *</label>
                        <input
                          type="date"
                          required
                          value={debito.data}
                          onChange={(e) => {
                            const updated = [...debitosNoModal]
                            updated[index] = { ...updated[index], data: e.target.value }
                            setDebitosNoModal(updated)
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição *</label>
                        <input
                          type="text"
                          required
                          value={debito.descricao}
                          onChange={(e) => {
                            const updated = [...debitosNoModal]
                            updated[index] = { ...updated[index], descricao: e.target.value }
                            setDebitosNoModal(updated)
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Descrição do débito..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={debito.valor}
                          onChange={(e) => {
                            const updated = [...debitosNoModal]
                            updated[index] = { ...updated[index], valor: e.target.value }
                            setDebitosNoModal(updated)
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setDebitosNoModal([...debitosNoModal, { data: '', descricao: '', valor: '' }])
                    }}
                    className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    Adicionar Débito
                  </button>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-300">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDebitosModal(false)
                      setDebitosNoModal([{ data: '', descricao: '', valor: '' }])
                      setEditingDebitoIndex(null)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                  >
                    {editingDebitoIndex !== null ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento */}
      {showShareModal && vehicleToShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Compartilhar Veículo</h2>
                <button
                  onClick={() => {
                    setShowShareModal(false)
                    setVehicleToShare(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">{vehicleToShare.brand} {vehicleToShare.model} {vehicleToShare.year}</span>
                </p>
                <p className="text-xs text-gray-500">Escolha como deseja compartilhar:</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={shareViaWhatsApp}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-3 transition-colors"
                >
                  <FiMessageCircle className="w-5 h-5" />
                  <span>Compartilhar no WhatsApp</span>
                </button>

                <button
                  onClick={shareViaEmail}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-3 transition-colors"
                >
                  <FiMail className="w-5 h-5" />
                  <span>Enviar por Email</span>
                </button>

                <button
                  onClick={copyToClipboard}
                  className="w-full px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center gap-3 transition-colors"
                >
                  <FiCopy className="w-5 h-5" />
                  <span>Copiar para Área de Transferência</span>
                </button>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowShareModal(false)
                    setVehicleToShare(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Cadastral */}
      {showFichaCadastralModal && vehicleForFicha && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Incluir Ficha Cadastral</h2>
                <button
                  onClick={() => {
                    setShowFichaCadastralModal(false)
                    setVehicleForFicha(null)
                    setFichaCadastralActiveStep(1)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              {/* Steps */}
              <div className="flex gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7].map(step => (
                  <div
                    key={step}
                    className={`flex-1 h-1 rounded ${
                      fichaCadastralActiveStep >= step ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={handleSalvarFichaCadastral} className="flex-1 overflow-y-auto p-6">
              {/* Etapa 1: Veículo Financiado */}
              {fichaCadastralActiveStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Veículo Financiado</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Marca</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.marca}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, marca: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Modelo</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.modelo}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, modelo: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Ano fabr/mod.</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={fichaCadastralFormData.anoFabricacao}
                          onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, anoFabricacao: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Fabricação"
                        />
                        <span className="self-center text-xs text-gray-500">/</span>
                        <input
                          type="number"
                          value={fichaCadastralFormData.anoModelo}
                          onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, anoModelo: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Modelo"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Placa</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.placa}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, placa: formatPlate(e.target.value.toUpperCase()) })}
                        maxLength={8}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Chassi</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.chassi}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, chassi: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Renavam</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.renavam}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, renavam: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Cor</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cor}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cor: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fichaCadastralFormData.valor}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, valor: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor de Entrada</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fichaCadastralFormData.valorEntrada}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, valorEntrada: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor Financiado</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fichaCadastralFormData.valorFinanciado}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, valorFinanciado: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Parcelas</label>
                      <input
                        type="number"
                        value={fichaCadastralFormData.parcelas}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, parcelas: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da parcela</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fichaCadastralFormData.valorParcela}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, valorParcela: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 2: Dados do Cliente */}
              {fichaCadastralActiveStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Dados do Cliente</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo Pessoa *</label>
                      <select
                        required
                        value={fichaCadastralFormData.tipoPessoa}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, tipoPessoa: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="Física">Física</option>
                        <option value="Jurídica">Jurídica</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome Completo / Razão Social *</label>
                      <input
                        type="text"
                        required
                        value={fichaCadastralFormData.nomeCompleto}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, nomeCompleto: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">CPF / CNPJ</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cpfCnpj}
                        onChange={(e) => {
                          const value = removeMask(e.target.value)
                          const formatted = fichaCadastralFormData.tipoPessoa === 'Jurídica' 
                            ? formatCNPJ(value) 
                            : formatCPF(value)
                          setFichaCadastralFormData({ ...fichaCadastralFormData, cpfCnpj: formatted })
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        maxLength={fichaCadastralFormData.tipoPessoa === 'Jurídica' ? 18 : 14}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">CNH</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cnh}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cnh: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        maxLength={11}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo CNH</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.tipoCNH}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, tipoCNH: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Ex: A / B / C / D / AB ..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de emissão CNH</label>
                      <input
                        type="date"
                        value={fichaCadastralFormData.dataEmissaoCNH}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, dataEmissaoCNH: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">RG / Inscrição Estadual</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.rg}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, rg: formatRG(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Orgão Emissor</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.orgaoEmissor}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, orgaoEmissor: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">UF</label>
                      <select
                        value={fichaCadastralFormData.uf}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, uf: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Emissão</label>
                      <input
                        type="date"
                        value={fichaCadastralFormData.dataEmissaoRG}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, dataEmissaoRG: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Nascimento</label>
                      <input
                        type="date"
                        value={fichaCadastralFormData.dataNascimento}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, dataNascimento: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Naturalidade</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.naturalidade}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, naturalidade: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Sexo</label>
                      <select
                        value={fichaCadastralFormData.sexo}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, sexo: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome do Pai</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.nomePai}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, nomePai: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome da Mãe</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.nomeMae}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, nomeMae: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Estado Civil</label>
                      <select
                        value={fichaCadastralFormData.estadoCivil}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, estadoCivil: e.target.value })}
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
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Endereço para Correspondência</label>
                      <select
                        value={fichaCadastralFormData.enderecoCorrespondencia}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, enderecoCorrespondencia: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Residencial">Residencial</option>
                        <option value="Comercial">Comercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Grau de Instrução</label>
                      <select
                        value={fichaCadastralFormData.grauInstrucao}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, grauInstrucao: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Analfabeto">Analfabeto</option>
                        <option value="Fundamental Incompleto">Fundamental Incompleto</option>
                        <option value="Fundamental Completo">Fundamental Completo</option>
                        <option value="Médio Incompleto">Médio Incompleto</option>
                        <option value="Médio Completo">Médio Completo</option>
                        <option value="Superior Incompleto">Superior Incompleto</option>
                        <option value="Superior">Superior</option>
                        <option value="Pós-graduação">Pós-graduação</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Dependentes</label>
                      <input
                        type="number"
                        value={fichaCadastralFormData.dependentes}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, dependentes: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 3: Dados Residenciais */}
              {fichaCadastralActiveStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Dados Residenciais</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">CEP</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cep}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cep: formatCEP(e.target.value) })}
                        maxLength={9}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Endereço</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.endereco}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, endereco: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Número</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.numero}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, numero: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Complemento</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.complemento}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, complemento: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Bairro</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.bairro}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, bairro: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Estado</label>
                      <select
                        value={fichaCadastralFormData.estado}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, estado: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="AC">Acre</option>
                        <option value="AL">Alagoas</option>
                        <option value="AP">Amapá</option>
                        <option value="AM">Amazonas</option>
                        <option value="BA">Bahia</option>
                        <option value="CE">Ceará</option>
                        <option value="DF">Distrito Federal</option>
                        <option value="ES">Espírito Santo</option>
                        <option value="GO">Goiás</option>
                        <option value="MA">Maranhão</option>
                        <option value="MT">Mato Grosso</option>
                        <option value="MS">Mato Grosso do Sul</option>
                        <option value="MG">Minas Gerais</option>
                        <option value="PA">Pará</option>
                        <option value="PB">Paraíba</option>
                        <option value="PR">Paraná</option>
                        <option value="PE">Pernambuco</option>
                        <option value="PI">Piauí</option>
                        <option value="RJ">Rio de Janeiro</option>
                        <option value="RN">Rio Grande do Norte</option>
                        <option value="RS">Rio Grande do Sul</option>
                        <option value="RO">Rondônia</option>
                        <option value="RR">Roraima</option>
                        <option value="SC">Santa Catarina</option>
                        <option value="SP">São Paulo</option>
                        <option value="SE">Sergipe</option>
                        <option value="TO">Tocantins</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Cidade</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cidade}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cidade: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tempo de Residência</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.tempoResidencia}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, tempoResidencia: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Ex: 5 anos"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de Residência</label>
                      <select
                        value={fichaCadastralFormData.tipoResidencia}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, tipoResidencia: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Própria">Própria</option>
                        <option value="Alugada">Alugada</option>
                        <option value="Cedida">Cedida</option>
                        <option value="Financiada">Financiada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone Residencial</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.telefoneResidencial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, telefoneResidencial: formatPhone(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Falar com</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.falarCom}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, falarCom: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo do Telefone</label>
                      <select
                        value={fichaCadastralFormData.tipoTelefone}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, tipoTelefone: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="Próprio">Próprio</option>
                        <option value="Parente">Parente</option>
                        <option value="Amigo">Amigo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone Celular</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.telefoneCelular}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, telefoneCelular: formatPhone(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Email</label>
                      <input
                        type="email"
                        value={fichaCadastralFormData.email}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, email: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 4: Dados Profissionais */}
              {fichaCadastralActiveStep === 4 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Dados Profissionais</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Empresa</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.empresa}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, empresa: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">CNPJ (Empresa Própria)</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cnpjEmpresa}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cnpjEmpresa: formatCNPJ(removeMask(e.target.value)) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        maxLength={18}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Renda Mensal / Faturamento</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fichaCadastralFormData.rendaMensal}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, rendaMensal: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Renda Extra</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fichaCadastralFormData.rendaExtra}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, rendaExtra: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Renda Extra (origem)</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.rendaExtraOrigem}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, rendaExtraOrigem: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Cargo/Função</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cargoFuncao}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cargoFuncao: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">CEP</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cepComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cepComercial: formatCEP(e.target.value) })}
                        maxLength={9}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Endereço Comercial</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.enderecoComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, enderecoComercial: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Nome da rua, logradouro"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Número</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.numeroComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, numeroComercial: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Complemento</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.complementoComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, complementoComercial: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Bairro</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.bairroComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, bairroComercial: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">UF</label>
                      <select
                        value={fichaCadastralFormData.ufComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, ufComercial: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Cidade</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cidadeComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cidadeComercial: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.telefoneComercial}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, telefoneComercial: formatPhone(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Tempo de Empresa</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.tempoEmpresa}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, tempoEmpresa: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Ex: 3 anos"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Admissão</label>
                      <input
                        type="date"
                        value={fichaCadastralFormData.dataAdmissao}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, dataAdmissao: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Empresa Anterior</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.empresaAnterior}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, empresaAnterior: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone da Empresa Anterior</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.telefoneEmpresaAnterior}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, telefoneEmpresaAnterior: formatPhone(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 5: Dados Cônjuge */}
              {fichaCadastralActiveStep === 5 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Dados Cônjuge</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome Completo</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.nomeConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, nomeConjuge: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Celular</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.celularConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, celularConjuge: formatPhone(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">CPF</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.cpfConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, cpfConjuge: formatCPF(removeMask(e.target.value)) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">RG</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.rgConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, rgConjuge: formatRG(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Nascimento</label>
                      <input
                        type="date"
                        value={fichaCadastralFormData.dataNascimentoConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, dataNascimentoConjuge: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Empresa Onde Trabalha</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.empresaConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, empresaConjuge: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.telefoneConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, telefoneConjuge: formatPhone(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="(00) 0000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Ocupação</label>
                      <input
                        type="text"
                        value={fichaCadastralFormData.ocupacaoConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, ocupacaoConjuge: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Renda</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fichaCadastralFormData.rendaConjuge}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, rendaConjuge: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Etapa 6: Referências */}
              {fichaCadastralActiveStep === 6 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Referências</h3>
                  
                  {/* Referências Pessoais */}
                  <div className="border border-gray-300 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-gray-900">Referências Pessoais</h4>
                    {fichaCadastralFormData.referenciasPessoais.map((ref, index) => (
                      <div key={index} className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-700">Referência {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newRefs = [...fichaCadastralFormData.referenciasPessoais]
                              newRefs.splice(index, 1)
                              setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasPessoais: newRefs })
                            }}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome Completo</label>
                            <input
                              type="text"
                              value={ref.nome}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasPessoais]
                                newRefs[index].nome = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasPessoais: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Endereço</label>
                            <input
                              type="text"
                              value={ref.endereco}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasPessoais]
                                newRefs[index].endereco = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasPessoais: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Número</label>
                            <input
                              type="text"
                              value={ref.numero}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasPessoais]
                                newRefs[index].numero = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasPessoais: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Complemento</label>
                            <input
                              type="text"
                              value={ref.complemento}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasPessoais]
                                newRefs[index].complemento = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasPessoais: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone</label>
                            <input
                              type="text"
                              value={ref.telefone}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasPessoais]
                                newRefs[index].telefone = formatPhone(e.target.value)
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasPessoais: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              placeholder="(00) 0000-0000"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFichaCadastralFormData({
                          ...fichaCadastralFormData,
                          referenciasPessoais: [...fichaCadastralFormData.referenciasPessoais, { nome: '', endereco: '', numero: '', complemento: '', telefone: '' }]
                        })
                      }}
                      className="mt-2 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      + Adicionar Referência Pessoal
                    </button>
                  </div>

                  {/* Referências Comerciais */}
                  <div className="border border-gray-300 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-gray-900">Referências Comerciais</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Possui Cartão de Crédito? Cite quais</label>
                      <textarea
                        value={fichaCadastralFormData.possuiCartaoCredito}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, possuiCartaoCredito: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        rows={2}
                        placeholder="Ex: Visa, Mastercard..."
                      />
                    </div>
                  </div>

                  {/* Referências Bancárias */}
                  <div className="border border-gray-300 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-gray-900">Referências Bancárias</h4>
                    {fichaCadastralFormData.referenciasBancarias.map((ref, index) => (
                      <div key={index} className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-700">Conta {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newRefs = [...fichaCadastralFormData.referenciasBancarias]
                              newRefs.splice(index, 1)
                              setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasBancarias: newRefs })
                            }}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome do Banco</label>
                            <input
                              type="text"
                              value={ref.banco}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasBancarias]
                                newRefs[index].banco = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasBancarias: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de Conta</label>
                            <select
                              value={ref.tipoConta}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasBancarias]
                                newRefs[index].tipoConta = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasBancarias: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            >
                              <option value="Comum">Comum</option>
                              <option value="Poupança">Poupança</option>
                              <option value="Corrente">Corrente</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Agência</label>
                            <input
                              type="text"
                              value={ref.agencia}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasBancarias]
                                newRefs[index].agencia = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasBancarias: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Número da Conta</label>
                            <input
                              type="text"
                              value={ref.conta}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasBancarias]
                                newRefs[index].conta = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasBancarias: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Tempo de Conta</label>
                            <input
                              type="text"
                              value={ref.tempoConta}
                              onChange={(e) => {
                                const newRefs = [...fichaCadastralFormData.referenciasBancarias]
                                newRefs[index].tempoConta = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, referenciasBancarias: newRefs })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              placeholder="Ex: 2 anos"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFichaCadastralFormData({
                          ...fichaCadastralFormData,
                          referenciasBancarias: [...fichaCadastralFormData.referenciasBancarias, { banco: '', tipoConta: 'Comum', agencia: '', conta: '', tempoConta: '' }]
                        })
                      }}
                      className="mt-2 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      + Adicionar Referência Bancária
                    </button>
                  </div>

                  {/* Bens Pessoais */}
                  <div className="border border-gray-300 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 text-gray-900">Bens Pessoais</h4>
                    {fichaCadastralFormData.bensPessoais.map((bem, index) => (
                      <div key={index} className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-700">Bem {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newBens = [...fichaCadastralFormData.bensPessoais]
                              newBens.splice(index, 1)
                              setFichaCadastralFormData({ ...fichaCadastralFormData, bensPessoais: newBens })
                            }}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo</label>
                            <select
                              value={bem.tipo}
                              onChange={(e) => {
                                const newBens = [...fichaCadastralFormData.bensPessoais]
                                newBens[index].tipo = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, bensPessoais: newBens })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            >
                              <option value="">Selecione</option>
                              <option value="Imóvel">Imóvel</option>
                              <option value="Veículo">Veículo</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                            <input
                              type="text"
                              value={bem.descricao}
                              onChange={(e) => {
                                const newBens = [...fichaCadastralFormData.bensPessoais]
                                newBens[index].descricao = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, bensPessoais: newBens })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              placeholder={bem.tipo === 'Imóvel' ? 'Cidade/UF' : bem.tipo === 'Veículo' ? 'Marca, Ano Modelo' : 'Descrição'}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor</label>
                            <input
                              type="number"
                              step="0.01"
                              value={bem.valor}
                              onChange={(e) => {
                                const newBens = [...fichaCadastralFormData.bensPessoais]
                                newBens[index].valor = e.target.value
                                setFichaCadastralFormData({ ...fichaCadastralFormData, bensPessoais: newBens })
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFichaCadastralFormData({
                          ...fichaCadastralFormData,
                          bensPessoais: [...fichaCadastralFormData.bensPessoais, { tipo: '', descricao: '', valor: '' }]
                        })
                      }}
                      className="mt-2 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      + Adicionar Bem
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa 7: Informações Adicionais */}
              {fichaCadastralActiveStep === 7 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-3 text-gray-900">Informações Adicionais</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Vendedor</label>
                      <select
                        value={fichaCadastralFormData.vendedor}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, vendedor: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        {sellers.map(seller => (
                          <option key={seller.id} value={seller.name}>{seller.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações</label>
                      <textarea
                        value={fichaCadastralFormData.observacoes}
                        onChange={(e) => setFichaCadastralFormData({ ...fichaCadastralFormData, observacoes: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        rows={4}
                        placeholder="Observações adicionais..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Navegação */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                {fichaCadastralActiveStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setFichaCadastralActiveStep(fichaCadastralActiveStep - 1)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Anterior
                  </button>
                )}
                {fichaCadastralActiveStep < 7 ? (
                  <button
                    type="button"
                    onClick={() => setFichaCadastralActiveStep(fichaCadastralActiveStep + 1)}
                    className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    className="ml-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                  >
                    {saving ? 'Salvando...' : 'Salvar Ficha Cadastral'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este veículo?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />
    </Layout>
  )
}

export default function VehiclesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500">Carregando...</div>}>
      <VehiclesPageContent />
    </Suspense>
  )
}
