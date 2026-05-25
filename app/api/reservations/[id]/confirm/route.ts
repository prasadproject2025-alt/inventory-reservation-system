import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const reservation = await prisma.reservation.findUnique({
    where: { id }
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (new Date() > reservation.expiresAt) {
    return NextResponse.json({ error: 'Reservation expired' }, { status: 410 })
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: 'CONFIRMED' }
  })

  return NextResponse.json(updated)
}