import { Prisma } from '@/app/generated/prisma/client';
import prisma from '@/lib/prisma';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotentResult = {
  status: number;
  body: unknown;
};

export async function runIdempotent(
  key: string | null,
  handler: () => Promise<IdempotentResult>,
): Promise<IdempotentResult> {
  if (!key?.trim()) {
    return handler();
  }

  const trimmedKey = key.trim();
  const now = new Date();

  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key: trimmedKey },
  });

  if (existing && existing.expiresAt > now) {
    return { status: existing.statusCode, body: existing.body };
  }

  if (existing) {
    await prisma.idempotencyRecord.delete({ where: { key: trimmedKey } });
  }

  const result = await handler();

  try {
    await prisma.idempotencyRecord.create({
      data: {
        key: trimmedKey,
        statusCode: result.status,
        body: result.body as Prisma.InputJsonValue,
        expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const raced = await prisma.idempotencyRecord.findUnique({
        where: { key: trimmedKey },
      });
      if (raced) {
        return { status: raced.statusCode, body: raced.body };
      }
    }
    throw error;
  }

  return result;
}

export async function purgeExpiredIdempotencyRecords() {
  await prisma.idempotencyRecord.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
