'use client'

import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import CustomerFormModal, { type CustomerFormModalCustomer } from '@/components/CustomerFormModal'
import { ESPECIES, COMBUSTIVEIS } from '@/utils/vehicleOptions'
import { FiChevronRight, FiChevronLeft, FiPlus, FiUserPlus } from 'react-icons/fi'

const CORES = ['Preto', 'Branco', 'Prata', 'Cinza', 'Vermelho', 'Azul', 'Verde', 'Bege', 'Dourado', 'Outros']
const TIPOS_RETORNO = ['À vista', 'Parcelado', 'Transferência', 'Outros']
/** Situação (pago pelo cliente) — alinhado ao sistema de despachante / transferência */
const SITUACAO_PAGO_CLIENTE = [
  'Pago cliente',
  'Aberto cliente',
  'Cortesia cliente',
  'Cliente vai transferir',
  'Embutido nos pagamentos do veículo',
] as const
const FINANCEIRAS = ['Financeira A', 'Financeira B', 'Santander', 'Itaú', 'Outros'] // pode vir da API depois

interface Customer {
  id: number
  name: string
  phone: string
  email?: string
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

function parseNum(v: string): number {
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
function formatBrl(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function RefinanciamentoPage() {
  const [step, setStep] = useState(1)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sellers, setSellers] = useState<{ id: number; name: string }[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [proprietarioSearch, setProprietarioSearch] = useState('')
  const [clientDropdown, setClientDropdown] = useState(false)
  const [proprietarioDropdown, setProprietarioDropdown] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)
  const proprietarioRef = useRef<HTMLDivElement>(null)
  const [vehicleType, setVehicleType] = useState<'carros' | 'motos' | 'caminhoes'>('carros')
  const [fipeBrands, setFipeBrands] = useState<FipeBrand[]>([])
  const [fipeModels, setFipeModels] = useState<FipeModel[]>([])
  const [fipeYears, setFipeYears] = useState<FipeYear[]>([])
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    clienteId: '',
    proprietarioId: '',
    funcionarioId: '',
    observacoesCliente: '',
    placa: '',
    especie: 'AUTOMÓVEL',
    marca: '',
    modelo: '',
    anoFipeCodigo: '',
    anoModelo: '',
    anoFabricacao: '',
    cor: '',
    combustivel: '',
    chassi: '',
    renavam: '',
    posicaoEstoque: '',
    financeira: '',
    numParcelas: '',
    valorParcelas: '0,00',
    valorVeiculo: '0,00',
    valorFinanciado: '0,00',
    valorRetorno: '0,00',
    tipoRetorno: '',
    valorPlus: '0,00',
    valorTac: '0,00',
    valorTif: '0,00',
    taxaIntermediacao: '',
    observacoesValores: '',
    enviarFinanceiro: false,
    valorCobradoDespachante: '',
    dataPagamentoDespachante: '',
    valorCustoDespachante: '0,00',
    informarTaxas: false,
    valorPagoCliente: '',
    situacaoPagoCliente: '',
    dataEntregaCliente: '',
    dataEntrega: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    Promise.all([api.get('/customers'), api.get('/users/sellers')]).then(([cRes, sRes]) => {
      setCustomers(cRes.data || [])
      setSellers(sRes.data || [])
    }).catch(() => setToast({ message: 'Erro ao carregar dados', type: 'error' }))
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setClientDropdown(false)
      if (proprietarioRef.current && !proprietarioRef.current.contains(e.target as Node)) setProprietarioDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredClients = clientSearch.length >= 3
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          (c.phone && c.phone.includes(clientSearch)) ||
          (c.email && c.email.toLowerCase().includes(clientSearch))
      )
    : []
  const filteredProprietarios = proprietarioSearch.length >= 3
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(proprietarioSearch.toLowerCase()) ||
          (c.phone && c.phone.includes(proprietarioSearch)) ||
          (c.email && c.email.toLowerCase().includes(proprietarioSearch))
      )
    : []

  const selectedCliente = form.clienteId ? customers.find((c) => c.id === parseInt(form.clienteId)) : null
  const selectedProprietario = form.proprietarioId ? customers.find((c) => c.id === parseInt(form.proprietarioId)) : null

