'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import {
  FiAlertCircle,
  FiRefreshCw,
  FiPlus,
  FiX,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiDownload,
  FiPrinter,
  FiChevronDown
} from 'react-icons/fi'

interface VehicleOption {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
}

interface UserOption {
  id: number
  name: string
  email?: string
}

interface PendenciaItem {
  id: number
  createdAt: string
  descricao: string
  dataLimite: string | null
  status: string
  emailPara: string | null
  marcador: string | null
  vehicle: { id: number; brand: string; model: string; year: number; plate?: string }
  responsavel: { id: number; name: string; email?: string } | null
}

const STATUS_OPCOES = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'finalizado', label: 'Finalizado' },
]

type StatusForm = 'aberto' | 'em_analise' | 'finalizado'

const emptyForm: {
  vehicleId: string
  vehicleSearch: string
  responsavelId: string
  status: StatusForm
  emailPara: string
  descricao: string
  dataLimite: string
  marcador: string
} = {
  vehicleId: '',
  vehicleSearch: '',
  responsavelId: '',
  status: 'aberto',
  emailPara: '',
  descricao: '',
  dataLimite: '',
  marcador: '',
}

export default function PendenciasPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [pendencias, setPendencias] = useState<PendenciaItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [vehicleSearchResults, setVehicleSearchResults] = useState<VehicleOption[]>([])
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false)
  const vehicleSearchRef = useRef<HTMLDivElement>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewPendencia, setViewPendencia] = useState<PendenciaItem | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [filterResponsavelId, setFilterResponsavelId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMarcador, setFilterMarcador] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const loadPendencias = async () => {
    setLoading(true)
    try {
      const res = await api.get('/pendencias')
      setPendencias(Array.isArray(res.data) ? res.data : [])
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Erro ao carregar pendências', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendencias()
  }, [])

  useEffect(() => {
    api.get('/users').then((uRes) => {
      setUsers(uRes.data?.data ?? uRes.data ?? [])
    }).catch(() => setToast({ message: 'Erro ao carregar usuários', type: 'error' }))
  }, [])

  useEffect(() => {
    if (!showModal) return
    if (users.length > 0) return
    api.get('/users').then((uRes) => {
      setUsers(uRes.data?.data ?? uRes.data ?? [])
    }).catch(() => setToast({ message: 'Erro ao carregar usuários', type: 'error' }))
  }, [showModal])

  useEffect(() => {
    if (!showModal) return
    const term = formData.vehicleSearch.trim()
    if (term.length < 2) {
      setVehicleSearchResults([])
      return
    }
    const t = setTimeout(() => {
      api.get(`/vehicles?search=${encodeURIComponent(term)}`)
        .then((vRes) => {
          const list = Array.isArray(vRes.data) ? vRes.data : (vRes.data?.data ?? [])
          setVehicleSearchResults(list.slice(0, 15))
          setVehicleSearchOpen(true)
        })
        .catch(() => setVehicleSearchResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [showModal, formData.vehicleSearch])

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (vehicleSearchRef.current && !vehicleSearchRef.current.contains(e.target as Node)) {
        setVehicleSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const openModal = (edit?: PendenciaItem) => {
    if (edit) {
      setEditingId(edit.id)
      const v = edit.vehicle
      setFormData({
        vehicleId: String(edit.vehicle.id),
        vehicleSearch: `${v.brand} ${v.model} ${v.year}${v.plate ? ` – ${v.plate}` : ''}`,
        responsavelId: edit.responsavel ? String(edit.responsavel.id) : '',
        status: (['aberto', 'em_analise', 'finalizado'].includes(edit.status) ? edit.status : 'aberto') as StatusForm,
        emailPara: edit.emailPara || '',
        descricao: edit.descricao,
        dataLimite: edit.dataLimite ? edit.dataLimite.slice(0, 10) : '',
        marcador: edit.marcador || '',
      })
    } else {
      setEditingId(null)
      setFormData(emptyForm)
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData(emptyForm)
    setVehicleSearchResults([])
    setVehicleSearchOpen(false)
  }

  const handleSubmitPendencia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.vehicleId || !formData.responsavelId || !formData.descricao) {
      setToast({ message: 'Preencha veículo, responsável e descrição', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        vehicleId: parseInt(formData.vehicleId, 10),
        responsavelId: parseInt(formData.responsavelId, 10),
        status: formData.status,
        emailPara: formData.emailPara || undefined,
        descricao: formData.descricao.trim(),
        dataLimite: formData.dataLimite || undefined,
        marcador: formData.marcador || undefined,
      }
      if (editingId) {
        await api.put(`/pendencias/${editingId}`, payload)
        setToast({ message: 'Pendência atualizada com sucesso', type: 'success' })
      } else {
        await api.post('/pendencias', payload)
        setToast({ message: 'Pendência criada com sucesso', type: 'success' })
      }
      closeModal()
      loadPendencias()
    } catch (err: any) {
      setToast({
        message: err.response?.data?.error || (editingId ? 'Erro ao atualizar pendência' : 'Erro ao criar pendência'),
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const openView = (p: PendenciaItem) => {
    setViewPendencia(p)
    setShowViewModal(true)
  }

  const handleDelete = async () => {
    if (confirmDeleteId == null) return
    try {
      await api.delete(`/pendencias/${confirmDeleteId}`)
      setToast({ message: 'Pendência excluída com sucesso', type: 'success' })
      setConfirmDeleteId(null)
      loadPendencias()
    } catch (err: any) {
      setToast({ message: err.response?.data?.error || 'Erro ao excluir pendência', type: 'error' })
      setConfirmDeleteId(null)
    }
  }

  const formatDate = (d: string | undefined | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const statusLabel = (s: string) => STATUS_OPCOES.find((o) => o.value === s)?.label ?? s
  const vehicleLabel = (v: PendenciaItem['vehicle']) =>
    `${v.brand} ${v.model} ${v.year}${v.plate ? ` – ${v.plate}` : ''}`

  const filteredPendencias = useMemo(() => {
    let list = [...pendencias]
    if (filterResponsavelId) {
      list = list.filter((p) => p.responsavel && String(p.responsavel.id) === filterResponsavelId)
    }
    if (filterStatus) {
      list = list.filter((p) => p.status === filterStatus)
    }
    if (filterMarcador.trim()) {
      const m = filterMarcador.trim().toLowerCase()
      list = list.filter((p) => (p.marcador || '').toLowerCase().includes(m))
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.descricao.toLowerCase().includes(term) ||
          vehicleLabel(p.vehicle).toLowerCase().includes(term) ||
          (p.marcador || '').toLowerCase().includes(term) ||
          (p.responsavel?.name || '').toLowerCase().includes(term)
      )
    }
    return list
  }, [pendencias, filterResponsavelId, filterStatus, searchTerm])

  const exportAsText = () => {
    const lines = [
      'PENDÊNCIAS - ' + new Date().toLocaleDateString('pt-BR'),
      '',
      'Data\tDescrição\tVeículo\tResponsável\tStatus\tMarcador\tData limite',
      ...filteredPendencias.map((p) =>
        [
          formatDate(p.createdAt),
          p.descricao.replace(/\t/g, ' '),
          vehicleLabel(p.vehicle).replace(/\t/g, ' '),
          p.responsavel?.name ?? '-',
          statusLabel(p.status),
          p.marcador || '-',
          formatDate(p.dataLimite),
        ].join('\t')
      ),
    ]
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pendencias_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
    setToast({ message: 'Exportado como texto', type: 'success' })
  }

  const exportAsCsv = () => {
    const header = 'Data;Descrição;Veículo;Responsável;Status;Marcador;Data limite'
    const rows = filteredPendencias.map((p) =>
      [
        formatDate(p.createdAt),
        `"${(p.descricao || '').replace(/"/g, '""')}"`,
        `"${vehicleLabel(p.vehicle).replace(/"/g, '""')}"`,
        `"${(p.responsavel?.name ?? '').replace(/"/g, '""')}"`,
        statusLabel(p.status),
        p.marcador || '',
        formatDate(p.dataLimite),
      ].join(';')
    )
    const blob = new Blob(['\ufeff' + [header, ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pendencias_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportOpen(false)
    setToast({ message: 'Exportado como CSV', type: 'success' })
  }

  const handlePrint = () => {
    setExportOpen(false)
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setToast({ message: 'Permita pop-ups para imprimir', type: 'error' })
      return
    }
    const title = 'Pendências - ' + new Date().toLocaleDateString('pt-BR')
    const rows = filteredPendencias.map(
      (p) =>
        `<tr><td>${formatDate(p.createdAt)}</td><td>${p.descricao}</td><td>${vehicleLabel(p.vehicle)}</td><td>${p.responsavel?.name ?? '-'}</td><td>${statusLabel(p.status)}</td><td>${p.marcador || '-'}</td><td>${formatDate(p.dataLimite)}</td></tr>`
    )
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:sans-serif;padding:16px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f5f5f5;}</style>
      </head><body><h1>${title}</h1><table><thead><tr><th>Data</th><th>Descrição</th><th>Veículo</th><th>Responsável</th><th>Status</th><th>Marcador</th><th>Data limite</th></tr></thead><tbody>${rows.join('')}</tbody></table></body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
  }

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <Layout>
      <div className="space-y-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FiAlertCircle className="text-amber-500" />
              Pendências
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Cadastro de pendências por veículo</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                <FiDownload className="w-4 h-4" />
                Exportar
                <FiChevronDown className="w-4 h-4" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    type="button"
                    onClick={exportAsText}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Como texto (.txt)
                  </button>
                  <button
                    type="button"
                    onClick={exportAsCsv}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Como CSV
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              <FiPrinter className="w-4 h-4" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <FiPlus className="w-4 h-4" />
              Criar
            </button>
            <button
              onClick={loadPendencias}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Filtros e busca */}
        {!loading && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-2">
            <div className="flex flex-wrap items-end gap-1.5">
              <div className="w-20">
                <label className="block text-[11px] font-medium text-gray-600 mb-0">Responsável</label>
                <select
                  value={filterResponsavelId}
                  onChange={(e) => setFilterResponsavelId(e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                >
                  <option value="">Todos</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="block text-[11px] font-medium text-gray-600 mb-0">Situação</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                >
                  <option value="">Todas</option>
                  {STATUS_OPCOES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="block text-[11px] font-medium text-gray-600 mb-0">Marcador</label>
                <input
                  type="text"
                  value={filterMarcador}
                  onChange={(e) => setFilterMarcador(e.target.value)}
                  placeholder="..."
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                />
              </div>
              <div className="flex-1 min-w-[90px] max-w-[140px]">
                <label className="block text-[11px] font-medium text-gray-600 mb-0">Busca</label>
                <div className="relative">
                  <FiSearch className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Descrição, veículo..."
                    className="w-full pl-5 pr-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Data</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Descrição</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Veículo</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Responsável</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Usuário</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Marcador</th>
                    <th className="px-2 py-1.5 text-left text-[11px] font-semibold text-gray-600 uppercase">Data limite</th>
                    <th className="px-2 py-1.5 text-right text-[11px] font-semibold text-gray-600 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPendencias.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-4 text-center text-xs text-gray-500">
                        {pendencias.length === 0
                          ? 'Nenhuma pendência cadastrada. Clique em Criar para adicionar.'
                          : 'Nenhum resultado para os filtros aplicados.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPendencias.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                        <td className="px-2 py-1.5 text-gray-900 max-w-[160px] truncate">{p.descricao}</td>
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap max-w-[120px] truncate">{vehicleLabel(p.vehicle)}</td>
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap max-w-[100px] truncate">{p.responsavel?.name ?? '-'}</td>
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap max-w-[100px] truncate">{p.responsavel?.name ?? '-'}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800">
                            {statusLabel(p.status)}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap max-w-[80px] truncate">{p.marcador || '-'}</td>
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap">{formatDate(p.dataLimite)}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => openView(p)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                              title="Visualizar"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal(p)}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                              title="Editar"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Deletar"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
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
      </div>

      {/* Modal Criar/Editar Pendência */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Editar Pendência' : 'Dados da Pendência'}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitPendencia} className="p-4 space-y-4">
                <div ref={vehicleSearchRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veículo</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.vehicleSearch}
                      onChange={(e) => {
                        setFormData({ ...formData, vehicleSearch: e.target.value })
                        if (!e.target.value) setFormData((f) => ({ ...f, vehicleId: '' }))
                      }}
                      onFocus={() => vehicleSearchResults.length > 0 && setVehicleSearchOpen(true)}
                      placeholder="Buscar por marca, modelo ou placa (digite ao menos 2 caracteres)"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                    {vehicleSearchOpen && vehicleSearchResults.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {vehicleSearchResults.map((v) => (
                          <li key={v.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  vehicleId: String(v.id),
                                  vehicleSearch: `${v.brand} ${v.model} ${v.year}${v.plate ? ` – ${v.plate}` : ''}`,
                                })
                                setVehicleSearchOpen(false)
                                setVehicleSearchResults([])
                              }}
                            >
                              {v.brand} {v.model} {v.year}{v.plate ? ` – ${v.plate}` : ''}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {formData.vehicleId && (
                    <p className="text-xs text-gray-500 mt-1">Veículo selecionado</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsável *</label>
                  <select
                    value={formData.responsavelId}
                    onChange={(e) => setFormData({ ...formData, responsavelId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione o responsável</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusForm })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    {STATUS_OPCOES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email para / Enviar email para</label>
                  <input
                    type="email"
                    value={formData.emailPara}
                    onChange={(e) => setFormData({ ...formData, emailPara: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    rows={3}
                    placeholder="Descreva a pendência"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data limite</label>
                  <input
                    type="date"
                    value={formData.dataLimite}
                    onChange={(e) => setFormData({ ...formData, dataLimite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">dd/mm/aaaa</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marcador</label>
                  <input
                    type="text"
                    value={formData.marcador}
                    onChange={(e) => setFormData({ ...formData, marcador: e.target.value })}
                    placeholder="Tag ou marcador"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar pendência'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Modal Visualizar */}
      {showViewModal && viewPendencia && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowViewModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Detalhes da Pendência</h2>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <p><span className="font-medium text-gray-700">Data:</span> {formatDate(viewPendencia.createdAt)}</p>
                <p><span className="font-medium text-gray-700">Descrição:</span> {viewPendencia.descricao}</p>
                <p><span className="font-medium text-gray-700">Veículo:</span> {vehicleLabel(viewPendencia.vehicle)}</p>
                <p><span className="font-medium text-gray-700">Responsável:</span> {viewPendencia.responsavel?.name ?? '-'}</p>
                <p><span className="font-medium text-gray-700">Usuário:</span> {viewPendencia.responsavel?.name ?? '-'}</p>
                <p><span className="font-medium text-gray-700">Status:</span> {statusLabel(viewPendencia.status)}</p>
                <p><span className="font-medium text-gray-700">Marcador:</span> {viewPendencia.marcador || '-'}</p>
                <p><span className="font-medium text-gray-700">Data limite:</span> {formatDate(viewPendencia.dataLimite)}</p>
                {viewPendencia.emailPara && (
                  <p><span className="font-medium text-gray-700">Email para:</span> {viewPendencia.emailPara}</p>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setShowViewModal(false); openModal(viewPendencia); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={confirmDeleteId != null}
        title="Excluir pendência"
        message="Tem certeza que deseja excluir esta pendência? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Layout>
  )
}
