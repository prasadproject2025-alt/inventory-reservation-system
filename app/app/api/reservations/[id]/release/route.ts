import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { expireReservationIfNeeded, releaseReservation } from '@/lib/reservations';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  const reservation = await prisma.$transaction(async (tx) => {
    const found = await tx.reservation.findUnique({ where: { id } });
    if (!found) {
      return null;
    }
    return expireReservationIfNeeded(tx, found);
  });

  if (!reservation) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (reservation.status === 'RELEASED') {
    return new NextResponse('Reservation expired', { status: 410 });
  }
  if (reservation.status === 'CONFIRMED') {
    return new NextResponse('Cannot release a confirmed reservation', { status: 400 });
  }
  if (reservation.status !== 'PENDING') {
    return new NextResponse('Invalid reservation state', { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await releaseReservation(tx, reservation);
    });
    return new NextResponse('Released', { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message === 'RESERVATION_STATE_CHANGED' ||
        err.message === 'INVENTORY_MISMATCH'
      ) {
        return new NextResponse('Reservation state invalid', { status: 409 });
      }
    }
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
