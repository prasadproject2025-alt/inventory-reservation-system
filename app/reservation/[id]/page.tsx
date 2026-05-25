'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Reservation {
  id: string
  quantity: number
  status: string
  expiresAt: string
  product: { name: string; price: number }
  warehouse: { name: string }
}

export default function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then(res => res.json())
      .then(data => setReservation(data))
  }, [id])

  useEffect(() => {
    if (!reservation) return
    const interval = setInterval(() => {
      const diff = new Date(reservation.expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Expired')
        clearInterval(interval)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [reservation])

  async function confirm() {
    const res = await fetch(`/api/reservations/${id}/confirm`, {
      method: 'POST'
    })
    if (res.status === 410) {
      setMessage('Reservation expired!')
      return
    }
    setMessage('Purchase confirmed!')
    setReservation(prev => prev ? { ...prev, status: 'CONFIRMED' } : null)
  }

  async function cancel() {
    await fetch(`/api/reservations/${id}/release`, {
      method: 'POST'
    })
    setMessage('Reservation cancelled.')
    setReservation(prev => prev ? { ...prev, status: 'RELEASED' } : null)
  }

  if (!reservation) return (
    <main className="p-8 max-w-lg mx-auto">
      <p className="text-gray-500">Loading...</p>
    </main>
  )

  return (
    <main className="p-8 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{reservation.product?.name}</h2>
          <p className="text-gray-500">{reservation.warehouse?.name}</p>
        </div>

        <div className="flex justify-between">
          <span>Quantity</span>
          <span>{reservation.quantity}</span>
        </div>

        <div className="flex justify-between">
          <span>Status</span>
          <span className={
            reservation.status === 'CONFIRMED' ? 'text-green-600' :
            reservation.status === 'RELEASED' ? 'text-red-600' :
            'text-yellow-600'
          }>
            {reservation.status}
          </span>
        </div>

        {reservation.status === 'PENDING' && (
          <div className="flex justify-between items-center bg-yellow-50 rounded p-3">
            <span>Time remaining</span>
            <span className="font-mono font-bold text-yellow-700">{timeLeft}</span>
          </div>
        )}

        {message && (
          <div className="bg-blue-50 text-blue-700 rounded p-3 text-center font-medium">
            {message}
          </div>
        )}

        {reservation.status === 'PENDING' && (
          <div className="flex gap-4 pt-2">
            <button
              onClick={confirm}
              className="flex-1 bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700"
            >
              Confirm purchase
            </button>
            <button
              onClick={cancel}
              className="flex-1 bg-red-100 text-red-700 py-3 rounded font-semibold hover:bg-red-200"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => router.push('/')}
        className="mt-6 text-blue-600 hover:underline"
      >
        Back to products
      </button>
    </main>
  )
}