import { NextResponse } from 'next/server';
import { runIdempotent } from '@/lib/idempotency';
import prisma from '@/lib/prisma';
import { cleanupExpiredReservations } from '@/lib/reservations';
import { createReservationSchema } from '@/lib/validation';

const RESERVATION_TTL_MS = 10 * 60 * 1000;

function jsonFromIdempotent(result: { status: number; body: unknown }) {
  if (typeof result.body === 'string') {
    return new NextResponse(result.body, { status: result.status });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON body', { status: 400 });
  }

  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { productId, warehouseId, quantity } = parsed.data;
  const idempotencyKey = req.headers.get('Idempotency-Key');

  try {
    const result = await runIdempotent(idempotencyKey, async () => {
      try {
        const reservation = await prisma.$transaction(async (tx) => {
          await cleanupExpiredReservations(tx);

          const inventory = await tx.inventory.findUnique({
            where: { productId_warehouseId: { productId, warehouseId } },
          });
          if (!inventory) {
            throw new Error('NOT_FOUND');
          }

          const updated = await tx.$executeRaw`
            UPDATE "Inventory"
            SET "reserved" = "reserved" + ${quantity}
            WHERE "id" = ${inventory.id}
              AND ("total" - "reserved") >= ${quantity};
          `;

          if (Number(updated) === 0) {
            throw new Error('INSUFFICIENT');
          }

          return tx.reservation.create({
            data: {
              productId: inventory.productId,
              warehouseId: inventory.warehouseId,
              quantity,
              expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
            },
          });
        });

        return { status: 201, body: reservation };
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'INSUFFICIENT') {
            return { status: 409, body: 'Not enough stock available' };
          }
          if (err.message === 'NOT_FOUND') {
            return { status: 404, body: 'Inventory not found for product/warehouse' };
          }
        }
        throw err;
      }
    });

    return jsonFromIdempotent(result);
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
