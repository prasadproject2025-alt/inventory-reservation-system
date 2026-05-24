import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cleanupExpiredReservations } from '@/lib/reservations';

export async function GET() {
  const inventories = await prisma.$transaction(async (tx) => {
    await cleanupExpiredReservations(tx);
    return tx.inventory.findMany({
      include: { product: true, warehouse: true },
    });
  });

  const productsMap = new Map<
    string,
    {
      id: number;
      sku: string;
      name: string;
      warehouses: Array<{
        warehouseId: number;
        warehouseName: string;
        total: number;
        reserved: number;
        available: number;
      }>;
    }
  >();

  for (const inv of inventories) {
    const pid = String(inv.product.id);
    if (!productsMap.has(pid)) {
      productsMap.set(pid, {
        id: inv.product.id,
        sku: inv.product.sku,
        name: inv.product.name,
        warehouses: [],
      });
    }
    productsMap.get(pid)!.warehouses.push({
      warehouseId: inv.warehouse.id,
      warehouseName: inv.warehouse.name,
      total: inv.total,
      reserved: inv.reserved,
      available: inv.total - inv.reserved,
    });
  }

  return NextResponse.json({ products: Array.from(productsMap.values()) });
}