  useEffect(() => {
    const type = form.especie === 'MOTOCICLETA' || form.especie === 'MOTONETA' ? 'motos' : form.especie === 'CAMINHÃO' ? 'caminhoes' : 'carros'
    setVehicleType(type)
  }, [form.especie])

  useEffect(() => {
    setLoadingBrands(true)
    api.get(`/fipe/brands?type=${vehicleType}`)
      .then((r) => setFipeBrands(r.data || []))
      .catch(() => setFipeBrands([]))
      .finally(() => setLoadingBrands(false))
  }, [vehicleType])

  useEffect(() => {
    if (!form.marca) {
      setFipeModels([])
      setFipeYears([])
      return
    }
    setLoadingModels(true)
    api.get(`/fipe/brands/${form.marca}/models?type=${vehicleType}`)
      .then((r) => setFipeModels(r.data || []))
      .catch(() => setFipeModels([]))
      .finally(() => setLoadingModels(false))
    setForm((p) => ({ ...p, modelo: '', anoFipeCodigo: '', anoModelo: '', anoFabricacao: '' }))
    setFipeYears([])
  }, [form.marca, vehicleType])

  useEffect(() => {
    if (!form.modelo) {
      setFipeYears([])
      return
    }
    setLoadingYears(true)
    api.get(`/fipe/brands/${form.marca}/models/${form.modelo}/years?type=${vehicleType}`)
      .then((r) => setFipeYears(r.data || []))
      .catch(() => setFipeYears([]))
      .finally(() => setLoadingYears(false))
    setForm((p) => ({ ...p, anoFipeCodigo: '', anoModelo: '', anoFabricacao: '' }))
  }, [form.modelo, form.marca, vehicleType])

  const steps = [
    { id: 1, name: 'Cliente' },
    { id: 2, name: 'Veículo' },
    { id: 3, name: 'Valores' },
    { id: 4, name: 'Despachante' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 4) {
      setStep(step + 1)
      return
    }
    setToast({ message: 'Refinanciamento cadastrado com sucesso! (integração backend pode ser feita depois)', type: 'success' })
    setStep(1)
    setForm({
      data: new Date().toISOString().split('T')[0],
      clienteId: '',
      proprietarioId: '',
      funcionarioId: '',
      observacoesCliente: '',
      placa: '',
      especie: 'AUTOMÓVEL',
      marca: '',
      modelo: '',
      anoFipeCodigo: '',
      anoModelo: '',
      anoFabricacao: '',
      cor: '',
      combustivel: '',
      chassi: '',
      renavam: '',
      posicaoEstoque: '',
      financeira: '',
      numParcelas: '',
      valorParcelas: '0,00',
      valorVeiculo: '0,00',
      valorFinanciado: '0,00',
      valorRetorno: '0,00',
      tipoRetorno: '',
      valorPlus: '0,00',
      valorTac: '0,00',
      valorTif: '0,00',
      taxaIntermediacao: '',
      observacoesValores: '',
      enviarFinanceiro: false,
      valorCobradoDespachante: '',
      dataPagamentoDespachante: '',
      valorCustoDespachante: '0,00',
      informarTaxas: false,
      valorPagoCliente: '',
      situacaoPagoCliente: '',
      dataEntregaCliente: '',
      dataEntrega: new Date().toISOString().split('T')[0],
    })
    setClientSearch('')
    setProprietarioSearch('')
  }

  const labelClass = 'block text-xs font-medium text-gray-700 mb-0.5'
  const inputClass =
    'w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm'
  const selectClass =
    'w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm bg-white'
  const textareaClass =
    'w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 text-sm'

