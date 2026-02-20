 'use client'

import React, { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { FiPlus, FiPrinter, FiFilter, FiTrash2, FiEye, FiEdit2 } from 'react-icons/fi'

type VehicleRow = {
  id: number
  brand?: string
  model?: string
  year?: number
  status?: string
  location?: string
  expectedReturn?: string | null
  locationId?: number | null
}

export default function LocationsPage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]) // for vehicle search
  const [rows, setRows] = useState<VehicleRow[]>([]) // location rows to display
  const [loading, setLoading] = useState(false)

  // Filters
  const [quickFilter, setQuickFilter] = useState<string>('') // atrasados, 7,15,30,30+, sem
  const [locationFilter, setLocationFilter] = useState('')
  const [yardFilter, setYardFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [situation, setSituation] = useState('') // cadastrado, estoque, devolvido, excluido, prevenda, vendido

  useEffect(() => {
    fetchRows()
    fetchVehiclesForSearch()
  }, [])

  const fetchVehiclesForSearch = async (params: Record<string, any> = {}) => {
    try {
      const response = await api.get('/vehicles', { params })
      setVehicles(response.data || [])
    } catch (err) {
      console.error('Erro ao carregar veículos para busca:', err)
      setVehicles([])
    }
  }

  const fetchRows = async (params: Record<string, any> = {}) => {
    try {
      setLoading(true)
      const response = await api.get('/locations', { params })
      const data = response.data || []
      const mapped = data.map((loc: any) => ({
        id: loc.id,
        vehicleId: loc.vehicle?.id || loc.vehicleId || null,
        brand: loc.vehicle?.brand || null,
        model: loc.vehicle?.model || null,
        year: loc.vehicle?.year || null,
        status: loc.status || loc.vehicle?.status || null,
        location: loc.location || '',
        expectedReturn: loc.expectedReturn || null,
        locationId: loc.id
      }))
      setRows(mapped)
    } catch (err) {
      console.error('Erro ao carregar localizações:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    const params: Record<string, any> = {}
    if (quickFilter) params.quick = quickFilter
    if (locationFilter) params.location = locationFilter
    if (yardFilter) params.yard = yardFilter
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (situation) params.situation = situation
    fetchRows(params)
  }

  const handleClearFilters = () => {
    setQuickFilter('')
    setLocationFilter('')
    setYardFilter('')
    setStartDate('')
    setEndDate('')
    setSituation('')
    fetchRows()
  }

  const handlePrint = () => {
    // Simple print of the current page / table area
    window.print()
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [modalVehicleId, setModalVehicleId] = useState<number | null>(null)
  const [moveVehicle, setMoveVehicle] = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [availableLocations, setAvailableLocations] = useState<string[]>(['Nenhum'])
  const [modalExpectedReturn, setModalExpectedReturn] = useState('')
  const [modalSituation, setModalSituation] = useState<string>('')
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null)

  const handleCreate = () => {
    // Open create modal
    setModalMode('create')
    setEditingLocationId(null)
    setSelectedLocation('')
    setModalExpectedReturn('')
    setMoveVehicle(false)
    setModalSituation('')
    setModalOpen(true)
    // start with empty search so user types to find vehicle
    setModalVehicleId(null)
    setVehicleSearch('')
  }

  const handleIncludeLocation = () => {
    const val = newLocation.trim()
    if (!val) return
    if (!availableLocations.includes(val)) {
      setAvailableLocations(prev => [...prev, val])
      setSelectedLocation(val)
      setNewLocation('')
    }
  }

  const handleModalSubmit = async () => {
    if (!modalVehicleId) {
      alert('Selecione um veículo')
      return
    }
    if (!selectedLocation || selectedLocation === 'Nenhum') {
      alert('Selecione ou adicione uma localização')
      return
    }
    try {
      const payload = {
        vehicleId: modalVehicleId,
        location: selectedLocation,
        yard: null,
        expectedReturn: modalExpectedReturn || null,
        status: modalSituation || null,
        notes: ''
      }
      if (modalMode === 'edit' && editingLocationId) {
        await api.put(`/locations/${editingLocationId}`, payload)
      } else if (modalMode === 'create') {
        await api.post('/locations', payload)
      }
      setModalOpen(false)
      setModalMode('create')
      setEditingLocationId(null)
      // refresh list
      handleApplyFilters()
    } catch (err) {
      console.error('Erro ao criar localização:', err)
      alert('Erro ao criar localização')
    }
  }

  const handleViewClick = async (id: number) => {
    try {
      const res = await api.get(`/locations/${id}`)
      const loc = res.data
      setModalMode('view')
      setEditingLocationId(id)
      setModalVehicleId(loc.vehicleId || null)
      setVehicleSearch(loc.vehicle ? `${loc.vehicle.brand} ${loc.vehicle.model} ${loc.vehicle.year || ''}` : '')
      setSelectedLocation(loc.location || '')
      setModalExpectedReturn(loc.expectedReturn ? new Date(loc.expectedReturn).toISOString().split('T')[0] : '')
      setModalSituation(loc.status || '')
      setMoveVehicle(false)
      setModalOpen(true)
    } catch (e) {
      console.error('Erro ao buscar location:', e)
      alert('Erro ao buscar localização')
    }
  }

  const handleEditClick = async (id: number) => {
    try {
      const res = await api.get(`/locations/${id}`)
      const loc = res.data
      setModalMode('edit')
      setEditingLocationId(id)
      setModalVehicleId(loc.vehicleId || null)
      setVehicleSearch(loc.vehicle ? `${loc.vehicle.brand} ${loc.vehicle.model} ${loc.vehicle.year || ''}` : '')
      setSelectedLocation(loc.location || '')
      setModalExpectedReturn(loc.expectedReturn ? new Date(loc.expectedReturn).toISOString().split('T')[0] : '')
      setModalSituation(loc.status || '')
      setMoveVehicle(false)
      setModalOpen(true)
    } catch (e) {
      console.error('Erro ao buscar location:', e)
      alert('Erro ao buscar localização')
    }
  }

  const handleDeleteClick = async (id: number) => {
    if (!confirm('Confirma remoção desta localização?')) return
    try {
      await api.delete(`/locations/${id}`)
      handleApplyFilters()
    } catch (e) {
      console.error('Erro ao deletar location:', e)
      alert('Erro ao deletar localização')
    }
  }

  return (
    <Layout>
      <div className="bg-gray-50 p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Localização de Veículos</h1>
            <p className="text-sm text-gray-600 mt-1">Gerencie a posição e previsão de retorno dos veículos</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="px-3 py-2 bg-primary-600 text-white rounded-md flex items-center gap-2 text-sm"
            >
              <FiPlus />
              Criar
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-gray-700 text-white rounded-md flex items-center gap-2 text-sm"
            >
              <FiPrinter />
              Imprimir
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FiFilter /> Filtros rápidos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="col-span-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'atrasados', label: 'Atrasados' },
                  { key: '7', label: 'Previsão até 7 dias' },
                  { key: '15', label: 'Previsão até 15 dias' },
                  { key: '30', label: 'Previsão até 30 dias' },
                  { key: '30plus', label: 'Previsão + de 30 dias' },
                  { key: 'sem', label: 'Sem previsão' }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setQuickFilter(item.key)}
                    className={`px-2 py-1 text-xs rounded ${quickFilter === item.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Localização</label>
              <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
            </div>

            <div>
              <label className="text-xs text-gray-600">Pátio</label>
              <input value={yardFilter} onChange={(e) => setYardFilter(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-600">Previsão retorno - De</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Até</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Situação veículo</label>
              <select value={situation} onChange={(e)=>setSituation(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                <option value="">Todos</option>
                <option value="cadastrado">Cadastrado</option>
                <option value="estoque">Estoque</option>
                <option value="devolvido">Devolvido</option>
                <option value="excluido">Excluído</option>
                <option value="prevenda">Pré venda</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleApplyFilters} className="px-3 py-2 bg-primary-600 text-white rounded text-sm">Aplicar filtros</button>
            <button onClick={handleClearFilters} className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm">Limpar</button>
          </div>
        </div>

        {/* Tabela de resultados */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4">
          {/* Modal de criação */}
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
              <div className="absolute inset-0 bg-black opacity-40" onClick={() => setModalOpen(false)} />
              <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg shadow-lg p-4 text-gray-900">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Criação de localização de veículo</h3>
                  <button onClick={() => setModalOpen(false)} className="text-gray-900 hover:text-gray-700">Fechar</button>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <label className="text-xs text-gray-900">Veículo *</label>
                    <input
                      type="text"
                      value={vehicleSearch}
                      onChange={(e) => { setVehicleSearch(e.target.value); setShowVehicleDropdown(true); setModalVehicleId(null) }}
                      onFocus={() => setShowVehicleDropdown(true)}
                      placeholder="Pesquisar veículo (marca, modelo, ano, placa)"
                      className="w-full px-2 py-1 border rounded text-sm text-gray-900 bg-white"
                    />
                    {showVehicleDropdown && vehicleSearch.trim().length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-auto bg-white border rounded shadow-sm text-sm">
                        {vehicles
                          .filter(v => {
                            const term = (vehicleSearch || '').toLowerCase().trim()
                            if (!term) return false
                            const text = `${v.brand} ${v.model} ${v.year || ''} ${v.status || ''}`.toLowerCase()
                            return text.includes(term)
                          })
                          .slice(0, 50)
                          .map(v => (
                            <li
                              key={v.id}
                              onClick={() => { setModalVehicleId(v.id); setVehicleSearch(`${v.brand} ${v.model} ${v.year || ''}`); setModalSituation(v.status || ''); setShowVehicleDropdown(false) }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                            >
                              {v.brand} {v.model} {v.year ? `(${v.year})` : ''} {v.status ? ` - ${v.status}` : ''}
                            </li>
                          ))
                        }
                        {vehicleSearch.trim().length > 0 && vehicles.filter(v => {
                            const term = (vehicleSearch || '').toLowerCase().trim()
                            const text = `${v.brand} ${v.model} ${v.year || ''} ${v.status || ''}`.toLowerCase()
                            return text.includes(term)
                          }).length === 0 && (
                          <li className="px-3 py-2 text-gray-500">Nenhum veículo encontrado</li>
                        )}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-900">Situação veículo</label>
                    <select value={modalSituation} onChange={(e)=>setModalSituation(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                      <option value="">Selecione</option>
                      <option value="cadastrado">Cadastrado</option>
                      <option value="estoque">Estoque</option>
                      <option value="devolvido">Devolvido</option>
                      <option value="excluido">Excluído</option>
                      <option value="pre_venda">Pré venda</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-900">Localização *</label>
                    <div className="flex gap-2">
                      <select value={selectedLocation} onChange={(e)=>setSelectedLocation(e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm">
                        {availableLocations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
                      </select>
                      <input value={newLocation} onChange={(e)=>setNewLocation(e.target.value)} placeholder="Adicionar Localização" className="px-2 py-1 border rounded text-sm" />
                      <button onClick={handleIncludeLocation} className="px-3 py-1 bg-primary-600 text-white rounded text-sm">Incluir</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-900">Previsão retorno</label>
                    <input type="date" value={modalExpectedReturn} onChange={(e)=>setModalExpectedReturn(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                  </div>

                  <div>
                    <label className="text-xs text-gray-900 font-medium">Histórico de localização</label>
                    <div className="mt-2 text-sm text-gray-900">
                      Nenhum histórico de movimentação deste veículo.
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={()=>setModalOpen(false)} className="px-3 py-2 bg-gray-100 text-gray-900 rounded text-sm">Cancelar</button>
                    <button onClick={handleModalSubmit} className="px-3 py-2 bg-primary-600 text-white rounded text-sm">Salvar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-900">Veículos</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-900">Situação veículo</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-900">Localização</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-900">Previsão Retorno</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhuma localização encontrada</td></tr>
                ) : rows.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{v.brand} {v.model} {v.year ? `(${v.year})` : ''}</td>
                    <td className="px-4 py-2 text-gray-900">{v.status || '-'}</td>
                    <td className="px-4 py-2 text-gray-900">{v.location || '-'}</td>
                    <td className="px-4 py-2 text-gray-900">{v.expectedReturn ? new Date(v.expectedReturn).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button onClick={() => handleViewClick(v.id)} className="px-2 py-1 text-xs bg-gray-100 text-gray-900 rounded hover:bg-gray-200">Visualizar</button>
                      <button onClick={() => handleEditClick(v.id)} className="px-2 py-1 text-xs bg-yellow-100 text-gray-900 rounded hover:bg-yellow-200">Editar</button>
                      <button onClick={() => handleDeleteClick(v.id)} className="px-2 py-1 text-xs bg-red-100 text-gray-900 rounded hover:bg-red-200">Deletar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

