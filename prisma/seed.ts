import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create warehouses
  const warehouse1 = await prisma.warehouse.create({
    data: { name: 'Mumbai Warehouse', location: 'Mumbai, India' }
  })

  const warehouse2 = await prisma.warehouse.create({
    data: { name: 'Delhi Warehouse', location: 'Delhi, India' }
  })

  // Create products with stock levels
  const product1 = await prisma.product.create({
    data: {
      name: 'Wireless Headphones',
      description: 'Premium noise cancelling headphones',
      price: 2999,
      stockLevels: {
        create: [
          { warehouseId: warehouse1.id, totalUnits: 10 },
          { warehouseId: warehouse2.id, totalUnits: 5 }
        ]
      }
    }
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Mechanical Keyboard',
      description: 'RGB mechanical gaming keyboard',
      price: 4999,
      stockLevels: {
        create: [
          { warehouseId: warehouse1.id, totalUnits: 8 },
          { warehouseId: warehouse2.id, totalUnits: 3 }
        ]
      }
    }
  })

  const product3 = await prisma.product.create({
    data: {
      name: 'USB-C Hub',
      description: '7-in-1 USB-C multiport adapter',
      price: 1499,
      stockLevels: {
        create: [
          { warehouseId: warehouse1.id, totalUnits: 2 },
          { warehouseId: warehouse2.id, totalUnits: 1 }
        ]
      }
    }
  })

  console.log('Seeded:', { product1, product2, product3 })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())