  return (
    <Layout>
      <div className="space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Refinanciamento</h1>
            <p className="text-xs text-gray-500 mt-0.5">Incluir – etapas Cliente, Veículo, Valores e Despachante</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`px-2 py-1 rounded text-xs font-medium ${step === s.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Etapa 1: Cliente */}
            {step === 1 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Data *</label>
                    <input
                      type="date"
                      value={form.data}
                      onChange={(e) => setForm({ ...form, data: e.target.value })}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
                <div ref={clientRef} className="relative">
                  <label className={labelClass}>Cliente *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value)
                        setClientDropdown(true)
                        if (!e.target.value) setForm((p) => ({ ...p, clienteId: '' }))
                      }}
                      onFocus={() => clientSearch.length >= 3 && setClientDropdown(true)}
                      placeholder="Digite no mínimo 3 caracteres para localizar o cliente."
                      className={`flex-1 ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="px-2 py-1.5 border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 text-xs font-medium flex items-center gap-1"
                    >
                      <FiUserPlus className="w-4 h-4" /> Criar novo
                    </button>
                  </div>
                  {clientSearch.length > 0 && clientSearch.length < 3 && (
                    <p className="text-xs text-gray-500 mt-1">Digite no mínimo 3 caracteres para localizar o cliente.</p>
                  )}
                  {selectedCliente && <p className="text-xs text-green-600 mt-1">Cliente selecionado: {selectedCliente.name}</p>}
                  {clientDropdown && clientSearch.length >= 3 && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-gray-900">
                      {filteredClients.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-gray-500">Nenhum cliente encontrado</li>
                      ) : (
                        filteredClients.slice(0, 10).map((c) => (
                          <li key={c.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0" onClick={() => { setForm((p) => ({ ...p, clienteId: String(c.id) })); setClientSearch(c.name); setClientDropdown(false) }}>
                            {c.name} {c.phone && `– ${c.phone}`}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <div ref={proprietarioRef} className="relative">
                  <label className={labelClass}>Proprietário *</label>
                  <input
                    type="text"
                    value={proprietarioSearch}
                    onChange={(e) => {
                      setProprietarioSearch(e.target.value)
                      setProprietarioDropdown(true)
                      if (!e.target.value) setForm((p) => ({ ...p, proprietarioId: '' }))
                    }}
                    onFocus={() => proprietarioSearch.length >= 3 && setProprietarioDropdown(true)}
                    placeholder="Digite no mínimo 3 caracteres para localizar o cliente."
                    className={inputClass}
                  />
                  {proprietarioSearch.length > 0 && proprietarioSearch.length < 3 && (
                    <p className="text-xs text-gray-500 mt-1">Digite no mínimo 3 caracteres para localizar o cliente.</p>
                  )}
                  {selectedProprietario && <p className="text-xs text-green-600 mt-1">Proprietário selecionado: {selectedProprietario.name}</p>}
                  {proprietarioDropdown && proprietarioSearch.length >= 3 && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-gray-900">
                      {filteredProprietarios.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-gray-500">Nenhum cliente encontrado</li>
                      ) : (
                        filteredProprietarios.slice(0, 10).map((c) => (
                          <li key={c.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0" onClick={() => { setForm((p) => ({ ...p, proprietarioId: String(c.id) })); setProprietarioSearch(c.name); setProprietarioDropdown(false) }}>
                            {c.name} {c.phone && `– ${c.phone}`}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Funcionário</label>
                  <select
                    value={form.funcionarioId}
                    onChange={(e) => setForm({ ...form, funcionarioId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Selecione</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Observações Cliente</label>
                  <textarea
                    value={form.observacoesCliente}
                    onChange={(e) => setForm({ ...form, observacoesCliente: e.target.value })}
                    rows={2}
                    className={textareaClass}
                  />
                </div>
              </div>
            )}

            {/* Etapa 2: Veículo */}
            {step === 2 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Veículo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Placa *</label>
                    <input type="text" value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} required className={inputClass} placeholder="ABC-1D23" />
                  </div>
                  <div>
                    <label className={labelClass}>Espécie *</label>
                    <select value={form.especie} onChange={(e) => setForm({ ...form, especie: e.target.value })} required className={selectClass}>
                      <option value="">Selecione</option>
                      {ESPECIES.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Marca *</label>
                    <select value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} required className={selectClass} disabled={loadingBrands}>
                      <option value="">Selecione uma marca</option>
                      {fipeBrands.map((b) => (
                        <option key={b.codigo} value={b.codigo}>{b.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Modelo *</label>
                    <select value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} required className={selectClass} disabled={!form.marca || loadingModels}>
                      <option value="">Selecione um modelo</option>
                      {fipeModels.map((m) => (
                        <option key={m.codigo} value={m.codigo}>{m.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ano modelo *</label>
                    <select
                      value={form.anoFipeCodigo}
                      onChange={(e) => {
                        const val = e.target.value
                        const y = fipeYears.find((yr) => yr.codigo === val)
                        const year = y ? (y.nome.split('/')[0]?.split('-')[0] || '') : ''
                        setForm((p) => ({ ...p, anoFipeCodigo: val, anoModelo: year, anoFabricacao: year || p.anoFabricacao }))
                      }}
                      required
                      className={selectClass}
                      disabled={!form.modelo || loadingYears}
                    >
                      <option value="">Selecione</option>
                      {fipeYears.map((y) => {
                        const yearDisplay = y.nome.split('/')[0]?.split('-')[0] || y.nome
                        return (
                          <option key={y.codigo} value={y.codigo}>{yearDisplay}</option>
                        )
                      })}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ano fabricação *</label>
                    <input type="text" value={form.anoFabricacao} onChange={(e) => setForm({ ...form, anoFabricacao: e.target.value })} required className={inputClass} placeholder="2024" />
                  </div>
                  <div>
                    <label className={labelClass}>Cor *</label>
                    <select value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} required className={selectClass}>
                      <option value="">Selecione</option>
                      {CORES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Combustível *</label>
                    <select value={form.combustivel} onChange={(e) => setForm({ ...form, combustivel: e.target.value })} required className={selectClass}>
                      <option value="">Selecione</option>
                      {COMBUSTIVEIS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Chassi</label>
                    <input type="text" value={form.chassi} onChange={(e) => setForm({ ...form, chassi: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Renavam</label>
                    <input type="text" value={form.renavam} onChange={(e) => setForm({ ...form, renavam: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Posição Estoque</label>
                    <input type="text" value={form.posicaoEstoque} onChange={(e) => setForm({ ...form, posicaoEstoque: e.target.value })} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 3: Valores */}
            {step === 3 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Valores</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Financeira *</label>
                    <select value={form.financeira} onChange={(e) => setForm({ ...form, financeira: e.target.value })} required className={selectClass}>
                      <option value="">Selecione</option>
                      {FINANCEIRAS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nº de parcelas *</label>
                    <input type="number" min={1} value={form.numParcelas} onChange={(e) => setForm({ ...form, numParcelas: e.target.value })} required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Valor das parcelas *</label>
                    <input type="text" value={form.valorParcelas} onChange={(e) => setForm({ ...form, valorParcelas: e.target.value })} required className={inputClass} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={labelClass}>Valor do veículo *</label>
                    <input type="text" value={form.valorVeiculo} onChange={(e) => setForm({ ...form, valorVeiculo: e.target.value })} required className={inputClass} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={labelClass}>Valor financiado *</label>
                    <input type="text" value={form.valorFinanciado} onChange={(e) => setForm({ ...form, valorFinanciado: e.target.value })} required className={inputClass} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={labelClass}>Valor do retorno *</label>
                    <input type="text" value={form.valorRetorno} onChange={(e) => setForm({ ...form, valorRetorno: e.target.value })} required className={inputClass} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de retorno</label>
                    <select value={form.tipoRetorno} onChange={(e) => setForm({ ...form, tipoRetorno: e.target.value })} className={selectClass}>
                      <option value="">Selecione</option>
                      {TIPOS_RETORNO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Valor do PLUS</label>
                    <input type="text" value={form.valorPlus} onChange={(e) => setForm({ ...form, valorPlus: e.target.value })} className={inputClass} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={labelClass}>Valor do TAC</label>
                    <input type="text" value={form.valorTac} onChange={(e) => setForm({ ...form, valorTac: e.target.value })} className={inputClass} placeholder="0,00" />
                  </div>
                  <div>
                    <label className={labelClass}>Valor do TIF</label>
                    <input type="text" value={form.valorTif} onChange={(e) => setForm({ ...form, valorTif: e.target.value })} className={inputClass} placeholder="0,00" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Taxa de intermediação de financiamento</label>
                    <input type="text" value={form.taxaIntermediacao} onChange={(e) => setForm({ ...form, taxaIntermediacao: e.target.value })} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Observações</label>
                    <textarea value={form.observacoesValores} onChange={(e) => setForm({ ...form, observacoesValores: e.target.value })} rows={2} className={textareaClass} />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="enviarFinanceiro" checked={form.enviarFinanceiro} onChange={(e) => setForm({ ...form, enviarFinanceiro: e.target.checked })} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <label htmlFor="enviarFinanceiro" className="text-xs font-medium text-gray-700">Enviar para financeiro?</label>
                  </div>
                </div>
              </div>
            )}

            {/* Etapa 4: Despachante (espelha campos do legado Quitação/Despachante) */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Despachante</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Valor cobrado pelo Despachante</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.valorCobradoDespachante}
                      onChange={(e) => setForm({ ...form, valorCobradoDespachante: e.target.value })}
                      className={inputClass}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Data de pagamento</label>
                    <input
                      type="date"
                      value={form.dataPagamentoDespachante}
                      onChange={(e) => setForm({ ...form, dataPagamentoDespachante: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Valor Custo</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.valorCustoDespachante}
                      onChange={(e) => setForm({ ...form, valorCustoDespachante: e.target.value })}
                      className={inputClass}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2 py-0.5 border border-gray-100 rounded-md px-2 bg-gray-50/80">
                    <input
                      type="checkbox"
                      id="informarTaxas"
                      checked={form.informarTaxas}
                      onChange={(e) => setForm({ ...form, informarTaxas: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="informarTaxas" className="text-xs font-medium text-gray-800">
                      Informar Taxas
                    </label>
                  </div>
                  <div>
                    <label className={labelClass}>Valor pago pelo cliente</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.valorPagoCliente}
                      onChange={(e) => setForm({ ...form, valorPagoCliente: e.target.value })}
                      className={inputClass}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <fieldset className="min-w-0 border border-gray-200 rounded-md p-2 bg-white">
                      <legend className="text-xs font-semibold text-gray-800 px-1">Situação Pago cliente</legend>
                      <p className="text-[10px] text-gray-500 mb-1.5 leading-snug">
                        Pago cliente · Aberto cliente · Cortesia cliente · Cliente vai transferir · Embutido nos pagamentos do veículo
                      </p>
                      <select
                        value={form.situacaoPagoCliente}
                        onChange={(e) => setForm({ ...form, situacaoPagoCliente: e.target.value })}
                        className={selectClass}
                      >
                        <option value="">Selecione</option>
                        {SITUACAO_PAGO_CLIENTE.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  </div>
                  <div>
                    <label className={labelClass}>Data de entrega para o Cliente</label>
                    <input
                      type="date"
                      value={form.dataEntregaCliente}
                      onChange={(e) => setForm({ ...form, dataEntregaCliente: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Data de Entrega</label>
                    <input
                      type="date"
                      value={form.dataEntrega}
                      onChange={(e) => setForm({ ...form, dataEntrega: e.target.value })}
                      className={inputClass}
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">Ex.: 25/03/2026</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 inline-flex items-center gap-1">
                <FiChevronLeft /> Anterior
              </button>
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 inline-flex items-center gap-1">
                {step === 4 ? 'Concluir' : 'Próximo'} <FiChevronRight />
              </button>
            </div>
          </form>
        </div>
      </div>

      <CustomerFormModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={(customer: CustomerFormModalCustomer) => {
          setCustomers((prev) => {
            const exists = prev.some((c) => c.id === customer.id)
            if (exists) return prev.map((c) => (c.id === customer.id ? { ...c, name: customer.name, phone: customer.phone || '', email: customer.email } : c))
            return [...prev, { id: customer.id, name: customer.name, phone: customer.phone || '', email: customer.email }]
          })
          setForm((prev) => ({ ...prev, clienteId: String(customer.id) }))
          setClientSearch(customer.name)
          setShowCustomerModal(false)
        }}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  )
}
