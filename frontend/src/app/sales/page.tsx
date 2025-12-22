'use client'

import Layout from '@/components/Layout'

export default function SalesPage() {
  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vendas</h1>
          <p className="text-gray-600">Gestão de vendas</p>
          
          <div className="mt-8">
            <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
              Nova Venda
            </button>
            
            <div className="mt-6">
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  <li className="px-6 py-4">
                    <p className="text-sm text-gray-500">Nenhuma venda cadastrada</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
