'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type WarehouseStock = {
  warehouseId: number;
  warehouseName: string;
  total: number;
  reserved: number;
  available: number;
};

type Product = {
  id: number;
  sku: string;
  name: string;
  warehouses: WarehouseStock[];
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserveLoading, setReserveLoading] = useState<string | null>(null);
  const router = useRouter();

  const loadProducts = async () => {
    setError(null);
    try {
      const res = await fetch('/api/products');
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = await res.json();
      setProducts(json.products || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleReserve = async (productId: number, warehouseId: number) => {
    setError(null);
    setReserveLoading(`${productId}-${warehouseId}`);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });

      if (res.status === 409) {
        setError('Not enough stock available for that warehouse (409).');
        await loadProducts();
        return;
      }
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const reservation = await res.json();
      router.push(`/reservation/${reservation.id}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to create reservation');
    } finally {
      setReserveLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-3xl font-semibold tracking-tight">Inventory reservation</h1>
          <p className="mt-2 text-slate-600">
            Reserve one unit for checkout and confirm or cancel before the timer expires.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="space-y-6">
          {loading ? (
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">Loading products...</div>
          ) : (
            products.map((product) => (
              <section key={product.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">SKU {product.sku}</p>
                    <h2 className="text-xl font-semibold">{product.name}</h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {product.warehouses.map((warehouse) => (
                    <div key={warehouse.warehouseId} className="rounded-3xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">{warehouse.warehouseName}</p>
                          <p className="text-sm text-slate-500">Available: {warehouse.available}</p>
                        </div>
                        <button
                          type="button"
                          disabled={warehouse.available <= 0 || reserveLoading === `${product.id}-${warehouse.warehouseId}`}
                          onClick={() => handleReserve(product.id, warehouse.warehouseId)}
                          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {reserveLoading === `${product.id}-${warehouse.warehouseId}` ? 'Reserving…' : 'Reserve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
