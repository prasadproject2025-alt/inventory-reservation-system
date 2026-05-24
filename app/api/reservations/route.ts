import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function POST(req: Request) {
  const body = await req.json();
  const { productId, warehouseId, quantity } = body;
  const qty = Number(quantity || 0);
  if (!productId || !warehouseId || qty <= 0) {
    return new NextResponse('Invalid request', { status: 400 });
  }

  // find inventory row
  const inventory = await prisma.inventory.findUnique({
    where: { productId_warehouseId: { productId: Number(productId), warehouseId: Number(warehouseId) } },
  });
  if (!inventory) return new NextResponse('Inventory not found', { status: 404 });

  try {
    const reservation = await prisma.$transaction(async (tx: any) => {
      // atomically increment reserved only if enough available
      const updated = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reserved" = "reserved" + ${qty}
        WHERE "id" = ${inventory.id} AND ("total" - "reserved") >= ${qty};
      `;

      if (Number(updated) === 0) {
        throw new Error('INSUFFICIENT');
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const r = await tx.reservation.create({
        data: {
          productId: inventory.productId,
          warehouseId: inventory.warehouseId,
          quantity: qty,
          expiresAt,
        },
      });

      return r;
    });

    return NextResponse.json(reservation);
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT') {
      return new NextResponse('Not enough stock', { status: 409 });
    }
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
