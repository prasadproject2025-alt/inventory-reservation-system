'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type ReservationDetail = {
  id: string;
  quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED';
  expiresAt: string;
  product: { sku: string; name: string };
  warehouse: { name: string };
};

export default function ReservationPage() {
  const params = useParams();
  const reservationId = params?.id as string | undefined;
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const expiresIn = useMemo(() => {
    if (!reservation) return 0;
    const diff = Math.max(0, new Date(reservation.expiresAt).getTime() - now.getTime());
    return Math.floor(diff / 1000);
  }, [now, reservation]);

  const humanTime = useMemo(() => {
    const seconds = expiresIn;
    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    return `${minutes}:${remSeconds.toString().padStart(2, '0')}`;
  }, [expiresIn]);

  const loadReservation = async () => {
    if (!reservationId) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/reservations/${reservationId}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setReservation(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load reservation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservation();
  }, [reservationId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'confirm' | 'release') => {
    if (!reservationId) return;
    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/reservations/${reservationId}/${action}`, {
        method: 'POST',
      });

      if (res.status === 409 || res.status === 410) {
        setError(await res.text());
      } else if (!res.ok) {
        throw new Error(await res.text());
      } else {
        setMessage(action === 'confirm' ? 'Purchase confirmed.' : 'Reservation released.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to complete action');
    } finally {
      setActionLoading(false);
      await loadReservation();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-3xl font-semibold">Reservation details</h1>
          {loading ? (
            <p className="mt-4 text-slate-600">Loading reservation...</p>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : reservation ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Product</p>
                  <p className="mt-2 text-lg font-semibold">{reservation.product.name}</p>
                  <p className="text-slate-500">SKU {reservation.product.sku}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Warehouse</p>
                  <p className="mt-2 text-lg font-semibold">{reservation.warehouse.name}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Quantity</p>
                  <p className="mt-2 text-lg font-semibold">{reservation.quantity}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-2 text-lg font-semibold">{reservation.status}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Time until expiry</p>
                <p className="mt-2 text-3xl font-semibold">{humanTime}</p>
              </div>

              {message ? (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {message}
                </div>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleAction('confirm')}
                  disabled={actionLoading || reservation.status !== 'PENDING' || expiresIn <= 0}
                  className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Confirm purchase
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('release')}
                  disabled={actionLoading || reservation.status !== 'PENDING'}
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Cancel reservation
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-slate-600">Reservation not found.</p>
          )}
        </div>
      </main>
    </div>
  );
}
