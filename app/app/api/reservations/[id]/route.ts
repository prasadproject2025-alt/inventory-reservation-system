import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { expireReservationIfNeeded } from '@/lib/reservations';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  const reservation = await prisma.$transaction(async (tx) => {
    const found = await tx.reservation.findUnique({
      where: { id },
      include: { product: true, warehouse: true },
    });
    if (!found) {
      return null;
    }
    return expireReservationIfNeeded(tx, found);
  });

  if (!reservation) {
    return new NextResponse('Not found', { status: 404 });
  }

  return NextResponse.json(reservation);
}
