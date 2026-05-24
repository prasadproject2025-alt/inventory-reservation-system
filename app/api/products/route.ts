import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function GET() {
  const inventories = await prisma.inventory.findMany({
    include: { product: true, warehouse: true },
  });

  // group by product
  const productsMap = new Map<string, any>();

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
    productsMap.get(pid).warehouses.push({
      warehouseId: inv.warehouse.id,
      warehouseName: inv.warehouse.name,
      total: inv.total,
      reserved: inv.reserved,
      available: inv.total - inv.reserved,
    });
  }

  const products = Array.from(productsMap.values());
  return NextResponse.json({ products });
}
