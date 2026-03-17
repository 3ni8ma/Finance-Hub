import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import { getAllStocks } from './marketService'
import { getIO } from '../websocket/server'
import logger from '../utils/logger'

const prisma = new PrismaClient()

export function setupCronJobs() {
  // Check price alerts every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const alerts = await prisma.priceAlert.findMany({ where: { triggered: false } })
      if (!alerts.length) return

      const tickers = [...new Set(alerts.map((a) => a.ticker))]
      const stocks = await getAllStocks()
      const priceMap: Record<string, number> = {}
      stocks.forEach((s) => { if (tickers.includes(s.symbol)) priceMap[s.symbol] = s.price })

      const io = getIO()
      for (const alert of alerts) {
        const price = priceMap[alert.ticker]
        if (price === undefined) continue
        const triggered =
          (alert.condition === 'above' && price >= alert.targetPrice) ||
          (alert.condition === 'below' && price <= alert.targetPrice)

        if (triggered) {
          await prisma.priceAlert.update({ where: { id: alert.id }, data: { triggered: true } })
          const message = `${alert.ticker} is now ${alert.condition} $${alert.targetPrice.toFixed(2)} (current: $${price.toFixed(2)})`
          logger.info(`Alert triggered: ${message}`)
          // Emit to user via WebSocket (broadcast; in prod scope to user room)
          io?.emit('alert_triggered', { alertId: alert.id, ticker: alert.ticker, price, message })
        }
      }
    } catch (err) {
      logger.error(`Alert cron error: ${(err as Error).message}`)
    }
  })

  // Record portfolio snapshots daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const users = await prisma.user.findMany({ include: { holdings: true } })
      const stocks = await getAllStocks()
      const priceMap: Record<string, number> = {}
      stocks.forEach((s) => { priceMap[s.symbol] = s.price })

      for (const user of users) {
        if (!user.holdings.length) continue
        const totalValue = user.holdings.reduce((sum, h) => sum + h.quantity * (priceMap[h.ticker] ?? h.avgBuyPrice), 0)
        await prisma.portfolioSnapshot.create({ data: { userId: user.id, totalValue } })
      }
      logger.info(`Portfolio snapshots recorded for ${users.length} users`)
    } catch (err) {
      logger.error(`Snapshot cron error: ${(err as Error).message}`)
    }
  })

  logger.info('Cron jobs scheduled')
}
