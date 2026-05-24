import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const r = await prisma.reservation.findUnique({ where: { id } });
  if (!r) return new NextResponse('Not found', { status: 404 });

  if (r.status !== 'PENDING') {
    return new NextResponse('Invalid reservation state', { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // decrease reserved
      await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reserved" = "reserved" - ${r.quantity}
        WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId};
      `;

      await tx.reservation.update({ where: { id }, data: { status: 'RELEASED' } });
    });

    return new NextResponse('Released', { status: 200 });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
