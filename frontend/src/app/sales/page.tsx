'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
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
  commission?: number
  status: string
  date: string
  customer: Customer
  vehicle: Vehicle
  seller: { id: number; name: string }
  contractClauses?: string
  notes?: string
}

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'financiamento', label: 'Financiamento' },
  { value: 'carta_credito', label: 'Carta de Crédito' },
  { value: 'cheque', label: 'Cheque' },
]

const entryTypes = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
]

export default function SalesPage() {
  const { user } = useAuthStore()
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showNewSellerModal, setShowNewSellerModal] = useState(false)
  const [showContractModal, setShowContractModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [newSellerData, setNewSellerData] = useState({ name: '', email: '', password: '' })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    vehicleId: '',
    sellerId: '',
    salePrice: '',
    purchasePrice: '',
    entryValue: '',
    entryType: '',
    entryVehicleValue: '',
    entryCardInstallments: '',
    remainingValue: '',
    paymentMethod: '',
    paymentInstallments: '',
    financedValue: '',
    commission: '',
    contractClauses: '',
    notes: '',
    status: 'em_andamento',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesRes, customersRes, vehiclesRes] = await Promise.all([
        api.get('/sales'),
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
      setFormData({ ...formData, entryType, entryVehicleValue: '' })
    } else {
      setFormData({ ...formData, entryType })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const dataToSend = {
        customerId: parseInt(formData.customerId),
        vehicleId: parseInt(formData.vehicleId),
        sellerId: formData.sellerId ? parseInt(formData.sellerId) : (user ? parseInt(user.id as any) : null),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        entryValue: formData.entryValue ? parseFloat(formData.entryValue) : undefined,
        entryType: formData.entryType || undefined,
        entryVehicleValue: formData.entryVehicleValue ? parseFloat(formData.entryVehicleValue) : undefined,
        entryCardInstallments: formData.entryCardInstallments ? parseInt(formData.entryCardInstallments) : undefined,
        remainingValue: formData.remainingValue ? parseFloat(formData.remainingValue) : undefined,
        paymentMethod: formData.paymentMethod || undefined,
        paymentInstallments: formData.paymentInstallments ? parseInt(formData.paymentInstallments) : undefined,
        paymentInstallmentValue: formData.paymentInstallmentValue ? parseFloat(formData.paymentInstallmentValue) : undefined,
        financedValue: formData.financedValue ? parseFloat(formData.financedValue) : undefined,
        commission: formData.commission ? parseFloat(formData.commission) : undefined,
        contractClauses: formData.contractClauses || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
      }
      
      const response = await api.post('/sales', dataToSend)
      console.log('Venda criada com sucesso:', response.data)
      setToast({ message: 'Venda criada com sucesso!', type: 'success' })
      setShowModal(false)
      resetForm()
      await loadData()
    } catch (error: any) {
      console.error('Erro ao criar venda:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao criar venda', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const formatPaymentMethod = (method?: string) => {
    const methods: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'financiamento': 'Financiamento',
      'carta_credito': 'Carta de Crédito',
      'cheque': 'Cheque'
    }
    return method ? methods[method] || method : 'Não informado'
  }

  const formatEntryType = (type?: string) => {
    const types: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'veiculo': 'Veículo',
      'cartao_credito': 'Cartão de Crédito'
    }
    return type ? types[type] || type : 'Não informado'
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
      doc.text(`Data: ${new Date(selectedSale.date).toLocaleDateString('pt-BR')}`, margin, y)
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
      doc.text(`Nome: ${selectedSale.seller.name}`, margin + 5, y)
      y += 6
      
      doc.setFont(undefined, 'bold')
      doc.text('COMPRADOR:', margin, y)
      y += 7
      doc.setFont(undefined, 'normal')
      doc.text(`Nome: ${selectedSale.customer.name}`, margin + 5, y)
      y += 6
      if (selectedSale.customer.cpf) {
        doc.text(`CPF: ${selectedSale.customer.cpf}`, margin + 5, y)
        y += 6
      }
      doc.text(`Telefone: ${selectedSale.customer.phone}`, margin + 5, y)
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
      doc.text(`Marca: ${selectedSale.vehicle.brand}`, margin + 5, y)
      y += 6
      doc.text(`Modelo: ${selectedSale.vehicle.model}`, margin + 5, y)
      y += 6
      doc.text(`Ano: ${selectedSale.vehicle.year}`, margin + 5, y)
      y += 6
      if (selectedSale.vehicle.plate) {
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
        const clauses = selectedSale.contractClauses.split('\n').filter(c => c.trim() !== '')
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
      doc.text(selectedSale.seller.name, margin, signatureY + 8)
      
      // Cliente
      doc.line(pageWidth - margin - 80, signatureY, pageWidth - margin, signatureY)
      doc.text('COMPRADOR', pageWidth - margin - 80, y)
      doc.text(selectedSale.customer.name, pageWidth - margin - 80, signatureY + 8)
      
      y = signatureY + 20
      
      // Data e Local
      doc.setFontSize(10)
      doc.text(`Data: ${new Date(selectedSale.date).toLocaleDateString('pt-BR')}`, margin, y)
      
      // Salvar PDF
      doc.save(`contrato-${selectedSale.id}-${selectedSale.customer.name.replace(/\s/g, '-')}.pdf`)
      setToast({ message: 'Contrato gerado com sucesso!', type: 'success' })
      setShowContractModal(false)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      setToast({ message: 'Erro ao gerar PDF. Tente novamente.', type: 'error' })
    }
  }

  const resetForm = () => {
    setFormData({
      customerId: '',
      vehicleId: '',
      sellerId: user ? user.id.toString() : '',
      salePrice: '',
      purchasePrice: '',
      entryValue: '',
      entryType: '',
      entryVehicleValue: '',
      entryCardInstallments: '',
      remainingValue: '',
      paymentMethod: '',
      paymentInstallments: '',
      financedValue: '',
      commission: '',
      contractClauses: '',
      notes: '',
      status: 'em_andamento',
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Nova Venda
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-700">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Veículo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Valor Venda</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Valor Compra</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Lucro</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Vendedor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-600 text-base">
                        Nenhuma venda cadastrada
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 border-b border-gray-200">
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div className="text-sm font-semibold text-gray-900">{sale.customer?.name || '-'}</div>
                          <div className="text-sm text-gray-600">{sale.customer?.cpf || sale.customer?.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.vehicle?.brand} {sale.vehicle?.model} {sale.vehicle?.year}
                          </div>
                          {sale.vehicle?.plate && (
                            <div className="text-sm text-gray-600">{sale.vehicle.plate}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-200">
                          {sale.salePrice ? `R$ ${sale.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 border-r border-gray-200">
                          {sale.purchasePrice ? `R$ ${sale.purchasePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700 border-r border-gray-200">
                          {sale.profit ? `R$ ${sale.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 border-r border-gray-200">
                          {sale.seller?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-200 text-blue-900 border border-blue-300">
                            {sale.status || 'em_andamento'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleGenerateContract(sale)}
                            className="text-blue-600 hover:text-blue-800 font-semibold underline"
                          >
                            Contrato
                          </button>
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
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Nova Venda</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Informações Básicas */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações Básicas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                        <select
                          required
                          value={formData.customerId}
                          onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione um cliente</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} - {customer.cpf || customer.phone}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                        <select
                          required
                          value={formData.vehicleId}
                          onChange={(e) => handleVehicleChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione um veículo</option>
                          {vehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.brand} {vehicle.model} {vehicle.year} - R$ {vehicle.price.toLocaleString('pt-BR')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
                          <select
                            required
                            value={formData.sellerId}
                            onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="">Selecione um vendedor</option>
                            {sellers.map((seller) => (
                              <option key={seller.id} value={seller.id}>
                                {seller.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNewSellerModal(true)}
                          className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Novo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Valores e Lucro */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Valores e Lucro</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.salePrice}
                          onChange={(e) => {
                            const newSalePrice = e.target.value
                            const remaining = calculateRemaining(newSalePrice, formData.entryValue, formData.entryVehicleValue, formData.entryAdditionalValue)
                            setFormData({ ...formData, salePrice: newSalePrice, remainingValue: remaining })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Preencha quando souber o valor"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Compra</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.purchasePrice}
                          onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Preencha quando souber o valor"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lucro</label>
                        <input
                          type="text"
                          readOnly
                          value={`R$ ${parseFloat(profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-semibold text-green-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Entrada */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Entrada</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Entrada</label>
                        <select
                          value={formData.entryType}
                          onChange={(e) => handleEntryTypeChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione...</option>
                          {entryTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formData.entryType === 'dinheiro' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Entrada (Dinheiro)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.entryValue}
                            onChange={(e) => {
                              const newEntryValue = e.target.value
                              const remaining = calculateRemaining(formData.salePrice, newEntryValue, formData.entryVehicleValue, formData.entryAdditionalValue)
                              setFormData({ ...formData, entryValue: newEntryValue, remainingValue: remaining })
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      )}
                      {formData.entryType === 'veiculo' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Veículo de Entrada</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.entryVehicleValue}
                              onChange={(e) => {
                                const newVehicleValue = e.target.value
                                const remaining = calculateRemaining(formData.salePrice, formData.entryValue, newVehicleValue, formData.entryAdditionalValue)
                                setFormData({ ...formData, entryVehicleValue: newVehicleValue, remainingValue: remaining })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Adicional em Dinheiro</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.entryAdditionalValue}
                              onChange={(e) => {
                                const newAdditionalValue = e.target.value
                                const remaining = calculateRemaining(formData.salePrice, formData.entryValue, formData.entryVehicleValue, newAdditionalValue)
                                setFormData({ ...formData, entryAdditionalValue: newAdditionalValue, remainingValue: remaining })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              placeholder="Valor adicional além do veículo"
                            />
                          </div>
                        </>
                      )}
                      {formData.entryType === 'cartao_credito' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Entrada (Cartão)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.entryValue}
                              onChange={(e) => {
                                const newEntryValue = e.target.value
                                const remaining = calculateRemaining(formData.salePrice, newEntryValue, formData.entryVehicleValue, formData.entryAdditionalValue)
                                setFormData({ ...formData, entryValue: newEntryValue, remainingValue: remaining })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={formData.entryCardInstallments}
                              onChange={(e) => setFormData({ ...formData, entryCardInstallments: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              placeholder="Número de parcelas"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor Restante</label>
                        <input
                          type="text"
                          readOnly
                          value={`R$ ${parseFloat(formData.remainingValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pagamento do Restante */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Pagamento do Restante</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                        <select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione...</option>
                          {paymentMethods.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(formData.paymentMethod === 'carta_credito' || formData.paymentMethod === 'financiamento') && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                            <input
                              type="number"
                              min="1"
                              value={formData.paymentInstallments}
                              onChange={(e) => setFormData({ ...formData, paymentInstallments: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                              placeholder="Número de parcelas"
                            />
                          </div>
                          {formData.paymentMethod === 'carta_credito' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Parcela</label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.paymentInstallmentValue}
                                onChange={(e) => setFormData({ ...formData, paymentInstallmentValue: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                placeholder="Valor de cada parcela"
                              />
                            </div>
                          )}
                        </>
                      )}
                      {formData.paymentMethod === 'financiamento' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Financiado</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.financedValue}
                            onChange={(e) => setFormData({ ...formData, financedValue: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comissão do Vendedor</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.commission}
                          onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Valor da comissão"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contrato */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Contrato</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cláusulas do Contrato</label>
                      <textarea
                        value={formData.contractClauses}
                        onChange={(e) => setFormData({ ...formData, contractClauses: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Digite as cláusulas do contrato aqui..."
                      />
                    </div>
                  </div>

                  {/* Outros */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Outros</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Observações adicionais..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      disabled={saving}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
      </div>
    </Layout>
  )
}
