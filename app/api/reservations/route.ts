import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { productId, warehouseId, quantity } = body

  if (!productId || !warehouseId || !quantity) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const stock = await prisma.stockLevel.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } }
    })

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
    }

    const available = stock.totalUnits - stock.reservedUnits

    if (available < quantity) {
      return NextResponse.json({ error: 'Not enough stock' }, { status: 409 })
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const [reservation] = await prisma.$transaction([
      prisma.reservation.create({
        data: { productId, warehouseId, quantity, expiresAt }
      }),
      prisma.stockLevel.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reservedUnits: { increment: quantity } }
      })
    ])

    return NextResponse.json(reservation, { status: 201 })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}