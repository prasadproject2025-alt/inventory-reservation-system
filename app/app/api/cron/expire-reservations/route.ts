import { NextResponse } from 'next/server';
import { purgeExpiredIdempotencyRecords } from '@/lib/idempotency';
import prisma from '@/lib/prisma';
import { cleanupExpiredReservations } from '@/lib/reservations';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const released = await prisma.$transaction(async (tx) => cleanupExpiredReservations(tx));
  await purgeExpiredIdempotencyRecords();

  return NextResponse.json({ ok: true, released });
}
