'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'

interface Brand {
  codigo: string
  nome: string
}

interface Model {
  codigo: string
  nome: string
}

interface Year {
  codigo: string
  nome: string
}

interface FipeData {
  valor: number
  marca: string
  modelo: string
  anoModelo: string
  combustivel: string
  codigoFipe: string
  mesReferencia: string
  tipoVeiculo: number
  siglaCombustivel: string
}

export default function FipePage() {
  const [vehicleType, setVehicleType] = useState<string>('carros') // 'carros', 'motos', 'caminhoes'
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [years, setYears] = useState<Year[]>([])
  
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [yearSearch, setYearSearch] = useState('')
  
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)
  const [loadingFipe, setLoadingFipe] = useState(false)
  
  const [fipeData, setFipeData] = useState<FipeData | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Quando trocar o tipo de veículo, limpar tudo e recarregar
  useEffect(() => {
    setSelectedBrand('')
    setSelectedModel('')
    setSelectedYear('')
    setBrands([])
    setModels([])
    setYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    setFipeData(null)
    loadBrands()
  }, [vehicleType])

  const loadBrands = async () => {
    setLoadingBrands(true)
    try {
      const response = await api.get(`/fipe/brands?type=${vehicleType}`)
      setBrands(response.data)
    } catch (error) {
      console.error('Erro ao carregar marcas:', error)
      setToast({ message: 'Erro ao carregar marcas', type: 'error' })
    } finally {
      setLoadingBrands(false)
    }
  }

  const loadModels = async (brandCode: string) => {
    if (!brandCode) return
    
    setLoadingModels(true)
    setModels([])
    setSelectedModel('')
    setSelectedYear('')
    setYears([])
    
    try {
      const response = await api.get(`/fipe/brands/${brandCode}/models?type=${vehicleType}`)
      setModels(response.data)
    } catch (error) {
      console.error('Erro ao carregar modelos:', error)
      setToast({ message: 'Erro ao carregar modelos', type: 'error' })
    } finally {
      setLoadingModels(false)
    }
  }

  const loadYears = async (brandCode: string, modelCode: string) => {
    if (!brandCode || !modelCode) return
    
    setLoadingYears(true)
    setYears([])
    setSelectedYear('')
    
    try {
      const response = await api.get(`/fipe/brands/${brandCode}/models/${modelCode}/years?type=${vehicleType}`)
      setYears(response.data)
    } catch (error) {
      console.error('Erro ao carregar anos:', error)
      setToast({ message: 'Erro ao carregar anos', type: 'error' })
    } finally {
      setLoadingYears(false)
    }
  }

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand.codigo)
    setBrandSearch(brand.nome)
    setShowBrandDropdown(false)
    loadModels(brand.codigo)
  }

  const handleModelSelect = (model: Model) => {
    if (!selectedBrand) return
    
    setSelectedModel(model.codigo)
    setModelSearch(model.nome)
    setShowModelDropdown(false)
    loadYears(selectedBrand, model.codigo)
  }

  const handleYearSelect = (year: Year) => {
    setSelectedYear(year.codigo)
    // Formatar nome do ano para exibição (ex: "2024/2024" -> "2024")
    const yearDisplay = year.nome.split('/')[0]?.split('-')[0] || year.nome
    setYearSearch(yearDisplay)
    setShowYearDropdown(false)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedBrand || !selectedModel || !selectedYear) {
      setToast({ message: 'Selecione marca, modelo e ano', type: 'error' })
      return
    }

    setLoadingFipe(true)
    setFipeData(null)
    
    try {
      const brand = brands.find(b => b.codigo === selectedBrand)
      const model = models.find(m => m.codigo === selectedModel)
      const year = years.find(y => y.codigo === selectedYear)
      
      if (!brand || !model || !year) {
        setToast({ message: 'Dados inválidos', type: 'error' })
        return
      }

      // Extrair o ano do nome (ex: "2024/2024" -> 2024 ou "2024-1" -> 2024)
      const yearNumber = parseInt(year.nome.split('/')[0]?.split('-')[0] || year.nome.split('-')[0] || year.nome)

      const response = await api.get('/fipe/search', {
        params: {
          brand: brand.nome,
          model: model.nome,
          year: yearNumber,
          type: vehicleType
        }
      })
      
      setFipeData(response.data)
      setToast({ message: 'Valor FIPE encontrado com sucesso!', type: 'success' })
    } catch (error: any) {
      console.error('Erro ao buscar valor FIPE:', error)
      const errorMessage = error.response?.data?.error || 'Erro ao buscar valor FIPE. Verifique se os dados estão corretos.'
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setLoadingFipe(false)
    }
  }

  const handleClear = () => {
    setSelectedBrand('')
    setSelectedModel('')
    setSelectedYear('')
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    setModels([])
    setYears([])
    setFipeData(null)
    setShowBrandDropdown(false)
    setShowModelDropdown(false)
    setShowYearDropdown(false)
  }

  const filteredBrands = brands.filter(brand =>
    brand.nome.toLowerCase().includes(brandSearch.toLowerCase())
  )

  const filteredModels = models.filter(model =>
    model.nome.toLowerCase().includes(modelSearch.toLowerCase())
  )

  const filteredYears = years.filter(year =>
    year.nome.toLowerCase().includes(yearSearch.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-2 h-full flex flex-col text-xs">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Consulta FIPE</h1>
            <p className="text-[11px] text-gray-600 mt-0.5">Consulte o valor da tabela FIPE de veículos</p>
          </div>
        </div>

        {/* Formulário de busca */}
        <div className="bg-white shadow rounded-lg p-2">
          <form onSubmit={handleSearch} className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-0.5">Tipo de Veículo *</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
              >
                <option value="carros">Carros</option>
                <option value="motos">Motos</option>
                <option value="caminhoes">Caminhões</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Select de Marca */}
              <div className="relative">
                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                  Marca *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={brandSearch}
                    onChange={(e) => {
                      setBrandSearch(e.target.value)
                      setShowBrandDropdown(true)
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                    placeholder="Digite para buscar..."
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  />
                  {loadingBrands && (
                    <div className="absolute right-2 top-1">
                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  {showBrandDropdown && filteredBrands.length > 0 && (
                    <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto text-xs">
                      {filteredBrands.map((brand) => (
                        <button
                          key={brand.codigo}
                          type="button"
                          onClick={() => handleBrandSelect(brand)}
                          className="w-full text-left px-2 py-1 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                        >
                          {brand.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Select de Modelo */}
              <div className="relative">
                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                  Modelo *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={modelSearch}
                    onChange={(e) => {
                      setModelSearch(e.target.value)
                      setShowModelDropdown(true)
                    }}
                    onFocus={() => selectedBrand && setShowModelDropdown(true)}
                    placeholder={selectedBrand ? "Digite para buscar..." : "Selecione uma marca primeiro"}
                    disabled={!selectedBrand || loadingModels}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                  />
                  {loadingModels && (
                    <div className="absolute right-2 top-1">
                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  {showModelDropdown && filteredModels.length > 0 && selectedBrand && (
                    <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto text-xs">
                      {filteredModels.map((model) => (
                        <button
                          key={model.codigo}
                          type="button"
                          onClick={() => handleModelSelect(model)}
                          className="w-full text-left px-2 py-1 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                        >
                          {model.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Select de Ano */}
              <div className="relative">
                <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
                  Ano *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={yearSearch}
                    onChange={(e) => {
                      setYearSearch(e.target.value)
                      setShowYearDropdown(true)
                    }}
                    onFocus={() => selectedModel && setShowYearDropdown(true)}
                    placeholder={selectedModel ? "Digite para buscar..." : "Selecione um modelo primeiro"}
                    disabled={!selectedModel || loadingYears}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                  />
                  {loadingYears && (
                    <div className="absolute right-2 top-1">
                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  {showYearDropdown && filteredYears.length > 0 && selectedModel && (
                    <div className="absolute z-10 w-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto text-xs">
                      {filteredYears.map((year) => {
                        // Formatar nome do ano (ex: "2024/2024" -> "2024")
                        const yearDisplay = year.nome.split('/')[0]?.split('-')[0] || year.nome
                        return (
                          <button
                            key={year.codigo}
                            type="button"
                            onClick={() => handleYearSelect(year)}
                            className="w-full text-left px-2 py-1 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                          >
                            {yearDisplay}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loadingFipe || !selectedBrand || !selectedModel || !selectedYear}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loadingFipe ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Consultar FIPE
                  </>
                )}
              </button>

              {(selectedBrand || selectedModel || selectedYear || fipeData) && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Limpar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Resultado da busca */}
        {fipeData && (
          <div className="bg-white shadow rounded-lg p-2">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Resultado da Consulta</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-primary-50 rounded p-2">
                <div className="text-[10px] text-gray-600 mb-0.5">Valor FIPE</div>
                <div className="text-xl font-bold text-primary-600">
                  R$ {fipeData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div>
                  <div className="text-[10px] text-gray-600">Veículo</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {fipeData.marca} {fipeData.modelo}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-600">Ano/Modelo</div>
                  <div className="text-sm text-gray-900">{fipeData.anoModelo}</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-600">Combustível</div>
                  <div className="text-sm text-gray-900">{fipeData.combustivel}</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-600">Código FIPE</div>
                  <div className="text-sm text-gray-900 font-mono">{fipeData.codigoFipe}</div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-600">Mês de Referência</div>
                  <div className="text-sm text-gray-900">{fipeData.mesReferencia}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-[11px] font-medium text-blue-900 mb-0.5">Como usar</h3>
              <ul className="text-[11px] text-blue-800 space-y-0.5">
                <li>1. Selecione a marca digitando para buscar</li>
                <li>2. Após selecionar a marca, os modelos serão carregados automaticamente</li>
                <li>3. Selecione o modelo digitando para buscar</li>
                <li>4. Após selecionar o modelo, os anos estarão disponíveis</li>
                <li>5. Selecione o ano e clique em &quot;Consultar FIPE&quot;</li>
              </ul>
            </div>
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

      {/* Overlay para fechar dropdowns ao clicar fora */}
      {(showBrandDropdown || showModelDropdown || showYearDropdown) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowBrandDropdown(false)
            setShowModelDropdown(false)
            setShowYearDropdown(false)
          }}
        />
      )}
    </Layout>
  )
}
