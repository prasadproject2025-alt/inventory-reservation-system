import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { releaseReservation } from '../../../../lib/reservations';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const reservation = await prisma.$transaction(async (tx) => {
    const r = await tx.reservation.findUnique({ where: { id } });
    if (!r) return null;

    if (r.status === 'PENDING' && r.expiresAt < new Date()) {
      await releaseReservation(tx, r);
      return { ...r, status: 'RELEASED' };
    }

    return r;
  });

  if (!reservation) return new NextResponse('Not found', { status: 404 });
  if (reservation.status === 'RELEASED') {
    return new NextResponse('Reservation expired', { status: 410 });
  }
  if (reservation.status !== 'PENDING') {
    return new NextResponse('Invalid reservation state', { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await releaseReservation(tx, reservation);
    });

    return new NextResponse('Released', { status: 200 });
  } catch (err: any) {
    if (err.message === 'RESERVATION_STATE_CHANGED' || err.message === 'INVENTORY_MISMATCH') {
      return new NextResponse('Reservation state invalid', { status: 409 });
    }
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
