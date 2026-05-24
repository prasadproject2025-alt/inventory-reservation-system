import type { Reservation } from '../app/generated/prisma/client';

export async function releaseReservation(tx: any, reservation: Reservation) {
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
    WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId} AND "reserved" >= ${reservation.quantity};
  `;

  if (Number(updated) === 0) {
    throw new Error('INVENTORY_MISMATCH');
  }
}

export async function cleanupExpiredReservations(tx: any) {
  const expired = await tx.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
  });

  if (expired.length === 0) {
    return;
  }

  const releaseIds = expired.map((reservation: Reservation) => reservation.id);

  await tx.reservation.updateMany({
    where: { id: { in: releaseIds }, status: 'PENDING' },
    data: { status: 'RELEASED' },
  });

  const groups = expired.reduce((acc: Map<string, { productId: number; warehouseId: number; quantity: number }>, reservation: Reservation) => {
    const key = `${reservation.productId}:${reservation.warehouseId}`;
    const existing = acc.get(key) ?? { productId: reservation.productId, warehouseId: reservation.warehouseId, quantity: 0 };
    existing.quantity += reservation.quantity;
    acc.set(key, existing);
    return acc;
  }, new Map<string, { productId: number; warehouseId: number; quantity: number }>());

  for (const { productId, warehouseId, quantity } of groups.values()) {
    await tx.$executeRaw`
      UPDATE "Inventory"
      SET "reserved" = "reserved" - ${quantity}
      WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId} AND "reserved" >= ${quantity};
    `;
  }
}
