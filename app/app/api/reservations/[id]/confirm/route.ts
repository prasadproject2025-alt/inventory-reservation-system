import { NextResponse } from 'next/server';
import { runIdempotent } from '@/lib/idempotency';
import prisma from '@/lib/prisma';
import { expireReservationIfNeeded } from '@/lib/reservations';

type RouteParams = { params: Promise<{ id: string }> };

function textFromIdempotent(result: { status: number; body: unknown }) {
  const message = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
  return new NextResponse(message, { status: result.status });
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const idempotencyKey = req.headers.get('Idempotency-Key');

  try {
    const result = await runIdempotent(idempotencyKey, async () => {
      const reservation = await prisma.$transaction(async (tx) => {
        const found = await tx.reservation.findUnique({ where: { id } });
        if (!found) {
          return null;
        }
        return expireReservationIfNeeded(tx, found);
      });

      if (!reservation) {
        return { status: 404, body: 'Not found' };
      }
      if (reservation.status === 'RELEASED') {
        return { status: 410, body: 'Reservation expired' };
      }
      if (reservation.status === 'CONFIRMED') {
        return { status: 200, body: 'Already confirmed' };
      }
      if (reservation.status !== 'PENDING') {
        return { status: 400, body: 'Invalid reservation state' };
      }

      try {
        await prisma.$transaction(async (tx) => {
          const updateCount = await tx.reservation.updateMany({
            where: { id, status: 'PENDING' },
            data: { status: 'CONFIRMED' },
          });

          if (updateCount.count === 0) {
            throw new Error('RESERVATION_STATE_CHANGED');
          }

          const updated = await tx.$executeRaw`
            UPDATE "Inventory"
            SET "reserved" = "reserved" - ${reservation.quantity},
                "total" = "total" - ${reservation.quantity}
            WHERE "productId" = ${reservation.productId}
              AND "warehouseId" = ${reservation.warehouseId}
              AND "reserved" >= ${reservation.quantity}
              AND "total" >= ${reservation.quantity};
          `;

          if (Number(updated) === 0) {
            throw new Error('INVENTORY_MISMATCH');
          }
        });

        return { status: 200, body: 'Confirmed' };
      } catch (err) {
        if (err instanceof Error) {
          if (
            err.message === 'INVENTORY_MISMATCH' ||
            err.message === 'RESERVATION_STATE_CHANGED'
          ) {
            return { status: 409, body: 'Inventory state invalid' };
          }
        }
        throw err;
      }
    });

    return textFromIdempotent(result);
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
