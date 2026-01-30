'use client'

import { useState, useEffect } from 'react'
import api from '@/services/api'
import { formatCPF, formatPhone, formatCEP, formatRG, formatCNPJ, removeMask } from '@/utils/formatters'

export interface CustomerFormModalCustomer {
  id: number
  name: string
  phone: string
  email?: string
  cpf?: string
  rg?: string
  address?: string
  city?: string
  district?: string
  cep?: string
  birthDate?: string
  pessoaType?: string
  apelido?: string
  marcador?: string
  nomeMae?: string
  facebook?: string
  instagram?: string
  website?: string
  nacionalidade?: string
  naturalidade?: string
  sexo?: string
  estadoCivil?: string
  profissao?: string
  cnh?: string
  cnhVencimento?: string
  adicional?: string
  pendenciasFinanceiras?: string
  status: string
}

interface CustomerFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: (customer: CustomerFormModalCustomer) => void
  editingCustomer?: CustomerFormModalCustomer | null
}

const initialFormData = {
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
}

export default function CustomerFormModal({
  open,
  onClose,
  onSuccess,
  editingCustomer = null,
}: CustomerFormModalProps) {
  const [activeStep, setActiveStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    if (!open) return
    setActiveStep(1)
    if (editingCustomer) {
      setFormData({
        pessoaType: (editingCustomer.pessoaType as 'Física' | 'Jurídica') || 'Física',
        cpf: editingCustomer.cpf
          ? (editingCustomer.pessoaType === 'Jurídica' ? formatCNPJ(editingCustomer.cpf) : formatCPF(editingCustomer.cpf))
          : '',
        name: editingCustomer.name,
        apelido: editingCustomer.apelido || '',
        rg: editingCustomer.rg ? formatRG(editingCustomer.rg) : '',
        nomeMae: editingCustomer.nomeMae || '',
        phone: editingCustomer.phone ? formatPhone(editingCustomer.phone) : '',
        email: editingCustomer.email || '',
        facebook: editingCustomer.facebook || '',
        instagram: editingCustomer.instagram || '',
        website: editingCustomer.website || '',
        nacionalidade: editingCustomer.nacionalidade || 'BRASILEIRA',
        naturalidade: editingCustomer.naturalidade || '',
        birthDate: editingCustomer.birthDate ? editingCustomer.birthDate.split('T')[0] : '',
        sexo: editingCustomer.sexo || '',
        estadoCivil: editingCustomer.estadoCivil || '',
        profissao: editingCustomer.profissao || '',
        cnh: editingCustomer.cnh || '',
        cnhVencimento: editingCustomer.cnhVencimento ? editingCustomer.cnhVencimento.split('T')[0] : '',
        cep: editingCustomer.cep ? formatCEP(editingCustomer.cep) : '',
        city: editingCustomer.city || '',
        district: editingCustomer.district || '',
        address: editingCustomer.address || '',
        adicional: editingCustomer.adicional || '',
        pendenciasFinanceiras: editingCustomer.pendenciasFinanceiras || '',
        marcador: editingCustomer.marcador || '',
        status: editingCustomer.status,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [open, editingCustomer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dataToSend = {
        ...formData,
        cpf: formData.cpf ? removeMask(formData.cpf) : '',
        phone: formData.phone ? removeMask(formData.phone) : '',
        cep: formData.cep ? removeMask(formData.cep) : '',
        rg: formData.rg ? removeMask(formData.rg) : '',
        cnh: formData.cnh || '',
        birthDate: formData.birthDate || null,
        cnhVencimento: formData.cnhVencimento || null,
      }
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, dataToSend)
        onSuccess?.(editingCustomer)
      } else {
        const res = await api.post('/customers', dataToSend)
        const created = res.data?.customer ?? res.data
        if (created) onSuccess?.(created)
      }
      onClose()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">
            {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
        </div>

        <div className="px-4 pt-4 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 1, label: 'Dados Básicos' },
              { id: 2, label: 'Contato' },
              { id: 3, label: 'Dados Pessoais' },
              { id: 4, label: 'CNH' },
              { id: 5, label: 'Endereço' },
              { id: 6, label: 'Adicional' },
            ].map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeStep === step.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4">
            {activeStep === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pessoa *</label>
                    <select
                      required
                      value={formData.pessoaType}
                      onChange={(e) => setFormData({ ...formData, pessoaType: e.target.value, cpf: '' })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="Física">Física</option>
                      <option value="Jurídica">Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {formData.pessoaType === 'Jurídica' ? 'CNPJ *' : 'CPF *'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={formData.pessoaType === 'Jurídica' ? 18 : 14}
                      value={formData.cpf}
                      onChange={(e) => {
                        const formatted =
                          formData.pessoaType === 'Jurídica' ? formatCNPJ(e.target.value) : formatCPF(e.target.value)
                        setFormData({ ...formData, cpf: formatted })
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder={formData.pessoaType === 'Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Apelido</label>
                    <input
                      type="text"
                      value={formData.apelido}
                      onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">RG</label>
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.rg}
                      onChange={(e) => setFormData({ ...formData, rg: formatRG(e.target.value) })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="00.000.000-0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Mãe</label>
                    <input
                      type="text"
                      value={formData.nomeMae}
                      onChange={(e) => setFormData({ ...formData, nomeMae: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Telefone *</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Facebook</label>
                    <input
                      type="text"
                      value={formData.facebook}
                      onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nacionalidade</label>
                    <input
                      type="text"
                      value={formData.nacionalidade}
                      onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Naturalidade</label>
                    <input
                      type="text"
                      value={formData.naturalidade}
                      onChange={(e) => setFormData({ ...formData, naturalidade: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sexo</label>
                    <select
                      value={formData.sexo}
                      onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Selecione</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estado Civil</label>
                    <select
                      value={formData.estadoCivil}
                      onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Profissão</label>
                    <input
                      type="text"
                      value={formData.profissao}
                      onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CNH</label>
                    <input
                      type="text"
                      value={formData.cnh}
                      onChange={(e) => setFormData({ ...formData, cnh: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data Vencimento CNH</label>
                    <input
                      type="date"
                      value={formData.cnhVencimento}
                      onChange={(e) => setFormData({ ...formData, cnhVencimento: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 5 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      maxLength={9}
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 6 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Adicional</label>
                    <textarea
                      value={formData.adicional}
                      onChange={(e) => setFormData({ ...formData, adicional: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pendências Financeiras</label>
                    <textarea
                      value={formData.pendenciasFinanceiras}
                      onChange={(e) => setFormData({ ...formData, pendenciasFinanceiras: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marcador</label>
                    <input
                      type="text"
                      value={formData.marcador}
                      onChange={(e) => setFormData({ ...formData, marcador: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
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

          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <div className="flex gap-2">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Anterior
                </button>
              )}
              {activeStep < 6 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Próximo
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
