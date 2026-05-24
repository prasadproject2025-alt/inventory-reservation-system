import type { Prisma, Reservation } from '@/app/generated/prisma/client';

export type DbTransaction = Prisma.TransactionClient;

export async function releaseReservation(tx: DbTransaction, reservation: Reservation) {
  const updatedReservation = await tx.reservation.updateMany({
    where: { id: reservation.id, status: 'PENDING' },
    data: { status: 'RELEASED' },
  });

  if (updatedReservation.count === 0) {
    throw new Error('RESERVATION_STATE_CHANGED');
  }

  const updated = await tx.$executeRaw`
    UPDATE "Inventory"
    SET "reserved" = "reserved" - ${reservation.quantity}
    WHERE "productId" = ${reservation.productId}
      AND "warehouseId" = ${reservation.warehouseId}
      AND "reserved" >= ${reservation.quantity};
  `;

  if (Number(updated) === 0) {
    throw new Error('INVENTORY_MISMATCH');
  }
}

export async function cleanupExpiredReservations(tx: DbTransaction) {
  const expired = await tx.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
  });

  if (expired.length === 0) {
    return 0;
  }

  const releaseIds = expired.map((reservation) => reservation.id);

  await tx.reservation.updateMany({
    where: { id: { in: releaseIds }, status: 'PENDING' },
    data: { status: 'RELEASED' },
  });

  const groups = expired.reduce(
    (acc, reservation) => {
      const key = `${reservation.productId}:${reservation.warehouseId}`;
      const existing = acc.get(key) ?? {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
        quantity: 0,
      };
      existing.quantity += reservation.quantity;
      acc.set(key, existing);
      return acc;
    },
    new Map<string, { productId: number; warehouseId: number; quantity: number }>(),
  );

  for (const { productId, warehouseId, quantity } of groups.values()) {
    await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reserved" = "reserved" - ${quantity}
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
        AND "reserved" >= ${quantity};
    `;
  }

  return expired.length;
}

export async function expireReservationIfNeeded(
  tx: DbTransaction,
  reservation: Reservation & { product?: unknown; warehouse?: unknown },
) {
  if (reservation.status === 'PENDING' && reservation.expiresAt < new Date()) {
    await releaseReservation(tx, reservation);
    return { ...reservation, status: 'RELEASED' as const };
  }
  return reservation;
}
