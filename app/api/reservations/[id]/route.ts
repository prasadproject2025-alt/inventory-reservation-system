import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { releaseReservation } from '../../../../lib/reservations';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const reservation = await prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({
      where: { id: params.id },
      include: { product: true, warehouse: true },
    });

    if (!r) {
      return null;
    }

    if (r.status === 'PENDING' && r.expiresAt < new Date()) {
      await releaseReservation(tx, r);
      return { ...r, status: 'RELEASED' };
    }

    return r;
  });

  if (!reservation) {
    return new NextResponse('Not found', { status: 404 });
  }

  return NextResponse.json(reservation);
}
