'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StockLevel {
  id: string
  totalUnits: number
  reservedUnits: number
  warehouse: { id: string; name: string; location: string }
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  stockLevels: StockLevel[]
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch products')
        return res.json()
      })
      .then(data => { setProducts(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  async function reserve(productId: string, warehouseId: string) {
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 })
      })

      if (res.status === 409) {
        alert('Sorry, not enough stock!')
        return
      }

      if (!res.ok) {
        const text = await res.text()
        alert('Error: ' + text)
        return
      }

      const reservation = await res.json()
      router.push(`/reservation/${reservation.id}`)
    } catch (err) {
      alert('Network error: ' + err)
    }
  }

  if (loading) return (
    <main className="p-8 max-w-4xl mx-auto">
      <p className="text-gray-500">Loading products...</p>
    </main>
  )

  if (error) return (
    <main className="p-8 max-w-4xl mx-auto">
      <p className="text-red-500">Error: {error}</p>
    </main>
  )

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Products</h1>
      <div className="grid grid-cols-1 gap-6">
        {products.map(product => (
          <div key={product.id} className="border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">{product.name}</h2>
                <p className="text-gray-500 mt-1">{product.description}</p>
              </div>
              <span className="text-xl font-bold text-blue-600">
                ₹{product.price}
              </span>
            </div>
            <div className="space-y-2">
              {product.stockLevels.map(stock => {
                const available = stock.totalUnits - stock.reservedUnits
                return (
                  <div
                    key={stock.id}
                    className="flex justify-between items-center bg-gray-50 rounded p-3"
                  >
                    <div>
                      <span className="font-medium">{stock.warehouse.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {available} units available
                      </span>
                    </div>
                    <button
                      onClick={() => reserve(product.id, stock.warehouse.id)}
                      disabled={available === 0}
                      className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                      {available === 0 ? 'Out of stock' : 'Reserve'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}