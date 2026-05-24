import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';

const prisma = new (PrismaClient as any)();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const [laWarehouse, nyWarehouse] = await Promise.all([
    prisma.warehouse.create({ data: { name: 'LA Warehouse' } }),
    prisma.warehouse.create({ data: { name: 'NY Warehouse' } }),
  ]);

  const [blueShirt, cozyMug, travelBottle] = await Promise.all([
    prisma.product.create({ data: { sku: 'BLUE-SHIRT', name: 'Blue Shirt' } }),
    prisma.product.create({ data: { sku: 'COZY-MUG', name: 'Cozy Mug' } }),
    prisma.product.create({ data: { sku: 'TRAVEL-BOTTLE', name: 'Travel Bottle' } }),
  ]);

  await prisma.inventory.createMany({
    data: [
      { productId: blueShirt.id, warehouseId: laWarehouse.id, total: 8, reserved: 0 },
      { productId: blueShirt.id, warehouseId: nyWarehouse.id, total: 5, reserved: 0 },
      { productId: cozyMug.id, warehouseId: laWarehouse.id, total: 12, reserved: 0 },
      { productId: cozyMug.id, warehouseId: nyWarehouse.id, total: 4, reserved: 0 },
      { productId: travelBottle.id, warehouseId: laWarehouse.id, total: 6, reserved: 0 },
      { productId: travelBottle.id, warehouseId: nyWarehouse.id, total: 7, reserved: 0 },
    ],
  });

  console.log('Seed data created.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
