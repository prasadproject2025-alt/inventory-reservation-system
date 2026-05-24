import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const r = await prisma.reservation.findUnique({ where: { id } });
  if (!r) return new NextResponse('Not found', { status: 404 });

  const now = new Date();
  if (r.expiresAt < now) {
    return new NextResponse('Reservation expired', { status: 410 });
  }
  if (r.status !== 'PENDING') {
    return new NextResponse('Invalid reservation state', { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // decrement total and reserved atomically only if enough reserved/total exists
      const updated = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reserved" = "reserved" - ${r.quantity}, "total" = "total" - ${r.quantity}
        WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId} AND ("reserved" >= ${r.quantity}) AND ("total" >= ${r.quantity});
      `;

      if (Number(updated) === 0) {
        throw new Error('INSUFFICIENT');
      }

      await tx.reservation.update({ where: { id }, data: { status: 'CONFIRMED' } });
    });

    return new NextResponse('Confirmed', { status: 200 });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT') {
      return new NextResponse('Inventory state invalid', { status: 409 });
    }
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
