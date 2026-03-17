import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create demo user
  const hash = await bcrypt.hash('demo1234', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@financehub.io' },
    update: {},
    create: {
      email: 'demo@financehub.io',
      passwordHash: hash,
    },
  })

  // Seed demo holdings
  await prisma.holding.deleteMany({ where: { userId: user.id } })
  await prisma.holding.createMany({
    data: [
      { userId: user.id, ticker: 'AAPL', quantity: 10, avgBuyPrice: 145.00, purchaseDate: new Date('2022-01-15') },
      { userId: user.id, ticker: 'MSFT', quantity: 5, avgBuyPrice: 280.00, purchaseDate: new Date('2022-03-10') },
      { userId: user.id, ticker: 'GOOGL', quantity: 3, avgBuyPrice: 2700.00, purchaseDate: new Date('2021-11-20') },
      { userId: user.id, ticker: 'NVDA', quantity: 8, avgBuyPrice: 220.00, purchaseDate: new Date('2023-01-05') },
    ],
  })

  // Seed portfolio snapshots
  const today = new Date()
  const snapshots = []
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    snapshots.push({
      userId: user.id,
      totalValue: 25000 + Math.random() * 5000 - 2500,
      recordedAt: d,
    })
  }
  await prisma.portfolioSnapshot.deleteMany({ where: { userId: user.id } })
  await prisma.portfolioSnapshot.createMany({ data: snapshots })

  // Seed a price alert
  await prisma.priceAlert.upsert({
    where: { id: 'seed-alert-1' },
    update: {},
    create: {
      id: 'seed-alert-1',
      userId: user.id,
      ticker: 'AAPL',
      condition: 'above',
      targetPrice: 200.00,
      triggered: false,
    },
  })

  console.log('✅ Seed complete — demo@financehub.io / demo1234')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
